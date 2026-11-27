import { mesesPlano, type Aluno, type Plano } from "../data/store";
import { inicioDaMatricula } from "./checkins";
import { dataBrParaIso, HOJE_DEMO } from "./datas";
import { formatarDataBr } from "./pessoa";

// As linhas do cartão "Minha matrícula", calculadas do cadastro do aluno e do plano dele (nada fixo na tela).
export function linhasDaMatricula(aluno: Aluno | undefined, planos: Plano[]) {
  if (!aluno) return [];
  const plano = planos.find((p) => p.nome === aluno.plano);
  const inicio = inicioDaMatricula(aluno.fim, mesesPlano(plano?.duracao ?? "1 mês"));
  const status =
    dataBrParaIso(aluno.fim) < HOJE_DEMO
      ? "Vencida"
      : aluno.fin === "Atrasado"
        ? "Ativa — mensalidade em atraso"
        : aluno.fin === "Pendente"
          ? "Ativa — pagamento em aberto"
          : "Ativa — em dia";
  return [
    { k: "Matrícula", v: aluno.matricula },
    { k: "Status", v: status },
    { k: "Plano", v: plano ? `${plano.nome} — ${plano.valor} · ${plano.duracao}` : aluno.plano },
    { k: "Início", v: formatarDataBr(inicio) },
    { k: "Válida até", v: aluno.fim },
    { k: "Renovação de", v: aluno.matriculaAnterior || "—" },
    { k: "Instrutor", v: aluno.instrutor },
  ];
}
