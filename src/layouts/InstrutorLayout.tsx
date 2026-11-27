import { Outlet } from "react-router-dom";
import { Home, User, Users } from "lucide-react";
import AppShell, { type MenuItem } from "../components/AppShell";
import { useStore } from "../data/store";
import { notificacoesDoInstrutor } from "../lib/notificacoes";

const INSTRUTOR_MENU: MenuItem[] = [
  {
    label: "Início",
    to: "/instrutor",
    icon: <Home size={18} />,
    title: "Painel do instrutor",
  },
  { label: "Meus alunos", to: "/instrutor/alunos", icon: <Users size={18} /> },
  { label: "Meu perfil", to: "/instrutor/perfil", icon: <User size={18} /> },
];

export default function InstrutorLayout() {
  const { alunos, avaliacoes } = useStore();
  return (
    <AppShell
      menuItems={INSTRUTOR_MENU}
      roleLabel="Instrutor"
      notifications={notificacoesDoInstrutor(alunos, avaliacoes)}
      notifFooter="Alertas operacionais do perfil Instrutor, gerados pelo job diário (RF22–RF24)."
    >
      <Outlet />
    </AppShell>
  );
}
