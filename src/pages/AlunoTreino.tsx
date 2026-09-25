import { useState } from "react";
import { TREINO_DIVISOES, type Exercicio } from "../data/aluno";

const DIVISOES = ["A", "B", "C"] as const;

export default function AlunoTreino() {
  const [divisao, setDivisao] = useState<(typeof DIVISOES)[number]>("A");
  const treino = TREINO_DIVISOES[divisao];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-navy/10 bg-white p-[22px]">
        <div>
          <div className="font-display text-[26px] font-bold text-navy">
            Divisão {divisao} · {treino.titulo}
          </div>
          <div className="mt-0.5 text-[13px] text-navy/55">
            Prescrito por Carla Menezes · atualizado em 12/08/2026
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {DIVISOES.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDivisao(d)}
              className={`rounded-[9px] border px-[15px] py-2.5 text-[13px] font-bold ${
                d === divisao
                  ? "border-navy bg-navy text-white"
                  : "border-navy/15 bg-white text-navy/60"
              }`}
            >
              Divisão {d}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-navy/10 bg-white">
        <div className="grid grid-cols-[2.2fr_.7fr_.8fr_.8fr] gap-3 bg-navy/[.03] px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-navy/45">
          <span>Exercício</span>
          <span>Séries</span>
          <span>Reps</span>
          <span>Carga</span>
        </div>
        {treino.exercicios.map((e: Exercicio) => (
          <div
            key={e.nome}
            className="grid grid-cols-[2.2fr_.7fr_.8fr_.8fr] items-center gap-3 border-t border-navy/[.07] px-5 py-[15px] text-sm"
          >
            <span className="font-semibold">{e.nome}</span>
            <span>{e.series}</span>
            <span>{e.reps}</span>
            <span className="font-bold text-teal-mid">{e.carga}</span>
          </div>
        ))}
      </div>

      <p className="text-xs text-navy/45">
        Somente o instrutor vinculado pode editar este treino (RF10).
      </p>
    </div>
  );
}
