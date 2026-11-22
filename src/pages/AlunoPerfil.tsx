import { useAuth } from "../auth/AuthContext";
import PerfilCard from "../components/PerfilCard";
import { useAlunoLogado } from "../data/useAlunoLogado";
import { MATRICULA_LINHAS } from "../data/aluno";
import { ENDERECO_VAZIO } from "../lib/endereco";

// Meu perfil do aluno: à esquerda o que o aluno altera (foto, contato, nascimento, sexo, endereço e senha;
// o CPF fica travado) e, à direita, a matrícula, que só a recepção ou a administração mexe.
// Os dados editados ficam no DynamoDB e a foto no S3, pela API do perfil (PUT/GET /profile).
export default function AlunoPerfil() {
  const { user } = useAuth();
  const aluno = useAlunoLogado();

  const nome = aluno?.nome ?? user?.nome ?? "";
  const iniciais = nome
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <PerfilCard
        nome={nome}
        subtitulo={aluno?.email ?? user?.email ?? ""}
        iniciais={iniciais}
        cpf={aluno?.cpf ?? "—"}
        emailRotulo="E-mail"
        base={{
          telefone: aluno?.tel ?? "",
          email: aluno?.email ?? "",
          nascimento: aluno?.nascimento ?? "",
          sexo: aluno?.sexo ?? "",
          endereco: aluno?.endereco ?? ENDERECO_VAZIO,
        }}
      />

      <div className="self-start rounded-2xl border border-navy/10 bg-white p-[22px]">
        <div className="text-[11px] font-bold uppercase tracking-wider text-navy/45">
          Dados cadastrais
        </div>
        <div className="mt-3.5 flex flex-col gap-2.5">
          {MATRICULA_LINHAS.map((linha) => (
            <div
              key={linha.k}
              className="flex justify-between gap-3 border-b border-dashed border-navy/10 pb-2.5 text-[13px]"
            >
              <span className="text-navy/55">{linha.k}</span>
              <span className="text-right font-bold">{linha.v}</span>
            </div>
          ))}
        </div>
        <p className="mt-3.5 text-xs leading-relaxed text-navy/45">
          Matrícula, plano, preço e perfil de acesso só podem ser alterados pela recepção ou administração.
          Seus dados pessoais e de contato você atualiza ao lado, em Editar.
        </p>
      </div>
    </div>
  );
}
