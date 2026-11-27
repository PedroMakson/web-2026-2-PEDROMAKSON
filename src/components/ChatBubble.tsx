import { type ChangeEvent, type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import { MessageCircle, Paperclip, Send, Trash2, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useFotoPerfil } from "../auth/FotoPerfil";
import { blobParaBase64 } from "../lib/fotoApi";
import { reduzirImagem, TIPOS_ACEITOS, validarArquivo } from "../lib/imagem";

// Endereço do agente de IA (API REST do API Gateway, chat.<domínio>/chat), protegido pelo JWT do Cognito.
const CHAT_URL: string | undefined = import.meta.env.VITE_CHAT_API_URL;
const ESPERA_RESPOSTA_MS = 60000;

type Autor = "usuario" | "assistente" | "sistema";
type Mensagem = { id: number; autor: Autor; texto: string; hora: string };

const QUEBRA_DE_LINHA = /\r?\n/;
const SAUDACAO = "Olá! Sou o assistente do GymFlow. Posso tirar dúvidas do sistema, informar a hora e trocar sua foto de perfil: é só anexar a imagem no clipe. Como posso ajudar?";

const horaAtual = () =>
  new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

function TextoFormatado({ texto }: { texto: string }) {
  return (
    <>
      {texto.split(QUEBRA_DE_LINHA).map((linha, i) => {
        const item = linha.match(/^\s*[*-]\s+(.*)$/);
        const conteudo = item ? item[1] : linha;
        const partes = conteudo
          .split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g)
          .map((parte, j) =>
            parte.length > 4 && parte.startsWith("**") && parte.endsWith("**") ? (
              <strong key={j}>{parte.slice(2, -2)}</strong>
            ) : parte.length > 2 && parte.startsWith("*") && parte.endsWith("*") ? (
              <em key={j}>{parte.slice(1, -1)}</em>
            ) : (
              parte
            ),
          );
        if (item) {
          return (
            <div key={i} className="flex gap-2">
              <span aria-hidden>•</span>
              <span>{partes}</span>
            </div>
          );
        }
        return linha.trim() ? <div key={i}>{partes}</div> : <div key={i} className="h-2" />;
      })}
    </>
  );
}

// Chama o /chat com o ID token do Cognito. Lança Error com uma mensagem pronta para o usuário.
async function chamar<T>(metodo: "GET" | "POST" | "DELETE", corpo?: unknown): Promise<T> {
  const sessao = await fetchAuthSession();
  const token = sessao.tokens?.idToken?.toString();
  if (!token) throw new Error("Sessão expirada. Entre novamente.");

  const controle = new AbortController();
  const limite = window.setTimeout(() => controle.abort(), ESPERA_RESPOSTA_MS);
  try {
    const resposta = await fetch(CHAT_URL!, {
      method: metodo,
      headers: { Authorization: token, ...(corpo ? { "Content-Type": "application/json" } : {}) },
      body: corpo ? JSON.stringify(corpo) : undefined,
      signal: controle.signal,
    });
    if (resposta.status === 401 || resposta.status === 403) {
      throw new Error("Sessão expirada. Entre novamente.");
    }
    const dados = await resposta.json().catch(() => ({}));
    if (!resposta.ok) {
      throw new Error(typeof dados?.message === "string" ? dados.message : "Não foi possível falar com o assistente.");
    }
    return dados as T;
  } catch (erro) {
    if (erro instanceof DOMException && erro.name === "AbortError") {
      throw new Error("A resposta demorou demais. Tente novamente.");
    }
    if (erro instanceof TypeError) throw new Error("Sem conexão com o assistente. Tente novamente.");
    throw erro;
  } finally {
    window.clearTimeout(limite);
  }
}

export default function ChatBubble() {
  const [aberto, setAberto] = useState(false);
  const [mensagens, setMensagens] = useState<Mensagem[]>([
    { id: 0, autor: "assistente", texto: SAUDACAO, hora: horaAtual() },
  ]);
  const [texto, setTexto] = useState("");
  const [anexo, setAnexo] = useState<File | null>(null);
  const [previa, setPrevia] = useState<string | null>(null);
  const [aguardando, setAguardando] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const { pathname } = useLocation();
  const foto = useFotoPerfil();

  const proximoId = useRef(1);
  const historicoCarregado = useRef(false);
  const lista = useRef<HTMLDivElement>(null);
  const seletor = useRef<HTMLInputElement>(null);

  const disponivel = Boolean(CHAT_URL);

  const adicionar = useCallback((autor: Autor, conteudo: string) => {
    setMensagens((atual) => [
      ...atual,
      { id: proximoId.current++, autor, texto: conteudo, hora: horaAtual() },
    ]);
  }, []);

  // ao abrir pela primeira vez, traz a conversa guardada no servidor: a memória do agente aparece na tela
  useEffect(() => {
    if (!aberto || !disponivel || historicoCarregado.current) return;
    historicoCarregado.current = true;
    setCarregando(true);
    chamar<{ mensagens: { autor: "usuario" | "assistente"; texto: string }[] }>("GET")
      .then(({ mensagens: guardadas }) => {
        if (guardadas.length === 0) return;
        setMensagens(
          guardadas.map((m) => ({ id: proximoId.current++, autor: m.autor, texto: m.texto, hora: "" })),
        );
      })
      .catch(() => {
        // sem histórico: o chat segue com a saudação
      })
      .finally(() => setCarregando(false));
  }, [aberto, disponivel]);

  // prévia da imagem escolhida (nada vai para o servidor antes de enviar)
  useEffect(() => {
    if (!anexo) {
      setPrevia(null);
      return;
    }
    const url = URL.createObjectURL(anexo);
    setPrevia(url);
    return () => URL.revokeObjectURL(url);
  }, [anexo]);

  useEffect(() => {
    const el = lista.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [mensagens, aguardando, aberto, carregando]);

  function aoEscolherImagem(evento: ChangeEvent<HTMLInputElement>) {
    const escolhido = evento.target.files?.[0];
    evento.target.value = ""; // permite escolher o mesmo arquivo de novo
    if (!escolhido) return;
    const problema = validarArquivo(escolhido);
    if (problema) {
      adicionar("sistema", problema);
      return;
    }
    setAnexo(escolhido);
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    const pergunta = texto.trim();
    if ((!pergunta && !anexo) || aguardando || !disponivel) return;
    const arquivo = anexo;
    adicionar("usuario", arquivo ? `${pergunta}${pergunta ? "\n" : ""}📎 ${arquivo.name}` : pergunta);
    setTexto("");
    setAnexo(null);
    setAguardando(true);
    try {
      const corpo: Record<string, unknown> = { pagina: pathname };
      if (pergunta) corpo.mensagem = pergunta;
      if (arquivo) corpo.anexo = { dados: await blobParaBase64(await reduzirImagem(arquivo)) };
      const resposta = await chamar<{ resposta: string; acoes?: string[] }>("POST", corpo);
      adicionar("assistente", resposta.resposta);
      if (resposta.acoes?.includes("foto_atualizada")) {
        await foto.atualizar().catch(() => undefined); // a foto nova aparece no menu e no Meu perfil
      }
    } catch (erro) {
      adicionar("sistema", erro instanceof Error ? erro.message : "Não foi possível falar com o assistente.");
    } finally {
      setAguardando(false);
    }
  }

  async function novaConversa() {
    if (aguardando) return;
    try {
      await chamar("DELETE");
      proximoId.current = 1;
      setMensagens([{ id: 0, autor: "assistente", texto: SAUDACAO, hora: horaAtual() }]);
    } catch (erro) {
      adicionar("sistema", erro instanceof Error ? erro.message : "Não foi possível apagar a conversa.");
    }
  }

  return (
    <>
      {aberto && (
        <div
          role="dialog"
          aria-label="Assistente GymFlow"
          className="fixed bottom-24 right-4 z-[55] flex h-[480px] max-h-[calc(100vh-7rem)] w-[360px] max-w-[calc(100vw-2rem)] animate-[gfIn_.25s_ease_both] flex-col overflow-hidden rounded-2xl border border-navy/10 bg-white shadow-2xl"
        >
          <div className="flex items-center gap-3 bg-navy px-4 py-3.5 text-white">
            <div className="min-w-0 flex-1">
              <div className="font-display text-lg font-bold leading-tight">
                Assistente GymFlow
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[11px] font-semibold text-white/65">
                <span className={`h-2 w-2 rounded-full ${disponivel ? "bg-neon" : "bg-white/40"}`} />
                {disponivel ? "Online" : "Indisponível"}
              </div>
            </div>
            <button
              type="button"
              onClick={novaConversa}
              disabled={!disponivel || aguardando}
              aria-label="Nova conversa"
              title="Nova conversa (apaga a memória)"
              className="rounded-lg p-1.5 text-white/65 transition hover:text-white disabled:opacity-40"
            >
              <Trash2 size={17} />
            </button>
            <button
              type="button"
              onClick={() => setAberto(false)}
              aria-label="Fechar chat"
              className="rounded-lg p-1.5 text-white/65 transition hover:text-white"
            >
              <X size={18} />
            </button>
          </div>

          <div ref={lista} className="flex flex-1 flex-col gap-2.5 overflow-y-auto bg-beige/30 p-4">
            {mensagens.map((m) => (
              <div
                key={m.id}
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed ${
                  m.autor === "usuario"
                    ? "self-end rounded-br-md bg-navy text-white"
                    : m.autor === "sistema"
                      ? "self-start rounded-bl-md bg-danger/10 text-danger-dark"
                      : "self-start rounded-bl-md border border-navy/10 bg-white text-navy"
                }`}
              >
                {m.autor === "assistente" ? (
                  <TextoFormatado texto={m.texto} />
                ) : (
                  <div className="whitespace-pre-wrap">{m.texto}</div>
                )}
                {m.hora && (
                  <div
                    className={`mt-1 text-right text-[10px] font-semibold ${
                      m.autor === "usuario" ? "text-white/55" : "text-navy/40"
                    }`}
                  >
                    {m.hora}
                  </div>
                )}
              </div>
            ))}
            {(aguardando || carregando) && (
              <div className="self-start rounded-2xl rounded-bl-md border border-navy/10 bg-white px-3.5 py-2.5 text-[13.5px] font-semibold text-navy/50">
                <span className="animate-pulse">{carregando ? "carregando a conversa…" : "digitando…"}</span>
              </div>
            )}
            {!disponivel && (
              <p className="text-center text-xs font-semibold text-navy/50">
                O assistente não está configurado neste ambiente.
              </p>
            )}
          </div>

          {anexo && (
            <div className="flex items-center gap-2.5 border-t border-navy/10 bg-white px-3 pt-2.5">
              {previa && <img src={previa} alt="" className="h-10 w-10 rounded-lg object-cover" />}
              <span className="min-w-0 flex-1 truncate text-xs font-semibold text-navy/70">{anexo.name}</span>
              <button
                type="button"
                onClick={() => setAnexo(null)}
                aria-label="Remover imagem"
                className="rounded-md p-1 text-navy/45 transition hover:text-navy"
              >
                <X size={15} />
              </button>
            </div>
          )}

          <form onSubmit={enviar} className="flex gap-2 border-t border-navy/10 bg-white p-3">
            <input
              ref={seletor}
              type="file"
              accept={TIPOS_ACEITOS.join(",")}
              onChange={aoEscolherImagem}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => seletor.current?.click()}
              disabled={!disponivel || aguardando}
              aria-label="Anexar imagem"
              title="Anexar imagem (JPEG, PNG ou WebP)"
              className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[10px] border border-navy/20 text-navy/70 transition hover:border-teal hover:text-navy disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Paperclip size={18} />
            </button>
            <input
              value={texto}
              onChange={(evento) => setTexto(evento.target.value)}
              maxLength={500}
              disabled={!disponivel || aguardando}
              placeholder={disponivel ? "Pergunte ou anexe uma imagem…" : "Assistente indisponível"}
              className="min-w-0 flex-1 rounded-[10px] border border-navy/20 px-3 py-2.5 text-sm outline-none focus:border-teal focus:ring-[3px] focus:ring-teal/25 disabled:bg-navy/5"
            />
            <button
              type="submit"
              disabled={!disponivel || aguardando || (!texto.trim() && !anexo)}
              aria-label="Enviar"
              className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[10px] bg-teal text-navy-dark transition hover:bg-neon disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setAberto((valor) => !valor)}
        aria-label={aberto ? "Fechar assistente" : "Abrir assistente"}
        className="fixed bottom-5 right-4 z-[55] flex h-[56px] w-[56px] items-center justify-center rounded-full bg-navy text-neon shadow-xl transition hover:scale-105 hover:bg-navy-hover"
      >
        {aberto ? <X size={24} /> : <MessageCircle size={26} />}
      </button>
    </>
  );
}
