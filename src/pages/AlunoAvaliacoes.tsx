import { AVALIACOES, AVAL_KPIS, EVOLUCAO_PESO } from "../data/aluno";

export default function AlunoAvaliacoes() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {AVAL_KPIS.map((k) => (
          <div
            key={k.label}
            className="rounded-2xl border border-navy/10 bg-white p-5"
          >
            <div className="text-[11px] font-bold uppercase tracking-wider text-navy/45">
              {k.label}
            </div>
            <div className="font-display mt-1.5 text-[32px] font-bold text-navy">
              {k.valor}
            </div>
            <div className={`text-xs font-bold ${k.cor}`}>{k.delta}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-navy/10 bg-white p-[22px]">
        <div className="text-[11px] font-bold uppercase tracking-wider text-navy/45">
          Evolução do peso
        </div>
        <div className="mt-5 flex h-[150px] items-end gap-3.5">
          {EVOLUCAO_PESO.map((p) => (
            <div
              key={p.data}
              className="flex h-full flex-1 flex-col justify-end gap-2"
            >
              <div className="text-center text-xs font-bold text-navy">
                {p.valor}
              </div>
              <div
                className={`w-full rounded-t-lg ${p.cor}`}
                style={{ height: `${p.altura}%` }}
              />
              <div className="text-center text-[11px] text-navy/45">
                {p.data}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-navy/10 bg-white">
        <div className="bg-navy/[.03] px-5 py-[18px] text-[11px] font-bold uppercase tracking-wider text-navy/45">
          Histórico de avaliações
        </div>
        {AVALIACOES.map((a) => (
          <div
            key={a.data}
            className="border-t border-navy/[.07] px-5 py-[18px]"
          >
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <span className="text-sm font-bold">{a.data}</span>
              <span className="text-xs text-navy/50">{a.instrutor}</span>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-5 text-[13px] text-navy/55">
              <span>
                Peso <strong className="text-navy">{a.peso}</strong>
              </span>
              <span>
                Altura <strong className="text-navy">{a.altura}</strong>
              </span>
              <span>
                % gordura <strong className="text-navy">{a.gordura}</strong>
              </span>
              <span>
                Medidas <strong className="text-navy">{a.medidas}</strong>
              </span>
            </div>
            {a.obs && (
              <p className="mt-2.5 rounded-[10px] bg-beige/45 px-3 py-2.5 text-[13px] leading-relaxed text-navy/70">
                {a.obs}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
