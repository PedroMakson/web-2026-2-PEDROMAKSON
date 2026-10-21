import { ChevronLeft, ChevronRight, Droplet } from "lucide-react";
import type { Checkin } from "../lib/checkins";
import { HOJE_DEMO, paraIso } from "../lib/datas";

const DIAS_SEMANA = ["S", "T", "Q", "Q", "S", "S", "D"];
export const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const AMARELO = "#d69e2e";

export function NavegacaoMes({
  ano,
  mes,
  total,
  onMudar,
}: {
  ano: number;
  mes: number;
  total: number;
  onMudar: (delta: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="font-display text-xl font-bold text-navy">
        {MESES[mes]} {ano}
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-xl bg-teal/15 px-3 py-1.5">
          <Droplet size={14} className="text-teal-dark" />
          <span className="text-[13px] font-bold text-teal-dark">{total} check-ins no mês</span>
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => onMudar(-1)}
            aria-label="Mês anterior"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-navy/15 text-navy transition hover:border-teal"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            type="button"
            onClick={() => onMudar(1)}
            aria-label="Próximo mês"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-navy/15 text-navy transition hover:border-teal"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CalendarioFrequencia({
  ano,
  mes,
  checkins,
  podeRegistrar,
  onRegistrar,
  onDetalhe,
}: {
  ano: number;
  mes: number; // 0 = janeiro
  checkins: Checkin[];
  // dias passados sem check-in que podem receber um lançamento retroativo
  podeRegistrar?: (iso: string) => boolean;
  onRegistrar?: (iso: string) => void;
  onDetalhe?: (checkin: Checkin) => void;
}) {
  const primeiroDiaSemana = (new Date(ano, mes, 1).getDay() + 6) % 7; // 0 = segunda
  const totalDias = new Date(ano, mes + 1, 0).getDate();
  const vigentes = checkins.filter((c) => !c.cancelado);

  const celulas: (string | null)[] = [
    ...Array.from({ length: primeiroDiaSemana }, () => null),
    ...Array.from({ length: totalDias }, (_, i) => paraIso(new Date(ano, mes, i + 1))),
  ];

  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5">
        {DIAS_SEMANA.map((d, i) => (
          <div
            key={i}
            className="pb-1.5 text-center text-[11px] font-bold uppercase tracking-wide text-navy/40"
          >
            {d}
          </div>
        ))}

        {celulas.map((iso, i) => {
          if (!iso) return <div key={i} />;
          const dia = Number(iso.slice(8));
          const checkin = vigentes.find((c) => c.data === iso);
          const ehHoje = iso === HOJE_DEMO;
          const futuro = iso > HOJE_DEMO;
          const retroativo = checkin?.origem === "Retroativo";
          const registravel = !checkin && !!podeRegistrar?.(iso) && !!onRegistrar;

          let classe = "border-navy/10 text-navy/70";
          let titulo: string | undefined;
          if (ehHoje) {
            classe = "border-navy bg-navy text-white";
            titulo = checkin ? "Hoje — check-in feito" : "Hoje";
          } else if (checkin) {
            classe = retroativo
              ? "border-[#d69e2e]/50 bg-[#d69e2e]/15 text-[#8a5a12]"
              : "border-teal/40 bg-teal/15 text-teal-dark";
            titulo = retroativo ? "Check-in retroativo" : "Check-in registrado";
          } else if (futuro) {
            classe = "border-navy/5 text-navy/25";
          } else if (registravel) {
            classe =
              "cursor-pointer border-dashed border-teal/70 text-navy/70 transition hover:bg-teal/10";
            titulo = "Registrar check-in retroativo";
          }

          const conteudo = (
            <>
              <span>{dia}</span>
              {checkin && (
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    ehHoje ? "bg-neon" : retroativo ? "bg-[#d69e2e]" : "bg-teal-dark"
                  }`}
                />
              )}
            </>
          );
          const base =
            "flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-lg border text-sm font-semibold";

          if (checkin && onDetalhe) {
            return (
              <button
                key={i}
                type="button"
                title={titulo}
                onClick={() => onDetalhe(checkin)}
                className={`${base} ${classe} cursor-pointer`}
              >
                {conteudo}
              </button>
            );
          }
          if (registravel) {
            return (
              <button
                key={i}
                type="button"
                title={titulo}
                onClick={() => onRegistrar!(iso)}
                className={`${base} ${classe}`}
              >
                {conteudo}
              </button>
            );
          }
          return (
            <div key={i} title={titulo} className={`${base} ${classe}`}>
              {conteudo}
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-navy/10 pt-4 text-xs text-navy/50">
        <span className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-teal/40" />
          Check-in registrado
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: AMARELO }} />
          Check-in retroativo
        </span>
        {onRegistrar && (
          <span className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-sm border border-dashed border-teal" />
            Disponível para registrar
          </span>
        )}
        <span className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-navy" />
          Hoje
        </span>
      </div>
    </div>
  );
}
