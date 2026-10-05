export type Perfil = "Aluno" | "Instrutor" | "Recepcionista" | "Administrador";

export const HOME_POR_PERFIL: Record<Perfil, string> = {
  Aluno: "/aluno",
  Instrutor: "/instrutor",
  Recepcionista: "/recepcao",
  Administrador: "/admin",
};

export function perfilDoGrupo(grupos: unknown): Perfil | null {
  if (!Array.isArray(grupos)) return null;
  return (
    (Object.keys(HOME_POR_PERFIL) as Perfil[]).find((p) => grupos.includes(p)) ??
    null
  );
}
