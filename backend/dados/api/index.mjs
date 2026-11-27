// API de dados do GymFlow: lê e grava nas tabelas DynamoDB do projeto (alunos, equipe, planos, pagamentos, check-ins).
//
//   GET    /dados                   tudo o que o perfil de quem chama pode ver
//   PUT    /dados/{colecao}/{id}    cria ou altera um documento (validado e conferido contra o perfil)
//   DELETE /dados/pagamentos/{id}   apaga uma parcela AINDA EM ABERTO (a troca de plano substitui as parcelas)
//
// Está atrás da HTTP API com JWT authorizer do Cognito: quando esta Lambda roda, o token já foi validado e os claims
// (sub, email, cognito:groups) vêm em event.requestContext.authorizer.jwt.claims. O perfil de acesso é o GRUPO do
// Cognito; a ligação entre o login e o cadastro (qual aluno, qual instrutor) é o atributo `loginEmails` de cada pessoa,
// gravado só pela carga inicial e nunca aceito pela API.
//
// Os documentos têm o mesmo formato que o app usa (src/data/store.tsx); aqui eles ganham só as chaves das tabelas.
// Quem pode o quê:
//   Administrador   tudo
//   Recepcionista   lê alunos, pagamentos, planos e check-ins; grava alunos, pagamentos, matrículas e check-ins
//   Instrutor       lê os alunos que ele acompanha, os check-ins, treinos, avaliações e observações deles;
//                   grava treinos, avaliações e observações só desses alunos
//   Aluno           lê o que é dele (cadastro, pagamentos, check-ins, treino e avaliações; as observações do instrutor
//                   não); grava os próprios check-ins e marca como paga, via Pix, uma parcela sua em aberto

const PERFIS = ["Aluno", "Instrutor", "Recepcionista", "Administrador"];
const ATENDIMENTO = ["Recepcionista", "Administrador"];
const ACOMPANHAMENTO = ["treinos", "avaliacoes", "observacoes"]; // o que o instrutor registra sobre o aluno

const json = (statusCode, corpo) => ({
  statusCode,
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify(corpo),
});

// ---------------------------------------------------------------- validação

const texto = (max, { vazio = false } = {}) => (v) =>
  typeof v === "string" && v.length <= max && (vazio || v.trim() !== "");
const inteiro = (v) => Number.isSafeInteger(v) && v > 0;
const booleano = (v) => typeof v === "boolean";
const dataBr = (v) => typeof v === "string" && /^\d{2}\/\d{2}\/\d{4}$/.test(v);
const dataIso = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
const opcao = (...valores) => (v) => valores.includes(v);
const email = (v) => typeof v === "string" && /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(v);
const objeto = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const endereco = (v) =>
  objeto(v) &&
  Object.keys(v).every((k) => ["cep", "logradouro", "numero", "complemento", "bairro", "cidade", "uf"].includes(k)) &&
  Object.values(v).every((x) => typeof x === "string" && x.length <= 120);
const SEXOS = ["Feminino", "Masculino", "Outro", "Prefiro não informar", ""];
const numero = (min, max) => (v) => typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
const exercicio = (v) =>
  objeto(v) &&
  Object.keys(v).sort().join() === "carga,nome,reps,series" &&
  texto(80)(v.nome) &&
  texto(14, { vazio: true })(v.carga) &&
  texto(10, { vazio: true })(v.reps) &&
  texto(8, { vazio: true })(v.series);

// campo: [teste, obrigatório]. Campo que não está na lista é recusado (ninguém grava loginEmails, pessoaId etc.).
const CAMPOS = {
  alunos: {
    id: [inteiro, true],
    nome: [texto(120), true],
    email: [email, true],
    tel: [texto(30, { vazio: true }), true],
    plano: [texto(60), true],
    instrutor: [texto(120), true],
    fim: [dataBr, true],
    fin: [opcao("Em dia", "Pendente", "Atrasado"), true],
    ultimo: [texto(40, { vazio: true }), true],
    alerta: [texto(80, { vazio: true }), true],
    checkin: [booleano, true],
    matricula: [texto(20), true],
    matriculaAnterior: [texto(20, { vazio: true }), true],
    ativo: [booleano, true],
    // matrícula cancelada (aluno que sai): quando, por quê e quem cancelou; some se ele voltar com uma nova matrícula
    cancelamento: [
      (v) => objeto(v) && dataIso(v.em) && texto(300)(v.motivo) && texto(120)(v.por) && Object.keys(v).length === 3,
      false,
    ],
    endereco: [endereco, false],
    cpf: [texto(14), false],
    nascimento: [dataIso, false],
    sexo: [opcao(...SEXOS), false],
  },
  usuarios: {
    id: [inteiro, true],
    nome: [texto(120), true],
    email: [email, true],
    tel: [texto(30, { vazio: true }), true],
    perfil: [opcao(...PERFIS), true],
    ativo: [booleano, true],
    endereco: [endereco, false],
    cpf: [texto(14), false],
    nascimento: [dataIso, false],
    sexo: [opcao(...SEXOS), false],
    admissao: [dataIso, false],
  },
  planos: {
    id: [inteiro, true],
    nome: [texto(60), true],
    valor: [texto(20), true],
    duracao: [texto(20), true],
    ativos: [(v) => Number.isSafeInteger(v) && v >= 0, true],
    regra: [texto(200, { vazio: true }), true],
  },
  pagamentos: {
    id: [inteiro, true],
    nome: [texto(120), true],
    plano: [texto(60), true],
    venc: [dataBr, true],
    valor: [(v) => typeof v === "string" && /^R\$ [\d.]+,\d{2}$/.test(v), true],
    parcela: [texto(10), false],
    pago: [booleano, true],
    atraso: [booleano, true],
    pagoEm: [dataBr, false],
    forma: [texto(20), false],
    origem: [texto(20), false],
  },
  matriculas: {
    id: [(v) => typeof v === "string" && /^\d{4}-\d{4}$/.test(v), true],
    alunoId: [inteiro, true],
    plano: [texto(60), true],
    fim: [dataBr, true],
    matriculaAnterior: [texto(20, { vazio: true }), false],
    situacao: [opcao("ATIVA", "VENCIDA", "CANCELADA"), true],
    // só nas canceladas por saída do aluno (a troca de plano também marca CANCELADA, sem estes campos)
    canceladaEm: [dataIso, false],
    motivo: [texto(300), false],
    multa: [texto(20), false],
  },
  treinos: {
    id: [(v) => typeof v === "string" && /^\d+-[ABC]$/.test(v), true],
    alunoId: [inteiro, true],
    divisao: [opcao("A", "B", "C"), true],
    titulo: [texto(60), true],
    exercicios: [(v) => Array.isArray(v) && v.length <= 30 && v.every(exercicio), true],
    atualizadoPor: [texto(120), true],
    atualizadoEm: [texto(40), true],
  },
  avaliacoes: {
    id: [inteiro, true],
    alunoId: [inteiro, true],
    data: [dataIso, true],
    instrutor: [texto(120), true],
    peso: [numero(20, 400), true],
    altura: [numero(0.5, 2.8), true],
    gordura: [numero(1, 70), false],
    cintura: [numero(20, 300), false],
    obs: [texto(500, { vazio: true }), false],
  },
  observacoes: {
    id: [inteiro, true],
    alunoId: [inteiro, true],
    texto: [texto(500), true],
    instrutor: [texto(120), true],
    criadoEm: [texto(40), true],
  },
  // notificações que o usuário já leu (o texto é calculado pelo app; a tabela guarda o "lida" de cada pessoa)
  notificacoes: {
    id: [inteiro, true],
    tipo: [texto(30), true],
    texto: [texto(300), true],
    lidoEm: [texto(40), true],
  },
  exportacoes: {
    id: [inteiro, true],
    relatorio: [texto(60), true],
    periodo: [texto(30), true],
    por: [texto(120), true],
    criadoEm: [texto(40), true],
    formato: [opcao("PDF", "Excel"), false],
  },
  checkins: {
    id: [inteiro, true],
    alunoId: [inteiro, true],
    data: [dataIso, true],
    hora: [(v) => typeof v === "string" && /^(\d{2}:\d{2})?$/.test(v), true],
    origem: [opcao("App", "Recepção", "Retroativo"), true],
    registradoPor: [texto(120), true],
    perfilRegistro: [opcao("Aluno", "Recepcionista", "Administrador"), true],
    registradoEm: [texto(40), true],
    motivo: [texto(300), false],
    cancelado: [
      (v) => objeto(v) && texto(160)(v.por) && texto(40)(v.em) && texto(300)(v.motivo) && Object.keys(v).length === 3,
      false,
    ],
  },
};

export function validar(colecao, doc) {
  if (!objeto(doc)) return "Corpo inválido: envie o documento em JSON.";
  const regras = CAMPOS[colecao];
  for (const campo of Object.keys(doc)) {
    if (!(campo in regras)) return `Campo não permitido: ${campo}.`;
  }
  for (const [campo, [teste, obrigatorio]] of Object.entries(regras)) {
    if (doc[campo] === undefined) {
      if (obrigatorio) return `Campo obrigatório: ${campo}.`;
    } else if (!teste(doc[campo])) {
      return `Valor inválido em ${campo}.`;
    }
  }
  if (colecao === "treinos" && doc.id !== `${doc.alunoId}-${doc.divisao}`) {
    return "O id do treino deve ser aluno-divisão (ex.: 1-A).";
  }
  return null;
}

// ---------------------------------------------------------------- coleções <-> tabelas

const tirar = (item, campos) => Object.fromEntries(Object.entries(item).filter(([k]) => !campos.includes(k)));

// `chave` e `paraItem` montam o item da tabela; `deItem` devolve o documento no formato do app.
export const COLECOES = {
  alunos: {
    tabela: "pessoas",
    chave: (d) => ({ pessoaId: `A#${d.id}` }),
    paraItem: (d) => ({ ...d, pessoaId: `A#${d.id}`, colecao: "alunos", perfil: "Aluno" }),
    deItem: (i) => tirar(i, ["pessoaId", "colecao", "perfil", "loginEmails"]),
  },
  usuarios: {
    tabela: "pessoas",
    chave: (d) => ({ pessoaId: `U#${d.id}` }),
    paraItem: (d) => ({ ...d, pessoaId: `U#${d.id}`, colecao: "usuarios" }),
    deItem: (i) => tirar(i, ["pessoaId", "colecao", "loginEmails"]),
  },
  planos: {
    tabela: "planos",
    chave: (d) => ({ planoId: String(d.id) }),
    paraItem: (d) => ({ ...d, planoId: String(d.id) }),
    deItem: (i) => tirar(i, ["planoId"]),
  },
  pagamentos: {
    tabela: "pagamentos",
    chave: (d) => ({ pagamentoId: String(d.id) }),
    paraItem: (d) => ({ ...d, pagamentoId: String(d.id) }),
    deItem: (i) => tirar(i, ["pagamentoId"]),
  },
  matriculas: {
    tabela: "matriculas",
    chave: (d) => ({ matriculaId: d.id }),
    // alunoId vira texto porque é chave do índice por-aluno
    paraItem: (d) => ({ ...d, matriculaId: d.id, alunoId: String(d.alunoId) }),
    deItem: (i) => ({ ...tirar(i, ["matriculaId"]), alunoId: Number(i.alunoId) }),
  },
  treinos: {
    tabela: "treinos",
    chave: (d) => ({ alunoId: String(d.alunoId), divisao: d.divisao }),
    paraItem: (d) => ({ ...d, alunoId: String(d.alunoId) }),
    deItem: (i) => ({ ...i, alunoId: Number(i.alunoId) }),
  },
  avaliacoes: {
    tabela: "avaliacoes",
    chave: (d) => ({ alunoId: String(d.alunoId), dataId: `${d.data}#${d.id}` }),
    paraItem: (d) => ({ ...d, alunoId: String(d.alunoId), dataId: `${d.data}#${d.id}` }),
    deItem: (i) => ({ ...tirar(i, ["dataId"]), alunoId: Number(i.alunoId) }),
  },
  observacoes: {
    tabela: "observacoes",
    chave: (d) => ({ alunoId: String(d.alunoId), criadoEm: d.criadoEm }),
    paraItem: (d) => ({ ...d, alunoId: String(d.alunoId) }),
    deItem: (i) => ({ ...i, alunoId: Number(i.alunoId) }),
  },
  notificacoes: {
    tabela: "notificacoes",
    // `destino` é posto pelo servidor (usuario#<e-mail do login>): cada pessoa só lê e grava as próprias
    chave: (d) => ({ destino: d.destino, criadoEm: d.lidoEm }),
    paraItem: (d) => ({ ...d, criadoEm: d.lidoEm, lida: true }),
    deItem: (i) => tirar(i, ["destino", "criadoEm", "lida"]),
  },
  exportacoes: {
    tabela: "exportacoes",
    chave: (d) => ({ relatorio: d.relatorio, criadoEm: d.criadoEm }),
    paraItem: (d) => ({ ...d }),
    deItem: (i) => ({ ...i }),
  },
  checkins: {
    tabela: "checkins",
    chave: (d) => ({ alunoId: String(d.alunoId), dataId: `${d.data}#${d.id}` }),
    paraItem: (d) => ({ ...d, alunoId: String(d.alunoId), dataId: `${d.data}#${d.id}` }),
    deItem: (i) => ({ ...tirar(i, ["dataId"]), alunoId: Number(i.alunoId) }),
  },
};

// ---------------------------------------------------------------- quem está chamando

// O API Gateway entrega a lista de grupos como texto ("[Aluno]") ou como lista; vale o primeiro perfil conhecido.
export function perfilDoToken(claims) {
  const bruto = claims["cognito:groups"];
  const grupos = Array.isArray(bruto) ? bruto : String(bruto ?? "").split(/[\s,[\]"]+/);
  return grupos.find((g) => PERFIS.includes(g)) ?? null;
}

const minusculo = (v) => String(v ?? "").toLowerCase();

async function identificar(db, claims, perfil) {
  const pessoas = await db.scan("pessoas");
  const login = minusculo(claims.email);
  const meus = pessoas.filter((i) => (i.loginEmails ?? []).some((e) => minusculo(e) === login));
  const usuario = meus.find((i) => i.colecao === "usuarios");
  const aluno = meus.find((i) => i.colecao === "alunos");
  return {
    perfil,
    destino: `usuario#${login}`,
    nome: usuario?.nome ?? aluno?.nome,
    alunoId: aluno?.id,
    usuarioId: usuario?.id,
    pessoas,
  };
}

// ---------------------------------------------------------------- leitura

// o DynamoDB devolve os itens fora de ordem: as telas esperam a ordem de cadastro (id crescente)
const porId = (a, b) => a.id - b.id;

function visaoDe(ator, { pessoas, planos, pagamentos, checkins, treinos, avaliacoes, observacoes, exportacoes = [], notificacoes = [], matriculas = [] }) {
  const alunos = pessoas.filter((i) => i.colecao === "alunos").map(COLECOES.alunos.deItem).sort(porId);
  const usuarios = pessoas.filter((i) => i.colecao === "usuarios").map(COLECOES.usuarios.deItem).sort(porId);
  const docsPlanos = planos.map(COLECOES.planos.deItem).sort(porId);
  const docsPagamentos = pagamentos.map(COLECOES.pagamentos.deItem).sort(porId);
  const docsCheckins = checkins.map(COLECOES.checkins.deItem).sort(porId);
  const docsTreinos = treinos.map(COLECOES.treinos.deItem).sort((a, b) => a.alunoId - b.alunoId || a.divisao.localeCompare(b.divisao));
  const docsAvaliacoes = avaliacoes.map(COLECOES.avaliacoes.deItem).sort(porId);
  const docsObservacoes = observacoes.map(COLECOES.observacoes.deItem).sort(porId);
  const docsMatriculas = matriculas.map(COLECOES.matriculas.deItem).sort((a, b) => a.id.localeCompare(b.id));
  const docsNotificacoes = notificacoes.filter((n) => n.destino === ator.destino).map(COLECOES.notificacoes.deItem).sort(porId);
  // mais recentes primeiro
  const docsExportacoes = exportacoes.map(COLECOES.exportacoes.deItem).sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));

  const proprio = (lista) => lista.filter((u) => u.id === ator.usuarioId);
  switch (ator.perfil) {
    case "Administrador":
      return {
        alunos,
        usuarios,
        planos: docsPlanos,
        pagamentos: docsPagamentos,
        checkins: docsCheckins,
        treinos: docsTreinos,
        avaliacoes: docsAvaliacoes,
        observacoes: docsObservacoes,
        exportacoes: docsExportacoes,
        notificacoes: docsNotificacoes,
        matriculas: docsMatriculas,
      };
    case "Recepcionista":
      return {
        alunos,
        usuarios: proprio(usuarios),
        planos: docsPlanos,
        pagamentos: docsPagamentos,
        checkins: docsCheckins,
        treinos: [],
        avaliacoes: [],
        observacoes: [],
        exportacoes: [],
        notificacoes: docsNotificacoes,
        matriculas: docsMatriculas,
      };
    case "Instrutor": {
      const meusAlunos = alunos.filter((a) => a.instrutor === ator.nome);
      const ids = new Set(meusAlunos.map((a) => a.id));
      const deles = (lista) => lista.filter((d) => ids.has(d.alunoId));
      return {
        alunos: meusAlunos,
        usuarios: proprio(usuarios),
        planos: docsPlanos,
        pagamentos: [],
        checkins: deles(docsCheckins),
        treinos: deles(docsTreinos),
        avaliacoes: deles(docsAvaliacoes),
        observacoes: deles(docsObservacoes),
        exportacoes: [],
        notificacoes: docsNotificacoes,
        matriculas: [],
      };
    }
    default: {
      const eu = alunos.filter((a) => a.id === ator.alunoId);
      const meus = (lista) => lista.filter((d) => d.alunoId === ator.alunoId);
      return {
        alunos: eu,
        usuarios: proprio(usuarios),
        planos: docsPlanos,
        pagamentos: docsPagamentos.filter((p) => eu.some((a) => a.nome === p.nome)),
        checkins: meus(docsCheckins),
        treinos: meus(docsTreinos),
        avaliacoes: meus(docsAvaliacoes),
        observacoes: [], // as observações são do instrutor
        exportacoes: [],
        notificacoes: docsNotificacoes,
        matriculas: [],
      };
    }
  }
}

// ---------------------------------------------------------------- escrita

const CAMPOS_FIXOS_DO_CHECKIN = ["id", "alunoId", "data", "hora", "origem", "registradoPor", "perfilRegistro", "registradoEm", "motivo"];

// O Pix do app é simulado: o aluno só pode virar a parcela DELE, ainda em aberto, para "paga via Pix pelo app" (num
// sistema real, quem confirmaria seria o provedor de pagamento). Nenhum outro campo da parcela muda.
async function conferirPagamentoDoAluno(db, ator, doc) {
  const atual = await db.get("pagamentos", COLECOES.pagamentos.chave(doc));
  if (!atual || atual.nome !== ator.nome) return [403, "Você só pode pagar as suas próprias parcelas."];
  if (atual.pago) return [409, "Essa parcela já está paga."];
  const livres = ["pagamentoId", "pago", "atraso", "forma", "origem", "pagoEm"];
  const resto = Object.keys(atual).filter((k) => !livres.includes(k));
  const intacto = resto.every((k) => atual[k] === doc[k]) && Object.keys(doc).every((k) => livres.includes(k) || k in atual);
  if (!intacto) return [400, "O aluno só pode marcar a parcela como paga."];
  if (doc.pago !== true || doc.atraso !== false || doc.forma !== "Pix" || doc.origem !== "App" || !doc.pagoEm) {
    return [400, "O aluno só pode pagar pelo Pix do app."];
  }
  return null;
}

function podeGravar(ator, colecao) {
  if (colecao === "pagamentos" && ator.perfil === "Aluno") return ator.alunoId !== undefined;
  if (colecao === "notificacoes") return true; // cada um marca as próprias como lidas
  if (colecao === "usuarios" || colecao === "planos" || colecao === "exportacoes") return ator.perfil === "Administrador";
  if (colecao === "alunos" || colecao === "pagamentos" || colecao === "matriculas") return ATENDIMENTO.includes(ator.perfil);
  if (ACOMPANHAMENTO.includes(colecao)) return ator.perfil === "Instrutor" || ator.perfil === "Administrador";
  return ATENDIMENTO.includes(ator.perfil) || (ator.perfil === "Aluno" && ator.alunoId !== undefined);
}

// Regras do check-in que não dependem só do formato: dono, quem registrou, remoção sem apagar, um por dia.
async function conferirCheckin(db, ator, doc) {
  if (ator.perfil === "Aluno" && doc.alunoId !== ator.alunoId) return [403, "Você só pode mexer nos seus check-ins."];

  const daquele = (await db.query("checkins", "alunoId", String(doc.alunoId))).map(COLECOES.checkins.deItem);
  const atual = daquele.find((i) => i.id === doc.id);

  if (!atual) {
    if (doc.cancelado) return [400, "Um check-in novo não pode nascer removido."];
    if (doc.perfilRegistro !== ator.perfil) return [403, "O perfil do registro não é o seu."];
    if (daquele.some((i) => i.data === doc.data && !i.cancelado)) {
      return [409, "Esse aluno já tem check-in nesse dia."];
    }
    return null;
  }

  if (atual.data !== doc.data) return [400, "A data de um check-in não pode mudar."];
  if (CAMPOS_FIXOS_DO_CHECKIN.some((c) => atual[c] !== doc[c])) return [400, "Só a remoção de um check-in pode ser registrada."];
  if (atual.cancelado) return [409, "Esse check-in já foi removido."];
  if (!doc.cancelado) return [400, "Informe a remoção do check-in."];
  if (!doc.cancelado.por.endsWith(`(${ator.perfil})`)) return [403, "A remoção deve ser registrada em nome de quem a fez."];
  return null;
}

// O cadastro do aluno guarda "fez check-in hoje" e "último check-in". Quem derruba isso é o servidor, na hora de gravar
// ou remover um check-in do dia, porque o aluno (que faz o próprio check-in) não pode gravar o próprio cadastro.
async function atualizarMarcasDoAluno(db, alunoId, marcas) {
  const chave = { pessoaId: `A#${alunoId}` };
  const aluno = await db.get("pessoas", chave);
  if (!aluno) return;
  const novo = { ...aluno, ...marcas };
  // quem acabou de fazer check-in deixa de ter o alerta "Sem check-in há N dias"
  if (marcas.ultimo === "hoje" && /^sem check-in/i.test(aluno.alerta ?? "")) novo.alerta = "";
  await db.put("pessoas", novo);
}

// Depois de uma parcela paga: com parcela ainda vencida o aluno fica "Atrasado"; sem nenhuma, fica "Em dia", o acesso é
// liberado (quem estava bloqueado por inadimplência volta a entrar, não importa quem registrou o pagamento) e o alerta
// de mensalidade atrasada sai.
async function acertarCadastroDepoisDoPagamento(db, nome) {
  const abertas = (await db.scan("pagamentos")).filter((p) => p.nome === nome && !p.pago);
  const atrasado = abertas.some((p) => p.atraso);
  const aluno = (await db.scan("pessoas")).find((p) => String(p.pessoaId).startsWith("A#") && p.nome === nome);
  if (!aluno) return;
  const novo = { ...aluno, fin: atrasado ? "Atrasado" : "Em dia" };
  if (!atrasado) {
    // matrícula cancelada não reabre o acesso: só uma nova matrícula (troca de plano) faz isso
    if (!aluno.cancelamento) novo.ativo = true;
    if (/^mensalidade atrasada/i.test(novo.alerta ?? "")) novo.alerta = "";
  }
  await db.put("pessoas", novo);
}

// Treino salvo pelo instrutor: o aluno deixa de ter o alerta "Treino desatualizado"
async function limparAlertaDeTreino(db, alunoId) {
  const chave = { pessoaId: `A#${alunoId}` };
  const aluno = await db.get("pessoas", chave);
  if (aluno && /^treino/i.test(aluno.alerta ?? "")) await db.put("pessoas", { ...aluno, alerta: "" });
}

// ---------------------------------------------------------------- entrada

export function criarHandler({ db }) {
  return async (event) => {
    const metodo = event.requestContext?.http?.method;
    const claims = event.requestContext?.authorizer?.jwt?.claims ?? {};
    if (typeof claims.sub !== "string" || !claims.sub) return json(401, { message: "Não autorizado." });
    const perfil = perfilDoToken(claims);
    if (!perfil) return json(403, { message: "Seu usuário não tem perfil de acesso." });

    try {
      const ator = await identificar(db, claims, perfil);

      if (metodo === "GET") {
        const [planos, pagamentos, checkins, treinos, avaliacoes, observacoes, exportacoes, notificacoes, matriculas] = await Promise.all([
          db.scan("planos"),
          db.scan("pagamentos"),
          db.scan("checkins"),
          db.scan("treinos"),
          db.scan("avaliacoes"),
          db.scan("observacoes"),
          db.scan("exportacoes"),
          db.scan("notificacoes"),
          db.scan("matriculas"),
        ]);
        const dados = visaoDe(ator, {
          pessoas: ator.pessoas,
          planos,
          pagamentos,
          checkins,
          treinos,
          avaliacoes,
          observacoes,
          exportacoes,
          notificacoes,
          matriculas,
        });
        return json(200, { ...dados, voce: { perfil, nome: ator.nome ?? null, alunoId: ator.alunoId ?? null } });
      }

      if (metodo === "DELETE") {
        const { colecao, id } = event.pathParameters ?? {};
        if (colecao !== "pagamentos") return json(404, { message: "Só é possível apagar parcelas em aberto." });
        if (!ATENDIMENTO.includes(ator.perfil)) return json(403, { message: "Seu perfil não pode alterar isto." });
        const chave = COLECOES.pagamentos.chave({ id });
        const atual = await db.get("pagamentos", chave);
        if (!atual) return json(404, { message: "Parcela não encontrada." });
        if (atual.pago) return json(409, { message: "Uma parcela paga não pode ser apagada." });
        await db.delete("pagamentos", chave);
        console.log("apagado", { colecao, id, perfil });
        return json(200, { ok: true });
      }

      if (metodo === "PUT") {
        const { colecao, id } = event.pathParameters ?? {};
        const def = COLECOES[colecao];
        if (!def) return json(404, { message: "Coleção desconhecida." });

        let doc;
        try {
          const bruto = event.body ?? "";
          doc = JSON.parse(event.isBase64Encoded ? Buffer.from(bruto, "base64").toString("utf8") : bruto);
        } catch {
          return json(400, { message: "Corpo inválido: envie um JSON." });
        }
        const problema = validar(colecao, doc);
        if (problema) return json(400, { message: problema });
        if (String(doc.id) !== id) return json(400, { message: "O id do endereço não confere com o do documento." });
        if (!podeGravar(ator, colecao)) return json(403, { message: "Seu perfil não pode alterar isto." });
        if (colecao === "notificacoes") doc.destino = ator.destino;

        // treino, avaliação e observação: o instrutor só mexe nos alunos que acompanha
        if (ACOMPANHAMENTO.includes(colecao)) {
          const alvo = await db.get("pessoas", { pessoaId: `A#${doc.alunoId}` });
          if (!alvo) return json(404, { message: "Aluno não encontrado." });
          if (ator.perfil === "Instrutor" && alvo.instrutor !== ator.nome) {
            return json(403, { message: "Esse aluno não é acompanhado por você." });
          }
        }

        let aposGravar = null;
        if (colecao === "pagamentos" && ator.perfil === "Aluno") {
          const recusa = await conferirPagamentoDoAluno(db, ator, doc);
          if (recusa) return json(recusa[0], { message: recusa[1] });
        }
        // depois de qualquer parcela paga (Pix do aluno, recepção ou administração), o cadastro do aluno é acertado
        if (colecao === "pagamentos" && doc.pago === true) aposGravar = () => acertarCadastroDepoisDoPagamento(db, doc.nome);

        let marcasDoAluno = null;
        if (colecao === "checkins") {
          const recusa = await conferirCheckin(db, ator, doc);
          if (recusa) return json(recusa[0], { message: recusa[1] });
          // check-in retroativo não mexe nas marcas de "hoje"
          if (doc.origem !== "Retroativo") {
            marcasDoAluno = doc.cancelado ? { checkin: false } : { checkin: true, ultimo: "hoje" };
          }
        }

        const item = def.paraItem(doc);
        // loginEmails é de quem carregou os dados: a API não deixa criar nem apagar a ligação entre login e cadastro
        const atual = await db.get(def.tabela, def.chave(doc));
        if (atual?.loginEmails) item.loginEmails = atual.loginEmails;
        await db.put(def.tabela, item);
        if (marcasDoAluno) await atualizarMarcasDoAluno(db, doc.alunoId, marcasDoAluno);
        if (colecao === "treinos") await limparAlertaDeTreino(db, doc.alunoId);
        if (aposGravar) await aposGravar();
        console.log("gravado", { colecao, id, perfil });
        return json(200, { ok: true });
      }

      return json(405, { message: "Método não permitido." });
    } catch (erro) {
      console.error("erro em /dados", { metodo, nome: erro?.name, mensagem: erro?.message });
      return json(500, { message: "Não foi possível processar o pedido agora. Tente novamente." });
    }
  };
}

// --- ligação com a AWS (só roda dentro da Lambda; os testes usam um banco em memória) ---

async function criarAdaptador() {
  const { DynamoDBClient } = await import("@aws-sdk/client-dynamodb");
  const { DeleteCommand, DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, ScanCommand } = await import(
    "@aws-sdk/lib-dynamodb"
  );
  const cliente = DynamoDBDocumentClient.from(new DynamoDBClient({}));
  const prefixo = process.env.TABLE_PREFIX ?? "pedromaksonfontesdacosta";
  const sufixo = process.env.TABLE_SUFFIX ?? "2026.2";
  const nome = (tabela) => `${prefixo}-${tabela}-${sufixo}`;

  return {
    async scan(tabela) {
      const itens = [];
      let inicio;
      do {
        const r = await cliente.send(new ScanCommand({ TableName: nome(tabela), ExclusiveStartKey: inicio }));
        itens.push(...(r.Items ?? []));
        inicio = r.LastEvaluatedKey;
      } while (inicio);
      return itens;
    },
    async query(tabela, atributo, valor) {
      const itens = [];
      let inicio;
      do {
        const r = await cliente.send(
          new QueryCommand({
            TableName: nome(tabela),
            KeyConditionExpression: "#p = :v",
            ExpressionAttributeNames: { "#p": atributo },
            ExpressionAttributeValues: { ":v": valor },
            ExclusiveStartKey: inicio,
          }),
        );
        itens.push(...(r.Items ?? []));
        inicio = r.LastEvaluatedKey;
      } while (inicio);
      return itens;
    },
    async get(tabela, chave) {
      return (await cliente.send(new GetCommand({ TableName: nome(tabela), Key: chave }))).Item ?? null;
    },
    async put(tabela, item) {
      await cliente.send(new PutCommand({ TableName: nome(tabela), Item: item }));
    },
    async delete(tabela, chave) {
      await cliente.send(new DeleteCommand({ TableName: nome(tabela), Key: chave }));
    },
  };
}

let padrao;
export const handler = async (event) => {
  padrao ??= criarHandler({ db: await criarAdaptador() });
  return padrao(event);
};
