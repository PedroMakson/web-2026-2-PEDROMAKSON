import { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Plus, X } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { type Divisao, type Treino, useStore } from "../data/store";
import type { Exercicio } from "../data/aluno";
import CalendarioFrequencia, { NavegacaoMes } from "../components/CalendarioFrequencia";
import { DetalheCheckinModal } from "../components/CheckinModais";
import { type Checkin, porSemana, totalNoMes, vigentes } from "../lib/checkins";
import { dataBr, lerNumero, maisRecentesPrimeiro, medidas, virgula } from "../lib/avaliacao";
import { HOJE_DEMO, paraData } from "../lib/datas";
import { useToast } from "../components/Toast";
import Obrigatorio from "../components/Obrigatorio";
import { rotasPorArea } from "../lib/rotas";

const META_SEMANAL = 4;
const DIVISOES: Divisao[] = ["A", "B", "C"];

const ABAS = ["treino", "aval", "freq"] as const;
type Aba = (typeof ABAS)[number];

// Editor de uma divisão do treino. O estado nasce do treino guardado; a tela de cima o recria (key) a cada troca de
// divisão ou depois de salvar.
function EditorTreino({
  divisao,
  treino,
  onSalvar,
}: {
  divisao: Divisao;
  treino?: Treino;
  onSalvar: (titulo: string, exercicios: Exercicio[]) => void;
}) {
  const toast = useToast();
  const [titulo, setTitulo] = useState(treino?.titulo ?? "");
  const [exercicios, setExercicios] = useState<Exercicio[]>(treino?.exercicios ?? []);

  function atualizarExercicio(i: number, campo: keyof Exercicio, valor: string) {
    setExercicios((prev) => prev.map((e, idx) => (idx === i ? { ...e, [campo]: valor } : e)));
  }

  function salvar() {
    if (!titulo.trim()) {
      toast("Dê um título à divisão (ex.: Peito e tríceps).");
      return;
    }
    // linhas sem nome de exercício não entram no treino
    const validos = exercicios
      .map((e) => ({ nome: e.nome.trim(), series: e.series.trim(), reps: e.reps.trim(), carga: e.carga.trim() }))
      .filter((e) => e.nome);
    onSalvar(titulo.trim(), validos);
    toast("Treino salvo com sucesso.");
  }

  const campo = "min-w-0 rounded-[9px] border border-navy/16 px-2.5 py-2.5 text-sm";
  return (
    <div className="rounded-2xl border border-navy/10 bg-white p-[22px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-base font-bold">Editor de treino</div>
          <div className="mt-1.5 flex items-center gap-2 text-xs text-navy/50">
            Divisão {divisao} ·
            <input
              value={titulo}
              onChange={(ev) => setTitulo(ev.target.value)}
              maxLength={60}
              placeholder="Título (ex.: Peito e tríceps)"
              aria-label="Título da divisão"
              className="min-w-0 rounded-[8px] border border-navy/16 px-2 py-1 text-xs text-navy"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setExercicios((prev) => [...prev, { nome: "", series: "", reps: "", carga: "" }])}
            className="flex items-center gap-1.5 rounded-[10px] border border-navy/18 px-3.5 py-2.5 text-[13px] font-bold text-navy transition hover:bg-navy/5"
          >
            <Plus size={15} /> Exercício
          </button>
          <button
            type="button"
            onClick={salvar}
            className="whitespace-nowrap rounded-[10px] bg-navy px-4 py-2.5 text-[13px] font-bold text-white"
          >
            Salvar treino
          </button>
        </div>
      </div>

      <div className="mt-[18px] flex flex-col gap-2.5">
        <div className="grid grid-cols-[2.2fr_.8fr_.8fr_.8fr_36px] gap-2.5 text-[11px] font-bold uppercase tracking-wider text-navy/45">
          <span>Exercício</span>
          <span>Séries</span>
          <span>Reps</span>
          <span>Carga</span>
          <span />
        </div>
        {exercicios.map((e, i) => (
          <div key={i} className="grid grid-cols-[2.2fr_.8fr_.8fr_.8fr_36px] items-center gap-2.5">
            <input
              value={e.nome}
              maxLength={80}
              onChange={(ev) => atualizarExercicio(i, "nome", ev.target.value)}
              placeholder="Nome do exercício"
              className={campo}
            />
            <input value={e.series} maxLength={8} onChange={(ev) => atualizarExercicio(i, "series", ev.target.value)} className={campo} />
            <input value={e.reps} maxLength={10} onChange={(ev) => atualizarExercicio(i, "reps", ev.target.value)} className={campo} />
            <input value={e.carga} maxLength={14} onChange={(ev) => atualizarExercicio(i, "carga", ev.target.value)} className={campo} />
            <button
              type="button"
              aria-label="Remover"
              onClick={() => setExercicios((prev) => prev.filter((_, idx) => idx !== i))}
              className="flex h-[38px] items-center justify-center rounded-[9px] border border-navy/12 text-navy/45 transition hover:border-danger hover:text-danger"
            >
              <X size={15} />
            </button>
          </div>
        ))}
        {exercicios.length === 0 && (
          <p className="text-sm text-navy/50">Nenhum exercício nesta divisão. Clique em “Exercício” para começar.</p>
        )}
      </div>
    </div>
  );
}

export default function InstrutorAlunoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const rotas = rotasPorArea(useLocation().pathname);
  const toast = useToast();
  const {
    alunos,
    checkins,
    treinos,
    avaliacoes,
    observacoes,
    salvarTreino,
    registrarAvaliacao,
    registrarObservacao,
  } = useStore();
  const { user } = useAuth();

  const [aba, setAba] = useState<Aba>("treino");
  const [divisao, setDivisao] = useState<Divisao>("A");
  const [novaObs, setNovaObs] = useState("");
  const [form, setForm] = useState({ peso: "", altura: "", gordura: "", cintura: "", obs: "" });
  const hoje = paraData(HOJE_DEMO);
  const [cursor, setCursor] = useState(new Date(hoje.getFullYear(), hoje.getMonth(), 1));
  const [detalhe, setDetalhe] = useState<Checkin | null>(null);

  const aluno = alunos.find((a) => a.id === Number(id));

  if (!aluno) {
    return (
      <div>
        <p className="text-sm text-navy/60">Aluno não encontrado.</p>
        <button
          type="button"
          onClick={() => navigate(rotas.treinos)}
          className="mt-3 text-sm font-bold text-teal-mid"
        >
          ← Meus alunos
        </button>
      </div>
    );
  }

  const instrutor = user?.nome ?? aluno.instrutor;
  const treinoAtual = treinos.find((t) => t.alunoId === aluno.id && t.divisao === divisao);
  const historico = maisRecentesPrimeiro(avaliacoes.filter((a) => a.alunoId === aluno.id));
  const notas = observacoes
    .filter((o) => o.alunoId === aluno.id)
    .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));

  function registrar() {
    if (!form.peso.trim() || !form.altura.trim()) {
      toast("Preencha ao menos peso e altura.");
      return;
    }
    const peso = lerNumero(form.peso);
    const altura = lerNumero(form.altura);
    const gordura = form.gordura.trim() ? lerNumero(form.gordura) : undefined;
    const cintura = form.cintura.trim() ? lerNumero(form.cintura) : undefined;
    if (!(peso >= 20 && peso <= 400) || !(altura >= 0.5 && altura <= 2.8)) {
      toast("Confira o peso (em kg) e a altura (em metros, ex.: 1,78).");
      return;
    }
    if ((gordura !== undefined && !(gordura >= 1 && gordura <= 70)) || (cintura !== undefined && !(cintura >= 20 && cintura <= 300))) {
      toast("Confira o % de gordura e a cintura (em cm).");
      return;
    }
    registrarAvaliacao({
      alunoId: aluno!.id,
      data: HOJE_DEMO,
      instrutor,
      peso,
      altura,
      gordura,
      cintura,
      obs: form.obs.trim() || undefined,
    });
    setForm({ peso: "", altura: "", gordura: "", cintura: "", obs: "" });
    toast("Avaliação registrada.");
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="self-start text-[13px] font-bold text-teal-mid"
      >
        ← Meus alunos
      </button>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-navy/10 bg-white p-[22px]">
        <div className="flex items-center gap-3.5">
          <div className="font-display flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-navy text-xl font-bold text-neon">
            {aluno.nome.split(" ").slice(0, 2).map((p) => p[0]).join("")}
          </div>
          <div>
            <div className="font-display text-[26px] font-bold text-navy">{aluno.nome}</div>
            <div className="text-[13px] text-navy/55">
              {aluno.plano} · matrícula {aluno.matricula}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { k: "treino" as const, label: "Treino" },
            { k: "aval" as const, label: "Avaliação" },
            { k: "freq" as const, label: "Frequência" },
          ].map((t) => (
            <button
              key={t.k}
              type="button"
              onClick={() => setAba(t.k)}
              className={`rounded-[9px] border px-[15px] py-2.5 text-[13px] font-bold ${
                aba === t.k ? "border-navy bg-navy text-white" : "border-navy/15 bg-white text-navy/60"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {aba === "treino" && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {DIVISOES.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDivisao(d)}
                className={`rounded-[9px] border px-[15px] py-2 text-[13px] font-bold ${
                  d === divisao ? "border-navy bg-navy text-white" : "border-navy/15 bg-white text-navy/60"
                }`}
              >
                Divisão {d}
              </button>
            ))}
          </div>
          <EditorTreino
            key={`${aluno.id}-${divisao}-${treinoAtual?.atualizadoEm ?? "novo"}`}
            divisao={divisao}
            treino={treinoAtual}
            onSalvar={(titulo, exercicios) =>
              salvarTreino({ alunoId: aluno.id, divisao, titulo, exercicios, atualizadoPor: instrutor })
            }
          />
        </div>
      )}

      {aba === "aval" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-navy/10 bg-white p-[22px]">
            <div className="text-base font-bold">Nova avaliação física</div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5 text-xs font-bold">
                <span>
                  Peso (kg)
                  <Obrigatorio />
                </span>
                <input
                  aria-required="true"
                  value={form.peso}
                  onChange={(e) => setForm({ ...form, peso: e.target.value })}
                  placeholder="78,4"
                  className="rounded-[9px] border border-navy/16 px-2.5 py-2.5 text-sm font-normal"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs font-bold">
                <span>
                  Altura (m)
                  <Obrigatorio />
                </span>
                <input
                  aria-required="true"
                  value={form.altura}
                  onChange={(e) => setForm({ ...form, altura: e.target.value })}
                  placeholder="1,78"
                  className="rounded-[9px] border border-navy/16 px-2.5 py-2.5 text-sm font-normal"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs font-bold">
                % de gordura
                <input
                  value={form.gordura}
                  onChange={(e) => setForm({ ...form, gordura: e.target.value })}
                  placeholder="18,2"
                  className="rounded-[9px] border border-navy/16 px-2.5 py-2.5 text-sm font-normal"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs font-bold">
                Cintura (cm)
                <input
                  value={form.cintura}
                  onChange={(e) => setForm({ ...form, cintura: e.target.value })}
                  placeholder="84"
                  className="rounded-[9px] border border-navy/16 px-2.5 py-2.5 text-sm font-normal"
                />
              </label>
            </div>
            <label className="mt-3 flex flex-col gap-1.5 text-xs font-bold">
              Observação
              <textarea
                value={form.obs}
                maxLength={500}
                onChange={(e) => setForm({ ...form, obs: e.target.value })}
                rows={3}
                placeholder="Evolução, restrições, orientações…"
                className="resize-y rounded-[9px] border border-navy/16 px-2.5 py-2.5 text-sm font-normal"
              />
            </label>
            <p className="mt-3 text-xs text-navy/50">
              <span className="text-danger">*</span> Campo obrigatório
            </p>
            <button
              type="button"
              onClick={registrar}
              className="mt-3.5 w-full rounded-[10px] bg-navy py-3 text-sm font-bold text-white"
            >
              Registrar avaliação
            </button>
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-navy/10 bg-white p-[22px]">
              <div className="text-[11px] font-bold uppercase tracking-wider text-navy/45">
                Histórico do aluno
              </div>
              <div className="mt-3.5 flex flex-col gap-3">
                {historico.map((a) => (
                  <div key={a.id} className="rounded-xl border border-navy/[.09] p-3.5">
                    <div className="flex justify-between text-[13px] font-bold">
                      <span>{dataBr(a.data)}</span>
                      <span className="text-teal-mid">{virgula(a.peso, 1)} kg</span>
                    </div>
                    <div className="mt-1 text-xs text-navy/55">
                      % gordura {a.gordura !== undefined ? `${virgula(a.gordura, 1)}%` : "—"} · altura{" "}
                      {virgula(a.altura, 2)} m · {medidas(a)}
                    </div>
                  </div>
                ))}
                {historico.length === 0 && (
                  <p className="text-sm text-navy/50">Nenhuma avaliação registrada ainda.</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-navy/10 bg-white p-[22px]">
              <div className="text-[11px] font-bold uppercase tracking-wider text-navy/45">
                Observações do aluno
              </div>
              <div className="mt-3.5 flex gap-2">
                <input
                  value={novaObs}
                  maxLength={500}
                  onChange={(e) => setNovaObs(e.target.value)}
                  placeholder="Registrar observação…"
                  className="min-w-0 flex-1 rounded-[9px] border border-navy/16 px-2.5 py-2.5 text-sm"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!novaObs.trim()) return;
                    registrarObservacao({ alunoId: aluno.id, texto: novaObs.trim(), instrutor });
                    setNovaObs("");
                  }}
                  className="shrink-0 whitespace-nowrap rounded-[9px] bg-navy px-4 py-2.5 text-[13px] font-bold text-white"
                >
                  Registrar
                </button>
              </div>
              <div className="mt-3.5 flex flex-col gap-2.5">
                {notas.map((o) => (
                  <div key={o.id} className="border-l-[3px] border-teal/50 py-0.5 pl-3">
                    <p className="text-[13px] leading-relaxed">{o.texto}</p>
                    <div className="mt-1 text-[11px] text-navy/45">
                      {o.instrutor} · {dataBr(o.criadoEm.slice(0, 10))} {o.criadoEm.slice(11, 16)}
                    </div>
                  </div>
                ))}
                {notas.length === 0 && <p className="text-sm text-navy/50">Nenhuma observação ainda.</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {aba === "freq" && (() => {
        const semanas = porSemana(checkins, aluno.id);
        const media = semanas.reduce((t, v) => t + v, 0) / semanas.length;
        const ano = cursor.getFullYear();
        const mes = cursor.getMonth();
        const retroativos = vigentes(checkins, aluno.id).filter((c) => c.origem === "Retroativo").length;
        return (
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-navy/10 bg-white p-[22px]">
              <div className="text-[11px] font-bold uppercase tracking-wider text-navy/45">
                Frequência — últimas 8 semanas
              </div>
              <div className="mt-5 flex h-[140px] items-end gap-2.5">
                {semanas.map((v, i) => (
                  <div key={i} className="flex h-full flex-1 flex-col justify-end gap-2">
                    <div className="text-center text-[11px] font-bold text-navy/60">{v}</div>
                    <div
                      className={`w-full rounded-t-md ${
                        v <= 1 ? "bg-danger/35" : v >= META_SEMANAL ? "bg-teal" : "bg-teal/55"
                      }`}
                      style={{ height: `${Math.min(100, (v / META_SEMANAL) * 100)}%` }}
                    />
                    <div className="text-center text-[10px] text-navy/45">S{i + 1}</div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-navy/45">
                Média de {media.toFixed(1).replace(".", ",")} check-ins por semana. Meta do plano:{" "}
                {META_SEMANAL}.
                {retroativos > 0 &&
                  ` ${retroativos} check-in(s) retroativo(s) no histórico, destacados em amarelo no calendário.`}
              </p>
            </div>

            <div className="rounded-2xl border border-navy/10 bg-white p-[22px]">
              <NavegacaoMes
                ano={ano}
                mes={mes}
                total={totalNoMes(checkins, aluno.id, ano, mes)}
                onMudar={(d) => setCursor(new Date(ano, mes + d, 1))}
              />
              <div className="mt-4">
                <CalendarioFrequencia
                  ano={ano}
                  mes={mes}
                  checkins={vigentes(checkins, aluno.id)}
                  onDetalhe={setDetalhe}
                />
              </div>
              <p className="mt-4 text-xs text-navy/45">
                Consulta apenas: quem registra check-ins é o aluno ou a recepção.
              </p>
            </div>

            {detalhe && (
              <DetalheCheckinModal
                checkin={detalhe}
                nomeAluno={aluno.nome}
                podeCancelar={user?.perfil === "Administrador"}
                perfil={user?.perfil === "Administrador" ? "Administrador" : "Recepcionista"}
                onClose={() => setDetalhe(null)}
              />
            )}
          </div>
        );
      })()}
    </div>
  );
}
