import { Outlet } from "react-router-dom";
import { Calendar, CreditCard, Dumbbell, Home, LineChart, User } from "lucide-react";
import AppShell, { type MenuItem } from "../components/AppShell";

const ALUNO_MENU: MenuItem[] = [
  { label: "Início", to: "/aluno", icon: <Home size={18} />, title: "Olá, Pedro" },
  { label: "Meu treino", to: "/aluno/treino", icon: <Dumbbell size={18} /> },
  {
    label: "Frequência",
    to: "/aluno/frequencia",
    icon: <Calendar size={18} />,
  },
  {
    label: "Avaliações físicas",
    to: "/aluno/avaliacoes",
    icon: <LineChart size={18} />,
  },
  {
    label: "Financeiro",
    to: "/aluno/financeiro",
    icon: <CreditCard size={18} />,
  },
  { label: "Meu perfil", to: "/aluno/perfil", icon: <User size={18} /> },
];

const NOTIFICACOES_ALUNO = [
  {
    tipo: "Pagamento",
    texto: "Sua mensalidade vence em 3 dias. Pague pelo Pix direto no app.",
    quando: "há 2 h",
    lida: false,
  },
  {
    tipo: "Incentivo",
    texto:
      "Você não faz check-in há 2 dias. Bora manter a sequência de 6 dias!",
    quando: "ontem",
    lida: false,
  },
  {
    tipo: "Matrícula",
    texto:
      "Sua matrícula #2026-0142 vence em 02/10/2026. Renovação disponível na recepção.",
    quando: "há 3 dias",
    lida: true,
  },
];

export default function AlunoLayout() {
  return (
    <AppShell
      menuItems={ALUNO_MENU}
      roleLabel="Aluno"
      user={{ nome: "Pedro Makson", iniciais: "PM" }}
      notifications={NOTIFICACOES_ALUNO}
      notifFooter="Disparadas pelo job diário de notificações (RF22–RF24)."
    >
      <Outlet />
    </AppShell>
  );
}
