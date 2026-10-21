import { type ReactNode, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Droplet } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { useStore } from "../data/store";
import { useAlunoLogado } from "../data/useAlunoLogado";
import { useToast } from "../components/Toast";
import PixModal from "../components/PixModal";
import { MATRICULA_LINHAS } from "../data/aluno";
import { bloqueioDoAluno, checkinDoDia, sequenciaAtual } from "../lib/checkins";
import { dataBrParaIso, HOJE_DEMO, LETRA_DIA, paraData, somarDias } from "../lib/datas";

const PROX_COBRANCA = { valor: "R$ 129,90", venc: "17/09/2026", parcela: "única" };

function Card({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl border border-navy/10 bg-white p-[22px] ${className}`}
    >
      {children}
    </div>
  );
}

export default function AlunoHome() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const aluno = useAlunoLogado();
  const { checkins, registrarCheckin } = useStore();
  const [pixOpen, setPixOpen] = useState(false);
  const [pendente, setPendente] = useState(true);

  const feitoHoje = checkinDoDia(checkins, aluno.id, HOJE_DEMO);
  const streak = sequenciaAtual(checkins, aluno.id);

  // Mesmas regras do protótipo: cobrança em aberto dentro do prazo não bloqueia o check-in;
  // só mensalidade atrasada ou matrícula vencida bloqueiam.
  const matriculaVencida = dataBrParaIso(aluno.fim) < HOJE_DEMO;
  const bloqueiaCheckin = !!bloqueioDoAluno(aluno);

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
    toast(`Check-in registrado! Sequência de ${streak + 1} dias.`);
  }

  const msgCheckin = bloqueiaCheckin
    ? matriculaVencida
      ? "Matrícula vencida — renove na recepção para liberar o check-in."
      : "Mensalidade em atraso: regularize para liberar o check-in."
    : feitoHoje
      ? `Check-in de hoje registrado às ${feitoHoje.hora}.`
      : "Seu check-in de hoje ainda não foi feito.";

  const labelCheckin = bloqueiaCheckin
    ? "Check-in bloqueado"
    : feitoHoje
      ? "Check-in feito"
      : "Fazer check-in";

  // últimos 14 dias, do mais antigo ao de hoje
  const ultimos14 = Array.from({ length: 14 }, (_, i) => {
    const data = somarDias(HOJE_DEMO, i - 13);
    return {
      letra: LETRA_DIA[paraData(data).getDay()],
      feito: !!checkinDoDia(checkins, aluno.id, data),
    };
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-[18px] bg-navy p-[26px] text-white sm:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-white/50">
                Check-in de hoje
              </div>
              <div className="mt-2.5 flex items-center gap-2.5">
                <Droplet size={24} className="text-neon" />
                <span className="font-display text-[38px] font-bold leading-none">
                  {streak} dias
                </span>
                <span className="self-end pb-1 text-[13px] text-white/60">
                  seguidos
                </span>
              </div>
              <div className="mt-1.5 text-[13px] text-white/60">
                {msgCheckin}
              </div>
            </div>
            <button
              type="button"
              onClick={fazerCheckin}
              disabled={bloqueiaCheckin || !!feitoHoje}
              className={`rounded-xl px-[30px] py-4 text-[15px] font-bold ${
                bloqueiaCheckin
                  ? "cursor-not-allowed bg-white/10 text-white/50"
                  : feitoHoje
                    ? "cursor-default bg-neon/15 text-neon"
                    : "animate-[gfPulse_2.4s_ease-in-out_infinite] cursor-pointer bg-neon text-navy-dark"
              }`}
            >
              {labelCheckin}
            </button>
          </div>
        </div>

        <Card className={pendente ? "border-danger/30" : ""}>
          <div className="text-[11px] font-bold uppercase tracking-wider text-navy/45">
            Financeiro
          </div>
          <div
            className={`mt-2.5 text-base font-bold ${pendente ? "text-danger" : "text-teal-dark"}`}
          >
            {pendente ? "Cobrança em aberto" : "Mensalidade em dia"}
          </div>
          <div className="mt-1 text-[13px] text-navy/55">
            {pendente
              ? "R$ 129,90 · vencimento 17/09/2026"
              : "Próximo vencimento 17/10/2026"}
          </div>
          {pendente && (
            <button
              type="button"
              onClick={() => setPixOpen(true)}
              className="mt-4 w-full rounded-[10px] bg-teal py-3 text-sm font-bold text-navy-dark transition hover:bg-neon"
            >
              Pagar com Pix
            </button>
          )}
        </Card>

        <Card>
          <div className="text-[11px] font-bold uppercase tracking-wider text-navy/45">
            Treino de hoje
          </div>
          <div className="mt-2.5 text-base font-bold text-navy">
            Divisão A · Peito e tríceps
          </div>
          <div className="mt-1 text-[13px] text-navy/55">
            4 exercícios · ~50 min
          </div>
          <button
            type="button"
            onClick={() => navigate("/aluno/treino")}
            className="mt-4 w-full rounded-[10px] border border-navy/18 py-2.5 text-[13px] font-bold text-navy transition hover:bg-navy/5"
          >
            Ver treino completo
          </button>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="flex h-full flex-col">
          <div className="text-[11px] font-bold uppercase tracking-wider text-navy/45">
            Frequência — últimos 14 dias
          </div>
          <div className="mt-[18px] flex min-h-[120px] flex-1 items-end gap-1.5">
            {ultimos14.map((dia, i) => (
              <div
                key={i}
                className="flex h-full flex-1 flex-col justify-end gap-1.5"
              >
                <div
                  className={`w-full rounded-[5px] ${dia.feito ? "bg-teal" : "bg-navy/10"}`}
                  style={{ height: `${dia.feito ? 55 + (i % 3) * 14 : 14}%` }}
                />
                <div className="text-center text-[9px] text-navy/40">
                  {dia.letra}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="text-[11px] font-bold uppercase tracking-wider text-navy/45">
            Minha matrícula
          </div>
          <div className="mt-3.5 flex flex-col gap-2.5">
            {MATRICULA_LINHAS.map((linha) => (
              <div
                key={linha.k}
                className="flex justify-between gap-3 border-b border-dashed border-navy/10 pb-2.5 text-[13px]"
              >
                <span className="text-navy/55">{linha.k}</span>
                <span className="text-right font-bold">{linha.v}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <PixModal
        open={pixOpen}
        onClose={() => setPixOpen(false)}
        proxCobranca={PROX_COBRANCA}
        onConfirm={() => {
          setPixOpen(false);
          setPendente(false);
          toast(
            `Pagamento de ${PROX_COBRANCA.valor} confirmado — matrícula atualizada e check-in liberado.`,
          );
        }}
      />
    </div>
  );
}
