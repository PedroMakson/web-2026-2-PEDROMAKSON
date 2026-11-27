import { type Aluno, type Avaliacao, brl, mesesPlano, type Pagamento, type Plano, valorNum } from "../data/store";
import type { Checkin } from "./checkins";
import type { Matricula } from "./dadosApi";
import { dataBrParaIso, HOJE_DEMO, somarDias, somarMeses } from "./datas";

// Indicadores calculados dos dados do sistema (alunos, parcelas, check-ins, avaliações). Os painéis e os PDFs de
// relatório usam estas mesmas contas, então o que aparece na tela é o que sai no arquivo.

export type Dados = {
  alunos: Aluno[];
  planos: Plano[];
  pagamentos: Pagamento[];
  checkins: Checkin[];
  avaliacoes?: Avaliacao[];
  matriculas?: Matricula[];
};

// Período de N dias terminando em "hoje" (o início é exclusivo): 7 dias = de hoje-6 até hoje.
export type Janela = { inicio: string; fim: string; dias: number };
export const janela = (dias: number, hoje = HOJE_DEMO, deslocamento = 0): Janela => {
  const fim = somarDias(hoje, -dias * deslocamento);
  return { inicio: somarDias(fim, -dias), fim, dias };
};
const dentro = (iso: string | null | undefined, j: Janela) => !!iso && iso > j.inicio && iso <= j.fim;

export const pagoEmIso = (p: Pagamento) => (p.pagoEm ? dataBrParaIso(p.pagoEm) : null);
const vencIso = (p: Pagamento) => dataBrParaIso(p.venc);
const vencida = (p: Pagamento, hoje = HOJE_DEMO) => !p.pago && (p.atraso || vencIso(p) < hoje);

export const receitaNa = (pagamentos: Pagamento[], j: Janela) =>
  pagamentos.filter((p) => p.pago && dentro(pagoEmIso(p), j)).reduce((t, p) => t + valorNum(p.valor), 0);

// Inadimplência: valor das parcelas vencidas e ainda em aberto sobre o valor das parcelas que venceram no período.
export function inadimplenciaNa(pagamentos: Pagamento[], j: Janela, hoje = HOJE_DEMO) {
  const venceram = pagamentos.filter((p) => dentro(vencIso(p), j));
  const base = venceram.reduce((t, p) => t + valorNum(p.valor), 0);
  const emAtraso = venceram.filter((p) => vencida(p, hoje)).reduce((t, p) => t + valorNum(p.valor), 0);
  return { base, emAtraso, taxa: base > 0 ? (emAtraso / base) * 100 : 0 };
}

// Início da matrícula atual: o vencimento menos a duração do plano.
export const inicioDaMatriculaDe = (a: Aluno, planos: Plano[]) => {
  const plano = planos.find((p) => p.nome === a.plano);
  return somarMeses(dataBrParaIso(a.fim), -(plano ? mesesPlano(plano.duracao) : 1));
};

// Matrícula cancelada por saída do aluno (não conta como ativa, nem como vencendo)
export const cancelada = (a: Aluno) => Boolean(a.cancelamento);

export function matriculasNa(alunos: Aluno[], planos: Plano[], j: Janela, matriculas: Matricula[] = []) {
  const vigentes = alunos.filter((a) => !cancelada(a));
  const noPeriodo = vigentes.filter((a) => dentro(inicioDaMatriculaDe(a, planos), j));
  return {
    novas: noPeriodo.filter((a) => !a.matriculaAnterior),
    renovacoes: noPeriodo.filter((a) => a.matriculaAnterior),
    ativas: vigentes.filter((a) => dataBrParaIso(a.fim) >= HOJE_DEMO),
    // cancelamentos do período (a troca de plano também marca CANCELADA, mas sem data de cancelamento: não entra aqui)
    cancelamentos: matriculas.filter((m) => m.situacao === "CANCELADA" && dentro(m.canceladaEm, j)),
  };
}

export const checkinsNa = (checkins: Checkin[], j: Janela) =>
  checkins.filter((c) => !c.cancelado && dentro(c.data, j));

export const FAIXAS_HORARIO = [
  { faixa: "06h – 09h", de: 6, ate: 9 },
  { faixa: "09h – 12h", de: 9, ate: 12 },
  { faixa: "12h – 16h", de: 12, ate: 16 },
  { faixa: "16h – 19h", de: 16, ate: 19 },
  { faixa: "19h – 22h", de: 19, ate: 22 },
] as const;

export function faixasNa(checkins: Checkin[], j: Janela) {
  const comHora = checkinsNa(checkins, j).filter((c) => c.hora);
  const horaDe = (c: Checkin) => Number(c.hora.slice(0, 2));
  const faixas = FAIXAS_HORARIO.map((f) => ({
    faixa: f.faixa,
    total: comHora.filter((c) => horaDe(c) >= f.de && horaDe(c) < f.ate).length,
  }));
  const outros = comHora.length - faixas.reduce((t, f) => t + f.total, 0);
  const todas = outros > 0 ? [...faixas, { faixa: "Outros horários", total: outros }] : faixas;
  const soma = Math.max(1, comHora.length);
  return todas.map((f) => ({ ...f, pct: Math.round((f.total / soma) * 100) }));
}

export const ORIGENS = ["App", "Recepção", "Retroativo"] as const;
export const origensNa = (checkins: Checkin[], j: Janela) => {
  const lista = checkinsNa(checkins, j);
  return ORIGENS.map((origem) => ({ origem, total: lista.filter((c) => c.origem === origem).length }));
};

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

// Receita em 6 períodos até hoje: semanas (janela de 7 dias) ou meses do calendário (30 e 90 dias).
export function serieDeReceita(pagamentos: Pagamento[], dias: number, hoje = HOJE_DEMO) {
  if (dias <= 7) {
    return Array.from({ length: 6 }, (_, i) => {
      const j = janela(7, hoje, 5 - i);
      return { rotulo: j.fim.slice(8) + "/" + j.fim.slice(5, 7), valor: receitaNa(pagamentos, j) };
    });
  }
  return Array.from({ length: 6 }, (_, i) => {
    const primeiro = somarMeses(hoje.slice(0, 8) + "01", -(5 - i));
    const prefixo = primeiro.slice(0, 7);
    const valor = pagamentos
      .filter((p) => p.pago && (pagoEmIso(p) ?? "").startsWith(prefixo))
      .reduce((t, p) => t + valorNum(p.valor), 0);
    return { rotulo: MESES[Number(prefixo.slice(5, 7)) - 1], valor };
  });
}

export const percentual = (n: number) => `${n.toFixed(1).replace(".", ",")}%`;
export const sinal = (n: number, unidade: string) => `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(1).replace(".", ",")}${unidade}`;

// Tudo o que o painel do administrador e o relatório de receita mostram para um período.
export function indicadoresDoPeriodo(dados: Dados, dias: number) {
  const atual = janela(dias);
  const anterior = janela(dias, HOJE_DEMO, 1);
  const receita = receitaNa(dados.pagamentos, atual);
  const receitaAnterior = receitaNa(dados.pagamentos, anterior);
  const inad = inadimplenciaNa(dados.pagamentos, atual);
  const inadAnterior = inadimplenciaNa(dados.pagamentos, anterior);
  const mat = matriculasNa(dados.alunos, dados.planos, atual, dados.matriculas);
  const feitos = checkinsNa(dados.checkins, atual);
  const semanas = dias / 7;
  return {
    atual,
    receita,
    receitaTexto: brl(receita),
    receitaDelta:
      receitaAnterior > 0
        ? `${sinal(((receita - receitaAnterior) / receitaAnterior) * 100, "%")} vs. período anterior`
        : "sem período anterior para comparar",
    inadimplencia: inad,
    inadimplenciaDelta: `${sinal(inad.taxa - inadAnterior.taxa, " p.p.")}`,
    matriculas: mat,
    frequenciaMedia: dados.alunos.length > 0 ? feitos.length / dados.alunos.length / semanas : 0,
    totalCheckins: feitos.length,
    faixas: faixasNa(dados.checkins, atual),
    origens: origensNa(dados.checkins, atual),
    serie: serieDeReceita(dados.pagamentos, dias),
  };
}
