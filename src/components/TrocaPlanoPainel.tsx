import { type Aluno, brl, mesesPlano, useStore, valorNum } from "../data/store";

const DIAS = ["Todo dia 05", "Todo dia 10", "Todo dia 15", "Todo dia 20"];

// Miolo da troca de plano: escolha do plano, vencimento das novas parcelas e o resumo do que
// acontece ao confirmar. Usado no modal "Trocar plano" e na aba "Matrícula e plano" da edição.
export default function TrocaPlanoPainel({
  aluno,
  planoEscolhido,
  onPlano,
  dia,
  onDia,
  renovacao = false,
  alterando = true,
  bloqueado = false,
}: {
  aluno: Aluno;
  planoEscolhido: string;
  onPlano: (nome: string) => void;
  dia: string;
  onDia: (dia: string) => void;
  renovacao?: boolean;
  // false quando o plano escolhido é o atual: esconde vencimento e resumo da troca
  alterando?: boolean;
  // true: planos só para consulta, até a pessoa liberar a edição
  bloqueado?: boolean;
}) {
  const { planos, pagamentos } = useStore();

  const atual = planos.find((p) => p.nome === aluno.plano);
  const novo = planos.find((p) => p.nome === planoEscolhido) ?? atual ?? planos[0];
  const n = mesesPlano(novo.duracao);
  const parcela = valorNum(novo.valor) / n;
  const abertas = pagamentos.filter((p) => p.nome === aluno.nome && !p.pago).length;
  const pagas = pagamentos.filter((p) => p.nome === aluno.nome && p.pago).length;

  const efeitos = [
    `${renovacao ? "Renovação: a" : "A"} matrícula atual é encerrada e uma nova é criada referenciando a anterior — treino, avaliações e check-ins são preservados (regra 5).`,
    `${pagas} parcela(s) já paga(s) permanecem no histórico, vinculadas à matrícula antiga.`,
    `${abertas} parcela(s) em aberto do plano ${aluno.plano} são canceladas.`,
    `${n} ${n > 1 ? "novas parcelas de" : "nova cobrança de"} ${brl(parcela)}, ${dia.toLowerCase()}.`,
    atual?.regra
      ? `Regra do plano atual: ${atual.regra}`
      : "Sem regra de cancelamento cadastrada para o plano atual.",
  ];

  return (
    <>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        {planos.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onPlano(p.nome)}
            disabled={bloqueado}
            className={`rounded-[11px] border-2 p-3 text-left ${
              planoEscolhido === p.nome ? "border-teal bg-teal/[.08]" : "border-navy/12 bg-white"
            } ${bloqueado ? "cursor-not-allowed opacity-60" : ""}`}
          >
            <div className="text-[13px] font-bold">
              {p.nome}
              {p.nome === aluno.plano && (
                <span className="ml-1.5 text-[10px] font-semibold text-navy/45">atual</span>
              )}
            </div>
            <div className="font-display mt-0.5 text-[22px] font-bold">{p.valor}</div>
            <div className="text-[11px] text-navy/50">
              {mesesPlano(p.duracao) > 1
                ? `${mesesPlano(p.duracao)}x de ${brl(valorNum(p.valor) / mesesPlano(p.duracao))}`
                : p.duracao}
            </div>
          </button>
        ))}
      </div>

      {alterando ? (
        <>
          <label className="mt-4 flex flex-col gap-1.5 text-xs font-bold">
            Vencimento das novas parcelas
            <select
              value={dia}
              onChange={(e) => onDia(e.target.value)}
              className="rounded-[9px] border border-navy/16 bg-white px-2.5 py-2.5 text-sm font-normal"
            >
              {DIAS.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </label>

          <div className="mt-4 flex flex-col gap-2 rounded-xl bg-beige/45 p-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-navy/50">
              O que acontece ao confirmar
            </div>
            {efeitos.map((e, i) => (
              <div key={i} className="flex gap-2 text-[13px] leading-relaxed">
                <span className="font-bold text-teal-mid">·</span>
                <span>{e}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="mt-4 text-xs leading-relaxed text-navy/50">
          {bloqueado
            ? "Plano bloqueado: só os dados cadastrais serão salvos. Clique em Editar plano para liberar a troca."
            : "Plano atual mantido: só os dados cadastrais serão salvos. Escolha outro plano acima para trocar — a matrícula atual é encerrada e uma nova é criada, com novas parcelas."}
        </p>
      )}
    </>
  );
}
