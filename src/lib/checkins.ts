import { dataBrParaIso, HOJE_DEMO, somarDias, somarMeses } from "./datas";
import { dataIsoValida, formatarDataBr } from "./pessoa";

// App: no dia, pelo próprio aluno. Recepção: no dia, pela equipe. Retroativo: lançado depois do dia.
export type OrigemCheckin = "App" | "Recepção" | "Retroativo";
export type PerfilRegistro = "Aluno" | "Recepcionista" | "Administrador";

export type Checkin = {
  id: number;
  alunoId: number;
  data: string; // AAAA-MM-DD
  hora: string; // HH:MM; vazio nos retroativos
  origem: OrigemCheckin;
  registradoPor: string;
  perfilRegistro: PerfilRegistro;
  registradoEm: string;
  motivo?: string;
  cancelado?: { por: string; em: string; motivo: string };
};

export const vigentes = (lista: Checkin[], alunoId: number) =>
  lista.filter((c) => c.alunoId === alunoId && !c.cancelado);

export const checkinDoDia = (lista: Checkin[], alunoId: number, data: string) =>
  vigentes(lista, alunoId).find((c) => c.data === data);

// Dias seguidos até hoje; se hoje ainda não foi feito, conta até ontem.
export function sequenciaAtual(lista: Checkin[], alunoId: number, hoje = HOJE_DEMO) {
  const dias = new Set(vigentes(lista, alunoId).map((c) => c.data));
  let dia = dias.has(hoje) ? hoje : somarDias(hoje, -1);
  let total = 0;
  while (dias.has(dia)) {
    total++;
    dia = somarDias(dia, -1);
  }
  return total;
}

export function totalNoMes(lista: Checkin[], alunoId: number, ano: number, mes0: number) {
  const prefixo = `${ano}-${String(mes0 + 1).padStart(2, "0")}`;
  return vigentes(lista, alunoId).filter((c) => c.data.startsWith(prefixo)).length;
}

// Check-ins por semana, das mais antigas para a mais recente, terminando em "hoje".
export function porSemana(lista: Checkin[], alunoId: number, semanas = 8, hoje = HOJE_DEMO) {
  const datas = vigentes(lista, alunoId).map((c) => c.data);
  return Array.from({ length: semanas }, (_, i) => {
    const fim = somarDias(hoje, -7 * (semanas - 1 - i));
    const inicio = somarDias(fim, -6);
    return datas.filter((d) => d >= inicio && d <= fim).length;
  });
}

export function bloqueioDoAluno(a: { fin: string; fim: string }, hoje = HOJE_DEMO) {
  if (a.fin === "Atrasado") {
    return "Mensalidade em atraso: check-in bloqueado (regra de negócio 1).";
  }
  if (dataBrParaIso(a.fim) < hoje) {
    return "Matrícula vencida — renove na recepção para liberar o check-in.";
  }
  return null;
}

export const inicioDaMatricula = (fimBr: string, meses: number) =>
  somarMeses(dataBrParaIso(fimBr), -meses);

// Retorna a mensagem do primeiro problema, ou null se o check-in pode ser registrado.
export function validarNovoCheckin(p: {
  data: string;
  inicio: string;
  motivo?: string;
  jaTem: boolean;
  bloqueio: string | null;
  hoje?: string;
}): string | null {
  const hoje = p.hoje ?? HOJE_DEMO;
  if (!dataIsoValida(p.data)) return "Data inválida.";
  if (p.data > hoje) return "Não é possível registrar check-in em data futura.";
  if (p.bloqueio) return p.bloqueio;
  if (p.data < p.inicio) {
    return `A data não pode ser anterior ao início da matrícula (${formatarDataBr(p.inicio)}).`;
  }
  const retroativo = p.data !== hoje;
  if (retroativo && (p.motivo ?? "").trim().length < 5) {
    return "Informe o motivo do check-in retroativo (mínimo de 5 caracteres).";
  }
  if (p.jaTem) return "Já existe check-in registrado neste dia (um por dia — RF04).";
  return null;
}
