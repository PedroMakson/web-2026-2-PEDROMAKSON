import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { COLECOES, criarHandler, perfilDoToken, validar } from "../index.mjs";

// ---------------------------------------------------------------- banco em memória

const CHAVES = {
  pessoas: ["pessoaId"],
  planos: ["planoId"],
  pagamentos: ["pagamentoId"],
  matriculas: ["matriculaId"],
  checkins: ["alunoId", "dataId"],
  treinos: ["alunoId", "divisao"],
  avaliacoes: ["alunoId", "dataId"],
  observacoes: ["alunoId", "criadoEm"],
  exportacoes: ["relatorio", "criadoEm"],
  notificacoes: ["destino", "criadoEm"],
};

function criarBanco() {
  const tabelas = Object.fromEntries(Object.keys(CHAVES).map((t) => [t, new Map()]));
  const chaveDe = (tabela, item) => JSON.stringify(CHAVES[tabela].map((c) => item[c]));
  const copia = (x) => structuredClone(x);
  return {
    tabelas,
    falhar: false,
    async scan(tabela) {
      if (this.falhar) throw new Error("AccessDeniedException: arn:aws:dynamodb:segredo");
      return [...tabelas[tabela].values()].map(copia);
    },
    async query(tabela, atributo, valor) {
      return [...tabelas[tabela].values()].filter((i) => i[atributo] === valor).map(copia);
    },
    async get(tabela, chave) {
      const achado = tabelas[tabela].get(chaveDe(tabela, chave));
      return achado ? copia(achado) : null;
    },
    async put(tabela, item) {
      tabelas[tabela].set(chaveDe(tabela, item), copia(item));
    },
    async delete(tabela, chave) {
      tabelas[tabela].delete(chaveDe(tabela, chave));
    },
  };
}

// ---------------------------------------------------------------- dados de teste (no formato do app)

const endereco = { cep: "59900-000", logradouro: "Rua A", numero: "1", complemento: "", bairro: "Centro", cidade: "Pau dos Ferros", uf: "RN" };

const aluno = (id, nome, instrutor, extra = {}) => ({
  id, nome, email: `${nome.split(" ")[0].toLowerCase()}@email.com`, tel: "(84) 99999-0000", plano: "Mensal Fit",
  instrutor, fim: "02/10/2026", fin: "Em dia", ultimo: "hoje", alerta: "", checkin: false,
  matricula: `#2026-00${id}`, matriculaAnterior: "", ativo: true, endereco, ...extra,
});
const usuario = (id, nome, perfil) => ({
  id, nome, email: `${nome.split(" ")[0].toLowerCase()}@gymflow.com`, tel: "(84) 99700-0000", perfil, ativo: true,
});
const pagamento = (id, nome) => ({
  id, nome, plano: "Mensal Fit", venc: "17/09/2026", valor: "R$ 129,90", parcela: "Única", pago: false, atraso: false,
});
const checkin = (id, alunoId, data, extra = {}) => ({
  id, alunoId, data, hora: "07:00", origem: "App", registradoPor: "Pedro Makson", perfilRegistro: "Aluno",
  registradoEm: `${data}T07:00:00`, ...extra,
});
const plano = { id: 1, nome: "Mensal Fit", valor: "R$ 129,90", duracao: "1 mês", ativos: 10, regra: "Carência de 30 dias." };
const treino = (alunoId, divisao = "A", extra = {}) => ({
  id: `${alunoId}-${divisao}`, alunoId, divisao, titulo: "Peito e tríceps",
  exercicios: [{ nome: "Supino reto", series: "4", reps: "8-10", carga: "40 kg" }],
  atualizadoPor: "Carla Menezes", atualizadoEm: "2026-08-12T08:00:00Z", ...extra,
});
const avaliacao = (id, alunoId, data, extra = {}) => ({ id, alunoId, data, instrutor: "Carla Menezes", peso: 79.2, altura: 1.78, gordura: 19.4, cintura: 86, ...extra });
const observacao = (id, alunoId, extra = {}) => ({ id, alunoId, texto: "Dor leve no ombro.", instrutor: "Carla Menezes", criadoEm: `2026-08-12T08:4${id}:00.000Z`, ...extra });

async function semear(db) {
  const gravar = async (colecao, doc, extra = {}) =>
    db.put(COLECOES[colecao].tabela, { ...COLECOES[colecao].paraItem(doc), ...extra });
  await gravar("alunos", aluno(1, "Pedro Makson", "Carla Menezes"), { loginEmails: ["aluno@gmail.com", "pedro.google@gmail.com"] });
  await gravar("alunos", aluno(2, "Ana Lima", "Carla Menezes"));
  await gravar("alunos", aluno(3, "Marcela Duarte", "Diego Rocha"));
  await gravar("usuarios", usuario(1, "Pedro Makson", "Aluno"), { loginEmails: ["aluno@gmail.com"] });
  await gravar("usuarios", usuario(2, "Carla Menezes", "Instrutor"), { loginEmails: ["instrutor@gymflow.com"] });
  await gravar("usuarios", usuario(3, "Diego Rocha", "Instrutor"));
  await gravar("usuarios", usuario(4, "Júlia Alves", "Recepcionista"), { loginEmails: ["recep@gymflow.com"] });
  await gravar("usuarios", usuario(6, "Walber Silva", "Administrador"), { loginEmails: ["adm@gymflow.com"] });
  await gravar("planos", plano);
  await gravar("pagamentos", pagamento(1, "Pedro Makson"));
  await gravar("pagamentos", pagamento(2, "Ana Lima"));
  await gravar("checkins", checkin(1, 1, "2026-09-10"));
  await gravar("checkins", checkin(2, 2, "2026-09-10", { registradoPor: "Ana Lima" }));
  await gravar("checkins", checkin(3, 3, "2026-09-10", { registradoPor: "Marcela Duarte" }));
  await gravar("treinos", treino(1));
  await gravar("treinos", treino(2));
  await gravar("treinos", treino(3));
  await gravar("avaliacoes", avaliacao(1, 1, "2026-08-12"));
  await gravar("avaliacoes", avaliacao(2, 2, "2026-08-10"));
  await gravar("observacoes", observacao(1, 1));
  await gravar("observacoes", observacao(2, 3));
}

// ---------------------------------------------------------------- chamadas

const CLAIMS = {
  admin: { sub: "sub-adm-0001", email: "adm@gymflow.com", "cognito:groups": "[Administrador]" },
  recep: { sub: "sub-rec-0001", email: "recep@gymflow.com", "cognito:groups": "[Recepcionista]" },
  instrutor: { sub: "sub-ins-0001", email: "instrutor@gymflow.com", "cognito:groups": "[Instrutor]" },
  aluno: { sub: "sub-alu-0001", email: "aluno@gmail.com", "cognito:groups": "[Aluno]" },
  google: { sub: "sub-goo-0001", email: "pedro.google@gmail.com", "cognito:groups": "[Aluno]" },
  estranho: { sub: "sub-est-0001", email: "outro@gmail.com", "cognito:groups": "[Aluno]" },
  semGrupo: { sub: "sub-sem-0001", email: "x@y.com" },
};

async function ambiente() {
  const db = criarBanco();
  await semear(db);
  const h = criarHandler({ db });
  const ler = (quem) => h({ requestContext: { http: { method: "GET" }, authorizer: { jwt: { claims: CLAIMS[quem] } } } });
  const apagar = (quem, colecao, id) =>
    h({
      requestContext: { http: { method: "DELETE" }, authorizer: { jwt: { claims: CLAIMS[quem] } } },
      pathParameters: { colecao, id: String(id) },
    });
  const gravar = (quem, colecao, doc, { id = doc?.id, corpo } = {}) =>
    h({
      requestContext: { http: { method: "PUT" }, authorizer: quem ? { jwt: { claims: CLAIMS[quem] } } : undefined },
      pathParameters: { colecao, id: String(id) },
      body: corpo ?? JSON.stringify(doc),
    });
  return { db, h, ler, gravar, apagar };
}

const corpo = (r) => JSON.parse(r.body);
const ids = (lista) => lista.map((x) => x.id).sort((a, b) => a - b);

// ---------------------------------------------------------------- testes

describe("quem é quem", () => {
  it("perfilDoToken lê o grupo do Cognito em texto ou em lista", () => {
    assert.equal(perfilDoToken({ "cognito:groups": "[Aluno]" }), "Aluno");
    assert.equal(perfilDoToken({ "cognito:groups": "Administrador" }), "Administrador");
    assert.equal(perfilDoToken({ "cognito:groups": ["x", "Instrutor"] }), "Instrutor");
    assert.equal(perfilDoToken({ "cognito:groups": "[inventado]" }), null);
    assert.equal(perfilDoToken({}), null);
  });

  it("401 sem token e 403 sem perfil de acesso", async () => {
    const { h, ler } = await ambiente();
    assert.equal((await h({ requestContext: { http: { method: "GET" } } })).statusCode, 401);
    assert.equal((await ler("semGrupo")).statusCode, 403);
  });
});

describe("GET /dados: cada perfil vê só o que é seu", () => {
  it("administrador vê tudo", async () => {
    const { ler } = await ambiente();
    const r = await ler("admin");
    assert.equal(r.statusCode, 200);
    const d = corpo(r);
    assert.deepEqual(ids(d.alunos), [1, 2, 3]);
    assert.deepEqual(ids(d.usuarios), [1, 2, 3, 4, 6]);
    assert.deepEqual(ids(d.pagamentos), [1, 2]);
    assert.deepEqual(ids(d.checkins), [1, 2, 3]);
    assert.deepEqual(d.voce, { perfil: "Administrador", nome: "Walber Silva", alunoId: null });
  });

  it("recepção vê alunos, pagamentos e check-ins, mas da equipe só o próprio cadastro", async () => {
    const d = corpo(await (await ambiente()).ler("recep"));
    assert.deepEqual(ids(d.alunos), [1, 2, 3]);
    assert.deepEqual(ids(d.pagamentos), [1, 2]);
    assert.deepEqual(ids(d.usuarios), [4]);
    assert.equal(d.voce.nome, "Júlia Alves");
  });

  it("instrutor vê só os alunos dele, os check-ins deles e nenhum pagamento", async () => {
    const d = corpo(await (await ambiente()).ler("instrutor"));
    assert.deepEqual(ids(d.alunos), [1, 2]);
    assert.deepEqual(ids(d.checkins), [1, 2]);
    assert.deepEqual(d.pagamentos, []);
    assert.deepEqual(ids(d.usuarios), [2]);
  });

  it("aluno vê só o próprio cadastro, pagamentos e check-ins", async () => {
    const d = corpo(await (await ambiente()).ler("aluno"));
    assert.deepEqual(ids(d.alunos), [1]);
    assert.deepEqual(ids(d.pagamentos), [1]);
    assert.deepEqual(ids(d.checkins), [1]);
    assert.deepEqual(ids(d.planos), [1]);
    assert.equal(d.voce.alunoId, 1);
  });

  it("o login do Google também leva ao cadastro do aluno", async () => {
    const d = corpo(await (await ambiente()).ler("google"));
    assert.deepEqual(ids(d.alunos), [1]);
  });

  it("aluno sem cadastro ligado ao login não vê dado de ninguém", async () => {
    const d = corpo(await (await ambiente()).ler("estranho"));
    assert.deepEqual([d.alunos, d.pagamentos, d.checkins, d.usuarios], [[], [], [], []]);
    assert.equal(d.voce.alunoId, null);
  });

  it("os atributos internos (chaves e loginEmails) nunca saem na resposta", async () => {
    const { ler } = await ambiente();
    const texto = (await ler("admin")).body;
    for (const interno of ["loginEmails", "pessoaId", "planoId", "pagamentoId", "dataId", "colecao", "aluno@gmail.com"]) {
      assert.ok(!texto.includes(interno), `vazou ${interno}`);
    }
  });

  it("tudo vem em ordem de id, não na ordem em que o banco devolve", async () => {
    const { db, ler, gravar } = await ambiente();
    await gravar("recep", "alunos", aluno(0 + 9, "Zé Último", "Carla Menezes"));
    await gravar("admin", "planos", { ...plano, id: 3, nome: "Anual" });
    await gravar("admin", "planos", { ...plano, id: 2, nome: "Trimestral" });
    // embaralha a ordem de inserção do banco em memória
    const pessoas = [...db.tabelas.pessoas.entries()].reverse();
    db.tabelas.pessoas.clear();
    for (const [k, v] of pessoas) db.tabelas.pessoas.set(k, v);
    const d = corpo(await ler("admin"));
    assert.deepEqual(d.alunos.map((a) => a.id), [1, 2, 3, 9]);
    assert.deepEqual(d.usuarios.map((u) => u.id), [1, 2, 3, 4, 6]);
    assert.deepEqual(d.planos.map((p) => p.id), [1, 2, 3]);
  });

  it("o check-in volta com o alunoId como número", async () => {
    const d = corpo(await (await ambiente()).ler("admin"));
    assert.equal(typeof d.checkins[0].alunoId, "number");
  });
});

describe("PUT /dados: permissão por perfil", () => {
  it("administrador grava plano e usuário; recepção, instrutor e aluno não", async () => {
    const { gravar } = await ambiente();
    const novoPlano = { ...plano, id: 2, nome: "Anual" };
    const novoUsuario = usuario(7, "Novo Instrutor", "Instrutor");
    assert.equal((await gravar("admin", "planos", novoPlano)).statusCode, 200);
    assert.equal((await gravar("admin", "usuarios", novoUsuario)).statusCode, 200);
    for (const quem of ["recep", "instrutor", "aluno"]) {
      assert.equal((await gravar(quem, "planos", novoPlano)).statusCode, 403, `${quem} planos`);
      assert.equal((await gravar(quem, "usuarios", novoUsuario)).statusCode, 403, `${quem} usuarios`);
    }
  });

  it("recepção grava aluno e pagamento; instrutor e aluno não", async () => {
    const { gravar } = await ambiente();
    assert.equal((await gravar("recep", "alunos", aluno(9, "Novo Aluno", "Carla Menezes"))).statusCode, 200);
    assert.equal((await gravar("recep", "pagamentos", { ...pagamento(1, "Pedro Makson"), pago: true, pagoEm: "14/09/2026", forma: "Pix", origem: "Recepção" })).statusCode, 200);
    for (const quem of ["instrutor", "aluno"]) {
      assert.equal((await gravar(quem, "alunos", aluno(9, "Novo Aluno", "x"))).statusCode, 403);
      assert.equal((await gravar(quem, "pagamentos", pagamento(9, "x"))).statusCode, 403);
    }
    assert.equal((await gravar("aluno", "pagamentos", pagamento(2, "Ana Lima"))).statusCode, 403);
  });

  it("o que foi gravado aparece na leitura seguinte", async () => {
    const { gravar, ler } = await ambiente();
    await gravar("recep", "alunos", aluno(9, "Novo Aluno", "Carla Menezes"));
    assert.deepEqual(ids(corpo(await ler("admin")).alunos), [1, 2, 3, 9]);
    assert.deepEqual(ids(corpo(await ler("instrutor")).alunos), [1, 2, 9]);
  });

  it("salvar o aluno não apaga a ligação com o login (loginEmails)", async () => {
    const { gravar, ler } = await ambiente();
    await gravar("recep", "alunos", { ...aluno(1, "Pedro Makson", "Carla Menezes"), ativo: false });
    const d = corpo(await ler("aluno"));
    assert.deepEqual(ids(d.alunos), [1]);
    assert.equal(d.alunos[0].ativo, false);
  });
});

describe("PUT /dados: validação", () => {
  it("recusa campos que não são do modelo, em especial os internos", async () => {
    const { gravar } = await ambiente();
    for (const extra of [{ loginEmails: ["eu@x.com"] }, { pessoaId: "A#1" }, { colecao: "usuarios" }, { perfil: "Administrador" }, { qualquer: 1 }]) {
      const r = await gravar("admin", "alunos", { ...aluno(1, "Pedro Makson", "Carla Menezes"), ...extra });
      assert.equal(r.statusCode, 400, JSON.stringify(extra));
    }
  });

  it("recusa documento incompleto ou com valor inválido", async () => {
    const { gravar } = await ambiente();
    const base = aluno(9, "Novo Aluno", "Carla Menezes");
    const { nome, ...semNome } = base;
    const casos = [
      semNome,
      { ...base, email: "sem-arroba" },
      { ...base, fim: "2026-10-02" },
      { ...base, fin: "Quase" },
      { ...base, ativo: "sim" },
      { ...base, id: 0 },
      { ...base, nome: "x".repeat(121) },
      { ...base, endereco: { ...endereco, extra: "x" } },
    ];
    for (const doc of casos) assert.equal((await gravar("admin", "alunos", doc, { id: doc.id ?? 9 })).statusCode, 400);
    assert.equal((await gravar("admin", "pagamentos", { ...pagamento(9, "x"), valor: "129,90" })).statusCode, 400);
    assert.equal((await gravar("admin", "usuarios", { ...usuario(9, "x", "Chefe") })).statusCode, 400);
  });

  it("o id do endereço precisa ser o do documento, a coleção precisa existir e o corpo ser JSON", async () => {
    const { gravar } = await ambiente();
    const doc = aluno(9, "Novo Aluno", "Carla Menezes");
    assert.equal((await gravar("admin", "alunos", doc, { id: 10 })).statusCode, 400);
    assert.equal((await gravar("admin", "inventada", doc)).statusCode, 404);
    assert.equal((await gravar("admin", "alunos", doc, { corpo: "não é json" })).statusCode, 400);
    assert.equal((await gravar("admin", "alunos", doc, { corpo: "[]" })).statusCode, 400);
  });
});

describe("check-ins", () => {
  const hoje = "2026-09-14";

  it("aluno registra o próprio check-in e o aluno novo aparece na leitura", async () => {
    const { gravar, ler } = await ambiente();
    assert.equal((await gravar("aluno", "checkins", checkin(10, 1, hoje))).statusCode, 200);
    assert.deepEqual(ids(corpo(await ler("aluno")).checkins), [1, 10]);
  });

  it("aluno não registra para outro aluno nem em nome de outro perfil", async () => {
    const { gravar } = await ambiente();
    assert.equal((await gravar("aluno", "checkins", checkin(10, 2, hoje))).statusCode, 403);
    assert.equal((await gravar("aluno", "checkins", checkin(10, 1, hoje, { perfilRegistro: "Recepcionista" }))).statusCode, 403);
  });

  it("recepção registra para qualquer aluno; instrutor e quem não tem cadastro, não", async () => {
    const { gravar } = await ambiente();
    const daRecepcao = checkin(10, 2, hoje, { origem: "Recepção", registradoPor: "Júlia Alves", perfilRegistro: "Recepcionista" });
    assert.equal((await gravar("recep", "checkins", daRecepcao)).statusCode, 200);
    assert.equal((await gravar("instrutor", "checkins", daRecepcao)).statusCode, 403);
    assert.equal((await gravar("estranho", "checkins", checkin(11, 1, hoje))).statusCode, 403);
  });

  it("um aluno só tem um check-in vigente por dia", async () => {
    const { gravar } = await ambiente();
    assert.equal((await gravar("aluno", "checkins", checkin(10, 1, hoje))).statusCode, 200);
    assert.equal((await gravar("aluno", "checkins", checkin(11, 1, hoje))).statusCode, 409);
  });

  it("depois de removido, o dia pode receber outro check-in", async () => {
    const { gravar } = await ambiente();
    const primeiro = checkin(10, 1, hoje);
    await gravar("aluno", "checkins", primeiro);
    await gravar("aluno", "checkins", { ...primeiro, cancelado: { por: "Pedro Makson (Aluno)", em: "2026-09-14T09:00:00Z", motivo: "Marquei sem querer" } });
    assert.equal((await gravar("aluno", "checkins", checkin(11, 1, hoje))).statusCode, 200);
  });

  it("remover mantém o registro (com quem removeu e por quê) e não o apaga", async () => {
    const { gravar, ler } = await ambiente();
    const original = checkin(1, 1, "2026-09-10");
    const removido = { ...original, cancelado: { por: "Pedro Makson (Aluno)", em: "2026-09-14T09:00:00Z", motivo: "Marquei sem querer" } };
    assert.equal((await gravar("aluno", "checkins", removido)).statusCode, 200);
    const guardado = corpo(await ler("aluno")).checkins.find((c) => c.id === 1);
    assert.equal(guardado.cancelado.motivo, "Marquei sem querer");
  });

  it("só a remoção pode alterar um check-in existente, e uma única vez", async () => {
    const { gravar } = await ambiente();
    const original = checkin(1, 1, "2026-09-10");
    const cancelado = { por: "Pedro Makson (Aluno)", em: "2026-09-14T09:00:00Z", motivo: "Marquei sem querer" };
    assert.equal((await gravar("aluno", "checkins", { ...original, hora: "23:59" })).statusCode, 400); // outro campo
    assert.equal((await gravar("aluno", "checkins", { ...original, data: "2026-09-11" })).statusCode, 400); // outro dia
    assert.equal((await gravar("aluno", "checkins", original)).statusCode, 400); // sem remoção
    assert.equal((await gravar("aluno", "checkins", { ...original, cancelado })).statusCode, 200);
    assert.equal((await gravar("aluno", "checkins", { ...original, cancelado })).statusCode, 409); // já removido
  });

  it("a remoção precisa estar no nome de quem a fez, e nada nasce já removido", async () => {
    const { gravar } = await ambiente();
    const original = checkin(1, 1, "2026-09-10");
    const em = "2026-09-14T09:00:00Z";
    assert.equal((await gravar("aluno", "checkins", { ...original, cancelado: { por: "Júlia Alves (Recepcionista)", em, motivo: "fraude" } })).statusCode, 403);
    assert.equal((await gravar("aluno", "checkins", checkin(10, 1, "2026-09-14", { cancelado: { por: "Pedro Makson (Aluno)", em, motivo: "x" } }))).statusCode, 400);
  });

  it("aluno não remove check-in de outro aluno", async () => {
    const { gravar } = await ambiente();
    const deOutro = checkin(2, 2, "2026-09-10", { registradoPor: "Ana Lima" });
    const r = await gravar("aluno", "checkins", { ...deOutro, cancelado: { por: "Pedro Makson (Aluno)", em: "2026-09-14T09:00:00Z", motivo: "teste" } });
    assert.equal(r.statusCode, 403);
  });
});

describe("treinos, avaliações e observações", () => {
  it("o aluno lê o próprio treino e as próprias avaliações, mas não as observações do instrutor", async () => {
    const d = corpo(await (await ambiente()).ler("aluno"));
    assert.deepEqual(d.treinos.map((t) => t.id), ["1-A"]);
    assert.deepEqual(ids(d.avaliacoes), [1]);
    assert.deepEqual(d.observacoes, []);
  });

  it("o instrutor lê o acompanhamento só dos alunos dele", async () => {
    const d = corpo(await (await ambiente()).ler("instrutor"));
    assert.deepEqual(d.treinos.map((t) => t.id), ["1-A", "2-A"]);
    assert.deepEqual(ids(d.avaliacoes), [1, 2]);
    assert.deepEqual(ids(d.observacoes), [1]);
  });

  it("administrador lê tudo; recepção não lê nada disso", async () => {
    const { ler } = await ambiente();
    const adm = corpo(await ler("admin"));
    assert.equal(adm.treinos.length, 3);
    assert.deepEqual(ids(adm.observacoes), [1, 2]);
    const rec = corpo(await ler("recep"));
    assert.deepEqual([rec.treinos, rec.avaliacoes, rec.observacoes], [[], [], []]);
  });

  it("o alunoId volta como número e o treino com os exercícios", async () => {
    const d = corpo(await (await ambiente()).ler("admin"));
    assert.equal(typeof d.treinos[0].alunoId, "number");
    assert.equal(d.treinos[0].exercicios[0].nome, "Supino reto");
    assert.equal(typeof d.avaliacoes[0].alunoId, "number");
    assert.ok(!(await (await ambiente()).ler("admin")).body.includes("dataId"));
  });

  it("instrutor grava treino, avaliação e observação do aluno dele; do aluno de outro instrutor, não", async () => {
    const { gravar } = await ambiente();
    assert.equal((await gravar("instrutor", "treinos", treino(1, "B", { titulo: "Costas e bíceps" }))).statusCode, 200);
    assert.equal((await gravar("instrutor", "avaliacoes", avaliacao(3, 1, "2026-09-14"))).statusCode, 200);
    assert.equal((await gravar("instrutor", "observacoes", observacao(3, 1, { criadoEm: "2026-09-14T10:00:00.000Z" }))).statusCode, 200);
    // Marcela (aluno 3) é de Diego Rocha, não de Carla
    assert.equal((await gravar("instrutor", "treinos", treino(3, "B"))).statusCode, 403);
    assert.equal((await gravar("instrutor", "avaliacoes", avaliacao(4, 3, "2026-09-14"))).statusCode, 403);
    assert.equal((await gravar("instrutor", "observacoes", observacao(4, 3, { criadoEm: "2026-09-14T10:01:00.000Z" }))).statusCode, 403);
  });

  it("treino salvo apaga o alerta \"Treino desatualizado\" do aluno, mas não outros alertas", async () => {
    const { db, gravar } = await ambiente();
    const chave = JSON.stringify(["A#1"]);
    const alerta = () => db.tabelas.pessoas.get(chave).alerta;
    db.tabelas.pessoas.set(chave, { ...db.tabelas.pessoas.get(chave), alerta: "Treino desatualizado" });
    assert.equal((await gravar("instrutor", "treinos", treino(1, "B"))).statusCode, 200);
    assert.equal(alerta(), "");

    db.tabelas.pessoas.set(chave, { ...db.tabelas.pessoas.get(chave), alerta: "Mensalidade atrasada" });
    await gravar("instrutor", "treinos", treino(1, "B"));
    assert.equal(alerta(), "Mensalidade atrasada");
  });

  it("administrador grava em qualquer aluno; aluno e recepção não gravam", async () => {
    const { gravar } = await ambiente();
    assert.equal((await gravar("admin", "treinos", treino(3, "B"))).statusCode, 200);
    for (const quem of ["aluno", "recep"]) {
      assert.equal((await gravar(quem, "treinos", treino(1, "C"))).statusCode, 403, `${quem} treino`);
      assert.equal((await gravar(quem, "avaliacoes", avaliacao(9, 1, "2026-09-14"))).statusCode, 403, `${quem} avaliação`);
      assert.equal((await gravar(quem, "observacoes", observacao(9, 1, { criadoEm: "2026-09-14T11:00:00.000Z" }))).statusCode, 403, `${quem} observação`);
    }
  });

  it("aluno que não existe é 404", async () => {
    const { gravar } = await ambiente();
    assert.equal((await gravar("admin", "treinos", treino(77))).statusCode, 404);
  });

  it("o que o instrutor grava aparece para o aluno e para ele na leitura seguinte", async () => {
    const { gravar, ler } = await ambiente();
    await gravar("instrutor", "treinos", treino(1, "A", { titulo: "Peito reforçado", atualizadoEm: "2026-09-14T09:00:00Z" }));
    await gravar("instrutor", "avaliacoes", avaliacao(3, 1, "2026-09-14", { peso: 78.4 }));
    assert.equal(corpo(await ler("aluno")).treinos[0].titulo, "Peito reforçado");
    assert.deepEqual(corpo(await ler("aluno")).avaliacoes.map((a) => a.peso).sort(), [78.4, 79.2]);
    assert.equal(corpo(await ler("instrutor")).treinos.find((t) => t.id === "1-A").titulo, "Peito reforçado");
  });

  it("valida treino, avaliação e observação", async () => {
    const { gravar } = await ambiente();
    const casos = [
      ["treinos", { ...treino(1), id: "1-B" }], // id não bate com a divisão
      ["treinos", { ...treino(1), divisao: "D", id: "1-D" }],
      ["treinos", { ...treino(1), exercicios: [{ nome: "", series: "4", reps: "8", carga: "40" }] }],
      ["treinos", { ...treino(1), exercicios: [{ nome: "Supino", series: "4", reps: "8", carga: "40", extra: 1 }] }],
      ["treinos", { ...treino(1), exercicios: "supino" }],
      ["avaliacoes", avaliacao(5, 1, "14/09/2026")],
      ["avaliacoes", avaliacao(5, 1, "2026-09-14", { peso: "79,2" })],
      ["avaliacoes", avaliacao(5, 1, "2026-09-14", { peso: 5 })],
      ["avaliacoes", avaliacao(5, 1, "2026-09-14", { altura: 178 })],
      ["observacoes", observacao(5, 1, { texto: "   " })],
      ["observacoes", observacao(5, 1, { texto: "x".repeat(501) })],
    ];
    for (const [colecao, doc] of casos) {
      assert.equal((await gravar("admin", colecao, doc, { id: doc.id })).statusCode, 400, `${colecao} ${JSON.stringify(doc).slice(0, 80)}`);
    }
  });
});

describe("marcas do aluno derivadas do check-in (feitas pelo servidor)", () => {
  const hoje = "2026-09-14";
  const alunoDoBanco = (db) => COLECOES.alunos.deItem(db.tabelas.pessoas.get(JSON.stringify(["A#1"])));

  it("o check-in do dia marca o aluno, mesmo quando quem faz é o próprio aluno (que não grava cadastro)", async () => {
    const { db, gravar } = await ambiente();
    assert.equal((await gravar("aluno", "checkins", checkin(10, 1, hoje))).statusCode, 200);
    assert.equal(alunoDoBanco(db).checkin, true);
    assert.equal(alunoDoBanco(db).ultimo, "hoje");
    assert.deepEqual(db.tabelas.pessoas.get(JSON.stringify(["A#1"])).loginEmails, ["aluno@gmail.com", "pedro.google@gmail.com"]);
  });

  it("o check-in do dia apaga o alerta de falta de check-in, mas não outros alertas", async () => {
    const { db, gravar } = await ambiente();
    const chave = JSON.stringify(["A#1"]);
    db.tabelas.pessoas.set(chave, { ...db.tabelas.pessoas.get(chave), alerta: "Sem check-in há 9 dias" });
    await gravar("aluno", "checkins", checkin(10, 1, hoje));
    assert.equal(alunoDoBanco(db).alerta, "");

    db.tabelas.pessoas.set(chave, { ...db.tabelas.pessoas.get(chave), alerta: "Treino desatualizado" });
    await gravar("aluno", "checkins", checkin(12, 1, hoje, { id: 12 }));
    assert.equal(alunoDoBanco(db).alerta, "Treino desatualizado");
  });

  it("remover o check-in do dia desmarca; o retroativo não mexe nas marcas", async () => {
    const { db, gravar } = await ambiente();
    const dia = checkin(10, 1, hoje);
    await gravar("aluno", "checkins", dia);
    await gravar("aluno", "checkins", { ...dia, cancelado: { por: "Pedro Makson (Aluno)", em: "2026-09-14T09:00:00Z", motivo: "Marquei sem querer" } });
    assert.equal(alunoDoBanco(db).checkin, false);

    const antes = alunoDoBanco(db).ultimo;
    const retro = checkin(11, 1, "2026-09-05", { origem: "Retroativo", hora: "", motivo: "Esqueci de marcar" });
    assert.equal((await gravar("aluno", "checkins", retro)).statusCode, 200);
    assert.equal(alunoDoBanco(db).checkin, false);
    assert.equal(alunoDoBanco(db).ultimo, antes);
  });
});

describe("notificações lidas (cada pessoa só as próprias)", () => {
  const lida = (id, extra = {}) => ({ id, tipo: "Pagamento", texto: "Sua mensalidade vence em 3 dias.", lidoEm: `2026-09-14T10:0${id}:00.000Z`, ...extra });

  it("quem marca como lida vê depois, e os outros usuários não veem", async () => {
    const { db, gravar, ler } = await ambiente();
    assert.equal((await gravar("aluno", "notificacoes", lida(1))).statusCode, 200);
    assert.equal((await gravar("recep", "notificacoes", lida(2, { texto: "Igor está atrasado." }))).statusCode, 200);
    assert.deepEqual(corpo(await ler("aluno")).notificacoes.map((n) => n.texto), ["Sua mensalidade vence em 3 dias."]);
    assert.deepEqual(corpo(await ler("recep")).notificacoes.map((n) => n.texto), ["Igor está atrasado."]);
    assert.deepEqual(corpo(await ler("admin")).notificacoes, []);
    // o destino é decidido pelo servidor, a partir do login, e não aparece no documento devolvido
    const itens = [...db.tabelas.notificacoes.values()].map((i) => i.destino).sort();
    assert.deepEqual(itens, ["usuario#aluno@gmail.com", "usuario#recep@gymflow.com"]);
    assert.equal("destino" in corpo(await ler("aluno")).notificacoes[0], false);
  });

  it("não aceita destino escolhido pelo cliente", async () => {
    const { gravar } = await ambiente();
    assert.equal((await gravar("aluno", "notificacoes", lida(1, { destino: "usuario#adm@gymflow.com" }))).statusCode, 400);
  });
});

describe("exportações de relatório (só administração)", () => {
  const exportacao = (id, extra = {}) => ({
    id, relatorio: "Receita e inadimplência", periodo: "Últimos 30 dias", por: "Walber Silva",
    criadoEm: `2026-09-14T10:0${id}:00.000Z`, ...extra,
  });

  it("o administrador registra e lê, com a mais recente primeiro; os outros perfis não gravam nem veem", async () => {
    const { gravar, ler } = await ambiente();
    assert.equal((await gravar("admin", "exportacoes", exportacao(1))).statusCode, 200);
    assert.equal((await gravar("admin", "exportacoes", exportacao(2))).statusCode, 200);
    assert.deepEqual(corpo(await ler("admin")).exportacoes.map((e) => e.id), [2, 1]);
    for (const quem of ["aluno", "recep", "instrutor"]) {
      assert.equal((await gravar(quem, "exportacoes", exportacao(3))).statusCode, 403, quem);
      assert.deepEqual(corpo(await ler(quem)).exportacoes, [], quem);
    }
  });

  it("recusa campo desconhecido e valor inválido", async () => {
    const { gravar } = await ambiente();
    assert.equal((await gravar("admin", "exportacoes", exportacao(1, { arquivo: "x.pdf" }))).statusCode, 400);
    assert.equal((await gravar("admin", "exportacoes", exportacao(1, { periodo: "" }))).statusCode, 400);
  });
});

describe("o aluno paga a própria parcela pelo Pix", () => {
  const pagaPeloApp = (id, nome) => ({ ...pagamento(id, nome), pago: true, atraso: false, forma: "Pix", origem: "App", pagoEm: "14/09/2026" });

  it("marca a própria parcela em aberto como paga e o cadastro vira Em dia", async () => {
    const { db, gravar, ler } = await ambiente();
    await gravar("recep", "alunos", aluno(1, "Pedro Makson", "Carla Menezes", { fin: "Pendente" }));
    assert.equal((await gravar("aluno", "pagamentos", pagaPeloApp(1, "Pedro Makson"))).statusCode, 200);
    const p = corpo(await ler("aluno")).pagamentos[0];
    assert.deepEqual([p.pago, p.forma, p.origem], [true, "Pix", "App"]);
    assert.equal(COLECOES.alunos.deItem(db.tabelas.pessoas.get(JSON.stringify(["A#1"]))).fin, "Em dia");
  });

  it("sobrando só parcela dentro do prazo o cadastro fica Em dia; sobrando parcela vencida, Atrasado", async () => {
    const { db, gravar } = await ambiente();
    const fin = () => COLECOES.alunos.deItem(db.tabelas.pessoas.get(JSON.stringify(["A#1"]))).fin;
    await gravar("recep", "alunos", aluno(1, "Pedro Makson", "Carla Menezes", { fin: "Pendente" }));
    await gravar("recep", "pagamentos", pagamento(7, "Pedro Makson"));
    await gravar("aluno", "pagamentos", pagaPeloApp(1, "Pedro Makson"));
    assert.equal(fin(), "Em dia");

    await gravar("recep", "pagamentos", { ...pagamento(8, "Pedro Makson"), venc: "01/09/2026", atraso: true });
    await gravar("recep", "pagamentos", pagamento(9, "Pedro Makson"));
    await gravar("aluno", "pagamentos", pagaPeloApp(9, "Pedro Makson"));
    assert.equal(fin(), "Atrasado");
  });

  it("quem fica em dia volta a ter acesso e perde o alerta de atraso, seja qual for o perfil que registra o pagamento", async () => {
    const quemPaga = {
      aluno: (id, nome) => ({ ...pagaPeloApp(id, nome), venc: "05/09/2026" }),
      recep: (id, nome) => ({ ...pagamento(id, nome), venc: "05/09/2026", pago: true, atraso: false, forma: "Dinheiro", origem: "Recepção", pagoEm: "14/09/2026" }),
      admin: (id, nome) => ({ ...pagamento(id, nome), venc: "05/09/2026", pago: true, atraso: false, forma: "Cartão", origem: "Recepção", pagoEm: "14/09/2026" }),
    };
    for (const [perfil, montar] of Object.entries(quemPaga)) {
      const { db, gravar } = await ambiente();
      const cadastro = () => COLECOES.alunos.deItem(db.tabelas.pessoas.get(JSON.stringify(["A#1"])));
      await gravar("admin", "alunos", aluno(1, "Pedro Makson", "Carla Menezes", { fin: "Atrasado", ativo: false, alerta: "Mensalidade atrasada" }));
      await gravar("recep", "pagamentos", { ...pagamento(1, "Pedro Makson"), venc: "05/09/2026", atraso: true });
      assert.equal((await gravar(perfil, "pagamentos", montar(1, "Pedro Makson"))).statusCode, 200, perfil);
      assert.deepEqual([cadastro().fin, cadastro().ativo, cadastro().alerta], ["Em dia", true, ""], perfil);
    }
  });

  it("aluno com matrícula cancelada continua sem acesso mesmo pagando a parcela vencida", async () => {
    const { db, gravar } = await ambiente();
    const cadastro = () => COLECOES.alunos.deItem(db.tabelas.pessoas.get(JSON.stringify(["A#1"])));
    const cancelamento = { em: "2026-09-14", motivo: "Mudou de cidade", por: "Júlia Alves" };
    await gravar("admin", "alunos", aluno(1, "Pedro Makson", "Carla Menezes", { fin: "Atrasado", ativo: false, cancelamento }));
    await gravar("recep", "pagamentos", { ...pagamento(1, "Pedro Makson"), venc: "05/09/2026", atraso: true });
    await gravar("recep", "pagamentos", { ...pagamento(1, "Pedro Makson"), venc: "05/09/2026", pago: true, atraso: false, forma: "Pix", origem: "Recepção", pagoEm: "14/09/2026" });
    assert.deepEqual([cadastro().fin, cadastro().ativo], ["Em dia", false]);
  });

  it("pagar uma parcela enquanto outra continua vencida não libera o acesso", async () => {
    const { db, gravar } = await ambiente();
    const cadastro = () => COLECOES.alunos.deItem(db.tabelas.pessoas.get(JSON.stringify(["A#1"])));
    await gravar("admin", "alunos", aluno(1, "Pedro Makson", "Carla Menezes", { fin: "Atrasado", ativo: false }));
    await gravar("recep", "pagamentos", { ...pagamento(1, "Pedro Makson"), venc: "05/08/2026", atraso: true });
    await gravar("recep", "pagamentos", { ...pagamento(2, "Pedro Makson"), venc: "05/09/2026", atraso: true });
    await gravar("recep", "pagamentos", { ...pagamento(1, "Pedro Makson"), venc: "05/08/2026", pago: true, atraso: false, forma: "Dinheiro", origem: "Recepção", pagoEm: "14/09/2026" });
    assert.deepEqual([cadastro().fin, cadastro().ativo], ["Atrasado", false]);
  });

  it("não paga parcela de outro aluno, nem cria parcela, nem paga duas vezes", async () => {
    const { gravar } = await ambiente();
    assert.equal((await gravar("aluno", "pagamentos", pagaPeloApp(2, "Ana Lima"))).statusCode, 403);
    assert.equal((await gravar("aluno", "pagamentos", pagaPeloApp(99, "Pedro Makson"))).statusCode, 403);
    assert.equal((await gravar("aluno", "pagamentos", pagaPeloApp(1, "Pedro Makson"))).statusCode, 200);
    assert.equal((await gravar("aluno", "pagamentos", pagaPeloApp(1, "Pedro Makson"))).statusCode, 409);
  });

  it("só pode mudar o pagamento, não o valor, o vencimento nem a forma", async () => {
    const { gravar } = await ambiente();
    const base = pagaPeloApp(1, "Pedro Makson");
    assert.equal((await gravar("aluno", "pagamentos", { ...base, valor: "R$ 1,00" })).statusCode, 400);
    assert.equal((await gravar("aluno", "pagamentos", { ...base, venc: "01/01/2030" })).statusCode, 400);
    assert.equal((await gravar("aluno", "pagamentos", { ...base, forma: "Dinheiro" })).statusCode, 400);
    assert.equal((await gravar("aluno", "pagamentos", { ...base, origem: "Recepção" })).statusCode, 400);
    assert.equal((await gravar("aluno", "pagamentos", { ...base, pago: false })).statusCode, 400);
  });

  it("instrutor continua sem acesso aos pagamentos", async () => {
    const { gravar } = await ambiente();
    assert.equal((await gravar("instrutor", "pagamentos", pagaPeloApp(1, "Pedro Makson"))).statusCode, 403);
  });
});

describe("matrículas e parcelas", () => {
  const matricula = { id: "2026-0242", alunoId: 1, plano: "Trimestral", fim: "02/12/2026", matriculaAnterior: "2026-0142", situacao: "ATIVA" };

  it("recepção e administração gravam matrículas; instrutor e aluno não", async () => {
    const { gravar, db } = await ambiente();
    assert.equal((await gravar("recep", "matriculas", matricula)).statusCode, 200);
    assert.equal((await gravar("admin", "matriculas", { ...matricula, id: "2026-0243" })).statusCode, 200);
    assert.equal((await gravar("instrutor", "matriculas", matricula)).statusCode, 403);
    assert.equal((await gravar("aluno", "matriculas", matricula)).statusCode, 403);
    const guardada = db.tabelas.matriculas.get(JSON.stringify(["2026-0242"]));
    assert.equal(guardada.alunoId, "1"); // texto: é chave do índice por-aluno
  });

  it("matrículas (com o cancelamento) vão para recepção e administração; instrutor e aluno não as recebem", async () => {
    const { gravar, ler } = await ambiente();
    const cancelada = { ...matricula, id: "2026-0300", situacao: "CANCELADA", canceladaEm: "2026-09-14", motivo: "Mudou de cidade", multa: "R$ 34,90" };
    assert.equal((await gravar("recep", "matriculas", cancelada)).statusCode, 200);
    assert.equal((await gravar("admin", "matriculas", matricula)).statusCode, 200);
    for (const quem of ["admin", "recep"]) {
      const lista = corpo(await ler(quem)).matriculas;
      assert.deepEqual(lista.map((m) => m.id), ["2026-0242", "2026-0300"], quem);
      assert.deepEqual([lista[1].situacao, lista[1].canceladaEm, lista[1].multa, lista[1].alunoId], ["CANCELADA", "2026-09-14", "R$ 34,90", 1], quem);
    }
    for (const quem of ["instrutor", "aluno"]) assert.deepEqual(corpo(await ler(quem)).matriculas, [], quem);
  });

  it("o cadastro do aluno guarda o cancelamento, com data, motivo e quem cancelou", async () => {
    const { db, gravar } = await ambiente();
    const cancelamento = { em: "2026-09-14", motivo: "Mudou de cidade", por: "Júlia Alves" };
    assert.equal((await gravar("recep", "alunos", aluno(1, "Pedro Makson", "Carla Menezes", { ativo: false, cancelamento }))).statusCode, 200);
    assert.deepEqual(COLECOES.alunos.deItem(db.tabelas.pessoas.get(JSON.stringify(["A#1"]))).cancelamento, cancelamento);
    for (const ruim of [{ ...cancelamento, em: "14/09/2026" }, { ...cancelamento, motivo: "" }, { ...cancelamento, extra: 1 }]) {
      assert.equal((await gravar("recep", "alunos", aluno(1, "Pedro Makson", "Carla Menezes", { cancelamento: ruim }))).statusCode, 400);
    }
  });

  it("valida a matrícula", async () => {
    const { gravar } = await ambiente();
    for (const doc of [{ ...matricula, id: "2026" }, { ...matricula, situacao: "TALVEZ" }, { ...matricula, fim: "2026-12-02" }]) {
      assert.equal((await gravar("recep", "matriculas", doc, { id: doc.id })).statusCode, 400);
    }
  });

  it("recepção apaga parcela em aberto; parcela paga, não", async () => {
    const { gravar, apagar, ler } = await ambiente();
    await gravar("recep", "pagamentos", { ...pagamento(5, "Pedro Makson"), pago: true, pagoEm: "14/09/2026", forma: "Pix", origem: "Recepção" });
    assert.equal((await apagar("recep", "pagamentos", 1)).statusCode, 200);
    assert.equal((await apagar("recep", "pagamentos", 5)).statusCode, 409);
    assert.equal((await apagar("recep", "pagamentos", 99)).statusCode, 404);
    assert.deepEqual(ids(corpo(await ler("admin")).pagamentos), [2, 5]);
  });

  it("só atendimento apaga, e só parcelas", async () => {
    const { apagar } = await ambiente();
    assert.equal((await apagar("aluno", "pagamentos", 1)).statusCode, 403);
    assert.equal((await apagar("instrutor", "pagamentos", 1)).statusCode, 403);
    assert.equal((await apagar("admin", "planos", 1)).statusCode, 404);
    assert.equal((await apagar("admin", "alunos", 1)).statusCode, 404);
  });
});

describe("falhas", () => {
  it("erro do banco vira 500 sem vazar detalhes", async () => {
    const { db, ler, gravar } = await ambiente();
    db.falhar = true;
    for (const r of [await ler("admin"), await gravar("admin", "planos", { ...plano, id: 5 })]) {
      assert.equal(r.statusCode, 500);
      assert.ok(!r.body.includes("segredo"));
    }
  });

  it("método não previsto é 405", async () => {
    const { h } = await ambiente();
    const r = await h({ requestContext: { http: { method: "PATCH" }, authorizer: { jwt: { claims: CLAIMS.admin } } } });
    assert.equal(r.statusCode, 405);
  });

  it("validar() é o mesmo critério usado na rota", () => {
    assert.equal(validar("planos", plano), null);
    assert.match(validar("planos", { ...plano, ativos: -1 }), /ativos/);
  });
});
