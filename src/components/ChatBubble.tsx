import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import { MessageCircle, Send, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const WS_URL: string | undefined = import.meta.env.VITE_WS_URL;
const MAX_TENTATIVAS = 3;
const ESPERA_RESPOSTA_MS = 70000;
const HISTORICO_MAX = 6;

type Status = "conectando" | "online" | "desconectado" | "indisponivel";
type Autor = "usuario" | "assistente" | "sistema";
type Mensagem = { id: number; autor: Autor; texto: string; hora: string };

const QUEBRA_DE_LINHA = /\r?\n/;

const horaAtual = () =>
  new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

const STATUS: Record<Status, { rotulo: string; cor: string }> = {
  conectando: { rotulo: "Conectando…", cor: "bg-[#d69e2e]" },
  online: { rotulo: "Online", cor: "bg-neon" },
  desconectado: { rotulo: "Desconectado", cor: "bg-danger" },
  indisponivel: { rotulo: "Indisponível", cor: "bg-white/40" },
};

function TextoFormatado({ texto }: { texto: string }) {
  return (
    <>
      {texto.split(QUEBRA_DE_LINHA).map((linha, i) => {
        const item = linha.match(/^\s*[*-]\s+(.*)$/);
        const conteudo = item ? item[1] : linha;
        const partes = conteudo
          .split(/(\*\*[^*]+\*\*)/g)
          .map((parte, j) =>
            parte.length > 4 && parte.startsWith("**") && parte.endsWith("**") ? (
              <strong key={j}>{parte.slice(2, -2)}</strong>
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

export default function ChatBubble() {
  const [aberto, setAberto] = useState(false);
  const [status, setStatus] = useState<Status>(WS_URL ? "desconectado" : "indisponivel");
  const [mensagens, setMensagens] = useState<Mensagem[]>([
    {
      id: 0,
      autor: "assistente",
      texto: "Olá! Sou o assistente do GymFlow. Como posso ajudar?",
      hora: horaAtual(),
    },
  ]);
  const [texto, setTexto] = useState("");
  const [aguardando, setAguardando] = useState(false);
  const { user } = useAuth();
  const { pathname } = useLocation();

  const socket = useRef<WebSocket | null>(null);
  const tentativas = useRef(0);
  const timer = useRef<number | undefined>(undefined);
  const abertoRef = useRef(false);
  const proximoId = useRef(1);
  const lista = useRef<HTMLDivElement>(null);

  const adicionar = useCallback((autor: Autor, conteudo: string) => {
    setMensagens((atual) => [
      ...atual,
      { id: proximoId.current++, autor, texto: conteudo, hora: horaAtual() },
    ]);
  }, []);

  async function conectar() {
    if (!WS_URL) return;
    const atual = socket.current;
    if (atual && atual.readyState <= WebSocket.OPEN) return;

    setStatus("conectando");
    try {
      const sessao = await fetchAuthSession();
      const token = sessao.tokens?.idToken?.toString();
      if (!token) {
        setStatus("desconectado");
        return;
      }

      const ws = new WebSocket(`${WS_URL}?token=${encodeURIComponent(token)}`);
      socket.current = ws;

      ws.onopen = () => {
        tentativas.current = 0;
        setStatus("online");
      };

      ws.onmessage = (evento) => {
        let dados: { type?: string; message?: unknown };
        try {
          dados = JSON.parse(String(evento.data));
        } catch {
          dados = { type: "answer", message: String(evento.data) };
        }
        adicionar(dados.type === "error" ? "sistema" : "assistente", String(dados.message ?? ""));
        setAguardando(false);
      };

      ws.onclose = () => {
        if (socket.current !== ws) return;
        socket.current = null;
        setStatus("desconectado");
        setAguardando(false);
        if (abertoRef.current && tentativas.current < MAX_TENTATIVAS) {
          tentativas.current += 1;
          timer.current = window.setTimeout(conectar, 3000);
        }
      };
    } catch {
      setStatus("desconectado");
    }
  }

  useEffect(() => {
    abertoRef.current = aberto;
    if (aberto) {
      tentativas.current = 0;
      conectar();
    }
  }, [aberto]);

  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      const ws = socket.current;
      socket.current = null;
      ws?.close();
    },
    [],
  );

  useEffect(() => {
    if (!aguardando) return;
    const limite = window.setTimeout(() => {
      adicionar("sistema", "A resposta demorou demais. Tente novamente.");
      setAguardando(false);
    }, ESPERA_RESPOSTA_MS);
    return () => window.clearTimeout(limite);
  }, [aguardando, adicionar]);

  useEffect(() => {
    const el = lista.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [mensagens, aguardando, aberto]);

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    const pergunta = texto.trim();
    const ws = socket.current;
    if (!pergunta || aguardando || !ws || ws.readyState !== WebSocket.OPEN) return;
    const historico = mensagens
      .filter((m) => m.autor !== "sistema" && m.id !== 0)
      .slice(-HISTORICO_MAX)
      .map((m) => ({ role: m.autor === "usuario" ? "user" : "model", text: m.texto }));
    ws.send(
      JSON.stringify({ message: pergunta, profile: user?.perfil, page: pathname, history: historico }),
    );
    adicionar("usuario", pergunta);
    setTexto("");
    setAguardando(true);
  }

  const online = status === "online";

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
                <span className={`h-2 w-2 rounded-full ${STATUS[status].cor}`} />
                {STATUS[status].rotulo}
              </div>
            </div>
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
                <div
                  className={`mt-1 text-right text-[10px] font-semibold ${
                    m.autor === "usuario" ? "text-white/55" : "text-navy/40"
                  }`}
                >
                  {m.hora}
                </div>
              </div>
            ))}
            {aguardando && (
              <div className="self-start rounded-2xl rounded-bl-md border border-navy/10 bg-white px-3.5 py-2.5 text-[13.5px] font-semibold text-navy/50">
                <span className="animate-pulse">digitando…</span>
              </div>
            )}
            {status === "indisponivel" && (
              <p className="text-center text-xs font-semibold text-navy/50">
                O assistente não está configurado neste ambiente.
              </p>
            )}
            {status === "desconectado" && (
              <div className="flex flex-col items-center gap-2 py-1 text-xs font-semibold text-navy/55">
                Sem conexão com o assistente.
                <button
                  type="button"
                  onClick={() => {
                    tentativas.current = 0;
                    conectar();
                  }}
                  className="rounded-lg border border-navy/20 bg-white px-3 py-1.5 font-bold text-navy transition hover:border-teal"
                >
                  Tentar novamente
                </button>
              </div>
            )}
          </div>

          <form onSubmit={enviar} className="flex gap-2 border-t border-navy/10 bg-white p-3">
            <input
              value={texto}
              onChange={(evento) => setTexto(evento.target.value)}
              maxLength={500}
              disabled={!online || aguardando}
              placeholder={online ? "Digite sua pergunta…" : "Aguardando conexão…"}
              className="min-w-0 flex-1 rounded-[10px] border border-navy/20 px-3 py-2.5 text-sm outline-none focus:border-teal focus:ring-[3px] focus:ring-teal/25 disabled:bg-navy/5"
            />
            <button
              type="submit"
              disabled={!online || aguardando || !texto.trim()}
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
