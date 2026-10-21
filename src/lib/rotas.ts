// Algumas telas (alunos, matrícula, pagamentos, treinos) são compartilhadas entre a Recepção,
// o Instrutor e o Administrador. Os destinos de navegação precisam ficar na área de quem está
// usando, para não trocar o menu lateral nem o perfil exibido.
export function rotasPorArea(pathname: string) {
  const admin = pathname.startsWith("/admin");
  return {
    alunos: admin ? "/admin/alunos" : "/recepcao/alunos",
    matricula: admin ? "/admin/alunos/matricula" : "/recepcao/matricula",
    pagamentos: admin ? "/admin/pagamentos" : "/recepcao/pagamentos",
    treinos: admin ? "/admin/treinos" : "/instrutor/alunos",
  };
}
