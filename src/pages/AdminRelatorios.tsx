import { useState } from "react";
import { Download, FileText } from "lucide-react";
import { useToast } from "../components/Toast";
import { useAuth } from "../auth/AuthContext";
import { useStore } from "../data/store";
import { montarRelatorio, nomeDoArquivo, PERIODOS_RELATORIO, RELATORIOS, type TituloRelatorio } from "../lib/relatorios";

const dataHoraBr = (iso: string) => {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

export default function AdminRelatorios() {
  const toast = useToast();
  const { user } = useAuth();
  const { alunos, planos, pagamentos, checkins, avaliacoes, matriculas, exportacoes, registrarExportacao } = useStore();
  const [periodos, setPeriodos] = useState<Record<string, string>>(
    Object.fromEntries(RELATORIOS.map((r) => [r.titulo, "Últimos 30 dias"])),
  );

  function exportar(titulo: TituloRelatorio) {
    const rotulo = periodos[titulo];
    const dias = PERIODOS_RELATORIO.find((p) => p.rotulo === rotulo)?.dias ?? 30;
    const por = user?.nome ?? "Administrador";
    try {
      const pdf = montarRelatorio(titulo, rotulo, dias, { alunos, planos, pagamentos, checkins, avaliacoes, matriculas }, por);
      pdf.save(nomeDoArquivo(titulo, dias));
    } catch {
      toast("Não foi possível gerar o PDF agora.");
      return;
    }
    registrarExportacao({ relatorio: titulo, periodo: rotulo, por });
    toast(`PDF de "${titulo}" gerado com os dados do sistema (RF21).`);
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
                {PERIODOS_RELATORIO.map((p) => (
                  <option key={p.rotulo}>{p.rotulo}</option>
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
              <th className="px-3 py-3">Gerado por</th>
              <th className="px-5 py-3">Quando</th>
            </tr>
          </thead>
          <tbody>
            {exportacoes.map((e) => (
              <tr key={e.id} className="border-t border-navy/[.07]">
                <td className="px-5 py-3.5 font-semibold">{e.relatorio}</td>
                <td className="px-3 py-3.5 text-navy/60">{e.periodo}</td>
                <td className="px-3 py-3.5 text-navy/60">{e.por}</td>
                <td className="px-5 py-3.5 text-navy/50">{dataHoraBr(e.criadoEm)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
