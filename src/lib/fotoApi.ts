import { fetchAuthSession } from "aws-amplify/auth";
import type { Endereco } from "./endereco";

const BASE: string | undefined = import.meta.env.VITE_PROFILE_API_URL;

// Sem a variável, o perfil na nuvem fica desligado e o app segue mostrando as iniciais.
export const fotoConfigurada = Boolean(BASE);

// Item do usuário na tabela DynamoDB (campos de texto).
export type PerfilSalvo = {
  userId?: string;
  email?: string;
  nome?: string;
  telefone?: string;
  emailContato?: string;
  nascimento?: string;
  sexo?: string;
  // endereço guardado em atributos de texto soltos
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  fotoKey?: string;
  atualizadoEm?: string;
};

// Monta o endereço do item salvo; undefined se o usuário nunca salvou um.
export function enderecoDoPerfil(p: PerfilSalvo | null): Endereco | undefined {
  if (!p || p.cep === undefined) return undefined;
  return {
    cep: p.cep,
    logradouro: p.logradouro ?? "",
    numero: p.numero ?? "",
    complemento: p.complemento ?? "",
    bairro: p.bairro ?? "",
    cidade: p.cidade ?? "",
    uf: p.uf ?? "",
  };
}

// Campos que o usuário pode alterar pelo PUT /profile (a foto segue em salvarPerfil).
export type DadosPerfil = {
  telefone?: string;
  emailContato?: string;
  nascimento?: string;
  sexo?: string;
  endereco?: Endereco;
};

const endereco = () => `${BASE!.replace(/\/+$/, "")}/profile`;

async function cabecalhoAutorizacao() {
  const sessao = await fetchAuthSession();
  const token = sessao.tokens?.idToken?.toString();
  if (!token) throw new Error("Sessão expirada. Entre novamente.");
  return { Authorization: `Bearer ${token}` };
}

async function mensagemDeErro(resposta: Response, padrao: string) {
  if (resposta.status === 401 || resposta.status === 403) {
    return "Sessão expirada. Entre novamente.";
  }
  try {
    const dados = await resposta.json();
    if (typeof dados?.message === "string") return dados.message;
  } catch {
    // corpo sem JSON: usa a mensagem padrão
  }
  return padrao;
}

async function chamar(init: RequestInit) {
  try {
    return await fetch(endereco(), init);
  } catch {
    throw new Error("Sem conexão com o servidor. Tente novamente.");
  }
}

export function blobParaBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(String(leitor.result).split(",")[1] ?? "");
    leitor.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    leitor.readAsDataURL(blob);
  });
}

function base64ParaBlob(dados: string, tipo: string): Blob {
  const binario = atob(dados);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return new Blob([bytes], { type: tipo });
}

// GET /profile: dados cadastrados (DynamoDB) e foto (S3) do usuário logado; nulos se ainda não há nada.
export async function buscarPerfil(): Promise<{ perfil: PerfilSalvo | null; foto: Blob | null }> {
  const resposta = await chamar({ headers: await cabecalhoAutorizacao() });
  if (!resposta.ok) throw new Error(await mensagemDeErro(resposta, "Não foi possível carregar o perfil."));
  const corpo = await resposta.json();
  const foto = corpo.foto ? base64ParaBlob(corpo.foto.dados, corpo.foto.tipo) : null;
  return { perfil: corpo.perfil ?? null, foto };
}

// PUT /profile: altera os dados e/ou a foto (qualquer combinação, ao menos um campo).
export async function salvarPerfil(dados: DadosPerfil & { foto?: Blob }): Promise<PerfilSalvo> {
  const { foto, ...texto } = dados;
  const corpo: Record<string, unknown> = { ...texto };
  if (foto) corpo.foto = { dados: await blobParaBase64(foto) };

  const resposta = await chamar({
    method: "PUT",
    headers: { ...(await cabecalhoAutorizacao()), "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  });
  if (!resposta.ok) throw new Error(await mensagemDeErro(resposta, "Não foi possível salvar o perfil."));
  return (await resposta.json()).perfil;
}
