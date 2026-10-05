import { type FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
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
  const { user, loading, entrar } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  if (!loading && user) {
    return <Navigate to={HOME_POR_PERFIL[user.perfil]} replace />;
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

            {erro && (
              <p className="rounded-lg bg-red-600/10 px-3 py-2 text-[13px] font-semibold text-red-700">
                {erro}
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
        </div>
      </div>
    </div>
  );
}
