import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { useStore } from "../data/store";
import { useToast } from "./Toast";
import TrocaPlanoPainel from "./TrocaPlanoPainel";
import { rotasPorArea } from "../lib/rotas";

export default function TrocaPlanoModal({
  open,
  onClose,
  alunoId,
  renovacao,
}: {
  open: boolean;
  onClose: () => void;
  alunoId: number | null;
  renovacao: boolean;
}) {
  const { alunos, trocarPlano } = useStore();
  const toast = useToast();
  const navigate = useNavigate();
  const rotas = rotasPorArea(useLocation().pathname);

  const aluno = alunos.find((a) => a.id === alunoId);
  const [planoEscolhido, setPlanoEscolhido] = useState(aluno?.plano ?? "");
  const [dia, setDia] = useState("Todo dia 10");

  useEffect(() => {
    if (open && aluno) {
      setPlanoEscolhido(aluno.plano);
      setDia("Todo dia 10");
    }
  }, [open, aluno]);

  if (!open || !aluno) return null;

  function confirmar() {
    const r = trocarPlano(aluno!.id, planoEscolhido, dia, renovacao);
    if (!r.ok) {
      toast(r.motivo ?? "Não foi possível trocar o plano.");
      return;
    }
    toast(r.mensagem ?? "Plano atualizado.");
    onClose();
    navigate(rotas.pagamentos);
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-navy/60 p-5"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[470px] max-h-[90vh] overflow-auto rounded-[20px] bg-white p-7"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold text-navy">
              {renovacao ? "Renovar matrícula" : "Trocar plano"}
            </h2>
            <p className="mt-1 text-[13px] text-navy/55">
              {aluno.nome} · hoje em {aluno.plano}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-navy/45">
            <X size={20} />
          </button>
        </div>

        <div className="mt-5">
          <TrocaPlanoPainel
            aluno={aluno}
            planoEscolhido={planoEscolhido}
            onPlano={setPlanoEscolhido}
            dia={dia}
            onDia={setDia}
            renovacao={renovacao}
          />
        </div>

        <div className="mt-5 flex gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[10px] border border-navy/18 px-[18px] py-3 text-sm font-bold"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirmar}
            className="flex-1 rounded-[10px] bg-teal py-3 text-sm font-bold text-navy-dark transition hover:bg-neon"
          >
            Confirmar troca
          </button>
        </div>
      </div>
    </div>
  );
}
