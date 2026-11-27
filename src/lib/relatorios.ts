import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import writeExcelFile from "write-excel-file/universal";
import { type Aluno, type Avaliacao, brl, valorNum } from "../data/store";
import { imc, virgula } from "./avaliacao";
import { dataBrParaIso, HOJE_DEMO, somarDias } from "./datas";
import {
  checkinsNa,
  type Dados,
  faixasNa,
  indicadoresDoPeriodo,
  inicioDaMatriculaDe,
  type Janela,
  janelaEntre,
  matriculasNa,
  origensNa,
  pagoEmIso,
  percentual,
  serieNoPeriodo,
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

// Atalhos do filtro de período; "Personalizado" deixa escolher o início e o fim.
export const ATALHOS_PERIODO = [
  { rotulo: "Últimos 7 dias", dias: 7 },
  { rotulo: "Últimos 30 dias", dias: 30 },
  { rotulo: "Últimos 90 dias", dias: 90 },
  { rotulo: "Personalizado", dias: 0 },
] as const;
export const intervaloDoAtalho = (dias: number) => ({ inicio: somarDias(HOJE_DEMO, -(dias - 1)), fim: HOJE_DEMO });
export const periodoTexto = (inicio: string, fim: string) => `${dataBr(inicio)} a ${dataBr(fim)}`;
export { janelaEntre };

const NAVY: [number, number, number] = [18, 33, 66];
// as fontes padrão do PDF não têm o sinal de menos tipográfico
const sinalPdf = (t: string) => t.replace(/−/g, "-");

const dataBr = (iso: string) => formatarDataBr(iso);
const dataHoraBr = (d: Date) =>
  `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

type Contexto = Dados & { avaliacoes: Avaliacao[] };  // matriculas (opcional) traz os cancelamentos

// Os relatórios montam um conteúdo neutro (seções, indicadores e tabelas) e depois ele é desenhado em PDF ou em Excel.
type Item =
  | { tipo: "secao"; titulo: string }
  | { tipo: "indicadores"; itens: [string, string][] }
  | { tipo: "tabela"; cabecalho: string[]; linhas: string[][]; vazio: string };
type Documento = { itens: Item[] };

const secao = (doc: Documento, titulo: string) => void doc.itens.push({ tipo: "secao", titulo });
const tabela = (doc: Documento, cabecalho: string[], linhas: string[][], vazio = "Nenhum registro no período.") =>
  void doc.itens.push({ tipo: "tabela", cabecalho, linhas, vazio });
const indicadores = (doc: Documento, itens: [string, string][]) => void doc.itens.push({ tipo: "indicadores", itens });

const textoDoPeriodo = (rotuloPeriodo: string, j: Janela) =>
  `${rotuloPeriodo} (${dataBr(somarDias(j.inicio, 1))} a ${dataBr(j.fim)} - ${j.dias} dia${j.dias === 1 ? "" : "s"})`;

// ---------------------------------------------------------------- PDF

function desenharPdf(doc: Documento, titulo: string, rotuloPeriodo: string, j: Janela, geradoPor: string) {
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
  pdf.text(`Período: ${textoDoPeriodo(rotuloPeriodo, j)}`, 40, 98);
  pdf.setTextColor(110, 110, 110);
  pdf.text(`Gerado por ${geradoPor} em ${dataHoraBr(new Date())}`, 40, 113);

  let y = 136;
  const fim = () => (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  for (const item of doc.itens) {
    if (item.tipo === "secao") {
      if (y > 730) {
        pdf.addPage();
        y = 50;
      }
      pdf.setTextColor(...NAVY);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.text(item.titulo, 40, y);
      y += 8;
    } else if (item.tipo === "indicadores") {
      autoTable(pdf, {
        startY: y,
        body: item.itens.map(([k, v]) => [k, sinalPdf(v)]),
        theme: "plain",
        margin: { left: 40, right: 40 },
        styles: { fontSize: 10, cellPadding: 4, textColor: NAVY },
        columnStyles: { 0: { fontStyle: "bold", cellWidth: 190 } },
      });
      y = fim() + 20;
    } else if (item.linhas.length === 0) {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(110, 110, 110);
      pdf.text(item.vazio, 40, y + 12);
      y += 34;
    } else {
      autoTable(pdf, {
        startY: y,
        head: [item.cabecalho],
        body: item.linhas.map((l) => l.map(sinalPdf)),
        margin: { left: 40, right: 40 },
        styles: { fontSize: 9, cellPadding: 5, textColor: NAVY },
        headStyles: { fillColor: NAVY, textColor: 255 },
        alternateRowStyles: { fillColor: [244, 247, 250] },
      });
      y = fim() + 24;
    }
  }

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
  return pdf;
}

// ---------------------------------------------------------------- Excel

type Celula = {
  value: string | number | Date;
  type?: StringConstructor | NumberConstructor | DateConstructor;
  format?: string;
  fontWeight?: "bold";
  backgroundColor?: string;
  textColor?: string;
};

// Os textos dos relatórios viram células de verdade: moeda, percentual, data e número ficam numéricos (dá para somar,
// filtrar e ordenar no Excel); o resto continua texto.
export function celulaDoTexto(texto: string): Celula {
  const t = texto.trim();
  const moeda = /^R\$ (-?[\d.]+,\d{2})$/.exec(t);
  if (moeda) return { value: Number(moeda[1].replace(/\./g, "").replace(",", ".")), type: Number, format: '"R$" #,##0.00' };
  const pct = /^(-?\d+(?:,\d+)?)%$/.exec(t);
  if (pct) return { value: Number(pct[1].replace(",", ".")) / 100, type: Number, format: "0.0%" };
  const data = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(t);
  if (data) return { value: new Date(Date.UTC(Number(data[3]), Number(data[2]) - 1, Number(data[1]))), type: Date, format: "dd/mm/yyyy" };
  if (/^-?\d+$/.test(t)) return { value: Number(t), type: Number };
  const decimal = /^-?\d+,(\d+)$/.exec(t);
  if (decimal) return { value: Number(t.replace(",", ".")), type: Number, format: decimal[1].length === 1 ? "0.0" : "0.00" };
  return { value: texto };
}

const CABECALHO: Omit<Celula, "value"> = { fontWeight: "bold", backgroundColor: "#122142", textColor: "#FFFFFF" };

// nome de aba do Excel: até 31 caracteres, sem \ / ? * [ ] :
const nomeDeAba = (titulo: string, usados: Set<string>) => {
  const base = titulo.replace(/[\\/?*[\]:]/g, " ").trim().slice(0, 28) || "Planilha";
  let nome = base;
  for (let n = 2; usados.has(nome.toLowerCase()); n++) nome = `${base} ${n}`;
  usados.add(nome.toLowerCase());
  return nome;
};

type Linha = (Celula | null)[];
const larguras = (linhas: Linha[]) => {
  const colunas = linhas.reduce((m, l) => Math.max(m, l.length), 0);
  return Array.from({ length: colunas }, (_, c) => ({
    width: Math.min(
      48,
      Math.max(10, ...linhas.map((l) => (l[c]?.value instanceof Date ? 12 : String(l[c]?.value ?? "").length + 2))),
    ),
  }));
};

async function desenharExcel(doc: Documento, titulo: string, rotuloPeriodo: string, j: Janela, geradoPor: string) {
  const usados = new Set<string>();
  const resumo: Linha[] = [
    [{ value: `GymFlow - ${titulo}`, fontWeight: "bold" }],
    [{ value: `Período: ${textoDoPeriodo(rotuloPeriodo, j)}` }],
    [{ value: `Gerado por ${geradoPor} em ${dataHoraBr(new Date())}` }],
  ];
  const abas: { data: Linha[]; sheet: string; columns: { width: number }[] }[] = [
    { data: resumo, sheet: nomeDeAba("Resumo", usados), columns: [] },
  ];

  // 1ª aba: identificação e indicadores; cada tabela vira uma aba própria
  let secaoAtual = "Dados";
  for (const item of doc.itens) {
    if (item.tipo === "secao") {
      secaoAtual = item.titulo;
    } else if (item.tipo === "indicadores") {
      resumo.push([null], [{ value: secaoAtual, fontWeight: "bold" }]);
      for (const [k, v] of item.itens) resumo.push([{ value: k, fontWeight: "bold" }, celulaDoTexto(v)]);
    } else {
      const linhas: Linha[] = [item.cabecalho.map((h) => ({ value: h, ...CABECALHO }))];
      if (item.linhas.length === 0) linhas.push([{ value: item.vazio }]);
      for (const l of item.linhas) linhas.push(l.map(celulaDoTexto));
      abas.push({ data: linhas, sheet: nomeDeAba(secaoAtual, usados), columns: larguras(linhas) });
    }
  }
  abas[0].columns = larguras(resumo);
  return writeExcelFile(abas).toBlob();
}

function receita(doc: Documento, c: Contexto, j: Janela) {
  const ind = indicadoresDoPeriodo(c, j);
  secao(doc, "Resumo");
  indicadores(doc, [
    ["Receita no período", ind.receitaTexto],
    ["Variação", sinalPdf(ind.receitaDelta)],
    ["Taxa de inadimplência", percentual(ind.inadimplencia.taxa)],
    ["Valor vencido em aberto", brl(ind.inadimplencia.emAtraso)],
    ["Parcelas que venceram no período", brl(ind.inadimplencia.base)],
  ]);

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

  const porSemana = j.dias <= 62;
  secao(doc, porSemana ? "Receita por semana" : "Receita por mês");
  tabela(doc, [porSemana ? "Semana até" : "Mês", "Receita"], serieNoPeriodo(c.pagamentos, j).map((s) => [s.rotulo, brl(s.valor)]));

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

function frequencia(doc: Documento, c: Contexto, j: Janela) {
  const semanas = Math.max(1, j.dias / 7);
  const feitos = checkinsNa(c.checkins, j);
  secao(doc, "Resumo");
  indicadores(doc, [
    ["Check-ins no período", String(feitos.length)],
    ["Alunos cadastrados", String(c.alunos.length)],
    ["Média por aluno, por semana", (c.alunos.length ? feitos.length / c.alunos.length / semanas : 0).toFixed(1).replace(".", ",")],
  ]);

  secao(doc, "Check-ins por aluno");
  tabela(
    doc,
    ["Aluno", "Instrutor", "Check-ins", "Por semana", "Último"],
    c.alunos.map((a) => {
      const dele = feitos.filter((x) => x.alunoId === a.id);
      const ultimo = dele.map((x) => x.data).sort().pop();
      return [a.nome, a.instrutor || "-", String(dele.length), (dele.length / semanas).toFixed(1).replace(".", ","), ultimo ? dataBr(ultimo) : "-"];
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

function matriculas(doc: Documento, c: Contexto, j: Janela) {
  const m = matriculasNa(c.alunos, c.planos, j, c.matriculas);
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

function avaliacoes(doc: Documento, c: Contexto, j: Janela) {
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

function construir(titulo: TituloRelatorio, j: Janela, dados: Contexto): Documento {
  const doc: Documento = { itens: [] };
  if (titulo === "Receita e inadimplência") receita(doc, dados, j);
  else if (titulo === "Frequência de treino") frequencia(doc, dados, j);
  else if (titulo === "Matrículas") matriculas(doc, dados, j);
  else avaliacoes(doc, dados, j);
  return doc;
}

// Monta o PDF do relatório pedido para o período escolhido.
export function montarRelatorio(titulo: TituloRelatorio, rotuloPeriodo: string, j: Janela, dados: Contexto, geradoPor: string) {
  return desenharPdf(construir(titulo, j, dados), titulo, rotuloPeriodo, j, geradoPor);
}

// O mesmo relatório em Excel (.xlsx): uma aba de resumo e uma aba por tabela.
export function montarExcel(titulo: TituloRelatorio, rotuloPeriodo: string, j: Janela, dados: Contexto, geradoPor: string) {
  return desenharExcel(construir(titulo, j, dados), titulo, rotuloPeriodo, j, geradoPor);
}

export const FORMATOS = ["PDF", "Excel"] as const;
export type FormatoRelatorio = (typeof FORMATOS)[number];

export const nomeDoArquivo = (titulo: string, inicio: string, fim: string, formato: FormatoRelatorio = "PDF") =>
  `gymflow-${titulo.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-")}-${inicio}-a-${fim}.${formato === "PDF" ? "pdf" : "xlsx"}`;
