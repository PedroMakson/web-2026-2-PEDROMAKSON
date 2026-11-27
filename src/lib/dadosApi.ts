import { fetchAuthSession } from "aws-amplify/auth";
import type { Aluno, Avaliacao, Exportacao, NotificacaoLida, Observacao, Pagamento, Plano, Treino, Usuario } from "../data/store";
import type { Checkin } from "./checkins";

// A API de dados é a mesma HTTP API do perfil (VITE_PROFILE_API_URL), nas rotas /dados. Sem a variável, o app roda só
// em memória, com os dados de demonstração.
const BASE: string | undefined = import.meta.env.VITE_PROFILE_API_URL;
export const dadosConfigurada = Boolean(BASE);

export type Colecao =
  | "alunos"
  | "usuarios"
  | "planos"
  | "pagamentos"
  | "checkins"
  | "matriculas"
  | "treinos"
  | "avaliacoes"
  | "observacoes"
  | "exportacoes"
  | "notificacoes";

// Qualquer documento do app: o que importa para a API é ter o id (a validação completa é do servidor).
export type Documento = { id: number | string; [campo: string]: unknown };

export type Matricula = {
  id: string; // 2026-0142 (sem o #)
  alunoId: number;
  plano: string;
  fim: string; // DD/MM/AAAA
  matriculaAnterior?: string;
  situacao: "ATIVA" | "VENCIDA" | "CANCELADA";
  // só nas matrículas canceladas por saída do aluno (a troca de plano também marca CANCELADA, sem estes campos)
  canceladaEm?: string; // AAAA-MM-DD
  motivo?: string;
  multa?: string; // R$ 52,35
};

// O que a API devolve: só o que o perfil de quem chama pode ver.
export type DadosDaNuvem = {
  alunos: Aluno[];
  usuarios: Usuario[];
  planos: Plano[];
  pagamentos: Pagamento[];
  checkins: Checkin[];
  treinos: Treino[];
  avaliacoes: Avaliacao[];
  observacoes: Observacao[];
  exportacoes: Exportacao[]; // só a administração vê o histórico
  notificacoes: NotificacaoLida[]; // as que a própria pessoa já leu
  matriculas: Matricula[]; // só recepção e administração recebem
  voce: { perfil: string; nome: string | null; alunoId: number | null };
};

const endereco = (resto: string) => `${BASE!.replace(/\/+$/, "")}/dados${resto}`;

async function pedir<T>(metodo: "GET" | "PUT" | "DELETE", resto: string, corpo?: unknown): Promise<T> {
  const sessao = await fetchAuthSession();
  const token = sessao.tokens?.idToken?.toString();
  if (!token) throw new Error("Sessão expirada. Entre novamente.");

  let resposta: Response;
  try {
    resposta = await fetch(endereco(resto), {
      method: metodo,
      headers: { Authorization: `Bearer ${token}`, ...(corpo ? { "Content-Type": "application/json" } : {}) },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
  } catch {
    throw new Error("Sem conexão com o servidor. Tente novamente.");
  }
  const dados = await resposta.json().catch(() => ({}));
  if (resposta.status === 401) throw new Error("Sessão expirada. Entre novamente.");
  if (!resposta.ok) {
    throw new Error(typeof dados?.message === "string" ? dados.message : "Não foi possível concluir a operação.");
  }
  return dados as T;
}

export const carregarDados = () => pedir<DadosDaNuvem>("GET", "");

export const gravarDocumento = (colecao: Colecao, doc: Documento) =>
  pedir("PUT", `/${colecao}/${encodeURIComponent(String(doc.id))}`, doc);

export const apagarParcela = (id: number) => pedir("DELETE", `/pagamentos/${id}`);
