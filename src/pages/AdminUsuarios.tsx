import { useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { useStore, type Usuario } from "../data/store";
import { useToast } from "../components/Toast";

const PERFIS: Usuario["perfil"][] = ["Instrutor", "Recepcionista", "Administrador"];

export default function AdminUsuarios() {
  const { usuarios, toggleUsuario, setPerfilUsuario, salvarUsuario } = useStore();
  const toast = useToast();
  const [busca, setBusca] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ nome: "", email: "", tel: "", perfil: "Instrutor" as Usuario["perfil"] });

  const filtrados = usuarios.filter(
    (u) => u.perfil !== "Aluno" && u.nome.toLowerCase().includes(busca.toLowerCase()),
  );

  function abrirNovo() {
    setEditId(null);
    setForm({ nome: "", email: "", tel: "", perfil: "Instrutor" });
    setModalOpen(true);
  }

  function abrirEdicao(u: Usuario) {
    setEditId(u.id);
    setForm({ nome: u.nome, email: u.email, tel: u.tel, perfil: u.perfil });
    setModalOpen(true);
  }

  function salvar() {
    if (!form.nome || !form.email) {
      toast("Preencha nome e e-mail.");
      return;
    }
    salvarUsuario({ id: editId ?? undefined, ...form });
    toast(editId ? "Usuário atualizado." : "Usuário cadastrado.");
    setModalOpen(false);
  }

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
          onClick={abrirNovo}
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
                  <select
                    value={u.perfil}
                    onChange={(e) => {
                      setPerfilUsuario(u.id, e.target.value as Usuario["perfil"]);
                      toast(`${u.nome.split(" ")[0]} agora é ${e.target.value}.`);
                    }}
                    className="rounded-[9px] border border-navy/16 bg-white px-2.5 py-2 text-[13px] font-semibold text-navy/75"
                  >
                    {PERFIS.map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
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
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => abrirEdicao(u)}
                      className="rounded-[9px] border border-navy/18 px-3 py-2 text-xs font-bold text-navy transition hover:border-teal hover:bg-teal/10"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        toggleUsuario(u.id);
                        toast(
                          u.ativo
                            ? `${u.nome.split(" ")[0]} bloqueado — login negado (regra 2).`
                            : `${u.nome.split(" ")[0]} desbloqueado.`,
                        );
                      }}
                      className={`rounded-[9px] border px-3 py-2 text-xs font-bold ${
                        u.ativo
                          ? "border-danger/35 text-danger-dark hover:bg-danger/10"
                          : "border-teal/50 text-teal-dark hover:bg-teal/15"
                      }`}
                    >
                      {u.ativo ? "Bloquear" : "Desbloquear"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-navy/60 p-5"
          onClick={() => setModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[420px] rounded-[20px] bg-white p-7"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-display text-2xl font-bold text-navy">
                {editId ? "Editar usuário" : "Novo usuário"}
              </h2>
              <button type="button" onClick={() => setModalOpen(false)} className="text-navy/45">
                <X size={20} />
              </button>
            </div>
            <div className="mt-4.5 flex flex-col gap-3">
              <label className="flex flex-col gap-1.5 text-xs font-bold">
                Nome completo
                <input
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="rounded-[9px] border border-navy/16 px-2.5 py-2.5 text-sm font-normal"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs font-bold">
                E-mail
                <input
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="rounded-[9px] border border-navy/16 px-2.5 py-2.5 text-sm font-normal"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs font-bold">
                Telefone
                <input
                  value={form.tel}
                  onChange={(e) => setForm({ ...form, tel: e.target.value })}
                  className="rounded-[9px] border border-navy/16 px-2.5 py-2.5 text-sm font-normal"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs font-bold">
                Perfil de acesso
                <select
                  value={form.perfil}
                  onChange={(e) => setForm({ ...form, perfil: e.target.value as Usuario["perfil"] })}
                  className="rounded-[9px] border border-navy/16 bg-white px-2.5 py-2.5 text-sm font-normal"
                >
                  {PERFIS.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </label>
            </div>
            <button
              type="button"
              onClick={salvar}
              className="mt-5 w-full rounded-[10px] bg-navy py-3 text-sm font-bold text-white"
            >
              {editId ? "Salvar alterações" : "Cadastrar usuário"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
