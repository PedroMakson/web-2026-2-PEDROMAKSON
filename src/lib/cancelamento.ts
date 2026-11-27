import { type Aluno, brl, type Pagamento, type Plano, valorNum } from "../data/store";

// O que o cancelamento de uma matrícula faz com o dinheiro do aluno:
//  - as parcelas que ainda vão vencer saem (não serão cobradas);
//  - as parcelas já vencidas e em aberto continuam em cobrança (cancelar não perdoa dívida);
//  - o plano pode ter multa: a regra do plano traz o percentual ("Multa de 10% sobre as parcelas restantes"), aplicado
//    sobre as parcelas que vão sair. Plano sem percentual (ex.: carência de 30 dias) não tem multa calculada.
export function simularCancelamento(aluno: Aluno, planos: Plano[], pagamentos: Pagamento[]) {
  const plano = planos.find((p) => p.nome === aluno.plano);
  const doAluno = pagamentos.filter((p) => p.nome === aluno.nome && !p.pago);
  const aVencer = doAluno.filter((p) => !p.atraso);
  const vencidas = doAluno.filter((p) => p.atraso);
  const total = (lista: Pagamento[]) => lista.reduce((t, p) => t + valorNum(p.valor), 0);
  const percentual = Number(/(\d+)\s*%/.exec(plano?.regra ?? "")?.[1] ?? 0);
  const multa = (total(aVencer) * percentual) / 100;
  return {
    plano,
    aVencer,
    vencidas,
    totalAVencer: total(aVencer),
    totalVencido: total(vencidas),
    percentual,
    multa,
    multaTexto: multa > 0 ? brl(multa) : undefined,
    regra: plano?.regra ?? "",
  };
}
