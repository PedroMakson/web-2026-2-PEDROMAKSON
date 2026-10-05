import { type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { HOME_POR_PERFIL, type Perfil } from "./perfis";

export default function RequireRole({
  perfis,
  children,
}: {
  perfis: Perfil[];
  children: ReactNode;
}) {
  const { user, loading } = useAuth();

  if (loading) return <div className="min-h-screen bg-navy" />;
  if (!user) return <Navigate to="/login" replace />;
  if (!perfis.includes(user.perfil)) {
    return <Navigate to={HOME_POR_PERFIL[user.perfil]} replace />;
  }
  return <>{children}</>;
}
