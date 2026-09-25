import { Outlet } from "react-router-dom";
import {
  CheckCircle2,
  Dumbbell,
  Gauge,
  FileText,
  Tag,
  Users,
  Wallet,
} from "lucide-react";
import AppShell, { type MenuItem } from "../components/AppShell";

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
];

const NOTIFICACOES_ADMIN = [
  {
    tipo: "Indicador",
    texto:
      "Inadimplência subiu para 5,8% no mês — 0,7 p.p. acima de agosto.",
    quando: "hoje",
    lida: false,
  },
  {
    tipo: "Relatório",
    texto: "Relatório de receita de agosto disponível para exportação em PDF.",
    quando: "há 2 dias",
    lida: false,
  },
  {
    tipo: "Usuários",
    texto: "Conta de Igor Bezerra foi bloqueada por Júlia Alves.",
    quando: "há 3 dias",
    lida: true,
  },
];

export default function AdminLayout() {
  return (
    <AppShell
      menuItems={ADMIN_MENU}
      roleLabel="Administrador"
      user={{ nome: "Walber Silva", iniciais: "WS" }}
      notifications={NOTIFICACOES_ADMIN}
      notifFooter="Alertas operacionais do perfil Administrador, gerados pelo job diário (RF22–RF24)."
    >
      <Outlet />
    </AppShell>
  );
}
