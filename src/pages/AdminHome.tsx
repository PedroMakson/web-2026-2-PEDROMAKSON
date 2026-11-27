import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText } from "lucide-react";
import { useStore } from "../data/store";
import { brl } from "../data/store";
import { indicadoresDoPeriodo, percentual } from "../lib/indicadores";

const PERIODOS = ["7 dias", "30 dias", "90 dias"] as const;
type Periodo = (typeof PERIODOS)[number];
const DIAS: Record<Periodo, number> = { "7 dias": 7, "30 dias": 30, "90 dias": 90 };

const CORES_FAIXA = ["bg-teal", "bg-teal/60", "bg-navy/70", "bg-navy", "bg-teal/60", "bg-navy/30"];

export default function AdminHome() {
  const navigate = useNavigate();
  const { alunos, planos, pagamentos, checkins, matriculas } = useStore();
  const [periodo, setPeriodo] = useState<Periodo>("30 dias");
  const dias = DIAS[periodo];
  const ind = indicadoresDoPeriodo({ alunos, planos, pagamentos, checkins, matriculas }, dias);
  const rv = ind.serie;
  const max = Math.max(1, ...rv.map((v) => v.valor));
  const porSemana = dias <= 7;

  const porOrigem = ind.origens;
  const totalOrigens = Math.max(1, ind.totalCheckins);

  const kpis = [
    { label: "Receita", valor: ind.receitaTexto, delta: ind.receitaDelta, destaque: true },
    {
      label: "Inadimplência",
      valor: percentual(ind.inadimplencia.taxa),
      delta: `${ind.inadimplenciaDelta} · ${brl(ind.inadimplencia.emAtraso)} em atraso`,
    },
    {
      label: "Matrículas",
      valor: String(ind.matriculas.ativas.length),
      delta: `+${ind.matriculas.novas.length} novas · ${ind.matriculas.renovacoes.length} renovação(ões) · ${ind.matriculas.cancelamentos.length} cancelada(s)`,
    },
    { label: "Frequência média", valor: ind.frequenciaMedia.toFixed(1).replace(".", ","), delta: "check-ins/aluno por semana" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5 rounded-xl border border-navy/12 bg-white p-1">
          {PERIODOS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriodo(p)}
              className={`rounded-lg px-3.5 py-2 text-[13px] font-bold ${
                periodo === p ? "bg-navy text-white" : "text-navy/55"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => navigate("/admin/relatorios")}
          className="flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-navy px-4 py-2.5 text-[13px] font-bold text-white"
        >
          <FileText size={16} /> Relatório completo
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <div
            key={k.label}
            className={`rounded-2xl p-5 ${
              k.destaque ? "bg-navy text-white" : "border border-navy/10 bg-white"
            }`}
          >
            <div
              className={`text-[11px] font-bold uppercase tracking-wider ${
                k.destaque ? "text-white/55" : "text-navy/45"
              }`}
            >
              {k.label}
            </div>
            <div className="font-display mt-1.5 text-[38px] font-bold leading-none">
              {k.valor}
            </div>
            <div
              className={`mt-1 text-xs font-bold ${
                k.destaque
                  ? "text-neon"
                  : k.label === "Inadimplência"
                    ? "text-danger"
                    : k.label === "Matrículas"
                      ? "text-teal-dark"
                      : "text-navy/50"
              }`}
            >
              {k.delta}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-navy/10 bg-white p-[22px]">
          <div className="text-[11px] font-bold uppercase tracking-wider text-navy/45">
            Receita por {porSemana ? "semana" : "mês"}
          </div>
          <div className="mt-5 flex items-end gap-3">
            {rv.map((v, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-2">
                <div className="text-center text-[11px] font-bold text-navy/60">{brl(v.valor).replace(",00", "")}</div>
                <div className="flex h-[110px] w-full items-end">
                  <div
                    className={`w-full rounded-t-lg ${i === rv.length - 1 ? "bg-teal" : "bg-navy/[.18]"}`}
                    style={{ height: `${Math.max(2, Math.round((v.valor / max) * 100))}%` }}
                  />
                </div>
                <div className="text-center text-[11px] text-navy/45">{v.rotulo}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-navy/10 bg-white p-[22px]">
          <div className="text-[11px] font-bold uppercase tracking-wider text-navy/45">
            Frequência por faixa de horário
          </div>
          <div className="mt-[18px] flex flex-col gap-3">
            {ind.faixas.map((f, i) => (
              <div key={f.faixa}>
                <div className="flex justify-between text-[13px] font-semibold">
                  <span>{f.faixa}</span>
                  <span className="text-navy/55">{f.pct}%</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-navy/[.08]">
                  <div className={`h-full ${CORES_FAIXA[i % CORES_FAIXA.length]}`} style={{ width: `${f.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-navy/10 bg-white p-[22px]">
        <div className="text-[11px] font-bold uppercase tracking-wider text-navy/45">
          Check-ins por origem — {periodo === "7 dias" ? "últimos 7 dias" : periodo === "30 dias" ? "últimos 30 dias" : "últimos 90 dias"}
        </div>
        <div className="mt-[18px] flex flex-col gap-3">
          {porOrigem.map((o) => (
            <div key={o.origem}>
              <div className="flex justify-between text-[13px] font-semibold">
                <span>{o.origem}</span>
                <span className="text-navy/55">{o.total}</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-navy/[.08]">
                <div
                  className={`h-full ${
                    o.origem === "App" ? "bg-teal" : o.origem === "Recepção" ? "bg-navy" : "bg-[#d69e2e]"
                  }`}
                  style={{ width: `${Math.round((o.total / totalOrigens) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
