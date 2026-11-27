import { Outlet } from "react-router-dom";
import {
  CheckCircle2,
  Dumbbell,
  Gauge,
  FileText,
  Tag,
  User,
  Users,
  Wallet,
} from "lucide-react";
import AppShell, { type MenuItem } from "../components/AppShell";
import { useStore } from "../data/store";
import { notificacoesDoAdmin } from "../lib/notificacoes";

const ADMIN_MENU: MenuItem[] = [
  {
    label: "Indicadores",
    to: "/admin",
    icon: <Gauge size={18} />,
    title: "Painel de indicadores",
    section: "Gestão",
  },
  {
    label: "Usuários e perfis",
    to: "/admin/usuarios",
    icon: <Users size={18} />,
    title: "Usuários e permissões",
  },
  { label: "Planos", to: "/admin/planos", icon: <Tag size={18} /> },
  { label: "Relatórios", to: "/admin/relatorios", icon: <FileText size={18} /> },
  {
    label: "Alunos e matrículas",
    to: "/admin/alunos",
    icon: <Users size={18} />,
    title: "Alunos",
    section: "Recepção",
  },
  {
    label: "Check-in manual",
    to: "/admin/checkin",
    icon: <CheckCircle2 size={18} />,
  },
  { label: "Pagamentos", to: "/admin/pagamentos", icon: <Wallet size={18} /> },
  {
    label: "Treinos e avaliações",
    to: "/admin/treinos",
    icon: <Dumbbell size={18} />,
    section: "Instrutor",
  },
  {
    label: "Meu perfil",
    to: "/admin/perfil",
    icon: <User size={18} />,
    section: "Conta",
  },
];

export default function AdminLayout() {
  const { alunos, pagamentos } = useStore();
  return (
    <AppShell
      menuItems={ADMIN_MENU}
      roleLabel="Administrador"
      notifications={notificacoesDoAdmin(alunos, pagamentos)}
      notifFooter="Alertas operacionais do perfil Administrador, gerados pelo job diário (RF22–RF24)."
    >
      <Outlet />
    </AppShell>
  );
}
