import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { useToast } from "../components/Toast";
import { useAuth } from "../auth/AuthContext";
import { useFotoPerfil } from "../auth/FotoPerfil";
import Avatar from "../components/Avatar";
import TrocarFotoModal from "../components/TrocarFotoModal";
import { useStore } from "../data/store";
import { formatarDataBr } from "../lib/pessoa";

// Meu perfil da equipe (Instrutor, Recepcionista e Administrador): à esquerda o que a pessoa altera
// (foto, telefone e e-mail de contato) e, à direita, os dados cadastrais somente leitura.
// Os dados editáveis ficam no DynamoDB e a foto no S3, pela mesma API do perfil do aluno (PUT/GET /profile).
export default function MeuPerfil() {
  const toast = useToast();
  const { user } = useAuth();
  const { usuarios } = useStore();
  const foto = useFotoPerfil();
  const [trocandoFoto, setTrocandoFoto] = useState(false);

  // dados de demonstração: o cadastro é localizado pelo e-mail ou pelo nome do login e, na falta dos dois,
  // cai no primeiro usuário do mesmo perfil de acesso
  const emailLogin = (user?.email ?? "").toLowerCase();
  const cadastro =
    usuarios.find((u) => u.email.toLowerCase() === emailLogin) ??
    usuarios.find((u) => u.nome === user?.nome) ??
    usuarios.find((u) => u.perfil === user?.perfil);
  const e = cadastro?.endereco;

  const [telefone, setTelefone] = useState(cadastro?.tel ?? "");
  const [email, setEmail] = useState(user?.email ?? "");

  // o que foi salvo na nuvem vale mais que os dados de demonstração
  useEffect(() => {
    if (!foto.perfil) return;
    if (foto.perfil.telefone !== undefined) setTelefone(foto.perfil.telefone);
    if (foto.perfil.emailContato !== undefined) setEmail(foto.perfil.emailContato);
  }, [foto.perfil]);

  // somente leitura: identificação e vínculo com a academia só o administrador altera
  const dadosCadastrais = [
    { k: "E-mail do login", v: user?.email || "—" },
    { k: "Perfil de acesso", v: user?.perfil ?? "—" },
    { k: "CPF", v: cadastro?.cpf ?? "—" },
    { k: "Data de nascimento", v: formatarDataBr(cadastro?.nascimento) },
    { k: "Sexo", v: cadastro?.sexo || "—" },
    { k: "Data de admissão", v: formatarDataBr(cadastro?.admissao) },
    { k: "Situação", v: cadastro ? (cadastro.ativo ? "Ativo" : "Bloqueado") : "—" },
  ];

  async function salvarDados() {
    if (!foto.configurado) {
      toast("O envio de dados não está configurado neste ambiente.");
      return;
    }
    try {
      await foto.salvarDados({ telefone, emailContato: email });
      toast("Dados de contato atualizados.");
    } catch (erro) {
      toast(erro instanceof Error ? erro.message : "Não foi possível salvar os dados.");
    }
  }

  function abrirTrocaDeFoto() {
    if (!foto.configurado) {
      toast("O envio de foto não está configurado neste ambiente.");
      return;
    }
    setTrocandoFoto(true);
  }

  const campo =
    "rounded-[10px] border border-navy/20 px-3 py-2.5 text-sm font-normal outline-none focus:border-teal focus:ring-[3px] focus:ring-teal/25";
  const linha =
    "flex justify-between gap-3 border-b border-dashed border-navy/10 pb-2.5 text-[13px]";

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-navy/10 bg-white p-[22px]">
        <div className="flex items-center gap-3.5">
          <Avatar
            url={foto.url}
            iniciais={user?.iniciais}
            className="font-display h-16 w-16 bg-navy text-2xl font-bold text-neon"
          />
          <div>
            <div className="text-[17px] font-bold text-navy">{user?.nome}</div>
            <div className="text-[13px] text-navy/55">
              {user?.perfil} · {user?.email}
            </div>
            <button
              type="button"
              onClick={abrirTrocaDeFoto}
              className="mt-1.5 text-xs font-bold text-teal-mid"
            >
              Trocar foto
            </button>
          </div>
        </div>

        <form
          className="mt-[22px] flex flex-col gap-3.5"
          onSubmit={(ev) => {
            ev.preventDefault();
            void salvarDados();
          }}
        >
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-navy">
            Telefone
            <input value={telefone} onChange={(ev) => setTelefone(ev.target.value)} className={campo} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-navy">
            E-mail de contato
            <input value={email} onChange={(ev) => setEmail(ev.target.value)} className={campo} />
          </label>
          <button
            type="submit"
            disabled={foto.salvando}
            className="rounded-[10px] bg-navy py-3 text-sm font-bold text-white transition hover:bg-navy-hover disabled:opacity-60"
          >
            {foto.salvando ? "Salvando…" : "Salvar alterações"}
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-navy/10 bg-white p-[22px]">
        <div className="text-[11px] font-bold uppercase tracking-wider text-navy/45">
          Dados cadastrais
        </div>
        <div className="mt-3.5 flex flex-col gap-2.5">
          {dadosCadastrais.map((item) => (
            <div key={item.k} className={linha}>
              <span className="flex items-center gap-1.5 text-navy/55">
                {item.k}
                <Lock size={11} aria-label="Somente leitura" className="text-navy/35" />
              </span>
              <span className="text-right font-bold">{item.v}</span>
            </div>
          ))}
          <div className="flex justify-between gap-3 text-[13px]">
            <span className="flex items-center gap-1.5 text-navy/55">
              Endereço
              <Lock size={11} aria-label="Somente leitura" className="text-navy/35" />
            </span>
            {e?.logradouro ? (
              <span className="text-right font-bold">
                {e.logradouro}, {e.numero}
                {e.complemento ? ` — ${e.complemento}` : ""}
                <span className="block font-normal text-navy/55">
                  {e.bairro} · {e.cidade}/{e.uf} · CEP {e.cep}
                </span>
              </span>
            ) : (
              <span className="text-right font-bold">—</span>
            )}
          </div>
        </div>
        <p className="mt-3.5 text-xs leading-relaxed text-navy/45">
          Foto, telefone e e-mail de contato você atualiza ao lado; o perfil de acesso, o CPF e os demais
          dados só o administrador altera.
        </p>
      </div>

      {trocandoFoto && (
        <TrocarFotoModal iniciais={user?.iniciais ?? ""} onClose={() => setTrocandoFoto(false)} />
      )}
    </div>
  );
}
