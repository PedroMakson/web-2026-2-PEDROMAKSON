import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText } from "lucide-react";

const PERIODOS = ["7 dias", "30 dias", "90 dias"] as const;
type Periodo = (typeof PERIODOS)[number];

const DADOS: Record<Periodo, { receita: string; inad: string; matriculas: string; freq: string; dR: string; dI: string; dM: string }> = {
  "7 dias": { receita: "R$ 12.480", inad: "4,1%", matriculas: "9", freq: "3,4", dR: "+6,2% vs. semana anterior", dI: "-0,4 p.p.", dM: "+2 novas" },
  "30 dias": { receita: "R$ 48.930", inad: "5,8%", matriculas: "34", freq: "3,1", dR: "+9,4% vs. mês anterior", dI: "+0,7 p.p.", dM: "+11 novas" },
  "90 dias": { receita: "R$ 141.200", inad: "6,3%", matriculas: "88", freq: "2,9", dR: "+14,1% vs. trimestre anterior", dI: "-1,1 p.p.", dM: "+23 novas" },
};

const RECEITA_VALS: Record<Periodo, number[]> = {
  "7 dias": [7.8, 9.1, 8.4, 10.2, 11.6, 12.4],
  "30 dias": [38.4, 41.2, 39.8, 44.6, 46.1, 48.9],
  "90 dias": [112, 118, 121, 130, 136, 141],
};
const MESES = ["abr", "mai", "jun", "jul", "ago", "set"];

const FAIXAS = [
  { faixa: "06h – 09h", valor: "31%", pct: 31, cor: "bg-teal" },
  { faixa: "09h – 12h", valor: "14%", pct: 14, cor: "bg-teal/60" },
  { faixa: "16h – 19h", valor: "38%", pct: 38, cor: "bg-navy" },
  { faixa: "19h – 22h", valor: "17%", pct: 17, cor: "bg-teal/60" },
];

export default function AdminHome() {
  const navigate = useNavigate();
  const [periodo, setPeriodo] = useState<Periodo>("30 dias");
  const d = DADOS[periodo];
  const rv = RECEITA_VALS[periodo];
  const max = Math.max(...rv);
  const unidade = periodo === "90 dias" ? "k" : "R$ ";

  const kpis = [
    { label: "Receita", valor: d.receita, delta: d.dR, destaque: true },
    { label: "Inadimplência", valor: d.inad, delta: d.dI },
    { label: "Matrículas", valor: d.matriculas, delta: d.dM },
    { label: "Frequência média", valor: d.freq, delta: "check-ins/aluno" },
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
            Receita por mês
          </div>
          <div className="mt-5 flex items-end gap-3">
            {rv.map((v, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-2">
                <div className="text-center text-[11px] font-bold text-navy/60">
                  {unidade}
                  {v}
                  {unidade === "k" ? "" : "k"}
                </div>
                <div className="flex h-[110px] w-full items-end">
                  <div
                    className={`w-full rounded-t-lg ${i === rv.length - 1 ? "bg-teal" : "bg-navy/[.18]"}`}
                    style={{ height: `${Math.round((v / max) * 100)}%` }}
                  />
                </div>
                <div className="text-center text-[11px] text-navy/45">{MESES[i]}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-navy/10 bg-white p-[22px]">
          <div className="text-[11px] font-bold uppercase tracking-wider text-navy/45">
            Frequência por faixa de horário
          </div>
          <div className="mt-[18px] flex flex-col gap-3">
            {FAIXAS.map((f) => (
              <div key={f.faixa}>
                <div className="flex justify-between text-[13px] font-semibold">
                  <span>{f.faixa}</span>
                  <span className="text-navy/55">{f.valor}</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-navy/[.08]">
                  <div className={`h-full ${f.cor}`} style={{ width: `${f.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
