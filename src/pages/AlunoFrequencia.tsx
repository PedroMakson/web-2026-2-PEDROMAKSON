import { useState } from "react";
import { Droplet } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { useStore } from "../data/store";
import { useAlunoLogado } from "../data/useAlunoLogado";
import { useToast } from "../components/Toast";
import CalendarioFrequencia, { NavegacaoMes } from "../components/CalendarioFrequencia";
import { DetalheCheckinModal, RegistrarCheckinModal } from "../components/CheckinModais";
import {
  bloqueioDoAluno,
  type Checkin,
  checkinDoDia,
  sequenciaAtual,
  totalNoMes,
  vigentes,
} from "../lib/checkins";
import { HOJE_DEMO, paraData } from "../lib/datas";

export default function AlunoFrequencia() {
  const aluno = useAlunoLogado();
  const { user } = useAuth();
  const toast = useToast();
  const { checkins, registrarCheckin, inicioDaMatricula } = useStore();

  const hoje = paraData(HOJE_DEMO);
  const [cursor, setCursor] = useState(new Date(hoje.getFullYear(), hoje.getMonth(), 1));
  const [retroativo, setRetroativo] = useState<string | null>(null);
  const [detalhe, setDetalhe] = useState<Checkin | null>(null);

  const ano = cursor.getFullYear();
  const mes = cursor.getMonth();

  const doAluno = vigentes(checkins, aluno.id);
  const feitoHoje = checkinDoDia(checkins, aluno.id, HOJE_DEMO);
  const bloqueio = bloqueioDoAluno(aluno);
  const sequencia = sequenciaAtual(checkins, aluno.id);
  const inicio = inicioDaMatricula(aluno.id);

  // dias passados, desde o início da matrícula, que ainda estão sem check-in
  const podeRegistrar = (iso: string) =>
    !bloqueio &&
    iso < HOJE_DEMO &&
    iso >= inicio &&
    !checkinDoDia(checkins, aluno.id, iso);

  function fazerCheckin() {
    const r = registrarCheckin({
      alunoId: aluno.id,
      data: HOJE_DEMO,
      por: user?.nome ?? aluno.nome,
      perfil: "Aluno",
    });
    if (!r.ok) {
      toast(r.erro ?? "Não foi possível registrar o check-in.");
      return;
    }
    toast(`Check-in registrado! Sequência de ${sequencia + 1} dias.`);
  }

  const mensagem = bloqueio
    ? bloqueio
    : feitoHoje
      ? `Check-in de hoje registrado às ${feitoHoje.hora}.`
      : "Seu check-in de hoje ainda não foi feito.";

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <div className="rounded-2xl border border-navy/10 bg-white p-[22px]">
        <div className="text-[11px] font-bold uppercase tracking-wider text-navy/45">Frequência</div>
        <div className="mt-3">
          <NavegacaoMes
            ano={ano}
            mes={mes}
            total={totalNoMes(checkins, aluno.id, ano, mes)}
            onMudar={(d) => setCursor(new Date(ano, mes + d, 1))}
          />
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-navy/10 pt-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-navy">
              <Droplet size={16} className="text-teal-dark" />
              {sequencia} dias seguidos
            </div>
            <div className="mt-0.5 text-xs text-navy/55">{mensagem}</div>
          </div>
          <button
            type="button"
            onClick={fazerCheckin}
            disabled={!!bloqueio || !!feitoHoje}
            className={`rounded-xl px-6 py-3 text-sm font-bold ${
              bloqueio
                ? "cursor-not-allowed bg-navy/10 text-navy/45"
                : feitoHoje
                  ? "cursor-default bg-teal/15 text-teal-dark"
                  : "cursor-pointer bg-teal text-navy-dark transition hover:bg-neon"
            }`}
          >
            {bloqueio ? "Check-in bloqueado" : feitoHoje ? "Check-in feito" : "Fazer check-in"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-navy/10 bg-white p-[22px]">
        <CalendarioFrequencia
          ano={ano}
          mes={mes}
          checkins={doAluno}
          podeRegistrar={podeRegistrar}
          onRegistrar={setRetroativo}
          onDetalhe={setDetalhe}
        />
        <p className="mt-4 text-xs leading-relaxed text-navy/45">
          Esqueceu de marcar? Clique em um dia com borda tracejada para registrar um check-in
          retroativo, informando o motivo. Clicando em um dia com check-in, você vê os detalhes e
          pode removê-lo.
        </p>
      </div>

      {retroativo && (
        <RegistrarCheckinModal
          alunoId={aluno.id}
          nomeAluno={aluno.nome}
          data={retroativo}
          perfil="Aluno"
          onClose={() => setRetroativo(null)}
        />
      )}
      {detalhe && (
        <DetalheCheckinModal
          checkin={detalhe}
          nomeAluno={aluno.nome}
          podeCancelar
          perfil="Aluno"
          onClose={() => setDetalhe(null)}
        />
      )}
    </div>
  );
}
