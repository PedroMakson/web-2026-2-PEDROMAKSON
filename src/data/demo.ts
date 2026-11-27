// Dados de demonstração do GymFlow (sem React): o app os usa como reserva quando a API de dados está fora do ar
// e o script backend/dados/carregar-demo.mjs os grava nas tabelas do DynamoDB.
import type { Checkin } from "../lib/checkins";
import type { Matricula } from "../lib/dadosApi";
import type { Endereco } from "../lib/endereco";
import { dataBrParaIso, diferencaDias, HOJE_DEMO, somarDias } from "../lib/datas";
import { formatarDataBr } from "../lib/pessoa";
import { TREINO_DIVISOES } from "./aluno";
import type { Aluno, Avaliacao, Divisao, Exportacao, Observacao, Pagamento, Plano, Treino, Usuario } from "./store";

// Os dados abaixo foram escritos como se "hoje" fosse 14/09/2026. Para a demonstração valer em qualquer dia, todas as
// datas são deslocadas pela diferença entre o dia real e essa base: o que estava a 3 dias de vencer continua a 3 dias.
const BASE_DOS_DADOS = "2026-09-14";
const DESLOCAMENTO = diferencaDias(HOJE_DEMO, BASE_DOS_DADOS);
const iso = (d: string) => somarDias(d, DESLOCAMENTO); // AAAA-MM-DD
const br = (d: string) => formatarDataBr(iso(dataBrParaIso(d))); // DD/MM/AAAA
const instante = (i: string) => iso(i.slice(0, 10)) + i.slice(10); // AAAA-MM-DDTHH:MM...

// Endereços de demonstração (Pau dos Ferros/RN); o CEP é o geral da cidade.
const endDemo = (logradouro: string, numero: string, bairro: string, complemento = ""): Endereco => ({
  cep: "59900-000",
  logradouro,
  numero,
  complemento,
  bairro,
  cidade: "Pau dos Ferros",
  uf: "RN",
});

const ALUNOS_INICIAL_BASE: Aluno[] = [
  { id: 1, nome: "Pedro Makson", email: "pedro@email.com", tel: "(84) 99812-4477", plano: "Mensal Fit", instrutor: "Carla Menezes", fim: "02/10/2026", fin: "Pendente", ultimo: "há 1 dia", alerta: "Treino desatualizado", checkin: false, matricula: "#2026-0142", matriculaAnterior: "#2025-0388", ativo: true, endereco: endDemo("Rua das Flores", "120", "Centro", "Apto 2"), cpf: "529.982.247-25", nascimento: "2001-05-14", sexo: "Masculino" },
  { id: 2, nome: "Ana Beatriz Lima", email: "ana.lima@email.com", tel: "(84) 99123-2211", plano: "Trimestral", instrutor: "Carla Menezes", fim: "20/11/2026", fin: "Em dia", ultimo: "hoje", alerta: "", checkin: true, matricula: "#2026-0118", matriculaAnterior: "", ativo: true, endereco: endDemo("Avenida Brasil", "455", "Centro"), cpf: "390.533.447-05", nascimento: "1998-11-03", sexo: "Feminino" },
  { id: 3, nome: "Rafael Torres", email: "rafael.t@email.com", tel: "(84) 98812-0099", plano: "Mensal Fit", instrutor: "Carla Menezes", fim: "28/09/2026", fin: "Em dia", ultimo: "há 9 dias", alerta: "Sem check-in há 9 dias", checkin: false, matricula: "#2026-0091", matriculaAnterior: "", ativo: true, endereco: endDemo("Rua do Comércio", "88", "Centro"), cpf: "111.444.777-35", nascimento: "1995-07-22", sexo: "Masculino" },
  { id: 4, nome: "Marcela Duarte", email: "marcela.d@email.com", tel: "(84) 99700-1122", plano: "Anual", instrutor: "Diego Rocha", fim: "14/03/2027", fin: "Em dia", ultimo: "há 2 dias", alerta: "", checkin: false, matricula: "#2025-0447", matriculaAnterior: "", ativo: true, endereco: endDemo("Rua São José", "301", "Centro", "Casa B"), cpf: "123.456.789-09", nascimento: "1989-02-17", sexo: "Feminino" },
  { id: 5, nome: "Igor Bezerra", email: "igor.b@email.com", tel: "(84) 98123-4455", plano: "Mensal Fit", instrutor: "Diego Rocha", fim: "18/09/2026", fin: "Atrasado", ultimo: "há 4 dias", alerta: "Mensalidade atrasada", checkin: false, matricula: "#2026-0133", matriculaAnterior: "", ativo: false, endereco: endDemo("Rua Projetada", "17", "Centro"), cpf: "987.654.321-00", nascimento: "2000-09-30", sexo: "Masculino" },
  { id: 6, nome: "Luana Freire", email: "luana.f@email.com", tel: "(84) 99988-7766", plano: "Trimestral", instrutor: "Carla Menezes", fim: "02/12/2026", fin: "Em dia", ultimo: "hoje", alerta: "", checkin: true, matricula: "#2026-0126", matriculaAnterior: "", ativo: true, endereco: endDemo("Avenida Getúlio Vargas", "762", "Centro"), cpf: "246.813.579-28", nascimento: "1993-12-08", sexo: "Feminino" },
];

export const ALUNOS_INICIAL: Aluno[] = ALUNOS_INICIAL_BASE.map((a) => ({ ...a, fim: br(a.fim) }));

const PAGAMENTOS_INICIAL_BASE: Pagamento[] = [
  { id: 1, nome: "Pedro Makson", plano: "Mensal Fit", venc: "17/09/2026", valor: "R$ 129,90", parcela: "Única", pago: false, atraso: false },
  { id: 2, nome: "Igor Bezerra", plano: "Mensal Fit", venc: "05/09/2026", valor: "R$ 129,90", parcela: "Única", pago: false, atraso: true },
  { id: 3, nome: "Rafael Torres", plano: "Mensal Fit", venc: "28/09/2026", valor: "R$ 129,90", parcela: "Única", pago: false, atraso: false },
  { id: 4, nome: "Ana Beatriz Lima", plano: "Trimestral", venc: "20/09/2026", valor: "R$ 116,33", parcela: "2/3", pago: false, atraso: false },
  { id: 5, nome: "Luana Freire", plano: "Trimestral", venc: "02/09/2026", valor: "R$ 116,33", parcela: "1/3", pago: true, pagoEm: "02/09/2026", forma: "Cartão", origem: "Recepção", atraso: false },
  // histórico de mensalidades já pagas do Pedro (a matrícula anterior)
  { id: 6, nome: "Pedro Makson", plano: "Mensal Fit", venc: "17/08/2026", valor: "R$ 129,90", parcela: "1/1", pago: true, pagoEm: "15/08/2026", forma: "Pix", origem: "App", atraso: false },
  { id: 7, nome: "Pedro Makson", plano: "Mensal Fit", venc: "17/07/2026", valor: "R$ 129,90", parcela: "1/1", pago: true, pagoEm: "17/07/2026", forma: "Cartão", origem: "Recepção", atraso: false },
  { id: 8, nome: "Pedro Makson", plano: "Mensal Fit", venc: "17/06/2026", valor: "R$ 129,90", parcela: "1/1", pago: true, pagoEm: "16/06/2026", forma: "Pix", origem: "App", atraso: false },
  { id: 9, nome: "Pedro Makson", plano: "Mensal Fit", venc: "17/05/2026", valor: "R$ 129,90", parcela: "1/1", pago: true, pagoEm: "17/05/2026", forma: "Cartão", origem: "Recepção", atraso: false },
  { id: 10, nome: "Pedro Makson", plano: "Mensal Fit", venc: "17/04/2026", valor: "R$ 129,90", parcela: "1/1", pago: true, pagoEm: "15/04/2026", forma: "Pix", origem: "App", atraso: false },
  { id: 11, nome: "Ana Beatriz Lima", plano: "Trimestral", venc: "20/08/2026", valor: "R$ 116,33", parcela: "1/3", pago: true, pagoEm: "19/08/2026", forma: "Pix", origem: "App", atraso: false },
  { id: 12, nome: "Rafael Torres", plano: "Mensal Fit", venc: "28/08/2026", valor: "R$ 129,90", parcela: "Única", pago: true, pagoEm: "27/08/2026", forma: "Pix", origem: "App", atraso: false },
  { id: 13, nome: "Rafael Torres", plano: "Mensal Fit", venc: "28/07/2026", valor: "R$ 129,90", parcela: "Única", pago: true, pagoEm: "28/07/2026", forma: "Cartão", origem: "Recepção", atraso: false },
  { id: 14, nome: "Igor Bezerra", plano: "Mensal Fit", venc: "05/08/2026", valor: "R$ 129,90", parcela: "Única", pago: true, pagoEm: "04/08/2026", forma: "Pix", origem: "App", atraso: false },
  { id: 15, nome: "Igor Bezerra", plano: "Mensal Fit", venc: "05/07/2026", valor: "R$ 129,90", parcela: "Única", pago: true, pagoEm: "06/07/2026", forma: "Dinheiro", origem: "Recepção", atraso: false },
  { id: 16, nome: "Marcela Duarte", plano: "Anual", venc: "14/04/2026", valor: "R$ 99,17", parcela: "1/12", pago: true, pagoEm: "14/04/2026", forma: "Cartão", origem: "Recepção", atraso: false },
  { id: 17, nome: "Marcela Duarte", plano: "Anual", venc: "14/05/2026", valor: "R$ 99,17", parcela: "2/12", pago: true, pagoEm: "13/05/2026", forma: "Pix", origem: "App", atraso: false },
  { id: 18, nome: "Marcela Duarte", plano: "Anual", venc: "14/06/2026", valor: "R$ 99,17", parcela: "3/12", pago: true, pagoEm: "14/06/2026", forma: "Pix", origem: "App", atraso: false },
  { id: 19, nome: "Marcela Duarte", plano: "Anual", venc: "14/07/2026", valor: "R$ 99,17", parcela: "4/12", pago: true, pagoEm: "14/07/2026", forma: "Cartão", origem: "Recepção", atraso: false },
  { id: 20, nome: "Marcela Duarte", plano: "Anual", venc: "14/08/2026", valor: "R$ 99,17", parcela: "5/12", pago: true, pagoEm: "12/08/2026", forma: "Pix", origem: "App", atraso: false },
  { id: 21, nome: "Marcela Duarte", plano: "Anual", venc: "14/09/2026", valor: "R$ 99,17", parcela: "6/12", pago: true, pagoEm: "12/09/2026", forma: "Pix", origem: "App", atraso: false },
  // parcelas que ainda vão vencer (o contrato gera todas de uma vez)
  { id: 22, nome: "Ana Beatriz Lima", plano: "Trimestral", venc: "20/10/2026", valor: "R$ 116,33", parcela: "3/3", pago: false, atraso: false },
  { id: 23, nome: "Marcela Duarte", plano: "Anual", venc: "14/10/2026", valor: "R$ 99,17", parcela: "7/12", pago: false, atraso: false },
  { id: 24, nome: "Marcela Duarte", plano: "Anual", venc: "14/11/2026", valor: "R$ 99,17", parcela: "8/12", pago: false, atraso: false },
  { id: 25, nome: "Marcela Duarte", plano: "Anual", venc: "14/12/2026", valor: "R$ 99,17", parcela: "9/12", pago: false, atraso: false },
  { id: 26, nome: "Marcela Duarte", plano: "Anual", venc: "14/01/2027", valor: "R$ 99,17", parcela: "10/12", pago: false, atraso: false },
  { id: 27, nome: "Marcela Duarte", plano: "Anual", venc: "14/02/2027", valor: "R$ 99,17", parcela: "11/12", pago: false, atraso: false },
  { id: 28, nome: "Marcela Duarte", plano: "Anual", venc: "14/03/2027", valor: "R$ 99,17", parcela: "12/12", pago: false, atraso: false },
];

export const PAGAMENTOS_INICIAL: Pagamento[] = PAGAMENTOS_INICIAL_BASE.map((p) => ({
  ...p,
  venc: br(p.venc),
  ...(p.pagoEm ? { pagoEm: br(p.pagoEm) } : {}),
}));

export const USUARIOS_INICIAL: Usuario[] = [
  { id: 1, nome: "Pedro Makson", email: "pedro@email.com", tel: "(84) 99812-4477", perfil: "Aluno", ativo: true, endereco: endDemo("Rua das Flores", "120", "Centro", "Apto 2"), cpf: "529.982.247-25", nascimento: "2001-05-14", sexo: "Masculino" },
  { id: 2, nome: "Carla Menezes", email: "carla@gymflow.com", tel: "(84) 99700-0001", perfil: "Instrutor", ativo: true, endereco: endDemo("Rua da Paz", "45", "Centro"), cpf: "135.792.468-28", nascimento: "1990-03-12", sexo: "Feminino", admissao: "2022-02-01" },
  { id: 3, nome: "Diego Rocha", email: "diego@gymflow.com", tel: "(84) 99700-0002", perfil: "Instrutor", ativo: true, endereco: endDemo("Rua Nova", "210", "Centro"), cpf: "864.209.753-10", nascimento: "1988-08-25", sexo: "Masculino", admissao: "2023-05-15" },
  { id: 4, nome: "Júlia Alves", email: "julia@gymflow.com", tel: "(84) 99700-0003", perfil: "Recepcionista", ativo: true, endereco: endDemo("Avenida Brasil", "980", "Centro", "Sala 3"), cpf: "314.159.265-90", nascimento: "1996-01-19", sexo: "Feminino", admissao: "2024-03-04" },
  { id: 5, nome: "Igor Bezerra", email: "igor.b@email.com", tel: "(84) 98123-4455", perfil: "Aluno", ativo: false, endereco: endDemo("Rua Projetada", "17", "Centro"), cpf: "987.654.321-00", nascimento: "2000-09-30", sexo: "Masculino" },
  { id: 6, nome: "Walber Silva", email: "walber@gymflow.com", tel: "(84) 99700-0004", perfil: "Administrador", ativo: true, endereco: endDemo("Rua do Sol", "64", "Centro"), cpf: "271.828.182-05", nascimento: "1985-06-30", sexo: "Masculino", admissao: "2021-09-01" },
];

export const PLANOS_INICIAL: Plano[] = [
  { id: 1, nome: "Mensal Fit", valor: "R$ 129,90", duracao: "1 mês", ativos: 214, regra: "Cancelamento antecipado: carência de 30 dias." },
  { id: 2, nome: "Trimestral", valor: "R$ 349,00", duracao: "3 meses", ativos: 96, regra: "Multa de 10% sobre as parcelas restantes." },
  { id: 3, nome: "Anual", valor: "R$ 1.190,00", duracao: "12 meses", ativos: 48, regra: "Multa de 15% ou transferência de titularidade." },
];

const pad2 = (n: number) => String(n).padStart(2, "0");

// manhã, almoço, fim de tarde e noite: as faixas de horário dos relatórios precisam de movimento variado
const HORARIOS = ["06:40", "07:25", "08:30", "10:15", "12:10", "17:20", "18:10", "19:05", "20:15", "21:00"];

// Check-ins de demonstração, coerentes com o "último check-in" de cada aluno e com o "hoje" fixo.
export function gerarCheckinsDemo(): Checkin[] {
  const lista: Checkin[] = [];
  let id = 1;
  const adicionar = (c: Omit<Checkin, "id" | "registradoEm"> & { registradoEm?: string }) =>
    lista.push({
      id: id++,
      registradoEm: c.registradoEm ?? `${c.data}T${c.hora || "12:00"}:00`,
      ...c,
    });

  // Pedro: calendário já usado nas telas, com um retroativo (dele) e um lançado pela recepção.
  const diasPedro: Record<string, number[]> = {
    "2026-09": [1, 3, 4, 6, 8, 9, 10, 11, 12, 13],
    "2026-08": [2, 3, 5, 7, 9, 10, 12, 14, 16, 17, 19, 21, 23, 24, 26, 28, 30, 31],
  };
  const horas = ["07:12", "18:05", "06:48", "19:20"];
  for (const [mes, dias] of Object.entries(diasPedro)) {
    for (const dia of dias) {
      const original = `${mes}-${pad2(dia)}`;
      const data = iso(original);
      const base = {
        alunoId: 1,
        data,
        hora: horas[dia % 4],
        origem: "App" as const,
        registradoPor: "Pedro Makson",
        perfilRegistro: "Aluno" as const,
      };
      if (original === "2026-09-03") {
        adicionar({
          ...base,
          hora: "",
          origem: "Retroativo",
          motivo: "Esqueci de marcar depois do treino.",
          registradoEm: instante("2026-09-04T08:10:00"),
        });
      } else if (original === "2026-09-09") {
        adicionar({
          ...base,
          hora: "07:50",
          origem: "Recepção",
          registradoPor: "Júlia Alves",
          perfilRegistro: "Recepcionista",
        });
      } else {
        adicionar(base);
      }
    }
  }

  const padroes = [
    { alunoId: 2, nome: "Ana Beatriz Lima", ultimo: 0, porSemana: 4, horaHoje: "08:20" },
    { alunoId: 3, nome: "Rafael Torres", ultimo: 9, porSemana: 3 },
    { alunoId: 4, nome: "Marcela Duarte", ultimo: 2, porSemana: 5 },
    { alunoId: 5, nome: "Igor Bezerra", ultimo: 4, porSemana: 3 },
    { alunoId: 6, nome: "Luana Freire", ultimo: 0, porSemana: 4, horaHoje: "08:42" },
  ];
  for (const p of padroes) {
    for (let atras = p.ultimo; atras < 56; atras++) {
      if (atras !== p.ultimo && (atras + p.alunoId) % 7 >= p.porSemana) continue;
      adicionar({
        alunoId: p.alunoId,
        data: somarDias(HOJE_DEMO, -atras),
        hora: atras === 0 && p.horaHoje ? p.horaHoje : HORARIOS[(atras * 3 + p.alunoId * 2) % HORARIOS.length],
        origem: "App",
        registradoPor: p.nome,
        perfilRegistro: "Aluno",
      });
    }
  }
  return lista;
}

// Treino de cada aluno: as três divisões, prescritas pelo instrutor dele (o mesmo ponto de partida para todos).
export const TREINOS_INICIAL: Treino[] = ALUNOS_INICIAL.flatMap((a) =>
  (["A", "B", "C"] as Divisao[]).map((divisao) => ({
    id: `${a.id}-${divisao}`,
    alunoId: a.id,
    divisao,
    titulo: TREINO_DIVISOES[divisao].titulo,
    exercicios: TREINO_DIVISOES[divisao].exercicios,
    atualizadoPor: a.instrutor,
    atualizadoEm: instante("2026-08-12T08:00:00.000Z"),
  })),
);

const AVALIACOES_INICIAL_BASE: Avaliacao[] = [
  { id: 1, alunoId: 1, data: "2026-04-05", instrutor: "Diego Rocha", peso: 83.4, altura: 1.78, gordura: 23.0, cintura: 92 },
  { id: 2, alunoId: 1, data: "2026-06-10", instrutor: "Carla Menezes", peso: 81.0, altura: 1.78, gordura: 21.1, cintura: 89 },
  { id: 3, alunoId: 1, data: "2026-08-12", instrutor: "Carla Menezes", peso: 79.2, altura: 1.78, gordura: 19.4, cintura: 86, obs: "Boa adesão ao treino de membros inferiores. Ajustar carga do agachamento." },
  { id: 4, alunoId: 2, data: "2026-08-20", instrutor: "Carla Menezes", peso: 62.5, altura: 1.65, gordura: 24.8, cintura: 72 },
  { id: 5, alunoId: 4, data: "2026-07-15", instrutor: "Diego Rocha", peso: 68.0, altura: 1.67, gordura: 26.0, cintura: 78 },
  { id: 6, alunoId: 6, data: "2026-08-05", instrutor: "Carla Menezes", peso: 58.4, altura: 1.62, gordura: 23.1, cintura: 70 },
];

export const AVALIACOES_INICIAL: Avaliacao[] = AVALIACOES_INICIAL_BASE.map((v) => ({ ...v, data: iso(v.data) }));

const OBSERVACOES_INICIAL_BASE: Observacao[] = [
  { id: 1, alunoId: 1, texto: "Relatou dor leve no ombro direito no supino — reduzir carga por duas semanas.", instrutor: "Carla Menezes", criadoEm: "2026-08-12T08:40:00.000Z" },
  { id: 2, alunoId: 1, texto: "Prefere treinar cedo; ajustar volume para sessões de 50 minutos.", instrutor: "Carla Menezes", criadoEm: "2026-06-10T07:15:00.000Z" },
];

export const OBSERVACOES_INICIAL: Observacao[] = OBSERVACOES_INICIAL_BASE.map((o) => ({ ...o, criadoEm: instante(o.criadoEm) }));

// Histórico de PDFs já exportados pela administração (os próximos entram pela tela Relatórios).
const EXPORTACOES_INICIAL_BASE: Exportacao[] = [
  { id: 1, relatorio: "Receita e inadimplência", periodo: "Últimos 30 dias", por: "Walber Silva", formato: "PDF", criadoEm: "2026-09-13T12:12:00.000Z" },
  { id: 2, relatorio: "Frequência de treino", periodo: "Últimos 90 dias", por: "Walber Silva", formato: "PDF", criadoEm: "2026-09-10T20:40:00.000Z" },
];

export const EXPORTACOES_INICIAL: Exportacao[] = EXPORTACOES_INICIAL_BASE.map((e) => ({ ...e, criadoEm: instante(e.criadoEm) }));

// A matrícula de cada aluno hoje, mais a anterior de quem renovou (as trocas de plano e os cancelamentos acrescentam as seguintes).
export const MATRICULAS_INICIAL: Matricula[] = ALUNOS_INICIAL.flatMap((a) => {
  const atual: Matricula = { id: a.matricula.replace("#", ""), alunoId: a.id, plano: a.plano, fim: a.fim, matriculaAnterior: a.matriculaAnterior, situacao: "ATIVA" };
  const anterior: Matricula[] = a.matriculaAnterior
    ? [{ id: a.matriculaAnterior.replace("#", ""), alunoId: a.id, plano: a.plano, fim: br("02/09/2026"), situacao: "VENCIDA" }]
    : [];
  return [...anterior, atual];
});
