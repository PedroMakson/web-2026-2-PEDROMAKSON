import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Pencil, Plus, Search, Unlock } from "lucide-react";
import { useStore } from "../data/store";
import { useToast } from "../components/Toast";

export default function AdminUsuarios() {
  const navigate = useNavigate();
  const { usuarios, toggleUsuario } = useStore();
  const toast = useToast();
  const [busca, setBusca] = useState("");

  const filtrados = usuarios.filter(
    (u) => u.perfil !== "Aluno" && u.nome.toLowerCase().includes(busca.toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[220px] max-w-[360px] flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-navy/40" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar usuário…"
            className="w-full rounded-xl border border-navy/16 bg-white py-3 pl-10 pr-3 text-sm outline-none focus:border-teal focus:ring-[3px] focus:ring-teal/25"
          />
        </div>
        <button
          type="button"
          onClick={() => navigate("/admin/usuarios/novo")}
          className="flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-navy px-4 py-3 text-sm font-bold text-white"
        >
          <Plus size={16} /> Novo usuário
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-navy/10 bg-white">
        <table className="w-full min-w-[620px] border-collapse text-sm">
          <thead>
            <tr className="bg-navy/[.03] text-left text-[11px] font-bold uppercase tracking-wider text-navy/45">
              <th className="px-5 py-3.5">Usuário</th>
              <th className="px-3 py-3.5">Perfil de acesso</th>
              <th className="px-3 py-3.5">Status</th>
              <th className="px-5 py-3.5">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((u) => (
              <tr key={u.id} className="border-t border-navy/[.07]">
                <td className="px-5 py-[14px]">
                  <div className="font-bold">{u.nome}</div>
                  <div className="text-xs text-navy/50">{u.email}</div>
                </td>
                <td className="px-3 py-[14px]">
                  <span className="rounded-full bg-navy/[.07] px-3 py-1.5 text-[13px] font-semibold text-navy/75">
                    {u.perfil}
                  </span>
                </td>
                <td className="px-3 py-[14px]">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                      u.ativo ? "bg-teal/15 text-teal-dark" : "bg-danger/10 text-danger-dark"
                    }`}
                  >
                    {u.ativo ? "Ativo" : "Bloqueado"}
                  </span>
                </td>
                <td className="px-5 py-[14px]">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      title="Editar usuário"
                      onClick={() => navigate(`/admin/usuarios/${u.id}`)}
                      className="flex h-[34px] w-[34px] items-center justify-center rounded-[9px] border border-navy/18 text-navy transition hover:border-teal hover:bg-teal/10"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      title={u.ativo ? "Bloquear" : "Desbloquear"}
                      onClick={() => {
                        toggleUsuario(u.id);
                        toast(
                          u.ativo
                            ? `${u.nome.split(" ")[0]} bloqueado — login negado (regra 2).`
                            : `${u.nome.split(" ")[0]} desbloqueado.`,
                        );
                      }}
                      className={`flex h-[34px] w-[34px] items-center justify-center rounded-[9px] border transition ${
                        u.ativo
                          ? "border-danger/35 text-danger-dark hover:bg-danger/10"
                          : "border-teal/50 text-teal-dark hover:bg-teal/15"
                      }`}
                    >
                      {u.ativo ? <Lock size={15} /> : <Unlock size={15} />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-6 text-sm text-navy/50">
                  Nenhum usuário encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
