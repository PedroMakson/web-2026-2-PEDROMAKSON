// "Hoje" fixo da demonstração, o mesmo usado nas demais telas (14/09/2026).
export const HOJE_DEMO = "2026-09-14";

export const LETRA_DIA = ["D", "S", "T", "Q", "Q", "S", "S"];

export function paraData(iso: string) {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(a, m - 1, d);
}

export function paraIso(data: Date) {
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${data.getFullYear()}-${mes}-${dia}`;
}

export function somarDias(iso: string, dias: number) {
  const data = paraData(iso);
  data.setDate(data.getDate() + dias);
  return paraIso(data);
}

export function somarMeses(iso: string, meses: number) {
  const data = paraData(iso);
  const dia = data.getDate();
  data.setDate(1);
  data.setMonth(data.getMonth() + meses);
  const ultimo = new Date(data.getFullYear(), data.getMonth() + 1, 0).getDate();
  data.setDate(Math.min(dia, ultimo));
  return paraIso(data);
}

// a - b, em dias
export function diferencaDias(a: string, b: string) {
  return Math.round((paraData(a).getTime() - paraData(b).getTime()) / 86400000);
}

export function dataBrParaIso(br: string) {
  const [d, m, a] = br.split("/");
  return `${a}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}
