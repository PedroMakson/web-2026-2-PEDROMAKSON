import { useState } from "react";
import { Search } from "lucide-react";
import { useStore } from "../data/store";
import { useToast } from "../components/Toast";

export default function RecepcaoCheckin() {
  const { alunos, registrarCheckinManual } = useStore();
  const toast = useToast();
  const [busca, setBusca] = useState("");

  const filtrados = alunos.filter((a) =>
    `${a.nome} ${a.email}`.toLowerCase().includes(busca.toLowerCase()),
  );

  function statusLabel(a: (typeof alunos)[number]) {
    if (a.fin === "Atrasado") return "Bloqueado — mensalidade atrasada";
    if (a.checkin) return "Check-in feito hoje";
    if (a.fin === "Pendente") return "Liberado — cobrança em aberto, ainda no prazo";
    return "Liberado para check-in";
  }

  function handleCheckin(a: (typeof alunos)[number]) {
    const r = registrarCheckinManual(a.id);
    if (!r.ok) {
      toast(r.motivo ?? "Não foi possível registrar.");
      return;
    }
    toast(`Check-in de ${a.nome.split(" ")[0]} registrado pela recepção.`);
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <div className="rounded-2xl border border-navy/10 bg-white p-6">
        <div className="text-base font-bold">Check-in manual</div>
        <p className="mt-1.5 text-[13px] leading-relaxed text-navy/55">
          Alternativa ao autoatendimento. Alunos inadimplentes são bloqueados pela regra de
          negócio.
        </p>

        <div className="relative mt-[18px]">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-navy/40" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar aluno…"
            className="w-full rounded-xl border border-navy/16 py-3 pl-10 pr-3 text-sm outline-none focus:border-teal focus:ring-[3px] focus:ring-teal/25"
          />
        </div>

        <div className="mt-3.5 flex flex-col gap-2">
          {filtrados.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-3 rounded-xl border border-navy/[.09] p-3"
            >
              <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-navy/[.07] text-xs font-bold">
                {a.nome.split(" ").slice(0, 2).map((p) => p[0]).join("")}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold">{a.nome}</div>
                <div className="text-xs text-navy/50">{statusLabel(a)}</div>
              </div>
              <button
                type="button"
                disabled={a.fin === "Atrasado" || a.checkin}
                onClick={() => handleCheckin(a)}
                className={`rounded-[9px] px-3.5 py-2 text-xs font-bold ${
                  a.fin === "Atrasado"
                    ? "cursor-not-allowed bg-danger/10 text-danger-dark"
                    : a.checkin
                      ? "cursor-default bg-navy/[.07] text-navy/45"
                      : "cursor-pointer bg-teal text-navy-dark hover:bg-neon"
                }`}
              >
                {a.fin === "Atrasado" ? "Bloqueado" : a.checkin ? "Feito" : "Registrar"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
