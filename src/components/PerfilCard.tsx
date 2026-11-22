import { type FormEvent, useState } from "react";
import { KeyRound, Lock, Pencil } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { useFotoPerfil } from "../auth/FotoPerfil";
import { type Endereco, validarEndereco } from "../lib/endereco";
import { enderecoDoPerfil, type PerfilSalvo } from "../lib/fotoApi";
import {
  dataIsoValida,
  hojeIso,
  NASCIMENTO_MINIMO,
  SEXOS,
  type Sexo,
} from "../lib/pessoa";
import AlterarSenhaModal from "./AlterarSenhaModal";
import Avatar from "./Avatar";
import EnderecoFields from "./EnderecoFields";
import TrocarFotoModal from "./TrocarFotoModal";
import { useToast } from "./Toast";

// O que o usuário pode alterar no próprio perfil.
export type DadosEditaveis = {
  telefone: string;
  email: string;
  nascimento: string;
  sexo: Sexo | "";
  endereco: Endereco;
};

// O que foi salvo na nuvem (DynamoDB) vale mais que os dados de demonstração.
function juntar(base: DadosEditaveis, perfil: PerfilSalvo | null): DadosEditaveis {
  return {
    telefone: perfil?.telefone ?? base.telefone,
    email: perfil?.emailContato ?? base.email,
    nascimento: perfil?.nascimento ?? base.nascimento,
    sexo: (perfil?.sexo as Sexo | undefined) ?? base.sexo,
    endereco: enderecoDoPerfil(perfil) ?? base.endereco,
  };
}

function validar(d: DadosEditaveis): string | null {
  if (d.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email.trim())) return "E-mail inválido.";
  if (!d.nascimento) return "Informe a data de nascimento.";
  if (!dataIsoValida(d.nascimento) || d.nascimento < NASCIMENTO_MINIMO || d.nascimento > hojeIso()) {
    return "Data de nascimento inválida.";
  }
  return validarEndereco(d.endereco);
}

const rotulo = "flex flex-col gap-1.5 text-sm font-semibold text-navy";
const campo =
  "rounded-[10px] border border-navy/20 px-3 py-2.5 text-sm font-normal outline-none focus:border-teal focus:ring-[3px] focus:ring-teal/25";
// campos bloqueados (inclusive os do EnderecoFields) ficam em cinza, sem foco
const bloqueado =
  "[&_input:disabled]:bg-navy/5 [&_input:disabled]:text-navy/70 [&_select:disabled]:bg-navy/5 [&_select:disabled]:text-navy/70";

// Cartão da esquerda do "Meu perfil": foto, dados pessoais e de contato (travados até clicar em Editar)
// e a troca de senha. O CPF nunca é liberado: só a recepção ou a administração altera.
export default function PerfilCard({
  nome,
  subtitulo,
  iniciais,
  cpf,
  emailRotulo,
  base,
}: {
  nome: string;
  subtitulo: string;
  iniciais: string;
  cpf: string;
  emailRotulo: string;
  base: DadosEditaveis;
}) {
  const toast = useToast();
  const { user } = useAuth();
  const foto = useFotoPerfil();
  const [trocandoFoto, setTrocandoFoto] = useState(false);
  const [trocandoSenha, setTrocandoSenha] = useState(false);
  const [editando, setEditando] = useState(false);
  const [erro, setErro] = useState("");

  const salvo = juntar(base, foto.perfil);
  // rascunho: só existe durante a edição; fora dela a tela mostra direto o que está salvo
  const [rascunho, setRascunho] = useState<DadosEditaveis>(salvo);
  const form = editando ? rascunho : salvo;

  function alterar(parcial: Partial<DadosEditaveis>) {
    setRascunho((atual) => ({ ...atual, ...parcial }));
  }

  function editar() {
    setRascunho(salvo);
    setErro("");
    setEditando(true);
  }

  function cancelar() {
    setErro("");
    setEditando(false);
  }

  async function salvar(ev: FormEvent) {
    ev.preventDefault();
    if (!foto.configurado) {
      setErro("O envio de dados não está configurado neste ambiente.");
      return;
    }
    const problema = validar(form);
    if (problema) {
      setErro(problema);
      return;
    }
    setErro("");
    try {
      await foto.salvarDados({
        telefone: form.telefone,
        emailContato: form.email,
        nascimento: form.nascimento,
        sexo: form.sexo,
        endereco: form.endereco,
      });
      setEditando(false);
      toast("Dados atualizados.");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível salvar os dados.");
    }
  }

  function abrirTrocaDeFoto() {
    if (!foto.configurado) {
      toast("O envio de foto não está configurado neste ambiente.");
      return;
    }
    setTrocandoFoto(true);
  }

  return (
    <div className="rounded-2xl border border-navy/10 bg-white p-[22px]">
      <div className="flex items-center gap-3.5">
        <Avatar
          url={foto.url}
          iniciais={iniciais}
          className="font-display h-16 w-16 bg-navy text-2xl font-bold text-neon"
        />
        <div>
          <div className="text-[17px] font-bold text-navy">{nome}</div>
          <div className="text-[13px] text-navy/55">{subtitulo}</div>
          <button type="button" onClick={abrirTrocaDeFoto} className="mt-1.5 text-xs font-bold text-teal-mid">
            Trocar foto
          </button>
        </div>
      </div>

      <form className="mt-[22px]" onSubmit={salvar}>
        <div className="flex items-center justify-between gap-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-navy/45">
            Dados pessoais e de contato
          </div>
          {!editando && (
            <button
              type="button"
              onClick={editar}
              className="flex items-center gap-1.5 rounded-[10px] border border-navy/18 px-3 py-1.5 text-[13px] font-bold text-navy transition hover:border-teal hover:bg-teal/10"
            >
              <Pencil size={14} />
              Editar
            </button>
          )}
        </div>

        <fieldset disabled={!editando || foto.salvando} className={`mt-3.5 flex flex-col gap-3.5 ${bloqueado}`}>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <label className={rotulo}>
              Telefone
              <input value={form.telefone} onChange={(ev) => alterar({ telefone: ev.target.value })} className={campo} />
            </label>
            <label className={rotulo}>
              {emailRotulo}
              <input value={form.email} onChange={(ev) => alterar({ email: ev.target.value })} className={campo} />
            </label>
            <label className={rotulo}>
              <span className="flex items-center gap-1.5">
                CPF
                <Lock size={11} aria-label="Somente leitura" className="text-navy/35" />
              </span>
              <input value={cpf} disabled readOnly className={campo} />
            </label>
            <label className={rotulo}>
              Data de nascimento
              <input
                type="date"
                value={form.nascimento}
                min={NASCIMENTO_MINIMO}
                max={hojeIso()}
                onChange={(ev) => alterar({ nascimento: ev.target.value })}
                className={campo}
              />
            </label>
            <label className={rotulo}>
              Sexo
              <select
                value={form.sexo}
                onChange={(ev) => alterar({ sexo: ev.target.value as Sexo | "" })}
                className={`${campo} bg-white`}
              >
                <option value="">Selecione</option>
                {SEXOS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-1 text-[11px] font-bold uppercase tracking-wider text-navy/45">Endereço</div>
          <EnderecoFields value={form.endereco} onChange={(endereco) => alterar({ endereco })} />
        </fieldset>

        {erro && (
          <p role="alert" className="mt-3 rounded-lg bg-red-600/10 px-3 py-2 text-[13px] font-semibold text-red-700">
            {erro}
          </p>
        )}

        {editando ? (
          <div className="mt-4 flex gap-2.5">
            <button
              type="button"
              onClick={cancelar}
              disabled={foto.salvando}
              className="rounded-[10px] border border-navy/18 px-[18px] py-3 text-sm font-bold disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={foto.salvando}
              className="flex-1 rounded-[10px] bg-navy py-3 text-sm font-bold text-white transition hover:bg-navy-hover disabled:opacity-60"
            >
              {foto.salvando ? "Salvando…" : "Salvar alterações"}
            </button>
          </div>
        ) : (
          <p className="mt-3 text-xs leading-relaxed text-navy/45">
            Clique em Editar para alterar. O CPF só pode ser alterado pela recepção ou administração.
          </p>
        )}
      </form>

      <div className="mt-5 border-t border-dashed border-navy/10 pt-4">
        <div className="text-[11px] font-bold uppercase tracking-wider text-navy/45">Senha</div>
        {user?.federado ? (
          <p className="mt-2 text-[13px] leading-relaxed text-navy/55">
            Você entrou com o Google. A senha da conta é gerenciada pelo Google, por isso não há troca de senha aqui.
          </p>
        ) : (
          <button
            type="button"
            onClick={() => setTrocandoSenha(true)}
            className="mt-2 flex items-center gap-1.5 rounded-[10px] border border-navy/18 px-3.5 py-2 text-[13px] font-bold text-navy transition hover:border-teal hover:bg-teal/10"
          >
            <KeyRound size={14} />
            Alterar senha
          </button>
        )}
      </div>

      {trocandoFoto && <TrocarFotoModal iniciais={iniciais} onClose={() => setTrocandoFoto(false)} />}
      {trocandoSenha && user && <AlterarSenhaModal email={user.email} onClose={() => setTrocandoSenha(false)} />}
    </div>
  );
}
