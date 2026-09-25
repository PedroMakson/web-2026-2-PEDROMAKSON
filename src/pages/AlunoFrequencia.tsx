import { useState } from "react";
import { ChevronLeft, ChevronRight, Droplet } from "lucide-react";

const DIAS_SEMANA = ["S", "T", "Q", "Q", "S", "S", "D"];
const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

// "Hoje" fixo do protótipo: 14/09/2026.
const HOJE = new Date(2026, 8, 14);

// Dias com check-in registrado, por "ano-mês" (0-indexado). Mock — em
// setembro/2026 mantém a sequência de 6 dias seguidos que aparece na Home.
const CHECKINS: Record<string, number[]> = {
  "2026-8": [1, 3, 4, 6, 8, 9, 10, 11, 12, 13],
  "2026-7": [2, 3, 5, 7, 9, 10, 12, 14, 16, 17, 19, 21, 23, 24, 26, 28, 30, 31],
};

function chave(ano: number, mes: number) {
  return `${ano}-${mes}`;
}

function mesmaData(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function AlunoFrequencia() {
  const [cursor, setCursor] = useState(new Date(HOJE.getFullYear(), HOJE.getMonth(), 1));

  const ano = cursor.getFullYear();
  const mes = cursor.getMonth();
  const diasComCheckin = new Set(CHECKINS[chave(ano, mes)] ?? []);

  const primeiroDiaSemana = (new Date(ano, mes, 1).getDay() + 6) % 7; // 0 = segunda
  const totalDias = new Date(ano, mes + 1, 0).getDate();

  const celulas: { dia: number | null; data: Date | null }[] = [
    ...Array.from({ length: primeiroDiaSemana }, () => ({ dia: null, data: null })),
    ...Array.from({ length: totalDias }, (_, i) => ({
      dia: i + 1,
      data: new Date(ano, mes, i + 1),
    })),
  ];

  const totalCheckins = diasComCheckin.size;

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <div className="rounded-2xl border border-navy/10 bg-white p-[22px]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-navy/45">
              Frequência
            </div>
            <div className="font-display mt-1 flex items-center gap-2 text-[26px] font-bold text-navy">
              {MESES[mes]} {ano}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-xl bg-teal/15 px-3.5 py-2">
              <Droplet size={16} className="text-teal-dark" />
              <span className="text-sm font-bold text-teal-dark">
                {totalCheckins} check-ins no mês
              </span>
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setCursor(new Date(ano, mes - 1, 1))}
                aria-label="Mês anterior"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-navy/15 text-navy transition hover:border-teal"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => setCursor(new Date(ano, mes + 1, 1))}
                aria-label="Próximo mês"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-navy/15 text-navy transition hover:border-teal"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-navy/10 bg-white p-[22px]">
        <div className="grid grid-cols-7 gap-1.5">
          {DIAS_SEMANA.map((d, i) => (
            <div
              key={i}
              className="pb-1.5 text-center text-[11px] font-bold uppercase tracking-wide text-navy/40"
            >
              {d}
            </div>
          ))}

          {celulas.map((c, i) => {
            if (!c.data) return <div key={i} />;
            const fezCheckin = diasComCheckin.has(c.dia!);
            const ehHoje = mesmaData(c.data, HOJE);
            const futuro = c.data > HOJE;

            return (
              <div
                key={i}
                className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border text-sm font-semibold ${
                  ehHoje
                    ? "border-navy bg-navy text-white"
                    : fezCheckin
                      ? "border-teal/40 bg-teal/15 text-teal-dark"
                      : futuro
                        ? "border-navy/5 text-navy/25"
                        : "border-navy/10 text-navy/70"
                }`}
              >
                <span>{c.dia}</span>
                {fezCheckin && !ehHoje && (
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-dark" />
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex items-center gap-2 border-t border-navy/10 pt-4 text-xs text-navy/50">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-teal/40" />
          Dia com check-in registrado
          <span className="ml-4 inline-block h-2.5 w-2.5 rounded-full bg-navy" />
          Hoje
        </div>
      </div>
    </div>
  );
}
