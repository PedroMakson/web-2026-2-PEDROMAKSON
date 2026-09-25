import { useState } from "react";
import { useToast } from "../components/Toast";
import { MATRICULA_LINHAS } from "../data/aluno";

export default function AlunoPerfil() {
  const toast = useToast();
  const [telefone, setTelefone] = useState("(84) 99812-4477");
  const [email, setEmail] = useState("pedro@email.com");

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-navy/10 bg-white p-[22px]">
        <div className="flex items-center gap-3.5">
          <div className="font-display flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-navy text-2xl font-bold text-neon">
            PM
          </div>
          <div>
            <div className="text-[17px] font-bold text-navy">
              Pedro Makson
            </div>
            <div className="text-[13px] text-navy/55">pedro@email.com</div>
            <button
              type="button"
              onClick={() => toast("Upload de foto vai para o S3 (dados de mídia).")}
              className="mt-1.5 text-xs font-bold text-teal-mid"
            >
              Trocar foto
            </button>
          </div>
        </div>

        <form
          className="mt-[22px] flex flex-col gap-3.5"
          onSubmit={(e) => {
            e.preventDefault();
            toast("Dados de contato atualizados.");
          }}
        >
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-navy">
            Telefone
            <input
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              className="rounded-[10px] border border-navy/20 px-3 py-2.5 text-sm font-normal outline-none focus:border-teal focus:ring-[3px] focus:ring-teal/25"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-navy">
            E-mail
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-[10px] border border-navy/20 px-3 py-2.5 text-sm font-normal outline-none focus:border-teal focus:ring-[3px] focus:ring-teal/25"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-navy">
            Nova senha
            <input
              type="password"
              placeholder="••••••••"
              className="rounded-[10px] border border-navy/20 px-3 py-2.5 text-sm font-normal outline-none focus:border-teal focus:ring-[3px] focus:ring-teal/25"
            />
          </label>
          <button
            type="submit"
            className="rounded-[10px] bg-navy py-3 text-sm font-bold text-white transition hover:bg-navy-hover"
          >
            Salvar alterações
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-navy/10 bg-white p-[22px]">
        <div className="text-[11px] font-bold uppercase tracking-wider text-navy/45">
          Dados cadastrais
        </div>
        <div className="mt-3.5 flex flex-col gap-2.5">
          {MATRICULA_LINHAS.map((linha) => (
            <div
              key={linha.k}
              className="flex justify-between gap-3 border-b border-dashed border-navy/10 pb-2.5 text-[13px]"
            >
              <span className="text-navy/55">{linha.k}</span>
              <span className="text-right font-bold">{linha.v}</span>
            </div>
          ))}
        </div>
        <p className="mt-3.5 text-xs leading-relaxed text-navy/45">
          Plano, preço e perfil de acesso só podem ser alterados pela
          recepção ou administração.
        </p>
      </div>
    </div>
  );
}
