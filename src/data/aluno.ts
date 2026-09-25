export const MATRICULA_LINHAS = [
  { k: "Matrícula", v: "#2026-0142" },
  { k: "Status", v: "Ativa — pagamento em aberto" },
  { k: "Plano", v: "Mensal Fit — R$ 129,90 · 1 mês" },
  { k: "Início", v: "02/09/2026" },
  { k: "Válida até", v: "02/10/2026" },
  { k: "Renovação de", v: "#2025-0388" },
  { k: "Instrutor", v: "Carla Menezes" },
];

export type Exercicio = {
  nome: string;
  series: string;
  reps: string;
  carga: string;
};

export const TREINO_DIVISOES: Record<
  "A" | "B" | "C",
  { titulo: string; exercicios: Exercicio[] }
> = {
  A: {
    titulo: "Peito e tríceps",
    exercicios: [
      { nome: "Supino reto com barra", series: "4", reps: "8-10", carga: "40 kg" },
      { nome: "Supino inclinado halteres", series: "3", reps: "10-12", carga: "16 kg" },
      { nome: "Crucifixo na máquina", series: "3", reps: "12", carga: "30 kg" },
      { nome: "Tríceps corda", series: "4", reps: "12-15", carga: "25 kg" },
    ],
  },
  B: {
    titulo: "Costas e bíceps",
    exercicios: [
      { nome: "Puxada frontal", series: "4", reps: "10", carga: "45 kg" },
      { nome: "Remada curvada", series: "4", reps: "10-12", carga: "35 kg" },
      { nome: "Rosca direta", series: "3", reps: "12", carga: "30 kg" },
      { nome: "Rosca martelo", series: "3", reps: "15", carga: "20 kg" },
    ],
  },
  C: {
    titulo: "Pernas e core",
    exercicios: [
      { nome: "Agachamento livre", series: "4", reps: "10", carga: "60 kg" },
      { nome: "Leg press 45°", series: "4", reps: "10-12", carga: "120 kg" },
      { nome: "Cadeira extensora", series: "3", reps: "12", carga: "30 kg" },
      { nome: "Panturrilha em pé", series: "3", reps: "15", carga: "20 kg" },
    ],
  },
};

export const AVAL_KPIS = [
  { label: "Peso atual", valor: "79,2 kg", delta: "-4,2 kg em 4 meses", cor: "text-teal-dark" },
  { label: "% de gordura", valor: "19,4%", delta: "-3,6 p.p.", cor: "text-teal-dark" },
  { label: "IMC", valor: "25,0", delta: "faixa de atenção", cor: "text-navy/50" },
  { label: "Avaliações", valor: "3", delta: "próxima em out/2026", cor: "text-navy/50" },
];

export const EVOLUCAO_PESO = [
  { data: "abr", valor: "83,4", altura: 100, cor: "bg-navy/[.18]" },
  { data: "jun", valor: "81,0", altura: 88, cor: "bg-navy/30" },
  { data: "ago", valor: "79,2", altura: 78, cor: "bg-teal" },
  { data: "meta", valor: "76,0", altura: 64, cor: "bg-teal/20 border border-dashed border-teal" },
];

export const AVALIACOES = [
  {
    data: "12/08/2026",
    instrutor: "Carla Menezes",
    peso: "79,2 kg",
    altura: "1,78 m",
    gordura: "19,4%",
    medidas: "cintura 86 cm",
    obs: "Boa adesão ao treino de membros inferiores. Ajustar carga do agachamento.",
  },
  {
    data: "10/06/2026",
    instrutor: "Carla Menezes",
    peso: "81,0 kg",
    altura: "1,78 m",
    gordura: "21,1%",
    medidas: "cintura 89 cm",
    obs: "",
  },
  {
    data: "05/04/2026",
    instrutor: "Diego Rocha",
    peso: "83,4 kg",
    altura: "1,78 m",
    gordura: "23,0%",
    medidas: "cintura 92 cm",
    obs: "",
  },
];

export type PagamentoStatus = "Pago" | "Pendente" | "Atrasado";

export const PAGAMENTOS_ALUNO: {
  plano: string;
  matricula: string;
  venc: string;
  parcela: string;
  valor: string;
  pagoEm: string;
  formaOrigem: string;
  status: PagamentoStatus;
}[] = [
  {
    plano: "Mensal Fit",
    matricula: "#2026-0142",
    venc: "17/09/2026",
    parcela: "Única",
    valor: "R$ 129,90",
    pagoEm: "—",
    formaOrigem: "—",
    status: "Pendente",
  },
  {
    plano: "Mensal Fit",
    matricula: "#2026-0142",
    venc: "17/08/2026",
    parcela: "1/1",
    valor: "R$ 129,90",
    pagoEm: "15/08/2026",
    formaOrigem: "Pix · app",
    status: "Pago",
  },
  {
    plano: "Mensal Fit",
    matricula: "#2026-0142",
    venc: "17/07/2026",
    parcela: "1/1",
    valor: "R$ 129,90",
    pagoEm: "17/07/2026",
    formaOrigem: "Cartão · recepção",
    status: "Pago",
  },
  {
    plano: "Mensal Fit",
    matricula: "#2026-0142",
    venc: "17/06/2026",
    parcela: "1/1",
    valor: "R$ 129,90",
    pagoEm: "16/06/2026",
    formaOrigem: "Pix · app",
    status: "Pago",
  },
];
