// Perfil do usuário (Avaliação 11): PUT /profile altera os dados e a foto, GET /profile devolve os dois.
//   - dados cadastrais: tabela DynamoDB  (variável TABLE)  -> um item por usuário, chave userId = sub do Cognito
//   - foto de perfil:   bucket S3        (variável BUCKET) -> objeto profile/<sub>.<jpg|png|webp>
// A rota é protegida por um JWT authorizer do Cognito (API Gateway HTTP API): quando a Lambda roda, o token
// já foi validado e os claims (sub, email, name) vêm em event.requestContext.authorizer.jwt.claims.
// Para colar no console da Lambda: Runtime Node.js 24, Handler "index.handler", variáveis BUCKET e TABLE.

const MAX_FOTO_BYTES = 3 * 1024 * 1024;
const EXTENSAO = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

const json = (statusCode, corpo) => ({
  statusCode,
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify(corpo),
});

// Identifica o formato pelo conteúdo do arquivo (e não pelo que o cliente diz); só aceita imagens comuns.
export function detectarTipo(buf) {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (
    buf.length >= 8 &&
    buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return "image/png";
  }
  if (
    buf.length >= 12 &&
    buf.subarray(0, 4).toString("latin1") === "RIFF" &&
    buf.subarray(8, 12).toString("latin1") === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;
const TELEFONE = /^[0-9+()\-\s.]{0,30}$/;
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;

const SEXOS = ["Feminino", "Masculino", "Outro", "Prefiro não informar"];
const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];
// tamanho máximo de cada campo do endereço
const LIMITES_ENDERECO = { logradouro: 100, numero: 20, complemento: 60, bairro: 80, cidade: 80 };

// AAAA-MM-DD de verdade (sem 31/02), entre 1900 e hoje
function nascimentoValido(valor) {
  if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const [a, m, d] = valor.split("-").map(Number);
  const data = new Date(Date.UTC(a, m - 1, d));
  if (data.getUTCFullYear() !== a || data.getUTCMonth() !== m - 1 || data.getUTCDate() !== d) return false;
  return valor >= "1900-01-01" && valor <= new Date().toISOString().slice(0, 10);
}

// Confere o endereço e devolve { endereco } já limpo (CEP como 00000-000) ou { erro } com a mensagem.
function normalizarEndereco(e) {
  if (!e || typeof e !== "object" || Array.isArray(e)) return { erro: "Endereço inválido." };
  const limpo = {};
  for (const campo of ["logradouro", "numero", "complemento", "bairro", "cidade"]) {
    const valor = e[campo] ?? "";
    if (typeof valor !== "string") return { erro: "Endereço inválido." };
    limpo[campo] = valor.trim();
    if (limpo[campo].length > LIMITES_ENDERECO[campo]) return { erro: `Endereço: ${campo} muito longo.` };
  }
  const digitos = typeof e.cep === "string" ? e.cep.replace(/\D/g, "") : "";
  if (digitos.length !== 8) return { erro: "CEP inválido: informe 8 dígitos." };
  limpo.cep = `${digitos.slice(0, 5)}-${digitos.slice(5)}`;
  if (!limpo.logradouro) return { erro: "Informe o logradouro." };
  if (!limpo.numero) return { erro: "Informe o número do endereço (ou S/N)." };
  if (!limpo.bairro) return { erro: "Informe o bairro." };
  if (!limpo.cidade) return { erro: "Informe a cidade." };
  if (!UFS.includes(e.uf)) return { erro: "UF inválida." };
  limpo.uf = e.uf;
  return { endereco: limpo };
}

// `perfis` isola o DynamoDB: { ler(userId) -> item | null, guardar(item) }.
// `fotos` isola o S3: { guardar(chave, corpo, tipo), ler(chave) -> { corpo, tipo } | null, remover(chave) }.
export function criarHandler({ perfis, fotos }, { maxFotoBytes = MAX_FOTO_BYTES } = {}) {
  return async (event) => {
    const metodo = event.requestContext?.http?.method;
    const claims = event.requestContext?.authorizer?.jwt?.claims ?? {};
    const sub = claims.sub;
    if (typeof sub !== "string" || !/^[A-Za-z0-9._-]{8,128}$/.test(sub)) {
      return json(401, { message: "Não autorizado." });
    }

    try {
      if (metodo === "GET") {
        const perfil = await perfis.ler(sub);
        let foto = null;
        if (perfil?.fotoKey) {
          const arquivo = await fotos.ler(perfil.fotoKey);
          if (arquivo) foto = { tipo: arquivo.tipo, dados: arquivo.corpo.toString("base64") };
        }
        return json(200, { perfil, foto });
      }

      if (metodo === "PUT") {
        let dados;
        try {
          const texto = event.body
            ? Buffer.from(event.body, event.isBase64Encoded ? "base64" : "utf8").toString("utf8")
            : "";
          dados = JSON.parse(texto);
        } catch {
          return json(400, { message: "Corpo inválido: envie um JSON." });
        }
        if (!dados || typeof dados !== "object" || Array.isArray(dados)) {
          return json(400, { message: "Corpo inválido: envie um JSON." });
        }

        const { telefone, emailContato, foto, nascimento, sexo, endereco } = dados;
        if (telefone !== undefined && (typeof telefone !== "string" || !TELEFONE.test(telefone.trim()))) {
          return json(400, { message: "Telefone inválido." });
        }
        if (
          emailContato !== undefined &&
          (typeof emailContato !== "string" || (emailContato.trim() !== "" && !EMAIL.test(emailContato.trim())))
        ) {
          return json(400, { message: "E-mail de contato inválido." });
        }
        if (nascimento !== undefined && !nascimentoValido(nascimento)) {
          return json(400, { message: "Data de nascimento inválida." });
        }
        if (sexo !== undefined && (typeof sexo !== "string" || (sexo !== "" && !SEXOS.includes(sexo)))) {
          return json(400, { message: "Sexo inválido." });
        }
        let enderecoLimpo = null;
        if (endereco !== undefined) {
          const resultado = normalizarEndereco(endereco);
          if (resultado.erro) return json(400, { message: resultado.erro });
          enderecoLimpo = resultado.endereco;
        }
        if (
          [telefone, emailContato, foto, nascimento, sexo, endereco].every((campo) => campo === undefined)
        ) {
          return json(400, {
            message:
              "Envie ao menos um campo para atualizar (telefone, emailContato, nascimento, sexo, endereco ou foto).",
          });
        }

        let imagem = null;
        if (foto !== undefined) {
          const base64 = typeof foto?.dados === "string" ? foto.dados.replace(/\s/g, "") : "";
          if (!BASE64.test(base64)) return json(400, { message: "Foto inválida: envie a imagem em base64." });
          const corpo = Buffer.from(base64, "base64");
          if (corpo.length > maxFotoBytes) {
            return json(413, {
              message: `Imagem muito grande: o limite é de ${Math.floor(maxFotoBytes / 1024 / 1024)} MB.`,
            });
          }
          const tipo = detectarTipo(corpo);
          if (!tipo) {
            return json(415, { message: "Formato não suportado: envie uma imagem JPEG, PNG ou WebP." });
          }
          imagem = { corpo, tipo };
        }

        const atual = (await perfis.ler(sub)) ?? {};
        const agora = new Date().toISOString();
        const novo = {
          ...atual,
          userId: sub,
          email: claims.email ?? atual.email,
          nome: claims.name ?? atual.nome,
          atualizadoEm: agora,
        };
        if (telefone !== undefined) novo.telefone = telefone.trim();
        if (emailContato !== undefined) novo.emailContato = emailContato.trim();
        if (nascimento !== undefined) novo.nascimento = nascimento;
        if (sexo !== undefined) novo.sexo = sexo;
        // o endereço é guardado em atributos de texto soltos (cep, logradouro, numero, ...)
        if (enderecoLimpo) Object.assign(novo, enderecoLimpo);

        if (imagem) {
          // uma foto por usuário: a chave leva o sub, então ninguém lê nem troca a de outro
          const chave = `profile/${sub}.${EXTENSAO[imagem.tipo]}`;
          await fotos.guardar(chave, imagem.corpo, imagem.tipo);
          if (atual.fotoKey && atual.fotoKey !== chave) {
            await fotos.remover(atual.fotoKey).catch(() => {});
          }
          novo.fotoKey = chave;
          novo.fotoAtualizadaEm = agora;
        }

        await perfis.guardar(novo);
        console.log("perfil atualizado", { sub, campos: Object.keys(dados), fotoAtualizada: Boolean(imagem) });
        return json(200, { message: "Perfil atualizado.", perfil: novo, fotoAtualizada: Boolean(imagem) });
      }

      return json(405, { message: "Método não permitido." });
    } catch (erro) {
      console.error("erro em /profile", { metodo, nome: erro?.name, mensagem: erro?.message });
      return json(500, { message: "Não foi possível processar o perfil agora. Tente novamente." });
    }
  };
}

// --- ligação com a AWS (só roda dentro da Lambda; os testes usam adaptadores em memória) ---

async function criarAdaptadores({ bucket, tabela }) {
  const { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } = await import("@aws-sdk/client-s3");
  const { DynamoDBClient, GetItemCommand, PutItemCommand } = await import("@aws-sdk/client-dynamodb");
  // o nome do bucket tem ponto (…-2026.2): sem path-style o certificado HTTPS do S3 não combina com o endereço
  const s3 = new S3Client({ forcePathStyle: true });
  const dynamo = new DynamoDBClient({});

  return {
    fotos: {
      async guardar(chave, corpo, tipo) {
        await s3.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: chave,
            Body: corpo,
            ContentType: tipo,
            CacheControl: "private, no-cache",
          }),
        );
      },
      async ler(chave) {
        try {
          const r = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: chave }));
          return {
            corpo: Buffer.from(await r.Body.transformToByteArray()),
            tipo: r.ContentType ?? "image/jpeg",
          };
        } catch (erro) {
          if (erro?.name === "NoSuchKey" || erro?.name === "NotFound") return null;
          throw erro;
        }
      },
      async remover(chave) {
        await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: chave }));
      },
    },
    perfis: {
      async ler(userId) {
        const r = await dynamo.send(new GetItemCommand({ TableName: tabela, Key: { userId: { S: userId } } }));
        if (!r.Item) return null;
        return Object.fromEntries(
          Object.entries(r.Item)
            .filter(([, valor]) => typeof valor.S === "string")
            .map(([nome, valor]) => [nome, valor.S]),
        );
      },
      async guardar(item) {
        const atributos = Object.fromEntries(
          Object.entries(item)
            .filter(([, valor]) => typeof valor === "string")
            .map(([nome, valor]) => [nome, { S: valor }]),
        );
        await dynamo.send(new PutItemCommand({ TableName: tabela, Item: atributos }));
      },
    },
  };
}

let padrao;
export const handler = async (event) => {
  padrao ??= criarHandler(
    await criarAdaptadores({ bucket: process.env.BUCKET, tabela: process.env.TABLE }),
    { maxFotoBytes: Number(process.env.MAX_FOTO_BYTES) || undefined },
  );
  return padrao(event);
};
