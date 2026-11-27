import type { Avaliacao } from "../data/store";
import { formatarDataBr } from "./pessoa";

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export const virgula = (n: number, casas: number) => n.toFixed(casas).replace(".", ",");

// "78,4" ou "78.4" -> 78.4; vazio ou inválido -> NaN
export const lerNumero = (texto: string) => Number(texto.trim().replace(",", "."));

export const imc = (a: Pick<Avaliacao, "peso" | "altura">) => a.peso / (a.altura * a.altura);

export function faixaDoImc(valor: number) {
  if (valor < 18.5) return "abaixo do ideal";
  if (valor < 25) return "faixa normal";
  if (valor < 30) return "faixa de atenção";
  return "acima da faixa";
}

// da mais recente para a mais antiga
export const maisRecentesPrimeiro = (lista: Avaliacao[]) =>
  [...lista].sort((a, b) => b.data.localeCompare(a.data) || b.id - a.id);

export const rotuloMes = (iso: string) => MESES[Number(iso.slice(5, 7)) - 1];

export const dataBr = (iso: string) => formatarDataBr(iso);

export function medidas(a: Avaliacao) {
  return a.cintura !== undefined ? `cintura ${virgula(a.cintura, 0)} cm` : "—";
}
