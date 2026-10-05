import { type FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { signInWithRedirect } from "aws-amplify/auth";
import { useAuth } from "../auth/AuthContext";
import { HOME_POR_PERFIL } from "../auth/perfis";

function mensagemDeErro(error: unknown) {
  const nome = error instanceof Error ? error.name : "";
  const texto = error instanceof Error ? error.message : "";
  if (/disabled/i.test(texto)) {
    return "Conta bloqueada. Procure o administrador.";
  }
  if (nome === "NotAuthorizedException" || nome === "UserNotFoundException") {
    return "E-mail ou senha incorretos.";
  }
  if (nome === "NetworkError") {
    return "Sem conexão com o servidor de login. Tente novamente.";
  }
  if (nome === "LimitExceededException" || nome === "TooManyRequestsException") {
    return "Muitas tentativas. Aguarde alguns minutos.";
  }
  return texto || "Não foi possível entrar. Tente novamente.";
}

export default function Login() {
  const navigate = useNavigate();
  const { user, loading, aviso, entrar } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  if (!loading && user) {
    return <Navigate to={HOME_POR_PERFIL[user.perfil]} replace />;
  }

  async function entrarComGoogle() {
    setErro("");
    try {
      await signInWithRedirect({ provider: "Google" });
    } catch {
      setErro("Não foi possível iniciar o login com o Google.");
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!email || !senha) {
      setErro("Preencha e-mail e senha.");
      return;
    }

    setErro("");
    setEnviando(true);
    try {
      const logado = await entrar(email.trim(), senha);
      navigate(HOME_POR_PERFIL[logado.perfil]);
    } catch (error) {
      setErro(mensagemDeErro(error));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-navy bg-cover bg-center p-6"
      style={{
        backgroundImage:
          "linear-gradient(180deg, rgba(27,44,74,.92), rgba(27,44,74,.82)), url('/gym-bg.jpg')",
      }}
    >
      <div className="grid w-full max-w-4xl grid-cols-1 items-center gap-8 md:grid-cols-2">
        <div className="text-white">
          <h1 className="font-display text-6xl font-bold leading-none tracking-tight">
            GYMFLOW
          </h1>
          <div className="mt-4 h-1 w-14 bg-neon" />
          <p className="mt-5 max-w-[34ch] text-[17px] leading-relaxed text-white/80">
            Matrícula, cobrança, frequência e evolução de treino em uma única
            plataforma. Um acesso para cada função da academia.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {["Check-in diário", "Pix integrado", "Painel de indicadores"].map(
              (label) => (
                <span
                  key={label}
                  className="rounded-full border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/80"
                >
                  {label}
                </span>
              ),
            )}
          </div>
        </div>

        <div className="animate-[gfIn_.4s_ease_both] rounded-2xl bg-white p-8 shadow-2xl">
          <h2 className="font-display text-3xl font-bold text-navy">Entrar</h2>
          <p className="mt-1.5 text-sm text-navy/60">
            Use sua conta para continuar.
          </p>

          <form className="mt-6 flex flex-col gap-3.5" onSubmit={handleSubmit}>
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-navy">
              E-mail
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="voce@email.com"
                className="rounded-[10px] border border-navy/20 px-3 py-2.5 text-sm font-normal outline-none focus:border-teal focus:ring-[3px] focus:ring-teal/25"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm font-semibold text-navy">
              Senha
              <input
                type="password"
                value={senha}
                onChange={(event) => setSenha(event.target.value)}
                placeholder="••••••••"
                className="rounded-[10px] border border-navy/20 px-3 py-2.5 text-sm font-normal outline-none focus:border-teal focus:ring-[3px] focus:ring-teal/25"
              />
            </label>

            <Link
              to="/recuperar-senha"
              className="self-start text-xs font-semibold text-teal-mid hover:underline"
            >
              Esqueceu sua senha?
            </Link>

            {(erro || aviso) && (
              <p className="rounded-lg bg-red-600/10 px-3 py-2 text-[13px] font-semibold text-red-700">
                {erro || aviso}
              </p>
            )}

            <button
              type="submit"
              disabled={enviando}
              className="mt-1 rounded-[10px] bg-navy py-3 text-sm font-bold text-white transition hover:bg-[#24395f] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {enviando ? "Entrando…" : "Entrar"}
            </button>
          </form>

          <div className="my-4 flex items-center gap-3 text-[11px] font-bold uppercase tracking-wider text-navy/35">
            <span className="h-px flex-1 bg-navy/10" />
            ou
            <span className="h-px flex-1 bg-navy/10" />
          </div>

          <button
            type="button"
            onClick={entrarComGoogle}
            className="flex w-full items-center justify-center gap-2.5 rounded-[10px] border border-navy/20 bg-white py-3 text-sm font-bold text-navy transition hover:border-teal hover:bg-teal/5"
          >
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Entrar com Google
          </button>
        </div>
      </div>
    </div>
  );
}
