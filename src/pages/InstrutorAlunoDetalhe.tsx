import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, X } from "lucide-react";
import { useStore } from "../data/store";
import { useToast } from "../components/Toast";

type Exercicio = { nome: string; series: string; reps: string; carga: string };

const EXERCICIOS_PADRAO: Exercicio[] = [
  { nome: "Supino reto com barra", series: "4", reps: "8-10", carga: "40 kg" },
  { nome: "Supino inclinado halteres", series: "3", reps: "10-12", carga: "16 kg" },
  { nome: "Crucifixo na máquina", series: "3", reps: "12", carga: "30 kg" },
  { nome: "Tríceps corda", series: "4", reps: "12-15", carga: "25 kg" },
];

const AVALIACOES_PADRAO = [
  { data: "12/08/2026", peso: "79,2 kg", altura: "1,78 m", gordura: "19,4%", medidas: "cintura 86 cm" },
  { data: "10/06/2026", peso: "81,0 kg", altura: "1,78 m", gordura: "21,1%", medidas: "cintura 89 cm" },
];

const OBSERVACOES_PADRAO = [
  { texto: "Relatou dor leve no ombro direito no supino — reduzir carga por duas semanas.", instrutor: "Carla Menezes", criadoEm: "12/08/2026 08:40" },
  { texto: "Prefere treinar cedo; ajustar volume para sessões de 50 minutos.", instrutor: "Carla Menezes", criadoEm: "10/06/2026 07:15" },
];

const FREQ_SEMANAS = [2, 3, 4, 3, 1, 4, 3, 2];

const ABAS = ["treino", "aval", "freq"] as const;
type Aba = (typeof ABAS)[number];

export default function InstrutorAlunoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { alunos } = useStore();

  const [aba, setAba] = useState<Aba>("treino");
  const [exercicios, setExercicios] = useState<Exercicio[]>(EXERCICIOS_PADRAO);
  const [avaliacoes, setAvaliacoes] = useState(AVALIACOES_PADRAO);
  const [observacoes, setObservacoes] = useState(OBSERVACOES_PADRAO);
  const [novaObs, setNovaObs] = useState("");
  const [form, setForm] = useState({ peso: "", altura: "", gordura: "", cintura: "", obs: "" });

  const aluno = alunos.find((a) => a.id === Number(id));

  if (!aluno) {
    return (
      <div>
        <p className="text-sm text-navy/60">Aluno não encontrado.</p>
        <button
          type="button"
          onClick={() => navigate("/instrutor/alunos")}
          className="mt-3 text-sm font-bold text-teal-mid"
        >
          ← Meus alunos
        </button>
      </div>
    );
  }

  function atualizarExercicio(i: number, campo: keyof Exercicio, valor: string) {
    setExercicios((prev) =>
      prev.map((e, idx) => (idx === i ? { ...e, [campo]: valor } : e)),
    );
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
            {aluno!.nome.split(" ").slice(0, 2).map((p) => p[0]).join("")}
          </div>
          <div>
            <div className="font-display text-[26px] font-bold text-navy">
              {aluno!.nome}
            </div>
            <div className="text-[13px] text-navy/55">
              {aluno!.plano} · matrícula {aluno!.matricula}
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
                aba === t.k
                  ? "border-navy bg-navy text-white"
                  : "border-navy/15 bg-white text-navy/60"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {aba === "treino" && (
        <div className="rounded-2xl border border-navy/10 bg-white p-[22px]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-base font-bold">Editor de treino</div>
              <div className="text-xs text-navy/50">Divisão A · Peito e tríceps</div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  setExercicios((prev) => [
                    ...prev,
                    { nome: "", series: "", reps: "", carga: "" },
                  ])
                }
                className="flex items-center gap-1.5 rounded-[10px] border border-navy/18 px-3.5 py-2.5 text-[13px] font-bold text-navy transition hover:bg-navy/5"
              >
                <Plus size={15} /> Exercício
              </button>
              <button
                type="button"
                onClick={() => toast("Treino salvo com sucesso.")}
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
                  onChange={(ev) => atualizarExercicio(i, "nome", ev.target.value)}
                  placeholder="Nome do exercício"
                  className="min-w-0 rounded-[9px] border border-navy/16 px-2.5 py-2.5 text-sm"
                />
                <input
                  value={e.series}
                  onChange={(ev) => atualizarExercicio(i, "series", ev.target.value)}
                  className="min-w-0 rounded-[9px] border border-navy/16 px-2.5 py-2.5 text-sm"
                />
                <input
                  value={e.reps}
                  onChange={(ev) => atualizarExercicio(i, "reps", ev.target.value)}
                  className="min-w-0 rounded-[9px] border border-navy/16 px-2.5 py-2.5 text-sm"
                />
                <input
                  value={e.carga}
                  onChange={(ev) => atualizarExercicio(i, "carga", ev.target.value)}
                  className="min-w-0 rounded-[9px] border border-navy/16 px-2.5 py-2.5 text-sm"
                />
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
          </div>
        </div>
      )}

      {aba === "aval" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-navy/10 bg-white p-[22px]">
            <div className="text-base font-bold">Nova avaliação física</div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5 text-xs font-bold">
                Peso (kg)
                <input
                  value={form.peso}
                  onChange={(e) => setForm({ ...form, peso: e.target.value })}
                  placeholder="78,4"
                  className="rounded-[9px] border border-navy/16 px-2.5 py-2.5 text-sm font-normal"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs font-bold">
                Altura (m)
                <input
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
                onChange={(e) => setForm({ ...form, obs: e.target.value })}
                rows={3}
                placeholder="Evolução, restrições, orientações…"
                className="resize-y rounded-[9px] border border-navy/16 px-2.5 py-2.5 text-sm font-normal"
              />
            </label>
            <button
              type="button"
              onClick={() => {
                if (!form.peso || !form.altura) {
                  toast("Preencha ao menos peso e altura.");
                  return;
                }
                setAvaliacoes((prev) => [
                  {
                    data: "14/09/2026",
                    peso: `${form.peso} kg`,
                    altura: `${form.altura} m`,
                    gordura: form.gordura ? `${form.gordura}%` : "—",
                    medidas: form.cintura ? `cintura ${form.cintura} cm` : "—",
                  },
                  ...prev,
                ]);
                setForm({ peso: "", altura: "", gordura: "", cintura: "", obs: "" });
                toast("Avaliação registrada.");
              }}
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
                {avaliacoes.map((a, i) => (
                  <div key={i} className="rounded-xl border border-navy/[.09] p-3.5">
                    <div className="flex justify-between text-[13px] font-bold">
                      <span>{a.data}</span>
                      <span className="text-teal-mid">{a.peso}</span>
                    </div>
                    <div className="mt-1 text-xs text-navy/55">
                      % gordura {a.gordura} · altura {a.altura} · {a.medidas}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-navy/10 bg-white p-[22px]">
              <div className="text-[11px] font-bold uppercase tracking-wider text-navy/45">
                Observações do aluno
              </div>
              <div className="mt-3.5 flex gap-2">
                <input
                  value={novaObs}
                  onChange={(e) => setNovaObs(e.target.value)}
                  placeholder="Registrar observação…"
                  className="min-w-0 flex-1 rounded-[9px] border border-navy/16 px-2.5 py-2.5 text-sm"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!novaObs.trim()) return;
                    setObservacoes((prev) => [
                      { texto: novaObs, instrutor: "Carla Menezes", criadoEm: "14/09/2026 agora" },
                      ...prev,
                    ]);
                    setNovaObs("");
                  }}
                  className="shrink-0 whitespace-nowrap rounded-[9px] bg-navy px-4 py-2.5 text-[13px] font-bold text-white"
                >
                  Registrar
                </button>
              </div>
              <div className="mt-3.5 flex flex-col gap-2.5">
                {observacoes.map((o, i) => (
                  <div key={i} className="border-l-[3px] border-teal/50 py-0.5 pl-3">
                    <p className="text-[13px] leading-relaxed">{o.texto}</p>
                    <div className="mt-1 text-[11px] text-navy/45">
                      {o.instrutor} · {o.criadoEm}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {aba === "freq" && (
        <div className="rounded-2xl border border-navy/10 bg-white p-[22px]">
          <div className="text-[11px] font-bold uppercase tracking-wider text-navy/45">
            Frequência — últimas 8 semanas
          </div>
          <div className="mt-5 flex h-[140px] items-end gap-2.5">
            {FREQ_SEMANAS.map((v, i) => (
              <div key={i} className="flex h-full flex-1 flex-col justify-end gap-2">
                <div className="text-center text-[11px] font-bold text-navy/60">{v}</div>
                <div
                  className={`w-full rounded-t-md ${
                    v <= 1 ? "bg-danger/35" : v >= 4 ? "bg-teal" : "bg-teal/55"
                  }`}
                  style={{ height: `${(v / 4) * 100}%` }}
                />
                <div className="text-center text-[10px] text-navy/45">S{i + 1}</div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-navy/45">
            Média de 3,1 check-ins por semana. Meta do plano: 4.
          </p>
        </div>
      )}
    </div>
  );
}
