import { Outlet } from "react-router-dom";
import { Calendar, CreditCard, Dumbbell, Home, LineChart, User } from "lucide-react";
import AppShell, { type MenuItem } from "../components/AppShell";
import { useAuth } from "../auth/AuthContext";
import { useStore } from "../data/store";
import { useAlunoLogado } from "../data/useAlunoLogado";
import { notificacoesDoAluno } from "../lib/notificacoes";

const menuDoAluno = (nome: string): MenuItem[] => [
  { label: "Início", to: "/aluno", icon: <Home size={18} />, title: `Olá, ${nome}` },
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

export default function AlunoLayout() {
  const { user } = useAuth();
  const aluno = useAlunoLogado();
  const { pagamentos, checkins } = useStore();
  const primeiroNome = (aluno?.nome ?? user?.nome ?? "").split(" ")[0];
  return (
    <AppShell
      menuItems={menuDoAluno(primeiroNome)}
      roleLabel="Aluno"
      notifications={notificacoesDoAluno(aluno, pagamentos, checkins)}
      notifFooter="Disparadas pelo job diário de notificações (RF22–RF24)."
    >
      {aluno ? (
        <Outlet />
      ) : (
        <div className="rounded-2xl border border-navy/10 bg-white p-8 text-center text-sm text-navy/60">
          Seu login ainda não está ligado a um cadastro de aluno. Procure a recepção para vincular.
        </div>
      )}
    </AppShell>
  );
}
