// Carrega os dados de demonstração do GymFlow (os mesmos de src/data/demo.ts) nas tabelas DynamoDB do projeto.
//
//   node backend/dados/carregar-demo.mjs             # carrega só as tabelas que ainda estão vazias
//   node backend/dados/carregar-demo.mjs --forcar    # sobrescreve (apaga alterações feitas pelo app nesses registros)
//   node backend/dados/carregar-demo.mjs --forcar --limpar   # e apaga o que o demo não tem (volta à demonstração limpa)
//
// Exige credenciais do Learner Lab válidas (variáveis AWS_* ou ~/.aws/credentials) na conta do projeto e o AWS CLI.
// O TypeScript do projeto transpila demo.ts na hora, então o app e a carga usam exatamente a mesma fonte.
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { COLECOES } from "./api/index.mjs";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, "..", "..");
const PREFIXO = "pedromaksonfontesdacosta";
const SUFIXO = "2026.2";
const CONTA_ESPERADA = "199730069200";
const nomeTabela = (t) => `${PREFIXO}-${t}-${SUFIXO}`;

// Qual login (e-mail do Cognito) é qual cadastro. É assim que a API sabe de quem são os dados que cada um vê.
const LOGINS = {
  alunos: { 1: ["aluno@gmail.com", "maksonjp080@gmail.com"] },
  usuarios: {
    1: ["aluno@gmail.com", "maksonjp080@gmail.com"],
    2: ["instrutor@gymflow.com"],
    4: ["recep@gymflow.com"],
    6: ["adm@gymflow.com"],
  },
};

function aws(args, entrada) {
  const r = spawnSync("aws", args, { encoding: "utf8", env: { ...process.env, PYTHONUTF8: "1", AWS_CLI_FILE_ENCODING: "UTF-8" } });
  if (r.status !== 0) throw new Error(`aws ${args.slice(0, 2).join(" ")} falhou: ${(r.stderr || r.stdout).trim()}`);
  return r.stdout.replace(/\r/g, "").trim();
}

// DynamoDB JSON (o batch-write-item do CLI não aceita documentos simples)
function marshall(v) {
  if (v === null || v === undefined) return { NULL: true };
  if (typeof v === "string") return { S: v };
  if (typeof v === "number") return { N: String(v) };
  if (typeof v === "boolean") return { BOOL: v };
  if (Array.isArray(v)) return { L: v.map(marshall) };
  return { M: Object.fromEntries(Object.entries(v).filter(([, x]) => x !== undefined).map(([k, x]) => [k, marshall(x)])) };
}

async function carregarDemo() {
  const tmp = mkdtempSync(path.join(tmpdir(), "gymflow-demo-"));
  try {
    const ts = createRequire(import.meta.url)(path.join(RAIZ, "node_modules", "typescript"));
    const transpilar = (arquivo, destino) => {
      const fonte = readFileSync(path.join(RAIZ, arquivo), "utf8");
      const js = ts.transpileModule(fonte, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
      writeFileSync(
        path.join(tmp, destino),
        js.outputText.replace(/"\.\.\/lib\/datas"/g, '"./datas.mjs"').replace(/"\.\/aluno"/g, '"./aluno.mjs"'),
      );
    };
    transpilar("src/lib/datas.ts", "datas.mjs");
    transpilar("src/data/aluno.ts", "aluno.mjs");
    transpilar("src/data/demo.ts", "demo.mjs");
    return await import(pathToFileURL(path.join(tmp, "demo.mjs")).href);
  } finally {
    // o módulo já está carregado na memória
    rmSync(tmp, { recursive: true, force: true });
  }
}

function escrever(tabela, itens) {
  for (let i = 0; i < itens.length; i += 25) {
    let pendentes = { [nomeTabela(tabela)]: itens.slice(i, i + 25).map((item) => ({ PutRequest: { Item: Object.fromEntries(Object.entries(item).map(([k, v]) => [k, marshall(v)])) } })) };
    for (let tentativa = 0; Object.keys(pendentes).length > 0; tentativa++) {
      if (tentativa > 5) throw new Error(`Itens sem gravar em ${tabela}.`);
      const arquivo = path.join(tmpdir(), `gymflow-lote-${process.pid}.json`);
      writeFileSync(arquivo, JSON.stringify(pendentes));
      try {
        const saida = aws(["dynamodb", "batch-write-item", "--request-items", `file://${arquivo.replace(/\\/g, "/")}`, "--output", "json"]);
        pendentes = JSON.parse(saida).UnprocessedItems ?? {};
      } finally {
        rmSync(arquivo, { force: true });
      }
    }
  }
}

const forcar = process.argv.includes("--forcar");
const conta = aws(["sts", "get-caller-identity", "--query", "Account", "--output", "text"]);
if (conta !== CONTA_ESPERADA) {
  console.error(`Conta ${conta} não é a do projeto (${CONTA_ESPERADA}). Nada foi gravado.`);
  process.exit(1);
}
const tabelaVazia = (tabela) =>
  Number(aws(["dynamodb", "scan", "--table-name", nomeTabela(tabela), "--select", "COUNT", "--query", "Count", "--output", "text"])) === 0;

const demo = await carregarDemo();
const docs = {
  alunos: demo.ALUNOS_INICIAL,
  usuarios: demo.USUARIOS_INICIAL,
  planos: demo.PLANOS_INICIAL,
  pagamentos: demo.PAGAMENTOS_INICIAL,
  checkins: demo.gerarCheckinsDemo(),
  treinos: demo.TREINOS_INICIAL,
  avaliacoes: demo.AVALIACOES_INICIAL,
  observacoes: demo.OBSERVACOES_INICIAL,
  exportacoes: demo.EXPORTACOES_INICIAL,
  matriculas: demo.MATRICULAS_INICIAL,
};

const porTabela = {};
for (const [colecao, lista] of Object.entries(docs)) {
  const def = COLECOES[colecao];
  for (const doc of lista) {
    const item = def.paraItem(doc);
    const logins = LOGINS[colecao]?.[doc.id];
    if (logins) item.loginEmails = logins;
    (porTabela[def.tabela] ??= []).push(item);
  }
}
// --limpar: apaga das tabelas o que o demo não tem (alunos, parcelas, check-ins... criados em testes)
function limparExtras() {
  const chavesDoDemo = {};
  const atributos = {};
  for (const [colecao, lista] of Object.entries(docs)) {
    const def = COLECOES[colecao];
    for (const doc of lista) {
      const chave = def.chave(doc);
      atributos[def.tabela] = Object.keys(chave);
      (chavesDoDemo[def.tabela] ??= new Set()).add(JSON.stringify(Object.values(chave).map(String)));
    }
  }
  // tabelas que o demo deixa vazias (as notificações lidas são de cada pessoa): tudo que existir nelas é resto de teste
  atributos.notificacoes ??= ["destino", "criadoEm"];
  chavesDoDemo.notificacoes ??= new Set();
  for (const [tabela, nomes] of Object.entries(atributos)) {
    const saida = aws([
      "dynamodb", "scan", "--table-name", nomeTabela(tabela), "--projection-expression", nomes.join(","), "--output", "json",
    ]);
    const extras = JSON.parse(saida).Items.filter(
      (item) => !chavesDoDemo[tabela].has(JSON.stringify(nomes.map((n) => String(item[n].S ?? item[n].N)))),
    );
    for (let i = 0; i < extras.length; i += 25) {
      const lote = { [nomeTabela(tabela)]: extras.slice(i, i + 25).map((Key) => ({ DeleteRequest: { Key } })) };
      const arquivo = path.join(tmpdir(), `gymflow-limpar-${process.pid}.json`);
      writeFileSync(arquivo, JSON.stringify(lote));
      try {
        aws(["dynamodb", "batch-write-item", "--request-items", `file://${arquivo.replace(/\\/g, "/")}`]);
      } finally {
        rmSync(arquivo, { force: true });
      }
    }
    console.log(`${tabela}: ${extras.length} item(ns) fora do demo apagado(s)`);
  }
}

for (const [tabela, itens] of Object.entries(porTabela)) {
  if (!forcar && !tabelaVazia(tabela)) {
    console.log(`${tabela}: já tem dados, nada gravado (use --forcar para sobrescrever)`);
    continue;
  }
  escrever(tabela, itens);
  console.log(`${tabela}: ${itens.length} itens gravados`);
}
if (process.argv.includes("--limpar")) limparExtras();
