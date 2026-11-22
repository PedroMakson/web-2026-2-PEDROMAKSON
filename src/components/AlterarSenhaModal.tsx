import { type FormEvent, useEffect, useState } from "react";
import { confirmResetPassword, resetPassword, updatePassword } from "aws-amplify/auth";
import { Check, Circle, X } from "lucide-react";
import { mensagemErroSenha, requisitosSenha } from "../lib/senha";
import Obrigatorio from "./Obrigatorio";
import { useToast } from "./Toast";

const campo =
  "rounded-[10px] border border-navy/20 px-3 py-2.5 text-sm font-normal outline-none focus:border-teal focus:ring-[3px] focus:ring-teal/25";

// Janela de troca de senha de quem entrou com e-mail e senha (Cognito). Dois caminhos:
//  - "atual": informa a senha atual e a nova (updatePassword);
//  - "codigo": esqueceu a atual, recebe um código no e-mail e define a nova (resetPassword/confirmResetPassword).
export default function AlterarSenhaModal({ email, onClose }: { email: string; onClose: () => void }) {
  const toast = useToast();
  const [modo, setModo] = useState<"atual" | "codigo">("atual");
  const [atual, setAtual] = useState("");
  const [codigo, setCodigo] = useState("");
  const [nova, setNova] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const fecharComEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !enviando) onClose();
    };
    window.addEventListener("keydown", fecharComEsc);
    return () => window.removeEventListener("keydown", fecharComEsc);
  }, [enviando, onClose]);

  const requisitos = requisitosSenha(nova, confirmacao);
  const novaValida = requisitos.every((r) => r.ok);
  const podeEnviar = novaValida && (modo === "atual" ? atual !== "" : codigo.length === 6);

  async function enviarCodigo() {
    setErro("");
    setEnviando(true);
    try {
      await resetPassword({ username: email });
      toast(`Código enviado para ${email}`);
      setCodigo("");
      setModo("codigo");
    } catch (e) {
      setErro(mensagemErroSenha(e));
    } finally {
      setEnviando(false);
    }
  }

  async function salvar(ev: FormEvent) {
    ev.preventDefault();
    if (!podeEnviar) return;
    setErro("");
    setEnviando(true);
    try {
      if (modo === "atual") {
        await updatePassword({ oldPassword: atual, newPassword: nova });
      } else {
        await confirmResetPassword({ username: email, confirmationCode: codigo, newPassword: nova });
      }
      toast("Senha alterada.");
      onClose();
    } catch (e) {
      setErro(mensagemErroSenha(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-navy/60 p-5"
      onClick={() => !enviando && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-alterar-senha"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-[420px] overflow-auto rounded-[20px] bg-white p-7"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="titulo-alterar-senha" className="font-display text-2xl font-bold text-navy">
            Alterar senha
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={enviando}
            aria-label="Fechar"
            className="text-navy/45 disabled:opacity-40"
          >
            <X size={20} />
          </button>
        </div>
        <p className="mt-1.5 text-[13px] leading-relaxed text-navy/55">
          {modo === "atual"
            ? "Confirme a senha atual e escolha a nova."
            : `Digite o código de 6 dígitos enviado para ${email} e escolha a nova senha.`}
        </p>

        <form className="mt-4 flex flex-col gap-3" onSubmit={salvar}>
          {modo === "atual" ? (
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-navy">
              <span>
                Senha atual
                <Obrigatorio />
              </span>
              <input
                type="password"
                autoFocus
                value={atual}
                onChange={(e) => setAtual(e.target.value)}
                autoComplete="current-password"
                aria-required="true"
                className={campo}
              />
            </label>
          ) : (
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-navy">
              <span>
                Código de verificação
                <Obrigatorio />
              </span>
              <input
                autoFocus
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                aria-required="true"
                className={`${campo} tracking-[0.3em]`}
              />
            </label>
          )}
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-navy">
            <span>
              Nova senha
              <Obrigatorio />
            </span>
            <input
              type="password"
              value={nova}
              onChange={(e) => setNova(e.target.value)}
              autoComplete="new-password"
              aria-required="true"
              className={campo}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-navy">
            <span>
              Confirmar nova senha
              <Obrigatorio />
            </span>
            <input
              type="password"
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
              autoComplete="new-password"
              aria-required="true"
              className={campo}
            />
          </label>

          <ul className="flex flex-col gap-1.5 rounded-xl bg-beige/45 p-3.5">
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

          {erro && (
            <p role="alert" className="rounded-lg bg-red-600/10 px-3 py-2 text-[13px] font-semibold text-red-700">
              {erro}
            </p>
          )}

          <div className="mt-1 flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={enviando}
              className="rounded-[10px] border border-navy/18 px-[18px] py-3 text-sm font-bold disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!podeEnviar || enviando}
              className="flex-1 rounded-[10px] bg-navy py-3 text-sm font-bold text-white transition hover:bg-navy-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {enviando ? "Aguarde…" : "Alterar senha"}
            </button>
          </div>

          <button
            type="button"
            disabled={enviando}
            onClick={() => {
              setErro("");
              if (modo === "atual") void enviarCodigo();
              else setModo("atual");
            }}
            className="text-center text-[13px] font-semibold text-teal-mid disabled:opacity-50"
          >
            {modo === "atual" ? "Esqueci minha senha atual (receber código por e-mail)" : "Lembrei da senha atual"}
          </button>
        </form>
      </div>
    </div>
  );
}
