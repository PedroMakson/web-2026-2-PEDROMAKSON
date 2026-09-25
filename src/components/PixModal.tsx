import { X } from "lucide-react";
import { useToast } from "./Toast";

const QR_SEED =
  "1011001010110100101101001011010010110100101101001011010010110100101101001011010";
const QR_CELLS = (QR_SEED + QR_SEED).slice(0, 81).split("");
const PIX_COPIA_COLA =
  "00020126580014BR.GOV.BCB.PIX0136gymflow-pau-dos-ferros-5204000053039865802BR";

export type PixAlvo = {
  nome: string;
  valor: string;
  venc: string;
} | null;

type PixModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  alvo?: PixAlvo;
  proxCobranca?: { valor: string; venc: string; parcela?: string } | null;
};

export default function PixModal({
  open,
  onClose,
  onConfirm,
  alvo = null,
  proxCobranca = null,
}: PixModalProps) {
  const toast = useToast();

  if (!open) return null;

  const titulo = alvo ? "Cobrança Pix" : "Pagar com Pix";
  const subtitulo = alvo
    ? `${alvo.nome} · ${alvo.valor} · vence ${alvo.venc}`
    : proxCobranca
      ? `Parcela ${proxCobranca.parcela || "única"} · vence ${proxCobranca.venc} · ${proxCobranca.valor}`
      : "Mensalidade em dia";
  const acao = alvo ? "Confirmar recebimento" : "Simular pagamento confirmado";
  const nota = alvo
    ? "Mostre o QR Code ao aluno. A baixa é registrada com autor e horário assim que o Pix cair."
    : "A confirmação chega por webhook do gateway e atualiza a matrícula de forma assíncrona.";

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-navy/60 p-5"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[400px] animate-[gfIn_.25s_ease_both] rounded-[20px] bg-white p-7"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-[26px] font-bold text-navy">
              {titulo}
            </h2>
            <p className="mt-1 text-[13px] text-navy/55">{subtitulo}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="p-0.5 text-navy/45 hover:text-navy"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mt-5 flex flex-col items-center gap-3.5 rounded-2xl bg-navy/[.04] p-5">
          <div className="grid h-[150px] w-[150px] grid-cols-9 grid-rows-9 gap-0.5 rounded-xl border border-navy/[.12] bg-white p-2.5">
            {QR_CELLS.map((c, i) => (
              <div
                key={i}
                className={`rounded-[1px] ${c === "1" || i % 7 === 0 ? "bg-navy" : "bg-transparent"}`}
              />
            ))}
          </div>
          <div className="break-all text-center text-[11px] leading-relaxed text-navy/50">
            {PIX_COPIA_COLA}
          </div>
          <button
            type="button"
            onClick={() => toast("Código Pix copiado.")}
            className="w-full rounded-[10px] border border-navy/[.18] bg-white py-2.5 text-[13px] font-bold text-navy"
          >
            Copiar código Pix
          </button>
        </div>

        <button
          type="button"
          onClick={onConfirm}
          className="mt-4 w-full rounded-xl bg-teal py-3.5 text-[15px] font-bold text-navy-dark transition hover:bg-neon"
        >
          {acao}
        </button>
        <p className="mt-3 text-center text-[11px] leading-relaxed text-navy/45">
          {nota}
        </p>
      </div>
    </div>
  );
}
