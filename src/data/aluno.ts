// Modelo do treino: a ficha padrão de cada divisão, usada como ponto de partida nos dados de demonstração.
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
