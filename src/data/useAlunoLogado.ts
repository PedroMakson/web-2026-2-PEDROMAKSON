import { useAuth } from "../auth/AuthContext";
import { useStore } from "./store";

// As telas do aluno usam os dados de demonstração: o cadastro é localizado pelo e-mail ou pelo
// nome do login e, na falta dos dois, cai no primeiro aluno cadastrado.
export function useAlunoLogado() {
  const { user } = useAuth();
  const { alunos } = useStore();
  const email = (user?.email ?? "").toLowerCase();
  return (
    alunos.find((a) => a.email.toLowerCase() === email) ??
    alunos.find((a) => a.nome === user?.nome) ??
    alunos[0]
  );
}
