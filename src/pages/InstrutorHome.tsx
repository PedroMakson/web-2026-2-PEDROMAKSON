import { useNavigate } from "react-router-dom";
import { useStore } from "../data/store";

const INSTRUTOR_LOGADO = "Carla Menezes";

export default function InstrutorHome() {
  const navigate = useNavigate();
  const { alunos } = useStore();

  const meusAlunos = alunos.filter((a) => a.instrutor === INSTRUTOR_LOGADO);
  const precisamAtencao = meusAlunos.filter((a) => a.alerta);

  const kpis = [
    { label: "Alunos vinculados", valor: meusAlunos.length, sub: "todos da unidade Centro" },
    { label: "Precisam de atenção", valor: precisamAtencao.length, sub: "sem check-in ou treino vencido" },
    { label: "Avaliações do mês", valor: "4", sub: "2 agendadas" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl border border-navy/10 bg-white p-5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-navy/45">
              {k.label}
            </div>
            <div className="font-display mt-1.5 text-[34px] font-bold text-navy">
              {k.valor}
            </div>
            <div className="text-xs text-navy/50">{k.sub}</div>
          </div>
        ))}
      </div>

      <div>
        <h2 className="font-display mb-3 text-[22px] font-bold text-navy">
          Precisam de atenção
        </h2>
        {precisamAtencao.length === 0 ? (
          <p className="text-sm text-navy/50">
            Nenhum aluno precisando de atenção agora.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {precisamAtencao.map((a) => (
              <div
                key={a.id}
                className="flex flex-col gap-3 rounded-2xl border border-navy/10 bg-white p-5"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy/[.07] text-[13px] font-bold">
                    {a.nome.split(" ").slice(0, 2).map((p) => p[0]).join("")}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[15px] font-bold">{a.nome}</div>
                    <div className="text-xs text-navy/50">{a.plano}</div>
                  </div>
                </div>
                <span className="w-fit rounded-full bg-danger/10 px-2.5 py-1 text-[11px] font-bold text-danger-dark">
                  {a.alerta}
                </span>
                <button
                  type="button"
                  onClick={() => navigate(`/instrutor/alunos/${a.id}`)}
                  className="rounded-[10px] border border-navy/18 py-2.5 text-[13px] font-bold text-navy transition hover:bg-navy/5"
                >
                  Abrir aluno
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
