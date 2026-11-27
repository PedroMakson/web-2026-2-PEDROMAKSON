import { Outlet } from "react-router-dom";
import { CheckCircle2, Home, User, Users, Wallet } from "lucide-react";
import AppShell, { type MenuItem } from "../components/AppShell";
import { useStore } from "../data/store";
import { notificacoesDaRecepcao } from "../lib/notificacoes";

const RECEPCAO_MENU: MenuItem[] = [
  {
    label: "Início",
    to: "/recepcao",
    icon: <Home size={18} />,
    title: "Movimento do dia",
  },
  { label: "Alunos", to: "/recepcao/alunos", icon: <Users size={18} /> },
  {
    label: "Check-in manual",
    to: "/recepcao/checkin",
    icon: <CheckCircle2 size={18} />,
  },
  { label: "Pagamentos", to: "/recepcao/pagamentos", icon: <Wallet size={18} /> },
  { label: "Meu perfil", to: "/recepcao/perfil", icon: <User size={18} /> },
];

export default function RecepcaoLayout() {
  const { alunos, pagamentos } = useStore();
  return (
    <AppShell
      menuItems={RECEPCAO_MENU}
      roleLabel="Recepcionista"
      notifications={notificacoesDaRecepcao(alunos, pagamentos)}
      notifFooter="Alertas operacionais do perfil Recepcionista, gerados pelo job diário (RF22–RF24)."
    >
      <Outlet />
    </AppShell>
  );
}
