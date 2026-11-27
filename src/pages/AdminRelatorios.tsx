import { useState } from "react";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { useToast } from "../components/Toast";
import { useAuth } from "../auth/AuthContext";
import { useStore } from "../data/store";
import {
  ATALHOS_PERIODO,
  intervaloDoAtalho,
  type FormatoRelatorio,
  janelaEntre,
  montarExcel,
  montarRelatorio,
  nomeDoArquivo,
  periodoTexto,
  RELATORIOS,
  type TituloRelatorio,
} from "../lib/relatorios";
import { HOJE_DEMO } from "../lib/datas";

const dataHoraBr = (iso: string) => {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

type Filtro = { atalho: string; inicio: string; fim: string };
// entrega o arquivo ao navegador (download)
function baixar(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const FILTRO_INICIAL: Filtro = { atalho: "Últimos 30 dias", ...intervaloDoAtalho(30) };

export default function AdminRelatorios() {
  const toast = useToast();
  const { user } = useAuth();
  const { alunos, planos, pagamentos, checkins, avaliacoes, matriculas, exportacoes, registrarExportacao } = useStore();
  const [filtros, setFiltros] = useState<Record<string, Filtro>>(
    Object.fromEntries(RELATORIOS.map((r) => [r.titulo, FILTRO_INICIAL])),
  );

  const mudar = (titulo: string, novo: Partial<Filtro>) =>
    setFiltros((prev) => ({ ...prev, [titulo]: { ...prev[titulo], ...novo } }));

  // escolher um atalho preenche as datas; mexer nas datas passa o filtro para "Personalizado"
  function escolherAtalho(titulo: string, rotulo: string) {
    const dias = ATALHOS_PERIODO.find((a) => a.rotulo === rotulo)?.dias ?? 0;
    mudar(titulo, dias > 0 ? { atalho: rotulo, ...intervaloDoAtalho(dias) } : { atalho: rotulo });
  }

  async function exportar(titulo: TituloRelatorio, formato: FormatoRelatorio) {
    const { inicio, fim } = filtros[titulo];
    if (!inicio || !fim) {
      toast("Informe a data de início e a de fim.");
      return;
    }
    if (inicio > fim) {
      toast("A data de início não pode ser depois da data de fim.");
      return;
    }
    if (fim > HOJE_DEMO) {
      toast("A data de fim não pode ser futura.");
      return;
    }
    const por = user?.nome ?? "Administrador";
    const periodo = periodoTexto(inicio, fim);
    const dados = { alunos, planos, pagamentos, checkins, avaliacoes, matriculas };
    const arquivo = nomeDoArquivo(titulo, inicio, fim, formato);
    try {
      if (formato === "PDF") {
        montarRelatorio(titulo, "Personalizado", janelaEntre(inicio, fim), dados, por).save(arquivo);
      } else {
        baixar(await montarExcel(titulo, "Personalizado", janelaEntre(inicio, fim), dados, por), arquivo);
      }
    } catch {
      toast(`Não foi possível gerar o ${formato} agora.`);
      return;
    }
    registrarExportacao({ relatorio: titulo, periodo, por, formato });
    toast(`${formato} de "${titulo}" gerado com os dados do sistema (RF21).`);
  }

  const campo = "w-full rounded-[9px] border border-navy/16 bg-white px-2.5 py-2.5 text-[13px] font-semibold";

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {RELATORIOS.map((r) => {
          const f = filtros[r.titulo];
          return (
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

              <div className="mt-4 grid grid-cols-2 gap-2.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-navy/45">
                  De
                  <input
                    type="date"
                    value={f.inicio}
                    max={f.fim || HOJE_DEMO}
                    onChange={(e) => mudar(r.titulo, { inicio: e.target.value, atalho: "Personalizado" })}
                    className={`${campo} mt-1`}
                  />
                </label>
                <label className="text-[11px] font-bold uppercase tracking-wider text-navy/45">
                  Até
                  <input
                    type="date"
                    value={f.fim}
                    min={f.inicio}
                    max={HOJE_DEMO}
                    onChange={(e) => mudar(r.titulo, { fim: e.target.value, atalho: "Personalizado" })}
                    className={`${campo} mt-1`}
                  />
                </label>
              </div>

              <div className="mt-2.5 flex flex-col gap-2.5">
                <select
                  value={f.atalho}
                  onChange={(e) => escolherAtalho(r.titulo, e.target.value)}
                  aria-label="Atalho de período"
                  className="w-full rounded-[9px] border border-navy/16 bg-white px-2.5 py-2.5 text-[13px] font-semibold"
                >
                  {ATALHOS_PERIODO.map((p) => (
                    <option key={p.rotulo}>{p.rotulo}</option>
                  ))}
                </select>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => exportar(r.titulo, "PDF")}
                    className="flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[9px] bg-navy px-3 py-2.5 text-[13px] font-bold text-white"
                  >
                    <Download size={15} /> PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => exportar(r.titulo, "Excel")}
                    className="flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[9px] border border-navy bg-white px-3 py-2.5 text-[13px] font-bold text-navy transition hover:bg-navy/5"
                  >
                    <FileSpreadsheet size={15} /> Excel
                  </button>
                </div>
              </div>
            </div>
          );
        })}
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
              <th className="px-3 py-3">Formato</th>
              <th className="px-3 py-3">Gerado por</th>
              <th className="px-5 py-3">Quando</th>
            </tr>
          </thead>
          <tbody>
            {exportacoes.map((e) => (
              <tr key={e.id} className="border-t border-navy/[.07]">
                <td className="px-5 py-3.5 font-semibold">{e.relatorio}</td>
                <td className="px-3 py-3.5 text-navy/60">{e.periodo}</td>
                <td className="px-3 py-3.5 text-navy/60">{e.formato ?? "PDF"}</td>
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
