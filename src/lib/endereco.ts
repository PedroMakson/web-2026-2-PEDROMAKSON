export type Endereco = {
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
};

export const ENDERECO_VAZIO: Endereco = {
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
};

export const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

export const soDigitos = (valor: string) => valor.replace(/\D/g, "");

export function formatarCep(valor: string) {
  const digitos = soDigitos(valor).slice(0, 8);
  return digitos.length > 5 ? `${digitos.slice(0, 5)}-${digitos.slice(5)}` : digitos;
}

// Retorna a mensagem do primeiro campo obrigatório que falta, ou null se estiver tudo certo.
export function validarEndereco(e: Endereco): string | null {
  if (soDigitos(e.cep).length !== 8) return "Informe um CEP válido, com 8 dígitos.";
  if (!e.logradouro.trim()) return "Informe o logradouro.";
  if (!e.numero.trim()) return "Informe o número do endereço (ou S/N).";
  if (!e.bairro.trim()) return "Informe o bairro.";
  if (!e.cidade.trim()) return "Informe a cidade.";
  if (!UFS.includes(e.uf)) return "Selecione a UF.";
  return null;
}

export function resumoEndereco(e?: Endereco) {
  if (!e || !e.logradouro) return "—";
  const complemento = e.complemento ? `, ${e.complemento}` : "";
  return `${e.logradouro}, ${e.numero}${complemento} — ${e.bairro}, ${e.cidade}/${e.uf} · CEP ${e.cep}`;
}

type DadosCep = Pick<Endereco, "logradouro" | "bairro" | "cidade" | "uf">;

export type ResultadoCep =
  | { ok: true; dados: DadosCep }
  | { ok: false; motivo: "invalido" | "nao_encontrado" | "rede" };

const TEMPO_LIMITE_MS = 6000;

// Cada consulta devolve os dados, null quando o CEP não existe, ou lança erro em falha de rede/serviço.
async function consultarViaCep(cep: string): Promise<DadosCep | null> {
  const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
    signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
  });
  if (!resposta.ok) throw new Error(`ViaCEP respondeu ${resposta.status}`);
  const dados = await resposta.json();
  if (dados.erro || (!dados.localidade && !dados.uf)) return null;
  return {
    logradouro: dados.logradouro ?? "",
    bairro: dados.bairro ?? "",
    cidade: dados.localidade ?? "",
    uf: dados.uf ?? "",
  };
}

async function consultarBrasilApi(cep: string): Promise<DadosCep | null> {
  const resposta = await fetch(`https://brasilapi.com.br/api/cep/v1/${cep}`, {
    signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
  });
  if (resposta.status === 404) return null;
  if (!resposta.ok) throw new Error(`BrasilAPI respondeu ${resposta.status}`);
  const dados = await resposta.json();
  if (!dados.city && !dados.state) return null;
  return {
    logradouro: dados.street ?? "",
    bairro: dados.neighborhood ?? "",
    cidade: dados.city ?? "",
    uf: dados.state ?? "",
  };
}

// Os Correios não têm API aberta; o ViaCEP (base dos Correios) é a consulta principal
// e o BrasilAPI entra como reserva quando o primeiro falha ou não conhece o CEP.
export async function buscarCep(cepBruto: string): Promise<ResultadoCep> {
  const cep = soDigitos(cepBruto);
  if (cep.length !== 8) return { ok: false, motivo: "invalido" };

  let algumNaoEncontrou = false;
  for (const consultar of [consultarViaCep, consultarBrasilApi]) {
    try {
      const dados = await consultar(cep);
      if (dados) return { ok: true, dados };
      algumNaoEncontrou = true;
    } catch {
      // serviço fora do ar ou lento: tenta o próximo
    }
  }
  return { ok: false, motivo: algumNaoEncontrou ? "nao_encontrado" : "rede" };
}
