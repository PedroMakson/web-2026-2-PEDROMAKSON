import { Lock } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import PerfilCard from "../components/PerfilCard";
import { useStore } from "../data/store";
import { ENDERECO_VAZIO } from "../lib/endereco";
import { formatarDataBr } from "../lib/pessoa";

// Meu perfil da equipe (Instrutor, Recepcionista e Administrador): à esquerda o que a pessoa altera (foto,
// contato, nascimento, sexo, endereço e senha; o CPF fica travado) e, à direita, o vínculo com a academia,
// somente leitura. Os dados editados ficam no DynamoDB e a foto no S3, pela mesma API do perfil do aluno.
export default function MeuPerfil() {
  const { user } = useAuth();
  const { usuarios } = useStore();

  // dados de demonstração: o cadastro é localizado pelo e-mail ou pelo nome do login e, na falta dos dois,
  // cai no primeiro usuário do mesmo perfil de acesso
  const emailLogin = (user?.email ?? "").toLowerCase();
  const cadastro =
    usuarios.find((u) => u.email.toLowerCase() === emailLogin) ??
    usuarios.find((u) => u.nome === user?.nome) ??
    usuarios.find((u) => u.perfil === user?.perfil);

  // somente leitura: o vínculo com a academia só o administrador altera
  const vinculo = [
    { k: "E-mail do login", v: user?.email || "—" },
    { k: "Perfil de acesso", v: user?.perfil ?? "—" },
    { k: "Data de admissão", v: formatarDataBr(cadastro?.admissao) },
    { k: "Situação", v: cadastro ? (cadastro.ativo ? "Ativo" : "Bloqueado") : "—" },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <PerfilCard
        nome={user?.nome ?? ""}
        subtitulo={`${user?.perfil} · ${user?.email}`}
        iniciais={user?.iniciais ?? ""}
        cpf={cadastro?.cpf ?? "—"}
        emailRotulo="E-mail de contato"
        base={{
          telefone: cadastro?.tel ?? "",
          email: user?.email ?? "",
          nascimento: cadastro?.nascimento ?? "",
          sexo: cadastro?.sexo ?? "",
          endereco: cadastro?.endereco ?? ENDERECO_VAZIO,
        }}
      />

      <div className="self-start rounded-2xl border border-navy/10 bg-white p-[22px]">
        <div className="text-[11px] font-bold uppercase tracking-wider text-navy/45">
          Dados cadastrais
        </div>
        <div className="mt-3.5 flex flex-col gap-2.5">
          {vinculo.map((item, i) => (
            <div
              key={item.k}
              className={`flex justify-between gap-3 text-[13px] ${
                i < vinculo.length - 1 ? "border-b border-dashed border-navy/10 pb-2.5" : ""
              }`}
            >
              <span className="flex items-center gap-1.5 text-navy/55">
                {item.k}
                <Lock size={11} aria-label="Somente leitura" className="text-navy/35" />
              </span>
              <span className="text-right font-bold">{item.v}</span>
            </div>
          ))}
        </div>
        <p className="mt-3.5 text-xs leading-relaxed text-navy/45">
          O perfil de acesso, a admissão e a situação só o administrador altera. Seus dados pessoais e de
          contato você atualiza ao lado, em Editar.
        </p>
      </div>
    </div>
  );
}
