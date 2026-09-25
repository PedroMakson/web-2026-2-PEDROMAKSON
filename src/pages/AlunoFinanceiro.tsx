import { useState } from "react";
import { useToast } from "../components/Toast";
import PixModal from "../components/PixModal";
import { PAGAMENTOS_ALUNO, type PagamentoStatus } from "../data/aluno";

function statusClasses(status: PagamentoStatus) {
  if (status === "Pago") return "text-teal-dark bg-teal/15";
  if (status === "Atrasado") return "text-white bg-danger";
  return "text-[#8a5a12] bg-[#d69e2e]/20";
}

export default function AlunoFinanceiro() {
  const toast = useToast();
  const [pagamentos, setPagamentos] = useState(PAGAMENTOS_ALUNO);
  const [pixOpen, setPixOpen] = useState(false);

  const cobrancaAberta = pagamentos.find((p) => p.status !== "Pago");
  const pendente = !!cobrancaAberta;

  function confirmarPix() {
    if (!cobrancaAberta) {
      setPixOpen(false);
      return;
    }
    setPagamentos((prev) =>
      prev.map((p) =>
        p === cobrancaAberta
          ? {
              ...p,
              status: "Pago",
              pagoEm: "14/09/2026",
              formaOrigem: "Pix · app",
            }
          : p,
      ),
    );
    setPixOpen(false);
    toast(
      `Pagamento de ${cobrancaAberta.valor} confirmado — matrícula atualizada e check-in liberado.`,
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        className={`rounded-2xl border bg-white p-[22px] ${pendente ? "border-danger/30" : "border-navy/10"}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-navy/45">
              Mensalidade atual
            </div>
            <div className="font-display mt-1.5 text-4xl font-bold text-navy">
              {cobrancaAberta?.valor ?? "R$ 129,90"}
            </div>
            <div
              className={`text-sm font-bold ${pendente ? "text-danger" : "text-teal-dark"}`}
            >
              {pendente ? "Cobrança em aberto" : "Mensalidade em dia"}
            </div>
          </div>
          {pendente && (
            <button
              type="button"
              onClick={() => setPixOpen(true)}
              className="rounded-xl bg-teal px-[26px] py-[15px] text-[15px] font-bold text-navy-dark transition hover:bg-neon"
            >
              Pagar com Pix
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-navy/10 bg-white">
        <table className="w-full min-w-[640px] border-collapse text-[13.5px]">
          <thead>
            <tr className="bg-navy/[.03] text-left text-[11px] font-bold uppercase tracking-wider text-navy/45">
              <th className="px-5 py-3.5 font-bold">Plano</th>
              <th className="px-3 py-3.5 font-bold">Vencimento</th>
              <th className="px-3 py-3.5 font-bold">Parcela</th>
              <th className="px-3 py-3.5 font-bold">Valor</th>
              <th className="px-3 py-3.5 font-bold">Pago em</th>
              <th className="px-3 py-3.5 font-bold">Forma</th>
              <th className="px-5 py-3.5 font-bold">Status</th>
            </tr>
          </thead>
          <tbody>
            {pagamentos.map((p, i) => (
              <tr key={i} className="border-t border-navy/[.07]">
                <td className="px-5 py-[15px]">
                  <div className="font-semibold">{p.plano}</div>
                  <div className="text-[11.5px] text-navy/45">
                    {p.matricula}
                  </div>
                </td>
                <td className="px-3 py-[15px] font-semibold">{p.venc}</td>
                <td className="px-3 py-[15px] text-navy/60">{p.parcela}</td>
                <td className="px-3 py-[15px]">{p.valor}</td>
                <td className="px-3 py-[15px] text-navy/60">{p.pagoEm}</td>
                <td className="px-3 py-[15px] text-navy/60">
                  {p.formaOrigem}
                </td>
                <td className="px-5 py-[15px]">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${statusClasses(p.status)}`}
                  >
                    {p.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PixModal
        open={pixOpen}
        onClose={() => setPixOpen(false)}
        onConfirm={confirmarPix}
        proxCobranca={
          cobrancaAberta
            ? {
                valor: cobrancaAberta.valor,
                venc: cobrancaAberta.venc,
                parcela: cobrancaAberta.parcela,
              }
            : null
        }
      />
    </div>
  );
}
