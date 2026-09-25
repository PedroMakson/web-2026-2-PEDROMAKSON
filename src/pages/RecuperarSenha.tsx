import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../components/Toast";

export default function RecuperarSenha() {
  const navigate = useNavigate();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!email) {
      setErro("Informe seu e-mail.");
      return;
    }

    // TODO: chamar a API (Cognito forgot password) quando o backend existir.
    toast(`Código enviado para ${email}`);
    navigate("/login");
  }

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
        <p className="mt-2 text-sm leading-relaxed text-navy/60">
          Informe seu e-mail. Enviaremos um código de verificação para
          redefinir sua senha.
        </p>

        <form className="mt-5 flex flex-col gap-1.5" onSubmit={handleSubmit}>
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

          {erro && (
            <p className="mt-2 rounded-lg bg-red-600/10 px-3 py-2 text-[13px] font-semibold text-red-700">
              {erro}
            </p>
          )}

          <button
            type="submit"
            className="mt-4 w-full rounded-[10px] bg-navy py-3 text-sm font-bold text-white transition hover:bg-navy-hover"
          >
            Enviar código
          </button>
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="w-full rounded-[10px] py-2.5 text-[13px] font-semibold text-navy/60 transition hover:text-navy"
          >
            Voltar para o login
          </button>
        </form>
      </div>
    </div>
  );
}
