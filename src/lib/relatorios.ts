import { jsPDF } from "jspdf";
import autoTable, { type RowInput } from "jspdf-autotable";
import { type Aluno, type Avaliacao, brl, valorNum } from "../data/store";
import { imc, virgula } from "./avaliacao";
import { dataBrParaIso, HOJE_DEMO, somarDias } from "./datas";
import {
  checkinsNa,
  type Dados,
  faixasNa,
  indicadoresDoPeriodo,
  inicioDaMatriculaDe,
  janela,
  matriculasNa,
  origensNa,
  pagoEmIso,
  percentual,
  serieDeReceita,
} from "./indicadores";
import { formatarDataBr } from "./pessoa";

// PDFs dos quatro relatórios da administração (RF21), montados com os mesmos dados e as mesmas contas dos painéis.

export const RELATORIOS = [
  { titulo: "Receita e inadimplência", desc: "Faturamento por plano, taxa de inadimplência e evolução da receita." },
  { titulo: "Frequência de treino", desc: "Check-ins por aluno, por instrutor, por faixa de horário e por origem (App, Recepção e Retroativo)." },
  { titulo: "Matrículas", desc: "Matrículas ativas, novas, renovações e cancelamentos no período, e as que vencem nos próximos 15 dias." },
  { titulo: "Avaliações físicas", desc: "Evolução de peso, % de gordura e IMC por aluno, com as avaliações feitas no período." },
] as const;
export type TituloRelatorio = (typeof RELATORIOS)[number]["titulo"];

export const PERIODOS_RELATORIO = [
  { rotulo: "Últimos 7 dias", dias: 7 },
  { rotulo: "Últimos 30 dias", dias: 30 },
  { rotulo: "Últimos 90 dias", dias: 90 },
] as const;

const NAVY: [number, number, number] = [18, 33, 66];
// as fontes padrão do PDF não têm o sinal de menos tipográfico
const sinalPdf = (t: string) => t.replace(/−/g, "-");

const dataBr = (iso: string) => formatarDataBr(iso);
const dataHoraBr = (d: Date) =>
  `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

type Contexto = Dados & { avaliacoes: Avaliacao[] };  // matriculas (opcional) traz os cancelamentos

type Documento = { pdf: jsPDF; y: number };

function iniciar(titulo: string, rotuloPeriodo: string, dias: number, geradoPor: string): Documento {
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const largura = pdf.internal.pageSize.getWidth();
  pdf.setFillColor(...NAVY);
  pdf.rect(0, 0, largura, 74, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(20);
  pdf.text("GymFlow", 40, 34);
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "normal");
  pdf.text(titulo, 40, 56);
  pdf.setTextColor(...NAVY);
  pdf.setFontSize(10);
  const j = janela(dias);
  pdf.text(`Período: ${rotuloPeriodo} (${dataBr(somarDias(j.inicio, 1))} a ${dataBr(j.fim)})`, 40, 98);
  pdf.setTextColor(110, 110, 110);
  pdf.text(`Gerado por ${geradoPor} em ${dataHoraBr(new Date())}`, 40, 113);
  return { pdf, y: 136 };
}

function secao(doc: Documento, titulo: string) {
  if (doc.y > 730) {
    doc.pdf.addPage();
    doc.y = 50;
  }
  doc.pdf.setTextColor(...NAVY);
  doc.pdf.setFont("helvetica", "bold");
  doc.pdf.setFontSize(12);
  doc.pdf.text(titulo, 40, doc.y);
  doc.y += 8;
}

function tabela(doc: Documento, cabecalho: string[], linhas: RowInput[], vazio = "Nenhum registro no período.") {
  if (linhas.length === 0) {
    doc.pdf.setFont("helvetica", "normal");
    doc.pdf.setFontSize(10);
    doc.pdf.setTextColor(110, 110, 110);
    doc.pdf.text(vazio, 40, doc.y + 12);
    doc.y += 34;
    return;
  }
  autoTable(doc.pdf, {
    startY: doc.y,
    head: [cabecalho],
    body: linhas,
    margin: { left: 40, right: 40 },
    styles: { fontSize: 9, cellPadding: 5, textColor: NAVY },
    headStyles: { fillColor: NAVY, textColor: 255 },
    alternateRowStyles: { fillColor: [244, 247, 250] },
  });
  doc.y = (doc.pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 24;
}

function indicadores(doc: Documento, itens: [string, string][]) {
  autoTable(doc.pdf, {
    startY: doc.y,
    body: itens.map(([k, v]) => [k, v]),
    theme: "plain",
    margin: { left: 40, right: 40 },
    styles: { fontSize: 10, cellPadding: 4, textColor: NAVY },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 190 } },
  });
  doc.y = (doc.pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;
}

function rodape(pdf: jsPDF) {
  const total = pdf.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    pdf.setPage(i);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(140, 140, 140);
    const { width, height } = pdf.internal.pageSize;
    pdf.text("GymFlow - relatório gerado a partir dos dados do sistema", 40, height - 24);
    pdf.text(`Página ${i} de ${total}`, width - 40, height - 24, { align: "right" });
  }
}

function receita(doc: Documento, c: Contexto, dias: number) {
  const ind = indicadoresDoPeriodo(c, dias);
  secao(doc, "Resumo");
  indicadores(doc, [
    ["Receita no período", ind.receitaTexto],
    ["Variação", sinalPdf(ind.receitaDelta)],
    ["Taxa de inadimplência", percentual(ind.inadimplencia.taxa)],
    ["Valor vencido em aberto", brl(ind.inadimplencia.emAtraso)],
    ["Parcelas que venceram no período", brl(ind.inadimplencia.base)],
  ]);

  const j = janela(dias);
  const pagas = c.pagamentos.filter((p) => p.pago && (pagoEmIso(p) ?? "") > j.inicio && (pagoEmIso(p) ?? "") <= j.fim);
  secao(doc, "Faturamento por plano");
  tabela(
    doc,
    ["Plano", "Parcelas pagas", "Valor recebido"],
    c.planos
      .map((pl) => {
        const dele = pagas.filter((p) => p.plano === pl.nome);
        return [pl.nome, String(dele.length), brl(dele.reduce((t, p) => t + valorNum(p.valor), 0))];
      })
      .filter((l) => l[1] !== "0"),
  );

  secao(doc, dias <= 7 ? "Receita por semana" : "Receita por mês");
  tabela(doc, [dias <= 7 ? "Semana até" : "Mês", "Receita"], serieDeReceita(c.pagamentos, dias).map((s) => [s.rotulo, brl(s.valor)]));

  secao(doc, "Parcelas vencidas em aberto");
  tabela(
    doc,
    ["Aluno", "Plano", "Parcela", "Vencimento", "Valor"],
    c.pagamentos
      .filter((p) => !p.pago && (p.atraso || dataBrParaIso(p.venc) < HOJE_DEMO))
      .map((p) => [p.nome, p.plano, p.parcela ?? "-", p.venc, p.valor]),
    "Nenhuma parcela vencida em aberto.",
  );

  secao(doc, "Recebimentos por forma de pagamento");
  const formas = ["Pix", "Cartão", "Dinheiro"].map((f) => {
    const dela = pagas.filter((p) => p.forma === f);
    return [f, String(dela.length), brl(dela.reduce((t, p) => t + valorNum(p.valor), 0))];
  });
  tabela(doc, ["Forma", "Parcelas", "Valor"], formas.filter((f) => f[1] !== "0"));
}

function frequencia(doc: Documento, c: Contexto, dias: number) {
  const j = janela(dias);
  const feitos = checkinsNa(c.checkins, j);
  secao(doc, "Resumo");
  indicadores(doc, [
    ["Check-ins no período", String(feitos.length)],
    ["Alunos cadastrados", String(c.alunos.length)],
    ["Média por aluno, por semana", (c.alunos.length ? feitos.length / c.alunos.length / (dias / 7) : 0).toFixed(1).replace(".", ",")],
  ]);

  secao(doc, "Check-ins por aluno");
  tabela(
    doc,
    ["Aluno", "Instrutor", "Check-ins", "Por semana", "Último"],
    c.alunos.map((a) => {
      const dele = feitos.filter((x) => x.alunoId === a.id);
      const ultimo = dele.map((x) => x.data).sort().pop();
      return [a.nome, a.instrutor || "-", String(dele.length), (dele.length / (dias / 7)).toFixed(1).replace(".", ","), ultimo ? dataBr(ultimo) : "-"];
    }),
  );

  secao(doc, "Check-ins por instrutor");
  const instrutores = [...new Set(c.alunos.map((a) => a.instrutor || "Sem instrutor"))];
  tabela(
    doc,
    ["Instrutor", "Alunos", "Check-ins"],
    instrutores.map((nome) => {
      const alunos = c.alunos.filter((a) => (a.instrutor || "Sem instrutor") === nome);
      const ids = new Set(alunos.map((a) => a.id));
      return [nome, String(alunos.length), String(feitos.filter((x) => ids.has(x.alunoId)).length)];
    }),
  );

  secao(doc, "Check-ins por faixa de horário");
  tabela(doc, ["Faixa", "Check-ins", "Participação"], faixasNa(c.checkins, j).map((f) => [f.faixa.replace("–", "a"), String(f.total), `${f.pct}%`]));

  secao(doc, "Check-ins por origem");
  tabela(doc, ["Origem", "Check-ins"], origensNa(c.checkins, j).map((o) => [o.origem, String(o.total)]));
}

function matriculas(doc: Documento, c: Contexto, dias: number) {
  const m = matriculasNa(c.alunos, c.planos, janela(dias), c.matriculas);
  secao(doc, "Resumo");
  indicadores(doc, [
    ["Matrículas ativas hoje", String(m.ativas.length)],
    ["Novas no período", String(m.novas.length)],
    ["Renovações no período", String(m.renovacoes.length)],
    ["Cancelamentos no período", String(m.cancelamentos.length)],
    ["Acesso bloqueado", String(c.alunos.filter((a) => !a.ativo && !a.cancelamento).length)],
  ]);

  const linha = (a: Aluno) => [a.nome, a.matricula, a.plano, dataBr(inicioDaMatriculaDe(a, c.planos)), a.fim, a.instrutor || "-"];
  const cab = ["Aluno", "Matrícula", "Plano", "Início", "Vencimento", "Instrutor"];
  secao(doc, "Novas matrículas");
  tabela(doc, cab, m.novas.map(linha));
  secao(doc, "Renovações");
  tabela(doc, [...cab.slice(0, 5), "Renova"], m.renovacoes.map((a) => [...linha(a).slice(0, 5), a.matriculaAnterior]));

  secao(doc, "Cancelamentos");
  tabela(
    doc,
    ["Aluno", "Matrícula", "Plano", "Cancelada em", "Multa", "Motivo"],
    m.cancelamentos.map((x) => [
      c.alunos.find((a) => a.id === x.alunoId)?.nome ?? "-",
      `#${x.id}`,
      x.plano,
      x.canceladaEm ? dataBr(x.canceladaEm) : "-",
      x.multa ?? "-",
      x.motivo ?? "-",
    ]),
    "Nenhum cancelamento no período.",
  );

  secao(doc, "Vencem nos próximos 15 dias");
  tabela(
    doc,
    ["Aluno", "Plano", "Vencimento", "Financeiro"],
    c.alunos
      .filter((a) => {
        const venc = dataBrParaIso(a.fim);
        return !a.cancelamento && venc >= HOJE_DEMO && venc <= somarDias(HOJE_DEMO, 15);
      })
      .map((a) => [a.nome, a.plano, a.fim, a.fin]),
    "Nenhuma matrícula vence nos próximos 15 dias.",
  );
}

function avaliacoes(doc: Documento, c: Contexto, dias: number) {
  const j = janela(dias);
  const doPeriodo = c.avaliacoes.filter((v) => v.data > j.inicio && v.data <= j.fim);
  secao(doc, "Resumo");
  indicadores(doc, [
    ["Avaliações no período", String(doPeriodo.length)],
    ["Alunos com avaliação", String(new Set(c.avaliacoes.map((v) => v.alunoId)).size)],
    ["Alunos sem nenhuma avaliação", String(c.alunos.filter((a) => !c.avaliacoes.some((v) => v.alunoId === a.id)).length)],
  ]);

  secao(doc, "Evolução por aluno (primeira x última avaliação)");
  tabela(
    doc,
    ["Aluno", "Avaliações", "Peso", "% gordura", "IMC"],
    c.alunos.flatMap((a) => {
      const dele = c.avaliacoes.filter((v) => v.alunoId === a.id).sort((x, y) => x.data.localeCompare(y.data));
      if (dele.length === 0) return [];
      const [primeira, ultima] = [dele[0], dele[dele.length - 1]];
      const par = (x: number | undefined, y: number | undefined, casas: number, un: string) =>
        x === undefined || y === undefined ? "-" : `${virgula(x, casas)} > ${virgula(y, casas)}${un}`;
      return [[
        a.nome,
        String(dele.length),
        par(primeira.peso, ultima.peso, 1, " kg"),
        par(primeira.gordura, ultima.gordura, 1, "%"),
        par(imc(primeira), imc(ultima), 1, ""),
      ]];
    }),
    "Nenhuma avaliação registrada.",
  );

  secao(doc, "Avaliações feitas no período");
  tabela(
    doc,
    ["Data", "Aluno", "Peso", "Altura", "% gordura", "Cintura", "Instrutor"],
    doPeriodo
      .sort((x, y) => y.data.localeCompare(x.data))
      .map((v) => [
        dataBr(v.data),
        c.alunos.find((a) => a.id === v.alunoId)?.nome ?? "-",
        `${virgula(v.peso, 1)} kg`,
        `${virgula(v.altura, 2)} m`,
        v.gordura === undefined ? "-" : `${virgula(v.gordura, 1)}%`,
        v.cintura === undefined ? "-" : `${virgula(v.cintura, 0)} cm`,
        v.instrutor,
      ]),
  );
}

// Monta o PDF do relatório pedido para o período escolhido.
export function montarRelatorio(titulo: TituloRelatorio, rotuloPeriodo: string, dias: number, dados: Contexto, geradoPor: string) {
  const doc = iniciar(titulo, rotuloPeriodo, dias, geradoPor);
  if (titulo === "Receita e inadimplência") receita(doc, dados, dias);
  else if (titulo === "Frequência de treino") frequencia(doc, dados, dias);
  else if (titulo === "Matrículas") matriculas(doc, dados, dias);
  else avaliacoes(doc, dados, dias);
  rodape(doc.pdf);
  return doc.pdf;
}

export const nomeDoArquivo = (titulo: string, dias: number) =>
  `gymflow-${titulo.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-")}-${dias}-dias.pdf`;
