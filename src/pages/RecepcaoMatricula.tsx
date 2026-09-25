import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useStore } from "../data/store";
import { useToast } from "../components/Toast";

const PLANOS_DIAS_VENC = ["Todo dia 05", "Todo dia 10", "Todo dia 15", "Todo dia 20"];

export default function RecepcaoMatricula() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { alunos, planos, salvarAluno } = useStore();

  const editando = id ? alunos.find((a) => a.id === Number(id)) : undefined;
  const [passo, setPasso] = useState<1 | 2>(1);
  const [erro, setErro] = useState("");

  const [nome, setNome] = useState(editando?.nome ?? "");
  const [email, setEmail] = useState(editando?.email ?? "");
  const [tel, setTel] = useState(editando?.tel ?? "(84) 90000-0000");
  const [instrutor, setInstrutor] = useState(editando?.instrutor ?? "Carla Menezes");

  const [plano, setPlano] = useState(editando?.plano ?? "Mensal Fit");
  const [inicio, setInicio] = useState("15/09/2026");
  const [diaVenc, setDiaVenc] = useState("Todo dia 15");

  function irPasso2() {
    if (!nome || !email) {
      setErro("Preencha nome e e-mail.");
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
      plano,
      instrutor,
      fim: editando?.fim ?? "15/10/2026",
      matricula: editando?.matricula ?? `#2026-0${Math.floor(100 + Math.random() * 900)}`,
    });
    toast(
      editando
        ? `Cadastro de ${nome.split(" ")[0]} atualizado.`
        : `Matrícula de ${nome.split(" ")[0]} concluída.`,
    );
    navigate("/recepcao/alunos");
  }

  const planoSelecionado = planos.find((p) => p.nome === plano) ?? planos[0];

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
              Nome completo
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ana Beatriz Lima"
                className="rounded-[9px] border border-navy/16 px-2.5 py-2.5 text-sm font-normal"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-bold">
              E-mail
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ana@email.com"
                className="rounded-[9px] border border-navy/16 px-2.5 py-2.5 text-sm font-normal"
              />
            </label>
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
          {erro && <p className="mt-3.5 text-[13px] font-semibold text-danger">{erro}</p>}
          <div className="mt-5 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => navigate("/recepcao/alunos")}
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
          <div className="text-base font-bold">Matrícula e plano</div>

          {editando ? (
            <div className="mt-[18px] rounded-xl bg-beige/45 p-4 text-[13px] leading-relaxed">
              <strong>{nome}</strong> · plano atual: {planoSelecionado.nome} —{" "}
              {planoSelecionado.valor} · matrícula até {editando.fim}
              <br />
              Plano e cobranças desta matrícula não mudam aqui — use{" "}
              <strong>Trocar plano</strong> na listagem de alunos. Alteração de cadastro
              registrada por Júlia Alves (RNF07).
            </div>
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
              {editando ? "Salvar alterações" : "Concluir matrícula"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
