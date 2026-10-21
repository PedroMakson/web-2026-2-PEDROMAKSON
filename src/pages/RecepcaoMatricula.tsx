import { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Pencil, X } from "lucide-react";
import { useStore } from "../data/store";
import { useToast } from "../components/Toast";
import DadosPessoaisFields from "../components/DadosPessoaisFields";
import EnderecoFields from "../components/EnderecoFields";
import TrocaPlanoPainel from "../components/TrocaPlanoPainel";
import Obrigatorio from "../components/Obrigatorio";
import { ENDERECO_VAZIO, soDigitos, validarEndereco } from "../lib/endereco";
import { type DadosPessoais, validarDadosPessoais } from "../lib/pessoa";
import { rotasPorArea } from "../lib/rotas";

const PLANOS_DIAS_VENC = ["Todo dia 05", "Todo dia 10", "Todo dia 15", "Todo dia 20"];

export default function RecepcaoMatricula() {
  const { id } = useParams();
  const navigate = useNavigate();
  const rotas = rotasPorArea(useLocation().pathname);
  const toast = useToast();
  const { alunos, planos, salvarAluno, trocarPlano } = useStore();

  const editando = id ? alunos.find((a) => a.id === Number(id)) : undefined;
  const [passo, setPasso] = useState<1 | 2>(1);
  const [erro, setErro] = useState("");

  const [nome, setNome] = useState(editando?.nome ?? "");
  const [email, setEmail] = useState(editando?.email ?? "");
  const [tel, setTel] = useState(editando?.tel ?? "(84) 90000-0000");
  const [instrutor, setInstrutor] = useState(editando?.instrutor ?? "Carla Menezes");
  const [endereco, setEndereco] = useState(editando?.endereco ?? ENDERECO_VAZIO);
  const [pessoais, setPessoais] = useState<DadosPessoais>({
    cpf: editando?.cpf ?? "",
    nascimento: editando?.nascimento ?? "",
    sexo: editando?.sexo ?? "",
  });

  const [plano, setPlano] = useState(editando?.plano ?? "Mensal Fit");
  const [inicio, setInicio] = useState("15/09/2026");
  const [diaVenc, setDiaVenc] = useState("Todo dia 15");
  const [diaTroca, setDiaTroca] = useState("Todo dia 10");
  const [planoLiberado, setPlanoLiberado] = useState(false);

  function irPasso2() {
    if (!nome.trim() || !email.trim()) {
      setErro("Preencha nome e e-mail.");
      return;
    }
    const erroPessoais = validarDadosPessoais(pessoais);
    if (erroPessoais) {
      setErro(erroPessoais);
      return;
    }
    const cpfEmUso = alunos.some(
      (a) => a.id !== editando?.id && a.cpf && soDigitos(a.cpf) === soDigitos(pessoais.cpf),
    );
    if (cpfEmUso) {
      setErro("Já existe um aluno cadastrado com este CPF.");
      return;
    }
    const erroEndereco = validarEndereco(endereco);
    if (erroEndereco) {
      setErro(erroEndereco);
      return;
    }
    setErro("");
    setPasso(2);
  }

  function concluir() {
    salvarAluno({
      id: editando?.id,
      nome,
      email,
      tel,
      // na edição o plano só muda pela troca de plano (nova matrícula e parcelas)
      plano: editando?.plano ?? plano,
      instrutor,
      endereco,
      cpf: pessoais.cpf,
      nascimento: pessoais.nascimento,
      sexo: pessoais.sexo,
      fim: editando?.fim ?? "15/10/2026",
      matricula: editando?.matricula ?? `#2026-0${Math.floor(100 + Math.random() * 900)}`,
    });
    if (editando && trocandoPlano) {
      const r = trocarPlano(editando.id, plano, diaTroca, false);
      if (!r.ok) {
        toast(r.motivo ?? "Não foi possível trocar o plano.");
        return;
      }
      toast(r.mensagem ?? "Plano atualizado.");
      navigate(rotas.pagamentos);
      return;
    }
    toast(
      editando
        ? `Cadastro de ${nome.split(" ")[0]} atualizado.`
        : `Matrícula de ${nome.split(" ")[0]} concluída.`,
    );
    navigate(rotas.alunos);
  }

  const planoSelecionado = planos.find((p) => p.nome === plano) ?? planos[0];
  const planoAtual = planos.find((p) => p.nome === editando?.plano) ?? planoSelecionado;
  // Na edição, escolher outro plano equivale ao "Trocar plano" da listagem.
  const trocandoPlano = !!editando && plano !== editando.plano;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div className="flex items-center gap-2.5">
        {[
          { n: 1, label: "Dados do aluno" },
          { n: 2, label: "Matrícula e plano" },
        ].map((p) => (
          <div key={p.n} className="flex flex-1 items-center gap-2.5">
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${
                passo >= p.n ? "bg-navy text-white" : "bg-navy/10 text-navy/50"
              }`}
            >
              {p.n}
            </div>
            <div
              className={`text-[13px] font-bold ${passo >= p.n ? "text-navy" : "text-navy/45"}`}
            >
              {p.label}
            </div>
            <div className="h-0.5 flex-1 bg-navy/10" />
          </div>
        ))}
      </div>

      {passo === 1 && (
        <div className="rounded-2xl border border-navy/10 bg-white p-6">
          <div className="text-base font-bold">
            {editando ? "Editar dados do aluno" : "Dados do aluno"}
          </div>
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
                placeholder="Ana Beatriz Lima"
                className="rounded-[9px] border border-navy/16 px-2.5 py-2.5 text-sm font-normal"
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
                placeholder="ana@email.com"
                className="rounded-[9px] border border-navy/16 px-2.5 py-2.5 text-sm font-normal"
              />
            </label>
            <DadosPessoaisFields value={pessoais} onChange={setPessoais} />
            <label className="flex flex-col gap-1.5 text-xs font-bold">
              Telefone
              <input
                value={tel}
                onChange={(e) => setTel(e.target.value)}
                placeholder="(84) 90000-0000"
                className="rounded-[9px] border border-navy/16 px-2.5 py-2.5 text-sm font-normal"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-bold">
              Instrutor responsável
              <select
                value={instrutor}
                onChange={(e) => setInstrutor(e.target.value)}
                className="rounded-[9px] border border-navy/16 bg-white px-2.5 py-2.5 text-sm font-normal"
              >
                <option>Carla Menezes</option>
                <option>Diego Rocha</option>
                <option>Sem instrutor</option>
              </select>
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
              onClick={() => navigate(rotas.alunos)}
              className="rounded-[10px] border border-navy/18 px-[18px] py-2.5 text-[13.5px] font-bold"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={irPasso2}
              className="rounded-[10px] bg-navy px-5 py-2.5 text-[13.5px] font-bold text-white"
            >
              Próximo
            </button>
          </div>
        </div>
      )}

      {passo === 2 && (
        <div className="rounded-2xl border border-navy/10 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-base font-bold">Matrícula e plano</div>
            {editando && (
              <button
                type="button"
                onClick={() => {
                  if (planoLiberado) setPlano(editando.plano);
                  setPlanoLiberado(!planoLiberado);
                }}
                className="flex items-center gap-1.5 rounded-[10px] border border-navy/18 px-3.5 py-2 text-[13px] font-bold text-navy transition hover:border-teal hover:bg-teal/10"
              >
                {planoLiberado ? (
                  <>
                    <X size={15} /> Cancelar troca
                  </>
                ) : (
                  <>
                    <Pencil size={15} /> Editar plano
                  </>
                )}
              </button>
            )}
          </div>

          {editando ? (
            <>
              <div className="mt-[18px] rounded-xl bg-beige/45 p-4 text-[13px] leading-relaxed">
                <strong>{nome}</strong> · plano atual: {planoAtual.nome} — {planoAtual.valor} ·
                matrícula até {editando.fim}
                <br />
                Para trocar o plano, clique em <strong>Editar plano</strong>. Alteração de cadastro
                registrada por Júlia Alves (RNF07).
              </div>
              <div className="mt-4">
                <TrocaPlanoPainel
                  aluno={editando}
                  planoEscolhido={plano}
                  onPlano={setPlano}
                  dia={diaTroca}
                  onDia={setDiaTroca}
                  alterando={trocandoPlano}
                  bloqueado={!planoLiberado}
                />
              </div>
            </>
          ) : (
            <>
              <div className="mt-[18px] grid grid-cols-1 gap-3 sm:grid-cols-3">
                {planos.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPlano(p.nome)}
                    className={`rounded-xl border p-4 text-left ${
                      plano === p.nome
                        ? "border-navy bg-navy text-white"
                        : "border-navy/16 bg-white text-navy"
                    }`}
                  >
                    <div className="text-sm font-bold">{p.nome}</div>
                    <div className="font-display mt-1 text-[26px] font-bold">{p.valor}</div>
                    <div
                      className={`text-xs ${plano === p.nome ? "text-white/60" : "text-navy/50"}`}
                    >
                      {p.duracao}
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-[18px] grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-xs font-bold">
                  Início
                  <input
                    value={inicio}
                    onChange={(e) => setInicio(e.target.value)}
                    className="rounded-[9px] border border-navy/16 px-2.5 py-2.5 text-sm font-normal"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-bold">
                  Vencimento da mensalidade
                  <select
                    value={diaVenc}
                    onChange={(e) => setDiaVenc(e.target.value)}
                    className="rounded-[9px] border border-navy/16 bg-white px-2.5 py-2.5 text-sm font-normal"
                  >
                    {PLANOS_DIAS_VENC.map((d) => (
                      <option key={d}>{d}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-[18px] rounded-xl bg-beige/45 p-4 text-[13px] leading-relaxed">
                <strong>{nome}</strong> · {planoSelecionado.nome} — {planoSelecionado.valor} ·
                início {inicio}
                <br />
                Cobrança {diaVenc.toLowerCase()}. A forma de pagamento é definida na hora de
                pagar — em Pagamentos ou pelo Pix no app do aluno.
              </div>
            </>
          )}

          <div className="mt-5 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setPasso(1)}
              className="rounded-[10px] border border-navy/18 px-[18px] py-2.5 text-[13.5px] font-bold"
            >
              Voltar
            </button>
            <button
              type="button"
              onClick={concluir}
              className="rounded-[10px] bg-teal px-5 py-2.5 text-[13.5px] font-bold text-navy-dark transition hover:bg-neon"
            >
              {!editando ? "Concluir matrícula" : trocandoPlano ? "Salvar e trocar plano" : "Salvar alterações"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
