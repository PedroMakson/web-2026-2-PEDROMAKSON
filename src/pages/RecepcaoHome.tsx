import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { brl, useStore } from "../data/store";
import TrocaPlanoModal from "../components/TrocaPlanoModal";
import { formatarDataBr } from "../lib/pessoa";
import { HOJE_DEMO } from "../lib/datas";
import { janela, matriculasNa } from "../lib/indicadores";

function diasAte(fim: string) {
  const [d, m, a] = fim.split("/").map(Number);
  const alvo = new Date(a, m - 1, d);
  const hoje = new Date(2026, 8, 14);
  return Math.round((alvo.getTime() - hoje.getTime()) / 86400000);
}

export default function RecepcaoHome() {
  const navigate = useNavigate();
  const { alunos, planos, pagamentos, checkins } = useStore();

  // os 5 check-ins mais recentes (retroativos aparecem pela data em que foram feitos)
  const recentes = checkins
    .filter((c) => !c.cancelado)
    .sort((x, y) => `${y.data}${y.hora}${y.id}`.localeCompare(`${x.data}${x.hora}${x.id}`))
    .slice(0, 5)
    .map((c) => ({
      nome: alunos.find((a) => a.id === c.alunoId)?.nome ?? "Aluno",
      hora: c.hora || formatarDataBr(c.data).slice(0, 5),
      origem: c.origem,
    }));
  const [renovarId, setRenovarId] = useState<number | null>(null);

  const pendentes = pagamentos.filter((p) => !p.pago);
  const totalPendente = pendentes.reduce(
    (t, p) => t + Number(p.valor.replace(/[^\d,]/g, "").replace(",", ".")),
    0,
  );
  const vencendo = alunos
    .filter((a) => {
      const dias = diasAte(a.fim);
      return !a.cancelamento && dias >= 0 && dias <= 15;
    })
    .slice(0, 4);

  // check-ins de hoje por origem e matrículas novas da semana, direto dos dados
  const hoje = checkins.filter((c) => !c.cancelado && c.data === HOJE_DEMO);
  const peloApp = hoje.filter((c) => c.origem === "App").length;
  const pelaRecepcao = hoje.filter((c) => c.origem === "Recepção").length;
  const novasNaSemana = matriculasNa(alunos, planos, janela(7)).novas.length;

  const kpis = [
    { label: "Check-ins hoje", valor: hoje.length, sub: `${peloApp} autoatendimento · ${pelaRecepcao} recepção` },
    {
      label: "Pagamentos pendentes",
      valor: pendentes.length,
      sub: `${brl(totalPendente)} em aberto`,
      destaque: true,
    },
    { label: "Matrículas vencendo", valor: vencendo.length, sub: "próximos 15 dias" },
    { label: "Novas matrículas", valor: novasNaSemana, sub: "nesta semana" },
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
            {recentes.map((c, i) => (
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
