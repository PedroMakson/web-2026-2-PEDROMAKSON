import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { useFotoPerfil } from "../auth/FotoPerfil";
import { TIPOS_ACEITOS, validarArquivo } from "../lib/imagem";
import { useToast } from "./Toast";
import Avatar from "./Avatar";

const tamanho = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

// Janela de troca da foto: mostra a imagem no centro, "Selecionar imagem" abre o seletor de arquivos
// e a escolha fica só como prévia. A foto só é enviada quando se clica em "Confirmar".
export default function TrocarFotoModal({
  iniciais,
  onClose,
}: {
  iniciais: string;
  onClose: () => void;
}) {
  const foto = useFotoPerfil();
  const toast = useToast();
  const entrada = useRef<HTMLInputElement>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [previa, setPrevia] = useState<string | null>(null);
  const [erro, setErro] = useState("");

  // prévia local da imagem escolhida (nada vai para o servidor ainda)
  useEffect(() => {
    if (!arquivo) {
      setPrevia(null);
      return;
    }
    const url = URL.createObjectURL(arquivo);
    setPrevia(url);
    return () => URL.revokeObjectURL(url);
  }, [arquivo]);

  useEffect(() => {
    const fecharComEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !foto.enviando) onClose();
    };
    window.addEventListener("keydown", fecharComEsc);
    return () => window.removeEventListener("keydown", fecharComEsc);
  }, [foto.enviando, onClose]);

  function aoEscolher(ev: ChangeEvent<HTMLInputElement>) {
    const escolhido = ev.target.files?.[0];
    ev.target.value = ""; // permite escolher o mesmo arquivo de novo
    if (!escolhido) return; // fechou o seletor sem escolher: mantém o que já estava
    const problema = validarArquivo(escolhido);
    if (problema) {
      setErro(problema);
      return;
    }
    setErro("");
    setArquivo(escolhido);
  }

  async function confirmar() {
    if (!arquivo) return;
    setErro("");
    try {
      await foto.trocar(arquivo);
      toast("Foto de perfil atualizada.");
      onClose();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível enviar a foto.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-navy/60 p-5"
      onClick={() => !foto.enviando && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-trocar-foto"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-[420px] overflow-auto rounded-[20px] bg-white p-7"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="titulo-trocar-foto" className="font-display text-2xl font-bold text-navy">
            Foto de perfil
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={foto.enviando}
            aria-label="Fechar"
            className="text-navy/45 disabled:opacity-40"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mt-6 flex flex-col items-center">
          <Avatar
            url={previa ?? foto.url}
            iniciais={iniciais}
            className="font-display h-40 w-40 bg-navy text-5xl font-bold text-neon"
          />
          <p className="mt-3 min-h-[18px] text-center text-xs text-navy/55">
            {arquivo
              ? `${arquivo.name} · ${tamanho(arquivo.size)}`
              : "Escolha uma imagem do seu computador."}
          </p>

          <button
            type="button"
            autoFocus
            onClick={() => entrada.current?.click()}
            disabled={foto.enviando}
            className="mt-3 flex items-center gap-2 rounded-[10px] border border-navy/18 px-4 py-2.5 text-[13px] font-bold text-navy transition hover:border-teal hover:bg-teal/10 disabled:opacity-50"
          >
            <ImagePlus size={16} />
            {arquivo ? "Escolher outra imagem" : "Selecionar imagem"}
          </button>
          <input
            ref={entrada}
            type="file"
            accept={TIPOS_ACEITOS.join(",")}
            onChange={aoEscolher}
            className="hidden"
          />
          <p className="mt-2.5 text-center text-[11px] leading-relaxed text-navy/45">
            JPEG, PNG ou WebP, até 10 MB. A imagem é reduzida automaticamente.
          </p>
        </div>

        {erro && (
          <p role="alert" className="mt-3 text-center text-[13px] font-semibold text-danger">
            {erro}
          </p>
        )}

        <div className="mt-6 flex gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={foto.enviando}
            className="rounded-[10px] border border-navy/18 px-[18px] py-3 text-sm font-bold disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirmar}
            disabled={!arquivo || foto.enviando}
            className="flex-1 rounded-[10px] bg-teal py-3 text-sm font-bold text-navy-dark transition hover:bg-neon disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-teal"
          >
            {foto.enviando ? "Enviando…" : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}
