import { useStore } from "../data/store";
import { useAlunoLogado } from "../data/useAlunoLogado";
import {
  dataBr,
  faixaDoImc,
  imc,
  maisRecentesPrimeiro,
  medidas,
  rotuloMes,
  virgula,
} from "../lib/avaliacao";

const COR_BARRA = ["bg-navy/[.18]", "bg-navy/30", "bg-navy/45", "bg-teal"];

// Tudo calculado das avaliações que o instrutor registrou (lidas do banco); nada fixo na tela.
export default function AlunoAvaliacoes() {
  const aluno = useAlunoLogado();
  const { avaliacoes } = useStore();
  const historico = maisRecentesPrimeiro(avaliacoes.filter((a) => a.alunoId === aluno?.id));

  if (historico.length === 0) {
    return (
      <div className="rounded-2xl border border-navy/10 bg-white p-8 text-center text-sm text-navy/55">
        Nenhuma avaliação física registrada ainda. Quem registra é o seu instrutor.
      </div>
    );
  }

  const atual = historico[0];
  const primeira = historico[historico.length - 1];
  const varios = historico.length > 1;
  const imcAtual = Math.round(imc(atual) * 10) / 10; // a faixa vale para o número que a tela mostra
  const sinal = (n: number) => (n > 0 ? "+" : n < 0 ? "-" : "");

  const kpis = [
    {
      label: "Peso atual",
      valor: `${virgula(atual.peso, 1)} kg`,
      delta: varios
        ? `${sinal(atual.peso - primeira.peso)}${virgula(Math.abs(atual.peso - primeira.peso), 1)} kg desde a 1ª avaliação`
        : "primeira avaliação",
      cor: varios && atual.peso < primeira.peso ? "text-teal-dark" : "text-navy/50",
    },
    {
      label: "% de gordura",
      valor: atual.gordura !== undefined ? `${virgula(atual.gordura, 1)}%` : "—",
      delta:
        varios && atual.gordura !== undefined && primeira.gordura !== undefined
          ? `${sinal(atual.gordura - primeira.gordura)}${virgula(Math.abs(atual.gordura - primeira.gordura), 1)} p.p.`
          : "sem comparação",
      cor:
        varios && atual.gordura !== undefined && primeira.gordura !== undefined && atual.gordura < primeira.gordura
          ? "text-teal-dark"
          : "text-navy/50",
    },
    { label: "IMC", valor: virgula(imcAtual, 1), delta: faixaDoImc(imcAtual), cor: "text-navy/50" },
    { label: "Avaliações", valor: String(historico.length), delta: `última em ${dataBr(atual.data)}`, cor: "text-navy/50" },
  ];

  // evolução do peso: as últimas quatro avaliações, da mais antiga para a mais nova
  const pontos = historico.slice(0, 4).reverse();
  const pesos = pontos.map((p) => p.peso);
  const maior = Math.max(...pesos);
  const menor = Math.min(...pesos);
  const altura = (peso: number) => (maior === menor ? 80 : 100 - ((maior - peso) / (maior - menor)) * 45);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl border border-navy/10 bg-white p-5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-navy/45">{k.label}</div>
            <div className="font-display mt-1.5 text-[32px] font-bold text-navy">{k.valor}</div>
            <div className={`text-xs font-bold ${k.cor}`}>{k.delta}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-navy/10 bg-white p-[22px]">
        <div className="text-[11px] font-bold uppercase tracking-wider text-navy/45">Evolução do peso</div>
        <div className="mt-5 flex h-[150px] items-end gap-3.5">
          {pontos.map((p, i) => (
            <div key={p.id} className="flex h-full flex-1 flex-col justify-end gap-2">
              <div className="text-center text-xs font-bold text-navy">{virgula(p.peso, 1)}</div>
              <div
                className={`w-full rounded-t-lg ${COR_BARRA[COR_BARRA.length - pontos.length + i]}`}
                style={{ height: `${altura(p.peso)}%` }}
              />
              <div className="text-center text-[11px] text-navy/45">{rotuloMes(p.data)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-navy/10 bg-white">
        <div className="bg-navy/[.03] px-5 py-[18px] text-[11px] font-bold uppercase tracking-wider text-navy/45">
          Histórico de avaliações
        </div>
        {historico.map((a) => (
          <div key={a.id} className="border-t border-navy/[.07] px-5 py-[18px]">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <span className="text-sm font-bold">{dataBr(a.data)}</span>
              <span className="text-xs text-navy/50">{a.instrutor}</span>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-5 text-[13px] text-navy/55">
              <span>
                Peso <strong className="text-navy">{virgula(a.peso, 1)} kg</strong>
              </span>
              <span>
                Altura <strong className="text-navy">{virgula(a.altura, 2)} m</strong>
              </span>
              <span>
                % gordura{" "}
                <strong className="text-navy">{a.gordura !== undefined ? `${virgula(a.gordura, 1)}%` : "—"}</strong>
              </span>
              <span>
                Medidas <strong className="text-navy">{medidas(a)}</strong>
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
