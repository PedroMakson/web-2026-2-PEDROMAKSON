import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { brl, mesesPlano, useStore, valorNum } from "../data/store";
import { useToast } from "./Toast";

const DIAS = ["Todo dia 05", "Todo dia 10", "Todo dia 15", "Todo dia 20"];

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
  const { alunos, planos, pagamentos, trocarPlano } = useStore();
  const toast = useToast();
  const navigate = useNavigate();

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

  const atual = planos.find((p) => p.nome === aluno.plano);
  const novo = planos.find((p) => p.nome === planoEscolhido) ?? atual ?? planos[0];
  const n = mesesPlano(novo.duracao);
  const parcela = valorNum(novo.valor) / n;
  const abertas = pagamentos.filter((p) => p.nome === aluno.nome && !p.pago).length;
  const pagas = pagamentos.filter((p) => p.nome === aluno.nome && p.pago).length;

  const efeitos = [
    `${renovacao ? "Renovação: a" : "A"} matrícula atual é encerrada e uma nova é criada referenciando a anterior — treino, avaliações e check-ins são preservados (regra 5).`,
    `${pagas} parcela(s) já paga(s) permanecem no histórico, vinculadas à matrícula antiga.`,
    `${abertas} parcela(s) em aberto do plano ${aluno.plano} são canceladas.`,
    `${n} ${n > 1 ? "novas parcelas de" : "nova cobrança de"} ${brl(parcela)}, ${dia.toLowerCase()}.`,
    atual?.regra
      ? `Regra do plano atual: ${atual.regra}`
      : "Sem regra de cancelamento cadastrada para o plano atual.",
  ];

  function confirmar() {
    const r = trocarPlano(aluno!.id, planoEscolhido, dia, renovacao);
    if (!r.ok) {
      toast(r.motivo ?? "Não foi possível trocar o plano.");
      return;
    }
    toast(r.mensagem ?? "Plano atualizado.");
    onClose();
    navigate("/recepcao/pagamentos");
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

        <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {planos.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPlanoEscolhido(p.nome)}
              className={`rounded-[11px] border-2 p-3 text-left ${
                planoEscolhido === p.nome
                  ? "border-teal bg-teal/[.08]"
                  : "border-navy/12 bg-white"
              }`}
            >
              <div className="text-[13px] font-bold">{p.nome}</div>
              <div className="font-display mt-0.5 text-[22px] font-bold">{p.valor}</div>
              <div className="text-[11px] text-navy/50">
                {mesesPlano(p.duracao) > 1
                  ? `${mesesPlano(p.duracao)}x de ${brl(valorNum(p.valor) / mesesPlano(p.duracao))}`
                  : p.duracao}
              </div>
            </button>
          ))}
        </div>

        <label className="mt-4 flex flex-col gap-1.5 text-xs font-bold">
          Vencimento das novas parcelas
          <select
            value={dia}
            onChange={(e) => setDia(e.target.value)}
            className="rounded-[9px] border border-navy/16 bg-white px-2.5 py-2.5 text-sm font-normal"
          >
            {DIAS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </label>

        <div className="mt-4 flex flex-col gap-2 rounded-xl bg-beige/45 p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-navy/50">
            O que acontece ao confirmar
          </div>
          {efeitos.map((e, i) => (
            <div key={i} className="flex gap-2 text-[13px] leading-relaxed">
              <span className="font-bold text-teal-mid">·</span>
              <span>{e}</span>
            </div>
          ))}
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
