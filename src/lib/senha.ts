// Regras de senha do user pool do Cognito (mesmas da recuperação de senha) e tradução dos erros.
export const SIMBOLO = /[\^$*.[\]{}()?\-"!@#%&/\\,><':;|_~`+=]/;

export function requisitosSenha(nova: string, confirmacao: string) {
  return [
    { texto: "Pelo menos 8 caracteres", ok: nova.length >= 8 },
    { texto: "Uma letra maiúscula", ok: /[A-Z]/.test(nova) },
    { texto: "Uma letra minúscula", ok: /[a-z]/.test(nova) },
    { texto: "Um número", ok: /\d/.test(nova) },
    { texto: "Um símbolo (ex.: @ ! # $)", ok: SIMBOLO.test(nova) },
    { texto: "As duas senhas são iguais", ok: nova !== "" && nova === confirmacao },
  ];
}

export function mensagemErroSenha(error: unknown) {
  const nome = error instanceof Error ? error.name : "";
  if (nome === "NotAuthorizedException") return "Senha atual incorreta.";
  if (nome === "InvalidPasswordException") return "A nova senha não atende à política de segurança.";
  if (nome === "LimitExceededException") return "Muitas tentativas. Aguarde alguns minutos.";
  if (nome === "CodeMismatchException") return "Código inválido. Confira os 6 dígitos.";
  if (nome === "ExpiredCodeException") return "Código expirado. Peça um novo.";
  return error instanceof Error ? error.message : "Não foi possível alterar a senha.";
}
