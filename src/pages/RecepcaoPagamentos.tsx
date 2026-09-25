import { useState } from "react";
import { Search } from "lucide-react";
import { useStore } from "../data/store";
import { useToast } from "../components/Toast";

const FILTROS = ["Mês atual", "Em atraso", "Futuras", "Todas"] as const;

export default function RecepcaoPagamentos() {
  const { pagamentos, registrarPagamento } = useStore();
  const toast = useToast();
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]>("Mês atual");
  const [busca, setBusca] = useState("");
  const [formas, setFormas] = useState<Record<number, string>>({});

  function statusDe(p: (typeof pagamentos)[number]) {
    if (p.pago) return "Pago";
    if (p.atraso) return "Atrasado";
    return "Pendente";
  }

  const filtrados = pagamentos.filter((p) => {
    const q = busca.toLowerCase();
    if (q && !`${p.nome} ${p.plano}`.toLowerCase().includes(q)) return false;
    if (filtro === "Em atraso") return statusDe(p) === "Atrasado";
    if (filtro === "Futuras") return !p.pago && !p.atraso;
    if (filtro === "Mês atual") return true;
    return true;
  });

  const pendentesTotal = pagamentos.filter((p) => !p.pago).length;

  function statusClasses(status: string) {
    if (status === "Pago") return "text-teal-dark bg-teal/15";
    if (status === "Atrasado") return "text-white bg-danger";
    return "text-[#8a5a12] bg-[#d69e2e]/20";
  }

  return (
    <div className="flex flex-col gap-3.5">
      <div className="overflow-x-auto rounded-2xl border border-navy/10 bg-white">
        <div className="flex flex-wrap items-center gap-3 bg-navy/[.03] p-4">
          <div className="flex flex-wrap gap-1.5 rounded-xl border border-navy/12 bg-white p-1">
            {FILTROS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFiltro(f)}
                className={`rounded-lg px-3 py-2 text-xs font-bold ${
                  filtro === f ? "bg-navy text-white" : "text-navy/55"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="relative min-w-[180px] max-w-[300px] flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy/40" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar aluno ou plano…"
              className="w-full rounded-xl border border-navy/16 bg-white py-2.5 pl-9 pr-3 text-[13.5px] outline-none focus:border-teal"
            />
          </div>
          <span className="whitespace-nowrap text-xs font-bold text-danger">
            {pendentesTotal} em aberto
          </span>
        </div>

        <table className="w-full min-w-[760px] border-collapse text-[13.5px]">
          <thead>
            <tr className="border-t border-navy/[.07] bg-navy/[.03] text-left text-[10.5px] font-bold uppercase tracking-wider text-navy/45">
              <th className="px-5 py-3">Aluno</th>
              <th className="px-3 py-3">Plano / parcela</th>
              <th className="px-3 py-3">Vencimento</th>
              <th className="px-3 py-3">Valor</th>
              <th className="px-3 py-3">Pago em / forma</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-5 py-3">Ação</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((p) => {
              const status = statusDe(p);
              return (
                <tr key={p.id} className="border-t border-navy/[.07]">
                  <td className="px-5 py-3.5 font-bold">{p.nome}</td>
                  <td className="px-3 py-3.5 text-navy/70">
                    {p.plano}
                    <div className="text-[11.5px] text-navy/45">
                      parcela {p.parcela ?? "única"}
                    </div>
                  </td>
                  <td className="px-3 py-3.5">{p.venc}</td>
                  <td className="px-3 py-3.5 font-bold">{p.valor}</td>
                  <td className="px-3 py-3.5 text-navy/60">
                    {p.pago ? (
                      <>
                        {p.pagoEm}
                        <div className="text-[11.5px] text-navy/40">
                          {p.forma} · {p.origem}
                        </div>
                      </>
                    ) : (
                      <select
                        value={formas[p.id] ?? "Pix"}
                        onChange={(e) =>
                          setFormas((prev) => ({ ...prev, [p.id]: e.target.value }))
                        }
                        className="w-full rounded-[9px] border border-navy/16 bg-white px-2 py-2 text-[13px]"
                      >
                        <option>Pix</option>
                        <option>Cartão</option>
                        <option>Dinheiro</option>
                      </select>
                    )}
                  </td>
                  <td className="px-3 py-3.5">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${statusClasses(status)}`}
                    >
                      {status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {p.pago ? (
                      <span className="text-xs text-navy/35">—</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          registrarPagamento(p.id, formas[p.id] ?? "Pix");
                          toast(`Pagamento de ${p.nome.split(" ")[0]} registrado.`);
                        }}
                        className="whitespace-nowrap rounded-[9px] bg-navy px-3.5 py-2 text-xs font-bold text-white"
                      >
                        Registrar
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-6 text-sm text-navy/50">
                  Nenhuma cobrança neste filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-navy/45">
        Mostrando {filtro.toLowerCase()}. Toda alteração financeira registra usuário e horário
        (RNF07).
      </p>
    </div>
  );
}
