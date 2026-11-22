import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAuth } from "./AuthContext";
import {
  buscarPerfil,
  type DadosPerfil,
  fotoConfigurada,
  type PerfilSalvo,
  salvarPerfil,
} from "../lib/fotoApi";
import { reduzirImagem, validarArquivo } from "../lib/imagem";

type PerfilUsuarioValor = {
  // foto exibida: a enviada pelo usuário (S3); se não houver, a do login com Google; senão null (iniciais)
  url: string | null;
  // dados cadastrados no DynamoDB; null enquanto não carregou ou se o usuário nunca salvou
  perfil: PerfilSalvo | null;
  enviando: boolean;
  salvando: boolean;
  configurado: boolean;
  // valida, reduz, envia (PUT) e lê de volta (GET); lança Error com a mensagem para o usuário
  trocar: (arquivo: File) => Promise<void>;
  // altera telefone, e-mail de contato, nascimento, sexo e endereço (PUT); lança Error com a mensagem para o usuário
  salvarDados: (dados: DadosPerfil) => Promise<void>;
};

const PerfilUsuarioContext = createContext<PerfilUsuarioValor | null>(null);

export function FotoPerfilProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const email = user?.email;
  const [urlS3, setUrlS3] = useState<string | null>(null);
  const [perfil, setPerfil] = useState<PerfilSalvo | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const urlAtual = useRef<string | null>(null);

  const aplicarFoto = useCallback((blob: Blob | null) => {
    const nova = blob ? URL.createObjectURL(blob) : null;
    if (urlAtual.current) URL.revokeObjectURL(urlAtual.current);
    urlAtual.current = nova;
    setUrlS3(nova);
  }, []);

  // carrega perfil e foto quando alguém entra e limpa quando sai
  useEffect(() => {
    if (!fotoConfigurada || !email) {
      aplicarFoto(null);
      setPerfil(null);
      return;
    }
    let ativo = true;
    buscarPerfil()
      .then((r) => {
        if (!ativo) return;
        setPerfil(r.perfil);
        aplicarFoto(r.foto);
      })
      .catch(() => {
        // API fora do ar: o app segue com os dados locais e as iniciais
      });
    return () => {
      ativo = false;
    };
  }, [email, aplicarFoto]);

  useEffect(
    () => () => {
      if (urlAtual.current) URL.revokeObjectURL(urlAtual.current);
    },
    [],
  );

  const trocar = useCallback(
    async (arquivo: File) => {
      const problema = validarArquivo(arquivo);
      if (problema) throw new Error(problema);
      setEnviando(true);
      try {
        const reduzida = await reduzirImagem(arquivo);
        setPerfil(await salvarPerfil({ foto: reduzida }));
        const atual = await buscarPerfil(); // mostra o que ficou guardado no S3
        aplicarFoto(atual.foto);
      } finally {
        setEnviando(false);
      }
    },
    [aplicarFoto],
  );

  const salvarDados = useCallback(async (dados: DadosPerfil) => {
    setSalvando(true);
    try {
      setPerfil(await salvarPerfil(dados));
    } finally {
      setSalvando(false);
    }
  }, []);

  return (
    <PerfilUsuarioContext.Provider
      value={{
        url: urlS3 ?? user?.picture ?? null,
        perfil,
        enviando,
        salvando,
        configurado: fotoConfigurada,
        trocar,
        salvarDados,
      }}
    >
      {children}
    </PerfilUsuarioContext.Provider>
  );
}

export function useFotoPerfil() {
  const ctx = useContext(PerfilUsuarioContext);
  if (!ctx) throw new Error("useFotoPerfil deve ser usado dentro de FotoPerfilProvider");
  return ctx;
}
