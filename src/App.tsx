import { Navigate, Route, Routes } from "react-router-dom";
import { ToastProvider } from "./components/Toast";
import { StoreProvider } from "./data/store";
import Login from "./pages/Login";
import RecuperarSenha from "./pages/RecuperarSenha";
import AlunoLayout from "./layouts/AlunoLayout";
import AlunoHome from "./pages/AlunoHome";
import AlunoTreino from "./pages/AlunoTreino";
import AlunoFrequencia from "./pages/AlunoFrequencia";
import AlunoAvaliacoes from "./pages/AlunoAvaliacoes";
import AlunoFinanceiro from "./pages/AlunoFinanceiro";
import AlunoPerfil from "./pages/AlunoPerfil";
import InstrutorLayout from "./layouts/InstrutorLayout";
import InstrutorHome from "./pages/InstrutorHome";
import InstrutorAlunos from "./pages/InstrutorAlunos";
import InstrutorAlunoDetalhe from "./pages/InstrutorAlunoDetalhe";
import RecepcaoLayout from "./layouts/RecepcaoLayout";
import RecepcaoHome from "./pages/RecepcaoHome";
import RecepcaoAlunos from "./pages/RecepcaoAlunos";
import RecepcaoMatricula from "./pages/RecepcaoMatricula";
import RecepcaoCheckin from "./pages/RecepcaoCheckin";
import RecepcaoPagamentos from "./pages/RecepcaoPagamentos";
import AdminLayout from "./layouts/AdminLayout";
import AdminHome from "./pages/AdminHome";
import AdminUsuarios from "./pages/AdminUsuarios";
import AdminPlanos from "./pages/AdminPlanos";
import AdminRelatorios from "./pages/AdminRelatorios";

export default function App() {
  return (
    <ToastProvider>
      <StoreProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/recuperar-senha" element={<RecuperarSenha />} />

          <Route path="/aluno" element={<AlunoLayout />}>
            <Route index element={<AlunoHome />} />
            <Route path="treino" element={<AlunoTreino />} />
            <Route path="frequencia" element={<AlunoFrequencia />} />
            <Route path="avaliacoes" element={<AlunoAvaliacoes />} />
            <Route path="financeiro" element={<AlunoFinanceiro />} />
            <Route path="perfil" element={<AlunoPerfil />} />
          </Route>

          <Route path="/instrutor" element={<InstrutorLayout />}>
            <Route index element={<InstrutorHome />} />
            <Route
              path="alunos"
              element={<InstrutorAlunos instrutorFiltro="Carla Menezes" />}
            />
            <Route path="alunos/:id" element={<InstrutorAlunoDetalhe />} />
          </Route>

          <Route path="/recepcao" element={<RecepcaoLayout />}>
            <Route index element={<RecepcaoHome />} />
            <Route path="alunos" element={<RecepcaoAlunos />} />
            <Route path="matricula" element={<RecepcaoMatricula />} />
            <Route path="matricula/:id" element={<RecepcaoMatricula />} />
            <Route path="checkin" element={<RecepcaoCheckin />} />
            <Route path="pagamentos" element={<RecepcaoPagamentos />} />
          </Route>

          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminHome />} />
            <Route path="usuarios" element={<AdminUsuarios />} />
            <Route path="planos" element={<AdminPlanos />} />
            <Route path="relatorios" element={<AdminRelatorios />} />
            <Route path="alunos" element={<RecepcaoAlunos />} />
            <Route path="checkin" element={<RecepcaoCheckin />} />
            <Route path="pagamentos" element={<RecepcaoPagamentos />} />
            <Route path="treinos" element={<InstrutorAlunos />} />
            <Route path="treinos/:id" element={<InstrutorAlunoDetalhe />} />
          </Route>
        </Routes>
      </StoreProvider>
    </ToastProvider>
  );
}
