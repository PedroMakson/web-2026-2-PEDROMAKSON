import { Outlet } from "react-router-dom";
import { CheckCircle2, Home, Users, Wallet } from "lucide-react";
import AppShell, { type MenuItem } from "../components/AppShell";

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
];

const NOTIFICACOES_RECEPCAO = [
  {
    tipo: "Pagamento",
    texto:
      "Igor Bezerra está com a mensalidade vencida desde 05/09 — check-in bloqueado.",
    quando: "há 1 h",
    lida: false,
  },
  {
    tipo: "Matrícula",
    texto:
      "3 matrículas vencem nos próximos 15 dias. Ofereça a renovação na recepção.",
    quando: "hoje",
    lida: false,
  },
  {
    tipo: "Movimento",
    texto: "42 check-ins registrados hoje, 8 pela recepção.",
    quando: "há 4 h",
    lida: true,
  },
];

export default function RecepcaoLayout() {
  return (
    <AppShell
      menuItems={RECEPCAO_MENU}
      roleLabel="Recepcionista"
      notifications={NOTIFICACOES_RECEPCAO}
      notifFooter="Alertas operacionais do perfil Recepcionista, gerados pelo job diário (RF22–RF24)."
    >
      <Outlet />
    </AppShell>
  );
}
