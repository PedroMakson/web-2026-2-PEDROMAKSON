import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Pencil, Plus, Repeat, Search, Unlock } from "lucide-react";
import { useStore } from "../data/store";
import { useToast } from "../components/Toast";
import TrocaPlanoModal from "../components/TrocaPlanoModal";

export default function RecepcaoAlunos() {
  const navigate = useNavigate();
  const toast = useToast();
  const { alunos, toggleAcessoAluno } = useStore();
  const [busca, setBusca] = useState("");
  const [trocaId, setTrocaId] = useState<number | null>(null);

  const filtrados = alunos.filter((a) =>
    `${a.nome} ${a.email} ${a.matricula}`.toLowerCase().includes(busca.toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[220px] flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-navy/40" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, e-mail ou matrícula…"
            className="w-full rounded-xl border border-navy/16 bg-white py-3 pl-10 pr-3 text-sm outline-none focus:border-teal focus:ring-[3px] focus:ring-teal/25"
          />
        </div>
        <button
          type="button"
          onClick={() => navigate("/recepcao/matricula")}
          className="flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-navy px-4 py-3 text-sm font-bold text-white"
        >
          <Plus size={16} /> Novo aluno
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-navy/10 bg-white">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="bg-navy/[.03] text-left text-[11px] font-bold uppercase tracking-wider text-navy/45">
              <th className="px-5 py-3.5">Aluno</th>
              <th className="px-3 py-3.5">Plano</th>
              <th className="px-3 py-3.5">Matrícula até</th>
              <th className="px-3 py-3.5">Financeiro</th>
              <th className="px-5 py-3.5">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((a) => (
              <tr key={a.id} className="border-t border-navy/[.07]">
                <td className="px-5 py-[15px]">
                  <div className="font-bold">{a.nome}</div>
                  <div className="text-xs text-navy/50">
                    {a.matricula}
                    {a.matriculaAnterior && ` · renovação de ${a.matriculaAnterior}`}
                  </div>
                  {!a.ativo && (
                    <span className="mt-1 inline-block rounded-full bg-danger/10 px-2.5 py-0.5 text-[10px] font-bold text-danger-dark">
                      Acesso bloqueado
                    </span>
                  )}
                </td>
                <td className="px-3 py-[15px]">{a.plano}</td>
                <td className="px-3 py-[15px]">{a.fim}</td>
                <td className="px-3 py-[15px]">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                      a.fin === "Em dia"
                        ? "bg-teal/15 text-teal-dark"
                        : "bg-danger/10 text-danger-dark"
                    }`}
                  >
                    {a.fin}
                  </span>
                </td>
                <td className="px-5 py-[15px]">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      title="Editar dados do aluno"
                      onClick={() => navigate(`/recepcao/matricula/${a.id}`)}
                      className="flex h-[34px] w-[34px] items-center justify-center rounded-[9px] border border-navy/18 text-navy transition hover:border-teal hover:bg-teal/10"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      title="Trocar plano"
                      onClick={() => setTrocaId(a.id)}
                      className="flex h-[34px] w-[34px] items-center justify-center rounded-[9px] border border-teal text-teal-dark transition hover:bg-teal/15"
                    >
                      <Repeat size={15} />
                    </button>
                    <button
                      type="button"
                      title={a.ativo ? "Bloquear" : "Desbloquear"}
                      onClick={() => {
                        toggleAcessoAluno(a.id);
                        toast(
                          a.ativo
                            ? `Acesso de ${a.nome.split(" ")[0]} bloqueado — login negado (regra de negócio 2).`
                            : `Acesso de ${a.nome.split(" ")[0]} liberado.`,
                        );
                      }}
                      className={`flex h-[34px] w-[34px] items-center justify-center rounded-[9px] border transition ${
                        a.ativo
                          ? "border-danger/35 text-danger-dark hover:bg-danger/10"
                          : "border-teal/50 text-teal-dark hover:bg-teal/15"
                      }`}
                    >
                      {a.ativo ? <Lock size={15} /> : <Unlock size={15} />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TrocaPlanoModal
        open={trocaId !== null}
        onClose={() => setTrocaId(null)}
        alunoId={trocaId}
        renovacao={false}
      />
    </div>
  );
}
