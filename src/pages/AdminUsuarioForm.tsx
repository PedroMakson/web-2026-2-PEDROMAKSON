import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useStore, type Usuario } from "../data/store";
import { useToast } from "../components/Toast";
import DadosPessoaisFields from "../components/DadosPessoaisFields";
import EnderecoFields from "../components/EnderecoFields";
import Obrigatorio from "../components/Obrigatorio";
import { ENDERECO_VAZIO, soDigitos, validarEndereco } from "../lib/endereco";
import { type DadosPessoais, dataIsoValida, validarDadosPessoais } from "../lib/pessoa";

const PERFIS: Usuario["perfil"][] = ["Instrutor", "Recepcionista", "Administrador"];

const campo = "rounded-[9px] border border-navy/16 px-2.5 py-2.5 text-sm font-normal";

export default function AdminUsuarioForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { usuarios, salvarUsuario } = useStore();

  // Esta tela cuida só da equipe; alunos são cadastrados pela recepção.
  const editando = id ? usuarios.find((u) => u.id === Number(id) && u.perfil !== "Aluno") : undefined;

  const [nome, setNome] = useState(editando?.nome ?? "");
  const [email, setEmail] = useState(editando?.email ?? "");
  const [tel, setTel] = useState(editando?.tel ?? "");
  const [perfil, setPerfil] = useState<Usuario["perfil"]>(editando?.perfil ?? "Instrutor");
  const [endereco, setEndereco] = useState(editando?.endereco ?? ENDERECO_VAZIO);
  const [pessoais, setPessoais] = useState<DadosPessoais>({
    cpf: editando?.cpf ?? "",
    nascimento: editando?.nascimento ?? "",
    sexo: editando?.sexo ?? "",
  });
  const [admissao, setAdmissao] = useState(editando?.admissao ?? "");
  const [erro, setErro] = useState("");

  if (id && !editando) {
    return (
      <div>
        <p className="text-sm text-navy/60">Usuário não encontrado.</p>
        <button
          type="button"
          onClick={() => navigate("/admin/usuarios")}
          className="mt-3 text-sm font-bold text-teal-mid"
        >
          ← Usuários e perfis
        </button>
      </div>
    );
  }

  function salvar() {
    if (!nome.trim() || !email.trim()) {
      setErro("Preencha nome e e-mail.");
      return;
    }
    const erroPessoais = validarDadosPessoais(pessoais);
    if (erroPessoais) {
      setErro(erroPessoais);
      return;
    }
    const cpfEmUso = usuarios.some(
      (u) =>
        u.id !== editando?.id &&
        u.perfil !== "Aluno" &&
        u.cpf &&
        soDigitos(u.cpf) === soDigitos(pessoais.cpf),
    );
    if (cpfEmUso) {
      setErro("Já existe um funcionário cadastrado com este CPF.");
      return;
    }
    if (!admissao) {
      setErro("Informe a data de admissão.");
      return;
    }
    if (!dataIsoValida(admissao) || admissao < pessoais.nascimento) {
      setErro("Data de admissão inválida: não pode ser anterior ao nascimento.");
      return;
    }
    const erroEndereco = validarEndereco(endereco);
    if (erroEndereco) {
      setErro(erroEndereco);
      return;
    }

    salvarUsuario({
      id: editando?.id,
      nome,
      email,
      tel,
      perfil,
      endereco,
      cpf: pessoais.cpf,
      nascimento: pessoais.nascimento,
      sexo: pessoais.sexo,
      admissao,
    });
    const primeiroNome = nome.trim().split(" ")[0];
    toast(
      !editando
        ? `${primeiroNome} cadastrado(a).`
        : editando.perfil !== perfil
          ? `Cadastro de ${primeiroNome} atualizado — perfil alterado para ${perfil}.`
          : `Cadastro de ${primeiroNome} atualizado.`,
    );
    navigate("/admin/usuarios");
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div className="rounded-2xl border border-navy/10 bg-white p-6">
        <div className="text-base font-bold">{editando ? "Editar usuário" : "Novo usuário"}</div>

        <div className="mt-[18px] grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-xs font-bold">
            <span>
              Nome completo
              <Obrigatorio />
            </span>
            <input
              aria-required="true"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Carla Menezes"
              className={campo}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-bold">
            <span>
              E-mail
              <Obrigatorio />
            </span>
            <input
              aria-required="true"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="carla@gymflow.com"
              className={campo}
            />
          </label>
          <DadosPessoaisFields value={pessoais} onChange={setPessoais} />
          <label className="flex flex-col gap-1.5 text-xs font-bold">
            Telefone
            <input
              value={tel}
              onChange={(e) => setTel(e.target.value)}
              placeholder="(84) 90000-0000"
              className={campo}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-bold">
            Perfil de acesso
            <select
              value={perfil}
              onChange={(e) => setPerfil(e.target.value as Usuario["perfil"])}
              className={`${campo} bg-white`}
            >
              {PERFIS.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-bold">
            <span>
              Data de admissão
              <Obrigatorio />
            </span>
            <input
              type="date"
              value={admissao}
              min="1950-01-01"
              onChange={(e) => setAdmissao(e.target.value)}
              aria-required="true"
              className={campo}
            />
          </label>
        </div>

        <div className="mt-6 border-t border-navy/10 pt-5">
          <div className="mb-3.5 text-sm font-bold text-navy">Endereço</div>
          <EnderecoFields value={endereco} onChange={setEndereco} />
        </div>

        <p className="mt-4 text-xs text-navy/50">
          <span className="text-danger">*</span> Campo obrigatório
        </p>
        {erro && <p className="mt-3.5 text-[13px] font-semibold text-danger">{erro}</p>}

        <div className="mt-5 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={() => navigate("/admin/usuarios")}
            className="rounded-[10px] border border-navy/18 px-[18px] py-2.5 text-[13.5px] font-bold"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={salvar}
            className="rounded-[10px] bg-teal px-5 py-2.5 text-[13.5px] font-bold text-navy-dark transition hover:bg-neon"
          >
            {editando ? "Salvar alterações" : "Cadastrar usuário"}
          </button>
        </div>
      </div>
    </div>
  );
}
