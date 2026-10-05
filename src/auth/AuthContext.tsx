import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { Amplify } from "aws-amplify";
import { fetchAuthSession, signIn, signOut } from "aws-amplify/auth";
import { type Perfil, perfilDoGrupo } from "./perfis";

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
      userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
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
  entrar: (email: string, senha: string) => Promise<AuthUser>;
  sair: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

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

  useEffect(() => {
    carregarUsuario()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
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
    <AuthContext.Provider value={{ user, loading, entrar, sair }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
