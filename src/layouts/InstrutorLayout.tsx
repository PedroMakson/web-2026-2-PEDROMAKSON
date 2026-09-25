import { Outlet } from "react-router-dom";
import { Home, Users } from "lucide-react";
import AppShell, { type MenuItem } from "../components/AppShell";

const INSTRUTOR_MENU: MenuItem[] = [
  {
    label: "Início",
    to: "/instrutor",
    icon: <Home size={18} />,
    title: "Painel do instrutor",
  },
  { label: "Meus alunos", to: "/instrutor/alunos", icon: <Users size={18} /> },
];

const NOTIFICACOES_INSTRUTOR = [
  {
    tipo: "Aluno",
    texto:
      "Rafael Torres está há 9 dias sem check-in. Vale um contato de retomada.",
    quando: "há 3 h",
    lida: false,
  },
  {
    tipo: "Avaliação",
    texto:
      "Avaliação física de Marcela Duarte vence este mês — agende a reavaliação.",
    quando: "ontem",
    lida: false,
  },
  {
    tipo: "Treino",
    texto: "O treino de Pedro Makson está sem atualização há 30 dias.",
    quando: "há 2 dias",
    lida: true,
  },
];

export default function InstrutorLayout() {
  return (
    <AppShell
      menuItems={INSTRUTOR_MENU}
      roleLabel="Instrutor"
      user={{ nome: "Carla Menezes", iniciais: "CM" }}
      notifications={NOTIFICACOES_INSTRUTOR}
      notifFooter="Alertas operacionais do perfil Instrutor, gerados pelo job diário (RF22–RF24)."
    >
      <Outlet />
    </AppShell>
  );
}
