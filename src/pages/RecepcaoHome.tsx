import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../data/store";
import TrocaPlanoModal from "../components/TrocaPlanoModal";

const CHECKINS_RECENTES = [
  { nome: "Luana Freire", hora: "08:42", origem: "App" },
  { nome: "Ana Beatriz Lima", hora: "08:20", origem: "App" },
  { nome: "Marcela Duarte", hora: "07:58", origem: "Recepção" },
  { nome: "Rafael Torres", hora: "07:31", origem: "App" },
  { nome: "Pedro Makson", hora: "07:12", origem: "App" },
];

function diasAte(fim: string) {
  const [d, m, a] = fim.split("/").map(Number);
  const alvo = new Date(a, m - 1, d);
  const hoje = new Date(2026, 8, 14);
  return Math.round((alvo.getTime() - hoje.getTime()) / 86400000);
}

export default function RecepcaoHome() {
  const navigate = useNavigate();
  const { alunos, pagamentos } = useStore();
  const [renovarId, setRenovarId] = useState<number | null>(null);

  const pendentes = pagamentos.filter((p) => !p.pago);
  const totalPendente = pendentes.reduce(
    (t, p) => t + Number(p.valor.replace(/[^\d,]/g, "").replace(",", ".")),
    0,
  );
  const vencendo = alunos
    .filter((a) => {
      const dias = diasAte(a.fim);
      return dias >= -30 && dias <= 20;
    })
    .slice(0, 4);

  const kpis = [
    { label: "Check-ins hoje", valor: "42", sub: "34 autoatendimento · 8 recepção" },
    {
      label: "Pagamentos pendentes",
      valor: pendentes.length,
      sub: `R$ ${totalPendente.toFixed(2).replace(".", ",")} em aberto`,
      destaque: true,
    },
    { label: "Matrículas vencendo", valor: vencendo.length, sub: "próximos 15 dias" },
    { label: "Novas matrículas", valor: "5", sub: "nesta semana" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <div
            key={k.label}
            className={`rounded-2xl border bg-white p-5 ${k.destaque ? "border-danger/30" : "border-navy/10"}`}
          >
            <div className="text-[11px] font-bold uppercase tracking-wider text-navy/45">
              {k.label}
            </div>
            <div className="font-display mt-1.5 text-4xl font-bold text-navy">
              {k.valor}
            </div>
            <div className="text-xs text-navy/55">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-navy/10 bg-white p-[22px]">
          <div className="flex items-center justify-between gap-2.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-navy/45">
              Matrículas vencendo
            </div>
            <button
              type="button"
              onClick={() => navigate("/recepcao/alunos")}
              className="text-xs font-bold text-teal-mid"
            >
              Ver todas
            </button>
          </div>
          <div className="mt-3.5 flex flex-col gap-2.5">
            {vencendo.length === 0 && (
              <p className="text-[13px] text-navy/50">
                Nenhuma matrícula vencendo nos próximos 15 dias.
              </p>
            )}
            {vencendo.map((v) => (
              <div
                key={v.id}
                className="flex items-center gap-3 rounded-xl border border-navy/[.09] p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold">{v.nome}</div>
                  <div className="text-xs text-navy/50">
                    {v.plano} · vence {v.fim}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setRenovarId(v.id)}
                  className="rounded-[9px] bg-teal/15 px-3.5 py-2 text-xs font-bold text-navy transition hover:bg-teal"
                >
                  Renovar
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-navy/10 bg-white p-[22px]">
          <div className="text-[11px] font-bold uppercase tracking-wider text-navy/45">
            Check-ins recentes
          </div>
          <div className="mt-3.5 flex flex-col">
            {CHECKINS_RECENTES.map((c, i) => (
              <div
                key={i}
                className="flex items-center gap-3 border-b border-navy/[.07] py-2.5 last:border-0"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal/15 text-[11px] font-bold">
                  {c.nome.split(" ").slice(0, 2).map((p) => p[0]).join("")}
                </div>
                <div className="flex-1 text-sm font-semibold">{c.nome}</div>
                <div className="text-xs text-navy/50">{c.hora}</div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                    c.origem === "App"
                      ? "bg-teal/15 text-teal-dark"
                      : "bg-navy/[.07] text-navy/60"
                  }`}
                >
                  {c.origem}
                </span>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => navigate("/recepcao/checkin")}
            className="mt-4 w-full rounded-[10px] border border-navy/18 py-2.5 text-[13px] font-bold text-navy transition hover:bg-navy/5"
          >
            Registrar check-in manual
          </button>
        </div>
      </div>

      <TrocaPlanoModal
        open={renovarId !== null}
        onClose={() => setRenovarId(null)}
        alunoId={renovarId}
        renovacao
      />
    </div>
  );
}
