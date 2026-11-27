import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../components/Toast";
import {
  apagarParcela,
  carregarDados,
  type Colecao,
  dadosConfigurada,
  type DadosDaNuvem,
  type Documento,
  gravarDocumento,
  type Matricula,
} from "../lib/dadosApi";
import { simularCancelamento } from "../lib/cancelamento";
import type { Endereco } from "../lib/endereco";
import type { Sexo } from "../lib/pessoa";
import {
  bloqueioDoAluno,
  type Checkin,
  checkinDoDia,
  inicioDaMatricula as calcularInicio,
  type PerfilRegistro,
  validarNovoCheckin,
} from "../lib/checkins";
import { HOJE_DEMO } from "../lib/datas";
import type { Exercicio } from "./aluno";
import {
  ALUNOS_INICIAL,
  AVALIACOES_INICIAL,
  EXPORTACOES_INICIAL,
  gerarCheckinsDemo,
  MATRICULAS_INICIAL,
  OBSERVACOES_INICIAL,
  PAGAMENTOS_INICIAL,
  PLANOS_INICIAL,
  TREINOS_INICIAL,
  USUARIOS_INICIAL,
} from "./demo";

export type Aluno = {
  id: number;
  nome: string;
  email: string;
  tel: string;
  plano: string;
  instrutor: string;
  fim: string; // vencimento da matrícula
  fin: "Em dia" | "Pendente" | "Atrasado";
  ultimo: string; // último check-in, texto livre
  alerta: string; // "" quando não precisa de atenção
  checkin: boolean; // já fez check-in hoje
  matricula: string;
  matriculaAnterior: string;
  ativo: boolean; // acesso liberado/bloqueado pelo admin ou por inadimplência
  cancelamento?: { em: string; motivo: string; por: string }; // matrícula cancelada (aluno que saiu); some com nova matrícula
  endereco?: Endereco;
  cpf?: string;
  nascimento?: string; // AAAA-MM-DD
  sexo?: Sexo | "";
};

export type Pagamento = {
  id: number;
  nome: string;
  plano: string;
  venc: string;
  valor: string;
  parcela?: string;
  pago: boolean;
  atraso: boolean;
  pagoEm?: string;
  forma?: string;
  origem?: string;
};

export type Usuario = {
  id: number;
  nome: string;
  email: string;
  tel: string;
  perfil: "Aluno" | "Instrutor" | "Recepcionista" | "Administrador";
  ativo: boolean;
  endereco?: Endereco;
  cpf?: string;
  nascimento?: string; // AAAA-MM-DD
  sexo?: Sexo | "";
  admissao?: string; // AAAA-MM-DD, só para a equipe
};

export type Plano = {
  id: number;
  nome: string;
  valor: string;
  duracao: string;
  ativos: number;
  regra: string;
};

// O que o instrutor registra sobre o aluno: o treino (uma ficha por divisão), as avaliações e as observações.
export type Divisao = "A" | "B" | "C";
export type Treino = {
  id: string; // "<alunoId>-<divisão>"
  alunoId: number;
  divisao: Divisao;
  titulo: string;
  exercicios: Exercicio[];
  atualizadoPor: string;
  atualizadoEm: string; // instante ISO
};
export type Avaliacao = {
  id: number;
  alunoId: number;
  data: string; // AAAA-MM-DD
  instrutor: string;
  peso: number; // kg
  altura: number; // m
  gordura?: number; // %
  cintura?: number; // cm
  obs?: string;
};
export type Observacao = {
  id: number;
  alunoId: number;
  texto: string;
  instrutor: string;
  criadoEm: string; // instante ISO
};


// Um PDF de relatório gerado pela administração (o histórico fica na tabela exportacoes).
export type Exportacao = {
  id: number;
  relatorio: string;
  periodo: string;
  por: string;
  criadoEm: string; // instante ISO
};

// Notificação que a pessoa já leu (o texto é calculado dos dados; a tabela notificacoes guarda o "lida" de cada pessoa).
export type NotificacaoLida = {
  id: number;
  tipo: string;
  texto: string;
  lidoEm: string; // instante ISO
};

export const brl = (n: number) =>
  "R$ " + n.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
export const valorNum = (v: string) =>
  Number(String(v).replace(/[^\d,]/g, "").replace(".", "").replace(",", ".")) || 0;
export const mesesPlano = (d: string) => parseInt(String(d), 10) || 1;
// As parcelas de um plano (valor dividido pela duração), uma por mês a partir de setembro/2026 no dia escolhido.
function gerarParcelas(nome: string, plano: Plano | undefined, dia: string): Pagamento[] {
  if (!plano || !dia) return [];
  const n = mesesPlano(plano.duracao);
  const valor = brl(valorNum(plano.valor) / n);
  const base = Date.now();
  return Array.from({ length: n }, (_, i) => ({
    id: base + i,
    nome,
    plano: plano.nome,
    venc: somaMes(dia, i + 1),
    valor,
    parcela: `${i + 1}/${n}`,
    pago: false,
    atraso: false,
  }));
}

export const somaMes = (dia: string, i: number) => {
  const base = 9 + i;
  const mes = ((base - 1) % 12) + 1;
  const ano = 2026 + Math.floor((base - 1) / 12);
  return String(dia).padStart(2, "0") + "/" + String(mes).padStart(2, "0") + "/" + ano;
};



type StoreValue = {
  alunos: Aluno[];
  pagamentos: Pagamento[];
  usuarios: Usuario[];
  planos: Plano[];
  treinos: Treino[];
  avaliacoes: Avaliacao[];
  observacoes: Observacao[];
  exportacoes: Exportacao[];
  matriculas: Matricula[];
  cancelarMatricula: (alunoId: number, motivo: string, por: string) => { ok: boolean; motivo?: string; mensagem?: string };
  notificacoesLidas: NotificacaoLida[];
  marcarNotificacoesLidas: (itens: { tipo: string; texto: string }[]) => void;
  registrarExportacao: (d: Pick<Exportacao, "relatorio" | "periodo" | "por">) => void;
  toggleAcessoAluno: (id: number) => void;
  checkins: Checkin[];
  registrarCheckin: (d: {
    alunoId: number;
    data: string;
    por: string;
    perfil: PerfilRegistro;
    motivo?: string;
  }) => { ok: boolean; erro?: string };
  cancelarCheckin: (
    id: number,
    motivo: string,
    por: string,
    perfil: PerfilRegistro,
  ) => { ok: boolean; erro?: string };
  inicioDaMatricula: (alunoId: number) => string;
  registrarPagamento: (id: number, forma: string, origem?: "Recepção" | "App") => void;
  salvarAluno: (dados: DadosNovoAluno) => void;
  toggleUsuario: (id: number) => void;
  setPerfilUsuario: (id: number, perfil: Usuario["perfil"]) => void;
  salvarUsuario: (dados: Omit<Usuario, "id" | "ativo"> & { id?: number }) => void;
  salvarPlano: (dados: Omit<Plano, "id" | "ativos"> & { id?: number }) => void;
  trocarPlano: (
    alunoId: number,
    novoPlanoNome: string,
    dia: string,
    renovacao: boolean,
  ) => { ok: boolean; motivo?: string; mensagem?: string };
  salvarTreino: (d: Omit<Treino, "id" | "atualizadoEm">) => void;
  registrarAvaliacao: (d: Omit<Avaliacao, "id">) => void;
  registrarObservacao: (d: Omit<Observacao, "id" | "criadoEm">) => void;
};

const StoreContext = createContext<StoreValue | null>(null);

// "local": dados de demonstração só em memória (sem login ou sem API); "carregando"/"pronto": dados da nuvem (DynamoDB).
type Estado = "local" | "carregando" | "pronto";

// `diaVenc` ("Todo dia 15") só vale na matrícula nova: gera as parcelas do plano e define o fim da matrícula.
type DadosNovoAluno = Omit<Aluno, "id" | "fin" | "ultimo" | "alerta" | "checkin" | "matriculaAnterior" | "ativo"> & {
  id?: number;
  diaVenc?: string;
};

// #2026-NNNN seguinte ao maior número já usado (inclusive nas matrículas anteriores guardadas nos alunos)
export function proximaMatricula(alunos: Pick<Aluno, "matricula" | "matriculaAnterior">[]) {
  const usados = alunos.flatMap((a) => [a.matricula, a.matriculaAnterior]);
  const maior = Math.max(0, ...usados.map((m) => Number(/^#2026-(\d{4})$/.exec(m)?.[1] ?? 0)));
  return `#2026-${String(maior + 1).padStart(4, "0")}`;
}

const idDaMatricula = (m: string) => m.replace("#", "");
const MATRICULA_VALIDA = /^\d{4}-\d{4}$/;

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const toast = useToast();
  const [estado, setEstado] = useState<Estado>("local");
  const [alunos, setAlunos] = useState(ALUNOS_INICIAL);
  const [pagamentos, setPagamentos] = useState(PAGAMENTOS_INICIAL);
  const [usuarios, setUsuarios] = useState(USUARIOS_INICIAL);
  const [planos, setPlanos] = useState(PLANOS_INICIAL);
  const [checkins, setCheckins] = useState(gerarCheckinsDemo);
  const [treinos, setTreinos] = useState(TREINOS_INICIAL);
  const [avaliacoes, setAvaliacoes] = useState(AVALIACOES_INICIAL);
  const [observacoes, setObservacoes] = useState(OBSERVACOES_INICIAL);
  const [exportacoes, setExportacoes] = useState(EXPORTACOES_INICIAL);
  const [matriculas, setMatriculas] = useState<Matricula[]>(MATRICULAS_INICIAL);
  const [notificacoesLidas, setNotificacoesLidas] = useState<NotificacaoLida[]>([]);
  const daNuvem = useRef(false);
  const nuvem = estado === "pronto";

  const aplicar = useCallback((d: DadosDaNuvem) => {
    setAlunos(d.alunos);
    setUsuarios(d.usuarios);
    setPlanos(d.planos);
    setPagamentos(d.pagamentos);
    setCheckins(d.checkins);
    setTreinos(d.treinos);
    setAvaliacoes(d.avaliacoes);
    setObservacoes(d.observacoes);
    setExportacoes(d.exportacoes ?? []);
    setNotificacoesLidas(d.notificacoes ?? []);
    setMatriculas(d.matriculas ?? []);
  }, []);

  const voltarAoDemo = useCallback(() => {
    if (!daNuvem.current) return;
    daNuvem.current = false;
    setAlunos(ALUNOS_INICIAL);
    setPagamentos(PAGAMENTOS_INICIAL);
    setUsuarios(USUARIOS_INICIAL);
    setPlanos(PLANOS_INICIAL);
    setCheckins(gerarCheckinsDemo());
    setTreinos(TREINOS_INICIAL);
    setAvaliacoes(AVALIACOES_INICIAL);
    setObservacoes(OBSERVACOES_INICIAL);
    setExportacoes(EXPORTACOES_INICIAL);
    setNotificacoesLidas([]);
    setMatriculas(MATRICULAS_INICIAL);
  }, []);

  // ao entrar, traz da nuvem só o que o perfil pode ver; ao sair, volta aos dados de demonstração
  useEffect(() => {
    if (!dadosConfigurada || !user) {
      voltarAoDemo();
      setEstado("local");
      return;
    }
    let ativo = true;
    setEstado("carregando");
    carregarDados()
      .then((dados) => {
        if (!ativo) return;
        aplicar(dados);
        daNuvem.current = true;
        setEstado("pronto");
      })
      .catch((erro) => {
        if (!ativo) return;
        voltarAoDemo();
        setEstado("local");
        toast(`${erro instanceof Error ? erro.message : "Falha ao carregar"} Usando os dados de demonstração.`);
      });
    return () => {
      ativo = false;
    };
  }, [user?.email, aplicar, voltarAoDemo]);

  async function recarregar() {
    try {
      aplicar(await carregarDados());
    } catch {
      // segue com o que está na tela
    }
  }

  // Grava na nuvem o documento que acabou de mudar na tela. Se o servidor recusar, avisa e volta ao que está guardado.
  function gravar(colecao: Colecao, doc: Documento) {
    if (!nuvem) return;
    gravarDocumento(colecao, doc).catch((erro) => {
      toast(erro instanceof Error ? erro.message : "Não foi possível salvar.");
      void recarregar();
    });
  }

  function apagarEmAberto(id: number) {
    if (!nuvem) return;
    apagarParcela(id).catch(() => {
      // a parcela já não existia: nada a fazer
    });
  }

  // cria ou atualiza a matrícula na tela e na nuvem
  function gravarMatricula(m: Matricula) {
    setMatriculas((prev) => [...prev.filter((x) => x.id !== m.id), m].sort((a, b) => a.id.localeCompare(b.id)));
    gravar("matriculas", m);
  }

  // Aluno que sai: a matrícula vira CANCELADA (com data, motivo e multa), as parcelas que ainda iam vencer saem, as já
  // vencidas continuam em cobrança e o acesso é bloqueado. Para voltar, o aluno faz uma nova matrícula (troca de plano).
  function cancelarMatricula(alunoId: number, motivo: string, por: string) {
    const aluno = alunos.find((a) => a.id === alunoId);
    if (!aluno) return { ok: false, motivo: "Aluno não encontrado." };
    if (aluno.cancelamento) return { ok: false, motivo: "Essa matrícula já está cancelada." };
    if (motivo.trim().length < 5) return { ok: false, motivo: "Informe o motivo do cancelamento (mínimo de 5 caracteres)." };

    const sim = simularCancelamento(aluno, planos, pagamentos);
    const saem = new Set(sim.aVencer.map((p) => p.id));
    setPagamentos((prev) => prev.filter((p) => !saem.has(p.id)));
    for (const p of sim.aVencer) apagarEmAberto(p.id);

    const cancelamento = { em: HOJE_DEMO, motivo: motivo.trim(), por };
    const atualizado: Aluno = { ...aluno, ativo: false, cancelamento, fin: sim.vencidas.length > 0 ? "Atrasado" : "Em dia" };
    setAlunos((prev) => prev.map((a) => (a.id === alunoId ? atualizado : a)));
    gravar("alunos", atualizado);

    if (MATRICULA_VALIDA.test(idDaMatricula(aluno.matricula))) {
      gravarMatricula({
        id: idDaMatricula(aluno.matricula),
        alunoId,
        plano: aluno.plano,
        fim: aluno.fim,
        matriculaAnterior: aluno.matriculaAnterior,
        situacao: "CANCELADA",
        canceladaEm: HOJE_DEMO,
        motivo: motivo.trim(),
        ...(sim.multaTexto ? { multa: sim.multaTexto } : {}),
      });
    }
    const primeiro = aluno.nome.split(" ")[0];
    return {
      ok: true,
      mensagem:
        `Matrícula de ${primeiro} cancelada` +
        (sim.multaTexto ? ` — multa de ${sim.multaTexto} (${sim.percentual}% das parcelas restantes).` : ".") +
        (sim.vencidas.length > 0 ? ` ${sim.vencidas.length} parcela(s) vencida(s) continuam em cobrança.` : ""),
    };
  }

  function toggleAcessoAluno(id: number) {
    const atual = alunos.find((a) => a.id === id);
    setAlunos((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ativo: !a.ativo } : a)),
    );
    if (atual) gravar("alunos", { ...atual, ativo: !atual.ativo });
  }

  function inicioDaMatricula(alunoId: number) {
    const aluno = alunos.find((a) => a.id === alunoId);
    if (!aluno) return HOJE_DEMO;
    const plano = planos.find((p) => p.nome === aluno.plano);
    return calcularInicio(aluno.fim, mesesPlano(plano?.duracao ?? "1 mês"));
  }

  function registrarCheckin(d: {
    alunoId: number;
    data: string;
    por: string;
    perfil: PerfilRegistro;
    motivo?: string;
  }) {
    const aluno = alunos.find((a) => a.id === d.alunoId);
    if (!aluno) return { ok: false, erro: "Aluno não encontrado." };

    const erro = validarNovoCheckin({
      data: d.data,
      inicio: inicioDaMatricula(d.alunoId),
      motivo: d.motivo,
      jaTem: !!checkinDoDia(checkins, d.alunoId, d.data),
      bloqueio: bloqueioDoAluno(aluno),
    });
    if (erro) return { ok: false, erro };

    const retroativo = d.data !== HOJE_DEMO;
    const agora = new Date();
    const novo: Checkin = {
      id: Math.max(0, ...checkins.map((c) => c.id)) + 1,
      alunoId: d.alunoId,
      data: d.data,
      hora: retroativo ? "" : agora.toTimeString().slice(0, 5),
      origem: retroativo ? "Retroativo" : d.perfil === "Aluno" ? "App" : "Recepção",
      registradoPor: d.por,
      perfilRegistro: d.perfil,
      registradoEm: agora.toISOString(),
      motivo: retroativo ? d.motivo?.trim() : undefined,
    };
    setCheckins((prev) => [novo, ...prev]);
    if (!retroativo) {
      setAlunos((prev) =>
        prev.map((a) =>
          a.id === d.alunoId
            ? { ...a, checkin: true, ultimo: "hoje", alerta: /^sem check-in/i.test(a.alerta) ? "" : a.alerta }
            : a,
        ),
      );
    }
    // as marcas "fez check-in hoje" do cadastro do aluno quem atualiza é o servidor
    gravar("checkins", novo);
    return { ok: true };
  }

  function cancelarCheckin(id: number, motivo: string, por: string, perfil: PerfilRegistro) {
    if (motivo.trim().length < 5) {
      return { ok: false, erro: "Informe o motivo da remoção (mínimo de 5 caracteres)." };
    }
    const alvo = checkins.find((c) => c.id === id && !c.cancelado);
    if (!alvo) return { ok: false, erro: "Check-in não encontrado." };

    const cancelado = { por: `${por} (${perfil})`, em: new Date().toISOString(), motivo: motivo.trim() };
    setCheckins((prev) => prev.map((c) => (c.id === id ? { ...c, cancelado } : c)));
    if (alvo.data === HOJE_DEMO) {
      setAlunos((prev) => prev.map((a) => (a.id === alvo.alunoId ? { ...a, checkin: false } : a)));
    }
    gravar("checkins", { ...alvo, cancelado });
    return { ok: true };
  }

  // origem "App": o aluno pagou pelo Pix; "Recepção": a equipe registrou. Nos dois casos o servidor acerta o cadastro do
  // aluno (Em dia, acesso liberado e sem o alerta de atraso quando não sobra parcela vencida); aqui a tela faz o mesmo.
  function registrarPagamento(id: number, forma: string, origem: "Recepção" | "App" = "Recepção") {
    const pagamento = pagamentos.find((p) => p.id === id);
    if (!pagamento) return;
    const pago: Pagamento = { ...pagamento, pago: true, atraso: false, forma, pagoEm: "14/09/2026", origem };
    setPagamentos((prev) => prev.map((p) => (p.id === id ? pago : p)));
    const atrasado = pagamentos.some((p) => p.id !== id && p.nome === pagamento.nome && !p.pago && p.atraso);
    setAlunos((prev) =>
      prev.map((a) => {
        if (a.nome !== pagamento.nome) return a;
        if (atrasado) return { ...a, fin: "Atrasado" };
        return { ...a, fin: "Em dia", ativo: a.cancelamento ? a.ativo : true, alerta: /^mensalidade atrasada/i.test(a.alerta) ? "" : a.alerta };
      }),
    );
    gravar("pagamentos", pago);
  }

  function salvarAluno(dados: DadosNovoAluno) {
    if (dados.id) {
      const atual = alunos.find((a) => a.id === dados.id);
      setAlunos((prev) =>
        prev.map((a) => (a.id === dados.id ? { ...a, ...dados, id: a.id } : a)),
      );
      if (atual) gravar("alunos", { ...atual, ...dados, id: atual.id });
    } else {
      const { diaVenc, ...cadastro } = dados;
      const plano = planos.find((p) => p.nome === cadastro.plano) ?? planos[0];
      const diaNum = (diaVenc ?? "").replace("Todo dia ", "");
      const parcelas = gerarParcelas(cadastro.nome, plano, diaNum);
      const novo: Aluno = {
        ...cadastro,
        id: Math.max(0, ...alunos.map((a) => a.id)) + 1,
        fim: diaNum ? somaMes(diaNum, parcelas.length) : cadastro.fim,
        fin: parcelas.length > 0 ? "Pendente" : "Em dia",
        ultimo: "—",
        alerta: "",
        checkin: false,
        matriculaAnterior: "",
        ativo: true,
      };
      setAlunos((prev) => [...prev, novo]);
      if (parcelas.length > 0) setPagamentos((prev) => [...parcelas, ...prev]);
      gravar("alunos", novo);
      for (const parcela of parcelas) gravar("pagamentos", parcela);
      if (MATRICULA_VALIDA.test(idDaMatricula(novo.matricula))) {
        gravarMatricula({
          id: idDaMatricula(novo.matricula),
          alunoId: novo.id,
          plano: novo.plano,
          fim: novo.fim,
          situacao: "ATIVA",
        });
      }
    }
  }

  function toggleUsuario(id: number) {
    const atual = usuarios.find((u) => u.id === id);
    setUsuarios((prev) =>
      prev.map((u) => (u.id === id ? { ...u, ativo: !u.ativo } : u)),
    );
    if (atual) gravar("usuarios", { ...atual, ativo: !atual.ativo });
  }

  function setPerfilUsuario(id: number, perfil: Usuario["perfil"]) {
    const atual = usuarios.find((u) => u.id === id);
    setUsuarios((prev) => prev.map((u) => (u.id === id ? { ...u, perfil } : u)));
    if (atual) gravar("usuarios", { ...atual, perfil });
  }

  function salvarUsuario(dados: Omit<Usuario, "id" | "ativo"> & { id?: number }) {
    if (dados.id) {
      const atual = usuarios.find((u) => u.id === dados.id);
      setUsuarios((prev) =>
        prev.map((u) => (u.id === dados.id ? { ...u, ...dados, id: u.id } : u)),
      );
      if (atual) gravar("usuarios", { ...atual, ...dados, id: atual.id });
    } else {
      const novo: Usuario = { ...dados, id: Math.max(0, ...usuarios.map((u) => u.id)) + 1, ativo: true };
      setUsuarios((prev) => [...prev, novo]);
      gravar("usuarios", novo);
    }
  }

  function salvarPlano(dados: Omit<Plano, "id" | "ativos"> & { id?: number }) {
    if (dados.id) {
      const atual = planos.find((p) => p.id === dados.id);
      setPlanos((prev) =>
        prev.map((p) => (p.id === dados.id ? { ...p, ...dados, id: p.id } : p)),
      );
      if (atual) gravar("planos", { ...atual, ...dados, id: atual.id });
    } else {
      const novo: Plano = { ...dados, id: Math.max(0, ...planos.map((p) => p.id)) + 1, ativos: 0 };
      setPlanos((prev) => [...prev, novo]);
      gravar("planos", novo);
    }
  }

  function trocarPlano(alunoId: number, novoPlanoNome: string, dia: string, renovacao: boolean) {
    const aluno = alunos.find((a) => a.id === alunoId);
    if (!aluno) return { ok: false };
    if (aluno.plano === novoPlanoNome && !renovacao && !aluno.cancelamento) {
      return { ok: false, motivo: "Escolha um plano diferente do atual." };
    }
    const novo = planos.find((p) => p.nome === novoPlanoNome) ?? planos[0];
    const n = mesesPlano(novo.duracao);
    const diaNum = dia.replace("Todo dia ", "");
    const novasParcelas = gerarParcelas(aluno.nome, novo, diaNum);
    // quem volta depois de cancelar continua devendo as parcelas que já tinham vencido
    const dividas = aluno.cancelamento ? pagamentos.filter((p) => p.nome === aluno.nome && !p.pago && p.atraso) : [];
    const emAberto = pagamentos.filter((p) => p.nome === aluno.nome && !p.pago && !dividas.includes(p));
    setPagamentos((prev) => [
      ...novasParcelas,
      ...prev.filter((p) => p.nome !== aluno.nome || p.pago || dividas.includes(p)),
    ]);
    const novaMatricula = proximaMatricula(alunos);
    const { cancelamento: _cancelada, ...semCancelamento } = aluno;
    const alunoAtualizado: Aluno = {
      ...semCancelamento,
      plano: novo.nome,
      fim: somaMes(diaNum, n),
      fin: dividas.length > 0 ? "Atrasado" : "Pendente",
      ativo: aluno.cancelamento ? dividas.length === 0 : aluno.ativo, // com dívida vencida o acesso só volta ao pagar
      matriculaAnterior: aluno.matricula,
      matricula: novaMatricula,
    };
    setAlunos((prev) => prev.map((a) => (a.id === alunoId ? alunoAtualizado : a)));

    // nuvem: as parcelas em aberto antigas saem, as novas entram e a matrícula anterior fica no histórico
    for (const antiga of emAberto) apagarEmAberto(antiga.id);
    for (const nova of novasParcelas) gravar("pagamentos", nova);
    gravar("alunos", alunoAtualizado);
    if (MATRICULA_VALIDA.test(idDaMatricula(novaMatricula))) {
      gravarMatricula({
        id: idDaMatricula(novaMatricula),
        alunoId,
        plano: novo.nome,
        fim: alunoAtualizado.fim,
        matriculaAnterior: aluno.matricula,
        situacao: "ATIVA",
      });
    }
    // a matrícula que já foi cancelada pela saída do aluno guarda a data e o motivo: não é reescrita aqui
    if (!aluno.cancelamento && MATRICULA_VALIDA.test(idDaMatricula(aluno.matricula))) {
      gravarMatricula({
        id: idDaMatricula(aluno.matricula),
        alunoId,
        plano: aluno.plano,
        fim: aluno.fim,
        matriculaAnterior: aluno.matriculaAnterior,
        situacao: renovacao ? "VENCIDA" : "CANCELADA",
      });
    }

    const mensagem =
      aluno.cancelamento
        ? `${aluno.nome.split(" ")[0]} voltou: nova matrícula em ${novo.nome}, acesso liberado${dividas.length > 0 ? " após quitar as parcelas vencidas" : ""}.`
        : renovacao && aluno.plano === novo.nome
        ? `Matrícula de ${aluno.nome.split(" ")[0]} renovada em ${novo.nome} — nova vigência e parcelas geradas, histórico preservado (regra 5).`
        : `Plano de ${aluno.nome.split(" ")[0]} alterado para ${novo.nome} — nova matrícula criada referenciando a anterior.`;
    return { ok: true, mensagem };
  }

  function salvarTreino(d: Omit<Treino, "id" | "atualizadoEm">) {
    const treino: Treino = { ...d, id: `${d.alunoId}-${d.divisao}`, atualizadoEm: new Date().toISOString() };
    setTreinos((prev) => [...prev.filter((t) => t.id !== treino.id), treino]);
    // treino atualizado: o alerta "Treino desatualizado" do aluno sai (o servidor faz o mesmo no banco)
    setAlunos((prev) =>
      prev.map((a) => (a.id === d.alunoId && /^treino/i.test(a.alerta) ? { ...a, alerta: "" } : a)),
    );
    gravar("treinos", treino);
  }

  function marcarNotificacoesLidas(itens: { tipo: string; texto: string }[]) {
    const jaLidas = new Set(notificacoesLidas.map((n) => n.texto));
    const agora = Date.now();
    // o instante é parte da chave na tabela: cada notificação ganha o seu
    const novas: NotificacaoLida[] = itens
      .filter((i) => !jaLidas.has(i.texto))
      .map((i, k) => ({ id: agora + k, tipo: i.tipo, texto: i.texto.slice(0, 300), lidoEm: new Date(agora + k).toISOString() }));
    if (novas.length === 0) return;
    setNotificacoesLidas((prev) => [...prev, ...novas]);
    for (const n of novas) gravar("notificacoes", n);
  }

  function registrarExportacao(d: Pick<Exportacao, "relatorio" | "periodo" | "por">) {
    const exportacao: Exportacao = { ...d, id: Date.now(), criadoEm: new Date().toISOString() };
    setExportacoes((prev) => [exportacao, ...prev]);
    gravar("exportacoes", exportacao);
  }

  function registrarAvaliacao(d: Omit<Avaliacao, "id">) {
    const avaliacao: Avaliacao = { ...d, id: Date.now() };
    setAvaliacoes((prev) => [...prev, avaliacao]);
    gravar("avaliacoes", avaliacao);
  }

  function registrarObservacao(d: Omit<Observacao, "id" | "criadoEm">) {
    // o "hoje" da demonstração é fixo (14/09/2026); a hora é a de agora
    const observacao: Observacao = {
      ...d,
      id: Date.now(),
      criadoEm: `${HOJE_DEMO}T${new Date().toISOString().slice(11)}`,
    };
    setObservacoes((prev) => [...prev, observacao]);
    gravar("observacoes", observacao);
  }

  if (estado === "carregando") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-beige/40 text-sm font-semibold text-navy/60">
        <span className="animate-pulse">Carregando seus dados…</span>
      </div>
    );
  }

  return (
    <StoreContext.Provider
      value={{
        alunos,
        pagamentos,
        usuarios,
        planos,
        toggleAcessoAluno,
        checkins,
        registrarCheckin,
        cancelarCheckin,
        inicioDaMatricula,
        registrarPagamento,
        salvarAluno,
        toggleUsuario,
        setPerfilUsuario,
        salvarUsuario,
        salvarPlano,
        trocarPlano,
        treinos,
        avaliacoes,
        observacoes,
        exportacoes,
        matriculas,
        cancelarMatricula,
        notificacoesLidas,
        marcarNotificacoesLidas,
        registrarExportacao,
        salvarTreino,
        registrarAvaliacao,
        registrarObservacao,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore deve ser usado dentro de StoreProvider");
  return ctx;
}
