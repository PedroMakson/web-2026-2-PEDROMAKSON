import { useState } from "react";
import { CalendarDays, Search } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { type Aluno, useStore } from "../data/store";
import { useToast } from "../components/Toast";
import Obrigatorio from "../components/Obrigatorio";
import CalendarioFrequencia, { NavegacaoMes } from "../components/CalendarioFrequencia";
import { DetalheCheckinModal, RegistrarCheckinModal } from "../components/CheckinModais";
import {
  bloqueioDoAluno,
  type Checkin,
  checkinDoDia,
  type PerfilRegistro,
  totalNoMes,
  vigentes,
} from "../lib/checkins";
import { HOJE_DEMO, paraData } from "../lib/datas";
import { formatarDataBr } from "../lib/pessoa";

export default function RecepcaoCheckin() {
  const { alunos, checkins, registrarCheckin, inicioDaMatricula } = useStore();
  const { user } = useAuth();
  const toast = useToast();

  const ehAdmin = user?.perfil === "Administrador";
  const perfil: PerfilRegistro = ehAdmin ? "Administrador" : "Recepcionista";

  const hoje = paraData(HOJE_DEMO);
  const [busca, setBusca] = useState("");
  const [data, setData] = useState(HOJE_DEMO);
  const [motivo, setMotivo] = useState("");
  const [aberto, setAberto] = useState<number | null>(null);
  const [cursor, setCursor] = useState(new Date(hoje.getFullYear(), hoje.getMonth(), 1));
  const [retroativo, setRetroativo] = useState<{ aluno: Aluno; data: string } | null>(null);
  const [detalhe, setDetalhe] = useState<{ aluno: Aluno; checkin: Checkin } | null>(null);

  const ehRetroativo = data !== HOJE_DEMO;

  const filtrados = alunos.filter((a) =>
    `${a.nome} ${a.email}`.toLowerCase().includes(busca.toLowerCase()),
  );

  function statusLabel(a: Aluno) {
    const existente = checkinDoDia(checkins, a.id, data);
    if (existente) {
      return ehRetroativo
        ? `Check-in registrado nesta data (${existente.origem})`
        : `Check-in feito hoje (${existente.origem})`;
    }
    const bloqueio = bloqueioDoAluno(a);
    if (bloqueio) {
      return a.fin === "Atrasado"
        ? "Bloqueado — mensalidade atrasada"
        : "Bloqueado — matrícula vencida";
    }
    if (a.fin === "Pendente") return "Liberado — cobrança em aberto, ainda no prazo";
    return "Liberado para check-in";
  }

  function handleCheckin(a: Aluno) {
    const r = registrarCheckin({
      alunoId: a.id,
      data,
      por: user?.nome ?? "",
      perfil,
      motivo,
    });
    if (!r.ok) {
      toast(r.erro ?? "Não foi possível registrar.");
      return;
    }
    toast(
      ehRetroativo
        ? `Check-in retroativo de ${a.nome.split(" ")[0]} (${formatarDataBr(data)}) registrado.`
        : `Check-in de ${a.nome.split(" ")[0]} registrado pela recepção.`,
    );
    if (ehRetroativo) setMotivo("");
  }

  // dias passados sem check-in, a partir do início da matrícula (a equipe não tem janela)
  const podeRegistrar = (a: Aluno) => (iso: string) =>
    !bloqueioDoAluno(a) &&
    iso < HOJE_DEMO &&
    iso >= inicioDaMatricula(a.id) &&
    !checkinDoDia(checkins, a.id, iso);

  const ano = cursor.getFullYear();
  const mes = cursor.getMonth();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div className="rounded-2xl border border-navy/10 bg-white p-6">
        <div className="text-base font-bold">Check-in manual</div>
        <p className="mt-1.5 text-[13px] leading-relaxed text-navy/55">
          Alternativa ao autoatendimento. Alunos inadimplentes são bloqueados pela regra de negócio.
          Para registrar um dia que ficou sem check-in, escolha a data (ou abra o calendário do
          aluno) e informe o motivo.
        </p>

        <div className="mt-[18px] grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-xs font-bold">
            Data do check-in
            <div className="flex gap-2">
              <input
                type="date"
                value={data}
                max={HOJE_DEMO}
                onChange={(e) => setData(e.target.value || HOJE_DEMO)}
                className="min-w-0 flex-1 rounded-[9px] border border-navy/16 px-2.5 py-2.5 text-sm font-normal"
              />
              {ehRetroativo && (
                <button
                  type="button"
                  onClick={() => setData(HOJE_DEMO)}
                  className="whitespace-nowrap rounded-[9px] border border-navy/18 px-3 text-xs font-bold text-navy transition hover:bg-navy/5"
                >
                  Hoje
                </button>
              )}
            </div>
          </label>
          {ehRetroativo && (
            <label className="flex flex-col gap-1.5 text-xs font-bold">
              <span>
                Motivo do retroativo
                <Obrigatorio />
              </span>
              <input
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                aria-required="true"
                placeholder="Ex.: aluno treinou e esqueceu de marcar"
                className="rounded-[9px] border border-navy/16 px-2.5 py-2.5 text-sm font-normal"
              />
            </label>
          )}
        </div>
        {ehRetroativo && (
          <p className="mt-2.5 text-xs text-navy/50">
            <span className="text-danger">*</span> Campo obrigatório. Lançamento retroativo de{" "}
            {formatarDataBr(data)}, registrado com o seu nome e horário.
          </p>
        )}

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
          {filtrados.map((a) => {
            const bloqueado = !!bloqueioDoAluno(a);
            const jaTem = !!checkinDoDia(checkins, a.id, data);
            return (
              <div key={a.id} className="rounded-xl border border-navy/[.09] p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-navy/[.07] text-xs font-bold">
                    {a.nome.split(" ").slice(0, 2).map((p) => p[0]).join("")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold">{a.nome}</div>
                    <div className="text-xs text-navy/50">{statusLabel(a)}</div>
                  </div>
                  <button
                    type="button"
                    title="Calendário de frequência"
                    onClick={() => setAberto(aberto === a.id ? null : a.id)}
                    className={`flex h-[34px] w-[34px] items-center justify-center rounded-[9px] border transition ${
                      aberto === a.id
                        ? "border-teal bg-teal/15 text-teal-dark"
                        : "border-navy/18 text-navy hover:border-teal hover:bg-teal/10"
                    }`}
                  >
                    <CalendarDays size={15} />
                  </button>
                  <button
                    type="button"
                    disabled={bloqueado || jaTem}
                    onClick={() => handleCheckin(a)}
                    className={`rounded-[9px] px-3.5 py-2 text-xs font-bold ${
                      bloqueado
                        ? "cursor-not-allowed bg-danger/10 text-danger-dark"
                        : jaTem
                          ? "cursor-default bg-navy/[.07] text-navy/45"
                          : "cursor-pointer bg-teal text-navy-dark hover:bg-neon"
                    }`}
                  >
                    {bloqueado ? "Bloqueado" : jaTem ? "Feito" : "Registrar"}
                  </button>
                </div>

                {aberto === a.id && (
                  <div className="mt-3.5 border-t border-navy/[.08] pt-3.5">
                    <NavegacaoMes
                      ano={ano}
                      mes={mes}
                      total={totalNoMes(checkins, a.id, ano, mes)}
                      onMudar={(d) => setCursor(new Date(ano, mes + d, 1))}
                    />
                    <div className="mt-3.5">
                      <CalendarioFrequencia
                        ano={ano}
                        mes={mes}
                        checkins={vigentes(checkins, a.id)}
                        podeRegistrar={podeRegistrar(a)}
                        onRegistrar={(iso) => setRetroativo({ aluno: a, data: iso })}
                        onDetalhe={(c) => setDetalhe({ aluno: a, checkin: c })}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {retroativo && (
        <RegistrarCheckinModal
          alunoId={retroativo.aluno.id}
          nomeAluno={retroativo.aluno.nome}
          data={retroativo.data}
          perfil={perfil}
          onClose={() => setRetroativo(null)}
        />
      )}
      {detalhe && (
        <DetalheCheckinModal
          checkin={detalhe.checkin}
          nomeAluno={detalhe.aluno.nome}
          podeCancelar
          perfil={perfil}
          onClose={() => setDetalhe(null)}
        />
      )}
    </div>
  );
}
