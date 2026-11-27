import type { Notification } from "../components/AppShell";
import { type Aluno, type Avaliacao, brl, type Pagamento, valorNum } from "../data/store";
import { type Checkin, checkinDoDia, vigentes } from "./checkins";
import { dataBrParaIso, HOJE_DEMO, paraData } from "./datas";

// Notificações do sino calculadas dos dados do sistema (o "job diário" do RF22 a RF24, feito na hora em que se abre o app).
// Antes eram textos fixos nos layouts.

const MS_DIA = 86_400_000;
const diasDe = (de: string, ate: string) => Math.round((paraData(ate).getTime() - paraData(de).getTime()) / MS_DIA);
const diasAte = (vencBr: string) => diasDe(HOJE_DEMO, dataBrParaIso(vencBr)); // negativo = já passou
const curto = (br: string) => br.slice(0, 5); // 05/09/2026 -> 05/09
const quando = (dias: number) => (dias === 0 ? "hoje" : dias === 1 ? "amanhã" : `em ${dias} dias`);
const nova = (tipo: string, texto: string): Notification => ({ tipo, texto, quando: "hoje", lida: false });

const emAberto = (pagamentos: Pagamento[]) =>
  pagamentos.filter((p) => !p.pago).sort((a, b) => dataBrParaIso(a.venc).localeCompare(dataBrParaIso(b.venc)));

const nomes = (lista: { nome: string }[]) => lista.map((a) => a.nome).join(", ");

export function notificacoesDoAluno(aluno: Aluno | undefined, pagamentos: Pagamento[], checkins: Checkin[]): Notification[] {
  if (!aluno) return [];
  const lista: Notification[] = [];

  if (aluno.cancelamento) {
    return [nova("Matrícula", `Sua matrícula ${aluno.matricula} foi cancelada em ${aluno.cancelamento.em.slice(8)}/${aluno.cancelamento.em.slice(5, 7)}/${aluno.cancelamento.em.slice(0, 4)}. Para voltar, faça uma nova matrícula na recepção.`)];
  }

  const proxima = emAberto(pagamentos.filter((p) => p.nome === aluno.nome))[0];
  if (proxima) {
    lista.push(
      proxima.atraso
        ? nova("Pagamento", `Sua mensalidade de ${proxima.valor} está atrasada desde ${curto(proxima.venc)}. Regularize pelo Pix para liberar o check-in.`)
        : nova("Pagamento", `Sua mensalidade de ${proxima.valor} vence ${quando(Math.max(0, diasAte(proxima.venc)))}. Pague pelo Pix direto no app.`),
    );
  }

  if (!checkinDoDia(checkins, aluno.id, HOJE_DEMO)) {
    const dias = vigentes(checkins, aluno.id).map((c) => c.data).filter((d) => d <= HOJE_DEMO).sort();
    const ultimo = dias[dias.length - 1];
    const parados = ultimo ? diasDe(ultimo, HOJE_DEMO) : null;
    if (parados !== null && parados >= 2) {
      lista.push(nova("Incentivo", `Você não faz check-in há ${parados} dias. Bora retomar a sequência!`));
    }
  }

  const ate = diasAte(aluno.fim);
  if (ate < 0) {
    lista.push(nova("Matrícula", `Sua matrícula ${aluno.matricula} venceu em ${aluno.fim}. Renove na recepção para liberar o check-in.`));
  } else if (ate <= 30) {
    lista.push(nova("Matrícula", `Sua matrícula ${aluno.matricula} vence em ${aluno.fim}. Renovação disponível na recepção.`));
  }
  return lista;
}

export function notificacoesDoInstrutor(alunos: Aluno[], avaliacoes: Avaliacao[]): Notification[] {
  const lista: Notification[] = [];
  for (const a of alunos) {
    if (a.alerta) {
      const alerta = a.alerta.toLowerCase();
      const treino = alerta.startsWith("treino");
      const semCheckin = alerta.startsWith("sem check-in");
      lista.push(nova(treino ? "Treino" : "Aluno", `${a.nome}: ${alerta}.${semCheckin ? " Vale um contato de retomada." : ""}`));
    }
  }
  for (const a of alunos) {
    const datas = avaliacoes.filter((v) => v.alunoId === a.id).map((v) => v.data).sort();
    const ultima = datas[datas.length - 1];
    if (!ultima) {
      lista.push(nova("Avaliação", `${a.nome} ainda não tem avaliação física registrada.`));
    } else if (diasDe(ultima, HOJE_DEMO) > 60) {
      lista.push(nova("Avaliação", `A última avaliação física de ${a.nome} foi em ${ultima.slice(8)}/${ultima.slice(5, 7)}/${ultima.slice(0, 4)} — agende a reavaliação.`));
    }
  }
  return lista.slice(0, 8);
}

function vencendo(alunos: Aluno[], dias: number) {
  return alunos.filter((a) => {
    if (a.cancelamento) return false;
    const ate = diasAte(a.fim);
    return ate >= 0 && ate <= dias;
  });
}

export function notificacoesDaRecepcao(alunos: Aluno[], pagamentos: Pagamento[]): Notification[] {
  const lista: Notification[] = [];
  for (const p of emAberto(pagamentos).filter((x) => x.atraso)) {
    lista.push(nova("Pagamento", `${p.nome} está com a mensalidade vencida desde ${curto(p.venc)} — check-in bloqueado.`));
  }
  for (const p of emAberto(pagamentos).filter((x) => !x.atraso && diasAte(x.venc) >= 0 && diasAte(x.venc) <= 3)) {
    lista.push(nova("Pagamento", `${p.nome}: a mensalidade de ${p.valor} vence ${quando(diasAte(p.venc))}.`));
  }
  const matriculas = vencendo(alunos, 15);
  if (matriculas.length > 0) {
    lista.push(
      nova("Matrícula", `${matriculas.length} matrícula(s) vence(m) nos próximos 15 dias (${nomes(matriculas)}). Ofereça a renovação na recepção.`),
    );
  }
  return lista;
}

export function notificacoesDoAdmin(alunos: Aluno[], pagamentos: Pagamento[]): Notification[] {
  const lista: Notification[] = [];
  const atrasadas = emAberto(pagamentos).filter((p) => p.atraso);
  if (atrasadas.length > 0) {
    const total = atrasadas.reduce((soma, p) => soma + valorNum(p.valor), 0);
    lista.push(nova("Indicador", `${atrasadas.length} parcela(s) em atraso, somando ${brl(total)} (${nomes(atrasadas)}).`));
  }
  const bloqueados = alunos.filter((a) => !a.ativo);
  if (bloqueados.length > 0) {
    lista.push(nova("Usuários", `${bloqueados.length} aluno(s) com acesso bloqueado: ${nomes(bloqueados)}.`));
  }
  const matriculas = vencendo(alunos, 15);
  if (matriculas.length > 0) {
    lista.push(nova("Matrícula", `${matriculas.length} matrícula(s) vence(m) nos próximos 15 dias (${nomes(matriculas)}).`));
  }
  return lista;
}
