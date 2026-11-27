import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { brl, useStore } from "../data/store";
import { simularCancelamento } from "../lib/cancelamento";
import { useToast } from "./Toast";

// Cancelamento da matrícula de quem sai da academia: mostra o que acontece com as parcelas e a multa do plano antes
// de confirmar, e exige o motivo (fica registrado com a data e quem cancelou).
export default function CancelarMatriculaModal({
  open,
  onClose,
  alunoId,
}: {
  open: boolean;
  onClose: () => void;
  alunoId: number | null;
}) {
  const { alunos, planos, pagamentos, cancelarMatricula } = useStore();
  const { user } = useAuth();
  const toast = useToast();
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState("");

  const aluno = alunos.find((a) => a.id === alunoId);

  useEffect(() => {
    if (open) {
      setMotivo("");
      setErro("");
    }
  }, [open, alunoId]);

  if (!open || !aluno) return null;
  const sim = simularCancelamento(aluno, planos, pagamentos);

  function confirmar() {
    const r = cancelarMatricula(aluno!.id, motivo, `${user?.nome ?? "Equipe"} (${user?.perfil ?? "Equipe"})`);
    if (!r.ok) {
      setErro(r.motivo ?? "Não foi possível cancelar a matrícula.");
      return;
    }
    toast(r.mensagem ?? "Matrícula cancelada.");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-navy/60 p-5" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-[470px] overflow-auto rounded-[20px] bg-white p-7"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold text-navy">Cancelar matrícula</h2>
            <p className="mt-1 text-[13px] text-navy/55">
              {aluno.nome} · {aluno.matricula} · {aluno.plano} até {aluno.fim}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="text-navy/45">
            <X size={20} />
          </button>
        </div>

        <div className="mt-5 flex flex-col gap-2 rounded-xl bg-beige/60 p-4 text-[13px] leading-relaxed text-navy/80">
          <div className="text-[11px] font-bold uppercase tracking-wider text-navy/45">O que acontece ao confirmar</div>
          <p>
            A matrícula passa a <b>cancelada</b>, o acesso é bloqueado e o check-in deixa de ser liberado. Para voltar, o
            aluno faz uma nova matrícula (Trocar plano).
          </p>
          <p>
            {sim.aVencer.length > 0 ? (
              <>
                <b>{sim.aVencer.length} parcela(s) a vencer</b> ({brl(sim.totalAVencer)}) deixam de ser cobradas.
              </>
            ) : (
              <>Não há parcelas a vencer para remover.</>
            )}
          </p>
          {sim.vencidas.length > 0 && (
            <p className="font-semibold text-danger-dark">
              {sim.vencidas.length} parcela(s) já vencida(s) ({brl(sim.totalVencido)}) continuam em cobrança.
            </p>
          )}
          <p>
            {sim.multaTexto ? (
              <>
                Multa do plano: <b>{sim.multaTexto}</b> ({sim.percentual}% sobre as parcelas restantes).
              </>
            ) : (
              <>Regra do plano: {sim.regra ? sim.regra.replace(/\.$/, "") : "sem multa"}. Nenhuma multa calculada.</>
            )}
          </p>
        </div>

        <label className="mt-5 block text-[13px] font-bold">
          Motivo do cancelamento <span className="text-danger">*</span>
          <textarea
            value={motivo}
            onChange={(e) => {
              setMotivo(e.target.value);
              setErro("");
            }}
            rows={3}
            maxLength={300}
            placeholder="Ex.: mudou de cidade."
            className="mt-1.5 w-full rounded-xl border border-navy/16 px-3.5 py-3 text-sm font-normal outline-none focus:border-teal focus:ring-[3px] focus:ring-teal/25"
          />
        </label>
        {erro && <p className="mt-2 text-xs font-semibold text-danger-dark">{erro}</p>}

        <div className="mt-5 flex gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[10px] border border-navy/18 px-[18px] py-3 text-sm font-bold"
          >
            Voltar
          </button>
          <button
            type="button"
            onClick={confirmar}
            className="flex-1 rounded-[10px] border border-danger/40 bg-danger/10 py-3 text-sm font-bold text-danger-dark transition hover:bg-danger/20"
          >
            Cancelar matrícula
          </button>
        </div>
      </div>
    </div>
  );
}
