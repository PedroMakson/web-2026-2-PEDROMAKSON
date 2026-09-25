import { useState } from "react";
import { Plus, X } from "lucide-react";
import { useStore, type Plano } from "../data/store";
import { useToast } from "../components/Toast";

export default function AdminPlanos() {
  const { planos, salvarPlano } = useStore();
  const toast = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ nome: "", valor: "", duracao: "", regra: "" });

  function abrirNovo() {
    setEditId(null);
    setForm({ nome: "", valor: "", duracao: "", regra: "" });
    setModalOpen(true);
  }

  function abrirEdicao(p: Plano) {
    setEditId(p.id);
    setForm({ nome: p.nome, valor: p.valor, duracao: p.duracao, regra: p.regra });
    setModalOpen(true);
  }

  function salvar() {
    if (!form.nome || !form.valor) {
      toast("Preencha nome e valor do plano.");
      return;
    }
    salvarPlano({ id: editId ?? undefined, ...form });
    toast(editId ? "Plano atualizado." : "Plano criado.");
    setModalOpen(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {planos.map((p) => (
          <div key={p.id} className="flex flex-col rounded-2xl border border-navy/10 bg-white p-6">
            <div className="text-sm font-bold text-navy/60">{p.nome}</div>
            <div className="font-display mt-1.5 text-[34px] font-bold leading-none text-navy">
              {p.valor}
            </div>
            <div className="mt-1 text-xs text-navy/45">{p.duracao}</div>
            <div className="mt-3.5 rounded-lg bg-beige/45 px-3 py-2.5 text-xs leading-relaxed text-navy/70">
              {p.regra}
            </div>
            <div className="mt-3.5 text-xs font-bold text-teal-dark">
              {p.ativos} aluno{p.ativos === 1 ? "" : "s"} ativo{p.ativos === 1 ? "" : "s"}
            </div>
            <button
              type="button"
              onClick={() => abrirEdicao(p)}
              className="mt-4 rounded-[10px] border border-navy/18 py-2.5 text-[13px] font-bold text-navy transition hover:border-teal hover:bg-teal/10"
            >
              Editar plano
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={abrirNovo}
          className="flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-navy/20 text-navy/45 transition hover:border-teal hover:text-teal-dark"
        >
          <Plus size={26} />
          <span className="text-sm font-bold">Novo plano</span>
        </button>
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
                {editId ? "Editar plano" : "Novo plano"}
              </h2>
              <button type="button" onClick={() => setModalOpen(false)} className="text-navy/45">
                <X size={20} />
              </button>
            </div>
            <div className="mt-4.5 flex flex-col gap-3">
              <label className="flex flex-col gap-1.5 text-xs font-bold">
                Nome do plano
                <input
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="Mensal Fit"
                  className="rounded-[9px] border border-navy/16 px-2.5 py-2.5 text-sm font-normal"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs font-bold">
                Valor
                <input
                  value={form.valor}
                  onChange={(e) => setForm({ ...form, valor: e.target.value })}
                  placeholder="R$ 129,90"
                  className="rounded-[9px] border border-navy/16 px-2.5 py-2.5 text-sm font-normal"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs font-bold">
                Duração
                <input
                  value={form.duracao}
                  onChange={(e) => setForm({ ...form, duracao: e.target.value })}
                  placeholder="Mensal, renovação automática"
                  className="rounded-[9px] border border-navy/16 px-2.5 py-2.5 text-sm font-normal"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs font-bold">
                Regra / observação
                <textarea
                  value={form.regra}
                  onChange={(e) => setForm({ ...form, regra: e.target.value })}
                  rows={2}
                  placeholder="Ex.: acesso bloqueado após 5 dias de atraso"
                  className="resize-none rounded-[9px] border border-navy/16 px-2.5 py-2.5 text-sm font-normal"
                />
              </label>
            </div>
            <button
              type="button"
              onClick={salvar}
              className="mt-5 w-full rounded-[10px] bg-navy py-3 text-sm font-bold text-white"
            >
              {editId ? "Salvar alterações" : "Criar plano"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
