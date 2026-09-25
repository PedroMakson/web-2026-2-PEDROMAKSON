import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Search } from "lucide-react";
import { useStore } from "../data/store";

export default function InstrutorAlunos({
  instrutorFiltro,
}: {
  instrutorFiltro?: string;
}) {
  const navigate = useNavigate();
  const { alunos } = useStore();
  const [busca, setBusca] = useState("");

  const base = instrutorFiltro
    ? alunos.filter((a) => a.instrutor === instrutorFiltro)
    : alunos;

  const filtrados = base.filter((a) =>
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
            placeholder="Buscar aluno…"
            className="w-full rounded-xl border border-navy/16 bg-white py-3 pl-10 pr-3 text-sm outline-none focus:border-teal focus:ring-[3px] focus:ring-teal/25"
          />
        </div>
        <span className="text-xs font-semibold text-navy/50">
          {filtrados.length} aluno{filtrados.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-navy/10 bg-white">
        {filtrados.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => navigate(`${a.id}`)}
            className="flex w-full flex-wrap items-center gap-3.5 border-t border-navy/[.07] px-5 py-4 text-left transition first:border-t-0 hover:bg-teal/[.06]"
          >
            <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-navy/[.07] text-[13px] font-bold">
              {a.nome.split(" ").slice(0, 2).map((p) => p[0]).join("")}
            </div>
            <div className="min-w-[140px] flex-1">
              <div className="text-[15px] font-bold">{a.nome}</div>
              <div className="text-xs text-navy/50">
                {a.plano} · último check-in {a.ultimo}
              </div>
            </div>
            {a.alerta && (
              <span className="rounded-full bg-danger/10 px-2.5 py-1 text-[11px] font-bold text-danger-dark">
                {a.alerta}
              </span>
            )}
            <ChevronRight size={18} className="text-navy/35" />
          </button>
        ))}
        {filtrados.length === 0 && (
          <p className="px-5 py-6 text-sm text-navy/50">
            Nenhum aluno encontrado.
          </p>
        )}
      </div>
    </div>
  );
}
