import {
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { confirmResetPassword, resetPassword } from "aws-amplify/auth";
import { Check, Circle } from "lucide-react";
import { useToast } from "../components/Toast";

const TAMANHO_CODIGO = 6;
const SIMBOLO = /[\^$*.[\]{}()?\-"!@#%&/\\,><':;|_~`+=]/;

type Etapa = "email" | "codigo" | "senha";

function mensagemDeErro(error: unknown) {
  const nome = error instanceof Error ? error.name : "";
  if (nome === "CodeMismatchException") return "Código inválido. Confira os 6 dígitos.";
  if (nome === "ExpiredCodeException") return "Código expirado. Solicite um novo.";
  if (nome === "InvalidPasswordException") {
    return "A senha não atende à política de segurança.";
  }
  if (nome === "LimitExceededException") {
    return "Muitas tentativas. Aguarde alguns minutos.";
  }
  return error instanceof Error ? error.message : "Não foi possível concluir.";
}

const inputClass =
  "rounded-[10px] border border-navy/20 px-3 py-2.5 text-sm font-normal outline-none focus:border-teal focus:ring-[3px] focus:ring-teal/25";

export default function RecuperarSenha() {
  const navigate = useNavigate();
  const toast = useToast();
  const [etapa, setEtapa] = useState<Etapa>("email");
  const [email, setEmail] = useState("");
  const [digitos, setDigitos] = useState<string[]>(Array(TAMANHO_CODIGO).fill(""));
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const caixas = useRef<(HTMLInputElement | null)[]>([]);

  const codigo = digitos.join("");
  const requisitos = [
    { texto: "Pelo menos 8 caracteres", ok: novaSenha.length >= 8 },
    { texto: "Uma letra maiúscula", ok: /[A-Z]/.test(novaSenha) },
    { texto: "Uma letra minúscula", ok: /[a-z]/.test(novaSenha) },
    { texto: "Um número", ok: /\d/.test(novaSenha) },
    { texto: "Um símbolo (ex.: @ ! # $)", ok: SIMBOLO.test(novaSenha) },
    {
      texto: "As duas senhas são iguais",
      ok: novaSenha !== "" && novaSenha === confirmacao,
    },
  ];
  const senhaValida = requisitos.every((r) => r.ok);

  useEffect(() => {
    if (etapa === "codigo") caixas.current[0]?.focus();
  }, [etapa]);

  function limparCodigo() {
    setDigitos(Array(TAMANHO_CODIGO).fill(""));
  }

  function digitar(indice: number, valor: string) {
    const digito = valor.replace(/\D/g, "").slice(-1);
    setDigitos((atual) => atual.map((d, i) => (i === indice ? digito : d)));
    if (digito && indice < TAMANHO_CODIGO - 1) caixas.current[indice + 1]?.focus();
  }

  function teclar(indice: number, evento: KeyboardEvent<HTMLInputElement>) {
    if (evento.key === "Backspace" && !digitos[indice] && indice > 0) {
      setDigitos((atual) => atual.map((d, i) => (i === indice - 1 ? "" : d)));
      caixas.current[indice - 1]?.focus();
    } else if (evento.key === "ArrowLeft" && indice > 0) {
      caixas.current[indice - 1]?.focus();
    } else if (evento.key === "ArrowRight" && indice < TAMANHO_CODIGO - 1) {
      caixas.current[indice + 1]?.focus();
    }
  }

  function colar(evento: ClipboardEvent<HTMLInputElement>) {
    const colado = evento.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, TAMANHO_CODIGO);
    if (!colado) return;
    evento.preventDefault();
    setDigitos(Array.from({ length: TAMANHO_CODIGO }, (_, i) => colado[i] ?? ""));
    caixas.current[Math.min(colado.length, TAMANHO_CODIGO - 1)]?.focus();
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro("");

    if (etapa === "email") {
      if (!email) {
        setErro("Informe seu e-mail.");
        return;
      }
      setEnviando(true);
      try {
        await resetPassword({ username: email.trim() });
        toast(`Código enviado para ${email}`);
        limparCodigo();
        setEtapa("codigo");
      } catch (error) {
        setErro(mensagemDeErro(error));
      } finally {
        setEnviando(false);
      }
      return;
    }

    if (etapa === "codigo") {
      if (codigo.length < TAMANHO_CODIGO) {
        setErro(`Digite os ${TAMANHO_CODIGO} dígitos do código.`);
        return;
      }
      setEtapa("senha");
      return;
    }

    if (!senhaValida) return;
    setEnviando(true);
    try {
      await confirmResetPassword({
        username: email.trim(),
        confirmationCode: codigo,
        newPassword: novaSenha,
      });
      toast("Senha redefinida. Entre com a nova senha.");
      navigate("/login");
    } catch (error) {
      const nome = error instanceof Error ? error.name : "";
      if (nome === "CodeMismatchException" || nome === "ExpiredCodeException") {
        limparCodigo();
        setEtapa("codigo");
      }
      setErro(mensagemDeErro(error));
    } finally {
      setEnviando(false);
    }
  }

  const subtitulo = {
    email:
      "Informe seu e-mail. Enviaremos um código de verificação para redefinir sua senha.",
    codigo: `Digite o código de ${TAMANHO_CODIGO} dígitos enviado para ${email}.`,
    senha: "Código recebido. Agora escolha a nova senha.",
  }[etapa];

  const botao = {
    email: "Enviar código",
    codigo: "Continuar",
    senha: "Redefinir senha",
  }[etapa];

  const botaoDesabilitado =
    enviando ||
    (etapa === "codigo" && codigo.length < TAMANHO_CODIGO) ||
    (etapa === "senha" && !senhaValida);

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-navy bg-cover bg-center p-6"
      style={{
        backgroundImage:
          "linear-gradient(180deg, rgba(27,44,74,.92), rgba(27,44,74,.86)), url('/gym-bg.jpg')",
      }}
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl">
        <h1 className="font-display text-3xl font-bold text-navy">
          Recuperar senha
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-navy/60">{subtitulo}</p>

        <form className="mt-5 flex flex-col gap-1.5" onSubmit={handleSubmit}>
          {etapa === "email" && (
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-navy">
              E-mail
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="voce@email.com"
                className={inputClass}
              />
            </label>
          )}

          {etapa === "codigo" && (
            <div className="flex justify-between gap-2">
              {digitos.map((digito, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    caixas.current[i] = el;
                  }}
                  value={digito}
                  onChange={(event) => digitar(i, event.target.value)}
                  onKeyDown={(event) => teclar(i, event)}
                  onPaste={colar}
                  onFocus={(event) => event.target.select()}
                  inputMode="numeric"
                  autoComplete={i === 0 ? "one-time-code" : "off"}
                  maxLength={1}
                  aria-label={`Dígito ${i + 1} do código`}
                  className="h-[52px] w-full min-w-0 rounded-[10px] border border-navy/20 text-center font-display text-2xl font-bold text-navy outline-none focus:border-teal focus:ring-[3px] focus:ring-teal/25"
                />
              ))}
            </div>
          )}

          {etapa === "senha" && (
            <>
              <label className="flex flex-col gap-1.5 text-sm font-semibold text-navy">
                Nova senha
                <input
                  type="password"
                  value={novaSenha}
                  onChange={(event) => setNovaSenha(event.target.value)}
                  autoComplete="new-password"
                  className={inputClass}
                />
              </label>
              <label className="mt-2 flex flex-col gap-1.5 text-sm font-semibold text-navy">
                Confirmar nova senha
                <input
                  type="password"
                  value={confirmacao}
                  onChange={(event) => setConfirmacao(event.target.value)}
                  autoComplete="new-password"
                  className={inputClass}
                />
              </label>
              <ul className="mt-3 flex flex-col gap-1.5 rounded-xl bg-beige/45 p-3.5">
                {requisitos.map((r) => (
                  <li
                    key={r.texto}
                    className={`flex items-center gap-2 text-[13px] font-semibold transition-colors ${
                      r.ok ? "text-teal-dark" : "text-navy/50"
                    }`}
                  >
                    {r.ok ? (
                      <Check size={15} strokeWidth={3} className="shrink-0" />
                    ) : (
                      <Circle size={15} className="shrink-0" />
                    )}
                    {r.texto}
                  </li>
                ))}
              </ul>
            </>
          )}

          {erro && (
            <p className="mt-2 rounded-lg bg-red-600/10 px-3 py-2 text-[13px] font-semibold text-red-700">
              {erro}
            </p>
          )}

          <button
            type="submit"
            disabled={botaoDesabilitado}
            className="mt-4 w-full rounded-[10px] bg-navy py-3 text-sm font-bold text-white transition hover:bg-navy-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {enviando ? "Aguarde…" : botao}
          </button>
          <button
            type="button"
            onClick={() => {
              setErro("");
              if (etapa === "email") navigate("/login");
              else if (etapa === "codigo") setEtapa("email");
              else setEtapa("codigo");
            }}
            className="w-full rounded-[10px] py-2.5 text-[13px] font-semibold text-navy/60 transition hover:text-navy"
          >
            {etapa === "email"
              ? "Voltar para o login"
              : etapa === "codigo"
                ? "Usar outro e-mail"
                : "Voltar"}
          </button>
        </form>
      </div>
    </div>
  );
}
