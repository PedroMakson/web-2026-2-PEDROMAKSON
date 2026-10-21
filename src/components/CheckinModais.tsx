import { type ReactNode, useState } from "react";
import { X } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { useStore } from "../data/store";
import { useToast } from "./Toast";
import Obrigatorio from "./Obrigatorio";
import type { Checkin, PerfilRegistro } from "../lib/checkins";
import { formatarDataBr } from "../lib/pessoa";

function Janela({
  titulo,
  subtitulo,
  onClose,
  children,
}: {
  titulo: string;
  subtitulo: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-navy/60 p-5"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-[440px] overflow-auto rounded-[20px] bg-white p-7"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold text-navy">{titulo}</h2>
            <p className="mt-1 text-[13px] text-navy/55">{subtitulo}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="text-navy/45">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const campo = "rounded-[9px] border border-navy/16 px-2.5 py-2.5 text-sm font-normal";

export function RegistrarCheckinModal({
  alunoId,
  nomeAluno,
  data,
  perfil,
  onClose,
}: {
  alunoId: number;
  nomeAluno: string;
  data: string;
  perfil: PerfilRegistro;
  onClose: () => void;
}) {
  const { registrarCheckin } = useStore();
  const { user } = useAuth();
  const toast = useToast();
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState("");

  function registrar() {
    const r = registrarCheckin({
      alunoId,
      data,
      por: user?.nome ?? nomeAluno,
      perfil,
      motivo,
    });
    if (!r.ok) {
      setErro(r.erro ?? "Não foi possível registrar o check-in.");
      return;
    }
    toast(`Check-in retroativo de ${formatarDataBr(data)} registrado.`);
    onClose();
  }

  return (
    <Janela
      titulo="Check-in retroativo"
      subtitulo={`${nomeAluno} · ${formatarDataBr(data)}`}
      onClose={onClose}
    >
      <p className="mt-4 text-[13px] leading-relaxed text-navy/60">
        {perfil === "Aluno"
          ? "O lançamento fica marcado como retroativo e visível para a recepção e o instrutor."
          : "O lançamento fica marcado como retroativo e registrado com o seu nome e o horário."}
      </p>
      <label className="mt-4 flex flex-col gap-1.5 text-xs font-bold">
        <span>
          Motivo
          <Obrigatorio />
        </span>
        <textarea
          autoFocus
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          rows={3}
          aria-required="true"
          placeholder="Ex.: treinei, mas esqueci de marcar o check-in."
          className={`${campo} resize-none`}
        />
      </label>
      <p className="mt-3 text-xs text-navy/50">
        <span className="text-danger">*</span> Campo obrigatório
      </p>
      {erro && <p className="mt-2 text-[13px] font-semibold text-danger">{erro}</p>}
      <div className="mt-5 flex gap-2.5">
        <button
          type="button"
          onClick={onClose}
          className="rounded-[10px] border border-navy/18 px-[18px] py-3 text-sm font-bold"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={registrar}
          className="flex-1 rounded-[10px] bg-teal py-3 text-sm font-bold text-navy-dark transition hover:bg-neon"
        >
          Registrar check-in
        </button>
      </div>
    </Janela>
  );
}

export function DetalheCheckinModal({
  checkin,
  nomeAluno,
  podeCancelar,
  perfil,
  onClose,
}: {
  checkin: Checkin;
  nomeAluno: string;
  podeCancelar: boolean;
  perfil: PerfilRegistro;
  onClose: () => void;
}) {
  const { cancelarCheckin } = useStore();
  const { user } = useAuth();
  const toast = useToast();
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState("");

  const linhas = [
    { k: "Data", v: formatarDataBr(checkin.data) },
    { k: "Origem", v: checkin.origem },
    { k: "Hora", v: checkin.hora || "—" },
    { k: "Registrado por", v: `${checkin.registradoPor} (${checkin.perfilRegistro})` },
    {
      k: "Registrado em",
      v: new Date(checkin.registradoEm).toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }),
    },
  ];

  function cancelar() {
    const r = cancelarCheckin(checkin.id, motivo, user?.nome ?? "", perfil);
    if (!r.ok) {
      setErro(r.erro ?? "Não foi possível remover o check-in.");
      return;
    }
    toast(`Check-in de ${formatarDataBr(checkin.data)} removido.`);
    onClose();
  }

  return (
    <Janela titulo="Detalhes do check-in" subtitulo={nomeAluno} onClose={onClose}>
      <div className="mt-4 flex flex-col gap-2.5">
        {linhas.map((l) => (
          <div
            key={l.k}
            className="flex justify-between gap-3 border-b border-dashed border-navy/10 pb-2.5 text-[13px]"
          >
            <span className="text-navy/55">{l.k}</span>
            <span className="text-right font-bold">{l.v}</span>
          </div>
        ))}
        {checkin.motivo && (
          <div className="rounded-xl bg-beige/45 p-3 text-[13px] leading-relaxed">
            <span className="font-bold">Motivo do retroativo: </span>
            {checkin.motivo}
          </div>
        )}
      </div>

      {podeCancelar ? (
        <>
          <label className="mt-5 flex flex-col gap-1.5 text-xs font-bold">
            <span>
              Motivo da remoção
              <Obrigatorio />
            </span>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={2}
              aria-required="true"
              placeholder="Ex.: marcado por engano."
              className={`${campo} resize-none`}
            />
          </label>
          {erro && <p className="mt-2 text-[13px] font-semibold text-danger">{erro}</p>}
          <div className="mt-4 flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-[10px] border border-navy/18 px-[18px] py-3 text-sm font-bold"
            >
              Fechar
            </button>
            <button
              type="button"
              onClick={cancelar}
              className="flex-1 rounded-[10px] border border-danger/40 py-3 text-sm font-bold text-danger-dark transition hover:bg-danger/10"
            >
              Remover check-in
            </button>
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-[10px] border border-navy/18 py-3 text-sm font-bold"
        >
          Fechar
        </button>
      )}
    </Janela>
  );
}
