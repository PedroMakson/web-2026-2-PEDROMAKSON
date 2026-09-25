import { useState } from "react";
import { Download, FileText } from "lucide-react";
import { useToast } from "../components/Toast";

const RELATORIOS = [
  {
    titulo: "Receita e inadimplência",
    desc: "Faturamento por plano, taxa de inadimplência e evolução mensal.",
  },
  {
    titulo: "Frequência de treino",
    desc: "Check-ins por aluno, por instrutor e por faixa de horário.",
  },
  {
    titulo: "Matrículas",
    desc: "Novas matrículas, renovações e cancelamentos no período.",
  },
  {
    titulo: "Avaliações físicas",
    desc: "Evolução de peso, % de gordura e medidas por aluno.",
  },
];

const PERIODOS = ["Últimos 7 dias", "Últimos 30 dias", "Últimos 90 dias"];

const EXPORTACOES_INICIAL = [
  { relatorio: "Receita e inadimplência", periodo: "Últimos 30 dias", quando: "13/09/2026 09:12" },
  { relatorio: "Frequência de treino", periodo: "Últimos 90 dias", quando: "10/09/2026 17:40" },
];

export default function AdminRelatorios() {
  const toast = useToast();
  const [periodos, setPeriodos] = useState<Record<string, string>>(
    Object.fromEntries(RELATORIOS.map((r) => [r.titulo, "Últimos 30 dias"])),
  );
  const [exportacoes, setExportacoes] = useState(EXPORTACOES_INICIAL);

  function exportar(titulo: string) {
    const periodo = periodos[titulo];
    setExportacoes((prev) => [
      { relatorio: titulo, periodo, quando: "21/09/2026 agora" },
      ...prev,
    ]);
    toast(`PDF de "${titulo}" gerado (RF21).`);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {RELATORIOS.map((r) => (
          <div key={r.titulo} className="flex flex-col rounded-2xl border border-navy/10 bg-white p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal/15 text-teal-dark">
                <FileText size={18} />
              </div>
              <div>
                <div className="text-sm font-bold">{r.titulo}</div>
                <p className="mt-1 text-xs leading-relaxed text-navy/55">{r.desc}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              <select
                value={periodos[r.titulo]}
                onChange={(e) => setPeriodos({ ...periodos, [r.titulo]: e.target.value })}
                className="flex-1 rounded-[9px] border border-navy/16 bg-white px-2.5 py-2.5 text-[13px] font-semibold"
              >
                {PERIODOS.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => exportar(r.titulo)}
                className="flex items-center gap-1.5 whitespace-nowrap rounded-[9px] bg-navy px-3.5 py-2.5 text-[13px] font-bold text-white"
              >
                <Download size={15} /> Exportar PDF
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-navy/10 bg-white">
        <div className="border-b border-navy/[.07] px-5 py-4 text-sm font-bold">
          Exportações recentes
        </div>
        <table className="w-full min-w-[520px] border-collapse text-sm">
          <thead>
            <tr className="bg-navy/[.03] text-left text-[11px] font-bold uppercase tracking-wider text-navy/45">
              <th className="px-5 py-3">Relatório</th>
              <th className="px-3 py-3">Período</th>
              <th className="px-5 py-3">Quando</th>
            </tr>
          </thead>
          <tbody>
            {exportacoes.map((e, i) => (
              <tr key={i} className="border-t border-navy/[.07]">
                <td className="px-5 py-3.5 font-semibold">{e.relatorio}</td>
                <td className="px-3 py-3.5 text-navy/60">{e.periodo}</td>
                <td className="px-5 py-3.5 text-navy/50">{e.quando}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
