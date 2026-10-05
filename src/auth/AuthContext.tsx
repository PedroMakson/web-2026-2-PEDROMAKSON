import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { Amplify } from "aws-amplify";
import { fetchAuthSession, signIn, signOut } from "aws-amplify/auth";
import { Hub } from "aws-amplify/utils";
import { type Perfil, perfilDoGrupo } from "./perfis";

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
      userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
      loginWith: {
        oauth: {
          domain: import.meta.env.VITE_COGNITO_DOMAIN,
          scopes: ["openid", "email", "profile"],
          redirectSignIn: [`${window.location.origin}/login`],
          redirectSignOut: [`${window.location.origin}/login`],
          responseType: "code",
        },
      },
    },
  },
});

export type AuthUser = {
  nome: string;
  email: string;
  perfil: Perfil;
  iniciais: string;
};

type AuthValue = {
  user: AuthUser | null;
  loading: boolean;
  aviso: string;
  entrar: (email: string, senha: string) => Promise<AuthUser>;
  sair: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

const AVISO_KEY = "gymflow:aviso-login";
const SEM_PERFIL =
  "Login concluído, mas seu usuário ainda não tem um perfil de acesso. Procure o administrador.";

async function carregarUsuario(): Promise<AuthUser | null> {
  const session = await fetchAuthSession();
  const payload = session.tokens?.idToken?.payload;
  if (!payload) return null;
  const perfil = perfilDoGrupo(payload["cognito:groups"]);
  if (!perfil) return null;
  const email = String(payload.email ?? "");
  const nome = String(payload.name ?? email);
  const iniciais = nome
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
  return { nome, email, perfil, iniciais };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [aviso, setAviso] = useState(() => {
    const guardado = sessionStorage.getItem(AVISO_KEY) ?? "";
    sessionStorage.removeItem(AVISO_KEY);
    return guardado;
  });

  useEffect(() => {
    carregarUsuario()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));

    return Hub.listen("auth", async ({ payload }) => {
      if (payload.event === "signInWithRedirect") {
        const logado = await carregarUsuario();
        if (logado) {
          setUser(logado);
        } else {
          sessionStorage.setItem(AVISO_KEY, SEM_PERFIL);
          await signOut();
        }
      } else if (payload.event === "signInWithRedirect_failure") {
        setAviso("Não foi possível entrar com o Google. Tente novamente.");
      }
    });
  }, []);

  async function entrar(email: string, senha: string) {
    await signOut();
    const resultado = await signIn({ username: email, password: senha });
    if (!resultado.isSignedIn) {
      throw new Error("Primeiro acesso: peça ao administrador para redefinir sua senha.");
    }
    const logado = await carregarUsuario();
    if (!logado) {
      await signOut();
      throw new Error("Seu usuário não tem um perfil de acesso. Procure o administrador.");
    }
    setUser(logado);
    return logado;
  }

  async function sair() {
    await signOut();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, aviso, entrar, sair }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
