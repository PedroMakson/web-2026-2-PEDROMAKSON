import { soDigitos } from "./endereco";

export const SEXOS = ["Feminino", "Masculino", "Outro", "Prefiro não informar"] as const;
export type Sexo = (typeof SEXOS)[number];

export type DadosPessoais = {
  cpf: string;
  nascimento: string; // AAAA-MM-DD, como o <input type="date">
  sexo: Sexo | "";
};

export const DADOS_PESSOAIS_VAZIOS: DadosPessoais = { cpf: "", nascimento: "", sexo: "" };

export const NASCIMENTO_MINIMO = "1900-01-01";

export function hojeIso() {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

export function formatarCpf(valor: string) {
  const d = soDigitos(valor).slice(0, 11);
  if (d.length > 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  if (d.length > 6) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  if (d.length > 3) return `${d.slice(0, 3)}.${d.slice(3)}`;
  return d;
}

// Confere os dois dígitos verificadores e descarta sequências repetidas (111.111.111-11 etc.).
export function cpfValido(valor: string) {
  const d = soDigitos(valor);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const digito = (tamanho: number) => {
    let soma = 0;
    for (let i = 0; i < tamanho; i++) soma += Number(d[i]) * (tamanho + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(9) === Number(d[9]) && digito(10) === Number(d[10]);
}

export function dataIsoValida(iso: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const [a, m, d] = iso.split("-").map(Number);
  const data = new Date(a, m - 1, d);
  return data.getFullYear() === a && data.getMonth() === m - 1 && data.getDate() === d;
}

export function formatarDataBr(iso?: string) {
  if (!iso || !dataIsoValida(iso)) return "—";
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

// Retorna a mensagem do primeiro problema encontrado, ou null se estiver tudo certo.
export function validarDadosPessoais(dados: DadosPessoais): string | null {
  if (!dados.nascimento) return "Informe a data de nascimento.";
  if (
    !dataIsoValida(dados.nascimento) ||
    dados.nascimento < NASCIMENTO_MINIMO ||
    dados.nascimento > hojeIso()
  ) {
    return "Data de nascimento inválida.";
  }
  if (!soDigitos(dados.cpf)) return "Informe o CPF.";
  if (!cpfValido(dados.cpf)) return "CPF inválido. Confira os 11 dígitos.";
  return null;
}
