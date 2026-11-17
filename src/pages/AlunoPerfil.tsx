import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { useToast } from "../components/Toast";
import { useAuth } from "../auth/AuthContext";
import { useFotoPerfil } from "../auth/FotoPerfil";
import Avatar from "../components/Avatar";
import TrocarFotoModal from "../components/TrocarFotoModal";
import { useAlunoLogado } from "../data/useAlunoLogado";
import { MATRICULA_LINHAS } from "../data/aluno";
import { formatarDataBr } from "../lib/pessoa";

export default function AlunoPerfil() {
  const toast = useToast();
  const { user } = useAuth();
  const aluno = useAlunoLogado();
  const foto = useFotoPerfil();
  const [trocandoFoto, setTrocandoFoto] = useState(false);

  const [telefone, setTelefone] = useState(aluno?.tel ?? "");
  const [email, setEmail] = useState(aluno?.email ?? "");

  // o que foi salvo na nuvem (DynamoDB) vale mais que os dados de demonstração
  useEffect(() => {
    if (!foto.perfil) return;
    if (foto.perfil.telefone !== undefined) setTelefone(foto.perfil.telefone);
    if (foto.perfil.emailContato !== undefined) setEmail(foto.perfil.emailContato);
  }, [foto.perfil]);

  async function salvarDados() {
    if (!foto.configurado) {
      toast("O envio de dados não está configurado neste ambiente.");
      return;
    }
    try {
      await foto.salvarDados({ telefone, emailContato: email });
      toast("Dados de contato atualizados.");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Não foi possível salvar os dados.");
    }
  }

  const nome = aluno?.nome ?? user?.nome ?? "";
  const iniciais = nome
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
  const e = aluno?.endereco;

  function abrirTrocaDeFoto() {
    if (!foto.configurado) {
      toast("O envio de foto não está configurado neste ambiente.");
      return;
    }
    setTrocandoFoto(true);
  }

  // somente leitura: dados de identificação não são alterados pelo próprio aluno
  const dadosPessoais = [
    { k: "CPF", v: aluno?.cpf ?? "—" },
    { k: "Data de nascimento", v: formatarDataBr(aluno?.nascimento) },
    { k: "Sexo", v: aluno?.sexo || "—" },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-navy/10 bg-white p-[22px]">
        <div className="flex items-center gap-3.5">
          <Avatar
            url={foto.url}
            iniciais={iniciais}
            className="font-display h-16 w-16 bg-navy text-2xl font-bold text-neon"
          />
          <div>
            <div className="text-[17px] font-bold text-navy">{nome}</div>
            <div className="text-[13px] text-navy/55">{aluno?.email}</div>
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
            <input
              value={telefone}
              onChange={(ev) => setTelefone(ev.target.value)}
              className="rounded-[10px] border border-navy/20 px-3 py-2.5 text-sm font-normal outline-none focus:border-teal focus:ring-[3px] focus:ring-teal/25"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-navy">
            E-mail
            <input
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              className="rounded-[10px] border border-navy/20 px-3 py-2.5 text-sm font-normal outline-none focus:border-teal focus:ring-[3px] focus:ring-teal/25"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-navy">
            Nova senha
            <input
              type="password"
              placeholder="••••••••"
              className="rounded-[10px] border border-navy/20 px-3 py-2.5 text-sm font-normal outline-none focus:border-teal focus:ring-[3px] focus:ring-teal/25"
            />
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
          {dadosPessoais.map((linha) => (
            <div
              key={linha.k}
              className="flex justify-between gap-3 border-b border-dashed border-navy/10 pb-2.5 text-[13px]"
            >
              <span className="flex items-center gap-1.5 text-navy/55">
                {linha.k}
                <Lock size={11} aria-label="Somente leitura" className="text-navy/35" />
              </span>
              <span className="text-right font-bold">{linha.v}</span>
            </div>
          ))}
          <div className="flex justify-between gap-3 border-b border-dashed border-navy/10 pb-2.5 text-[13px]">
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
          CPF, data de nascimento, sexo, endereço, plano, preço e perfil de acesso só podem ser
          alterados pela recepção ou administração. Telefone e e-mail você atualiza ao lado.
        </p>
      </div>

      {trocandoFoto && (
        <TrocarFotoModal iniciais={iniciais} onClose={() => setTrocandoFoto(false)} />
      )}
    </div>
  );
}
