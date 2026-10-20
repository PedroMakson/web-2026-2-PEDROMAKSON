import { createPublicKey, createVerify } from "node:crypto";

const ISSUER = `https://cognito-idp.${process.env.AWS_REGION}.amazonaws.com/${process.env.USER_POOL_ID}`;
let chaves;

async function carregarChaves() {
  if (!chaves) {
    const resposta = await fetch(`${ISSUER}/.well-known/jwks.json`);
    chaves = (await resposta.json()).keys;
  }
  return chaves;
}

const decodificar = (parte) => JSON.parse(Buffer.from(parte, "base64url").toString("utf8"));

async function validar(token) {
  const [cabecalho, corpo, assinatura] = token.split(".");
  if (!assinatura) throw new Error("token malformado");

  const { kid, alg } = decodificar(cabecalho);
  if (alg !== "RS256") throw new Error("algoritmo inválido");

  const jwk = (await carregarChaves()).find((k) => k.kid === kid);
  if (!jwk) throw new Error("chave desconhecida");

  const assinaturaValida = createVerify("RSA-SHA256")
    .update(`${cabecalho}.${corpo}`)
    .verify(createPublicKey({ key: jwk, format: "jwk" }), Buffer.from(assinatura, "base64url"));
  if (!assinaturaValida) throw new Error("assinatura inválida");

  const dados = decodificar(corpo);
  if (dados.iss !== ISSUER) throw new Error("emissor inválido");
  if (dados.token_use !== "id" || dados.aud !== process.env.CLIENT_ID) {
    throw new Error("token não pertence ao aplicativo");
  }
  if (dados.exp * 1000 < Date.now()) throw new Error("token expirado");
  return dados;
}

const politica = (efeito, recurso, principal) => ({
  principalId: principal,
  policyDocument: {
    Version: "2012-10-17",
    Statement: [{ Action: "execute-api:Invoke", Effect: efeito, Resource: recurso }],
  },
});

export const handler = async (event) => {
  try {
    const dados = await validar(event.queryStringParameters?.token ?? "");
    return {
      ...politica("Allow", event.methodArn, dados.sub),
      context: { email: String(dados.email ?? "") },
    };
  } catch (erro) {
    console.warn("conexão negada:", erro.message);
    return politica("Deny", event.methodArn, "anonimo");
  }
};
