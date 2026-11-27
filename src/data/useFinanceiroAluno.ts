import { dataBrParaIso } from "../lib/datas";
import { type Pagamento, useStore } from "./store";
import { useAlunoLogado } from "./useAlunoLogado";

export type PagamentoStatus = "Pago" | "Pendente" | "Atrasado";

export type LinhaPagamento = {
  id: number;
  plano: string;
  matricula: string;
  venc: string;
  parcela: string;
  valor: string;
  pagoEm: string;
  formaOrigem: string;
  status: PagamentoStatus;
};

const porVencimento = (a: Pagamento, b: Pagamento) => dataBrParaIso(a.venc).localeCompare(dataBrParaIso(b.venc));

// As parcelas do aluno logado (as mesmas que a recepção vê), com a cobrança em aberto mais antiga e o pagamento por Pix.
export function useFinanceiroAluno() {
  const aluno = useAlunoLogado();
  const { pagamentos, registrarPagamento } = useStore();
  const doAluno = pagamentos.filter((p) => aluno && p.nome === aluno.nome);

  const linhas: LinhaPagamento[] = [...doAluno]
    .sort((a, b) => porVencimento(b, a))
    .map((p) => ({
      id: p.id,
      plano: p.plano,
      matricula: aluno?.matricula ?? "",
      venc: p.venc,
      parcela: p.parcela ?? "—",
      valor: p.valor,
      pagoEm: p.pagoEm ?? "—",
      formaOrigem: p.pago ? `${p.forma ?? "—"} · ${p.origem === "App" ? "app" : "recepção"}` : "—",
      status: p.pago ? "Pago" : p.atraso ? "Atrasado" : "Pendente",
    }));

  const cobrancaAberta = [...doAluno].filter((p) => !p.pago).sort(porVencimento)[0];

  // o Pix do app é simulado: confirmar grava a parcela como paga (origem "App")
  function pagarComPix() {
    if (cobrancaAberta) registrarPagamento(cobrancaAberta.id, "Pix", "App");
  }

  return { linhas, cobrancaAberta, pagarComPix };
}
