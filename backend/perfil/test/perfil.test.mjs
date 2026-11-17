import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { criarHandler, detectarTipo } from "../index.mjs";

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(60, 7)]);

function ambiente() {
  const itens = new Map();
  const objetos = new Map();
  return {
    itens,
    objetos,
    adaptadores: {
      perfis: {
        async ler(id) {
          return itens.get(id) ? { ...itens.get(id) } : null;
        },
        async guardar(item) {
          itens.set(item.userId, { ...item });
        },
      },
      fotos: {
        async guardar(chave, corpo, tipo) {
          objetos.set(chave, { corpo, tipo });
        },
        async ler(chave) {
          return objetos.get(chave) ?? null;
        },
        async remover(chave) {
          objetos.delete(chave);
        },
      },
    },
  };
}

const SUB_A = "11111111-aaaa-bbbb-cccc-000000000001";
const SUB_B = "22222222-aaaa-bbbb-cccc-000000000002";
const claimsA = { sub: SUB_A, email: "pedro@gmail.com", name: "Pedro Makson" };

const evento = (metodo, { claims = claimsA, corpo } = {}) => ({
  requestContext: { http: { method: metodo }, authorizer: claims ? { jwt: { claims } } : undefined },
  isBase64Encoded: false,
  body: corpo === undefined ? undefined : typeof corpo === "string" ? corpo : JSON.stringify(corpo),
});

const foto = (buf, extra = {}) => ({ dados: buf.toString("base64"), ...extra });

describe("detectarTipo", () => {
  it("reconhece JPEG, PNG e WebP e recusa o resto", () => {
    assert.equal(detectarTipo(JPEG), "image/jpeg");
    assert.equal(detectarTipo(PNG), "image/png");
    assert.equal(
      detectarTipo(Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBP"), Buffer.alloc(8)])),
      "image/webp",
    );
    assert.equal(detectarTipo(Buffer.from("<svg/>")), null);
    assert.equal(detectarTipo(Buffer.alloc(0)), null);
  });
});

describe("/profile", () => {
  it("401 sem usuário no token ou com sub suspeito", async () => {
    const h = criarHandler(ambiente().adaptadores);
    assert.equal((await h(evento("GET", { claims: null }))).statusCode, 401);
    assert.equal((await h(evento("GET", { claims: { sub: "../x" } }))).statusCode, 401);
  });

  it("GET de quem ainda não tem perfil devolve perfil e foto nulos", async () => {
    const h = criarHandler(ambiente().adaptadores);
    const r = await h(evento("GET"));
    assert.equal(r.statusCode, 200);
    assert.deepEqual(JSON.parse(r.body), { perfil: null, foto: null });
  });

  it("PUT cria o item no DynamoDB com os dados do token e o que foi enviado", async () => {
    const amb = ambiente();
    const h = criarHandler(amb.adaptadores);
    const r = await h(evento("PUT", { corpo: { telefone: "(84) 99812-4477", emailContato: "contato@email.com" } }));
    assert.equal(r.statusCode, 200);

    const item = amb.itens.get(SUB_A);
    assert.equal(item.userId, SUB_A);
    assert.equal(item.email, "pedro@gmail.com");
    assert.equal(item.nome, "Pedro Makson");
    assert.equal(item.telefone, "(84) 99812-4477");
    assert.equal(item.emailContato, "contato@email.com");
    assert.ok(item.atualizadoEm);
    assert.equal(item.fotoKey, undefined);
  });

  it("PUT com foto grava no S3 e guarda a chave no item; GET devolve os mesmos bytes", async () => {
    const amb = ambiente();
    const h = criarHandler(amb.adaptadores);
    const put = await h(evento("PUT", { corpo: { telefone: "84999990000", foto: foto(PNG) } }));
    assert.equal(put.statusCode, 200);
    assert.equal(JSON.parse(put.body).fotoAtualizada, true);
    assert.ok(amb.objetos.has(`profile/${SUB_A}.png`));
    assert.equal(amb.itens.get(SUB_A).fotoKey, `profile/${SUB_A}.png`);

    const get = JSON.parse((await h(evento("GET"))).body);
    assert.equal(get.perfil.telefone, "84999990000");
    assert.equal(get.foto.tipo, "image/png");
    assert.deepEqual(Buffer.from(get.foto.dados, "base64"), PNG);
  });

  it("alterar só os dados mantém a foto; alterar só a foto mantém os dados", async () => {
    const amb = ambiente();
    const h = criarHandler(amb.adaptadores);
    await h(evento("PUT", { corpo: { telefone: "111", foto: foto(PNG) } }));
    await h(evento("PUT", { corpo: { telefone: "222" } }));
    assert.equal(amb.itens.get(SUB_A).fotoKey, `profile/${SUB_A}.png`);
    assert.equal(amb.itens.get(SUB_A).telefone, "222");

    await h(evento("PUT", { corpo: { foto: foto(PNG) } }));
    assert.equal(amb.itens.get(SUB_A).telefone, "222");
  });

  it("trocar para outro formato remove a foto antiga do S3", async () => {
    const amb = ambiente();
    const h = criarHandler(amb.adaptadores);
    await h(evento("PUT", { corpo: { foto: foto(PNG) } }));
    await h(evento("PUT", { corpo: { foto: foto(JPEG) } }));
    assert.deepEqual([...amb.objetos.keys()], [`profile/${SUB_A}.jpg`]);
    assert.equal(amb.itens.get(SUB_A).fotoKey, `profile/${SUB_A}.jpg`);
  });

  it("cada usuário só enxerga o próprio perfil e a própria foto", async () => {
    const amb = ambiente();
    const h = criarHandler(amb.adaptadores);
    await h(evento("PUT", { corpo: { telefone: "111", foto: foto(PNG) } }));
    const outro = JSON.parse((await h(evento("GET", { claims: { sub: SUB_B } }))).body);
    assert.deepEqual(outro, { perfil: null, foto: null });
  });

  it("recusa foto que não é imagem de verdade (415) sem gravar nada", async () => {
    const amb = ambiente();
    const r = await criarHandler(amb.adaptadores)(
      evento("PUT", { corpo: { foto: foto(Buffer.from("isto não é uma imagem")) } }),
    );
    assert.equal(r.statusCode, 415);
    assert.equal(amb.objetos.size, 0);
    assert.equal(amb.itens.size, 0);
  });

  it("recusa foto acima do limite (413)", async () => {
    const amb = ambiente();
    const grande = Buffer.concat([JPEG, Buffer.alloc(3000)]);
    const r = await criarHandler(amb.adaptadores, { maxFotoBytes: 1024 })(
      evento("PUT", { corpo: { foto: foto(grande) } }),
    );
    assert.equal(r.statusCode, 413);
    assert.equal(amb.objetos.size, 0);
  });

  it("valida os campos (400)", async () => {
    const h = criarHandler(ambiente().adaptadores);
    for (const corpo of [
      "não é json",
      "[]",
      {},
      { telefone: "abc" },
      { telefone: 123 },
      { emailContato: "sem-arroba" },
      { foto: { dados: "***" } },
      { foto: "texto" },
    ]) {
      const r = await h(evento("PUT", { corpo }));
      assert.equal(r.statusCode, 400, `corpo ${JSON.stringify(corpo)}`);
    }
  });

  it("aceita telefone e e-mail de contato vazios (para limpar o campo)", async () => {
    const amb = ambiente();
    const h = criarHandler(amb.adaptadores);
    await h(evento("PUT", { corpo: { telefone: "111", emailContato: "a@b.com" } }));
    const r = await h(evento("PUT", { corpo: { telefone: "", emailContato: "" } }));
    assert.equal(r.statusCode, 200);
    assert.equal(amb.itens.get(SUB_A).telefone, "");
  });

  it("405 para outros métodos", async () => {
    const h = criarHandler(ambiente().adaptadores);
    assert.equal((await h(evento("POST", { corpo: {} }))).statusCode, 405);
    assert.equal((await h(evento("DELETE"))).statusCode, 405);
  });

  it("falha do S3 ou do DynamoDB vira 500 sem vazar detalhes", async () => {
    const amb = ambiente();
    amb.adaptadores.perfis.guardar = async () => {
      throw new Error("AccessDeniedException: arn:aws:dynamodb:segredo");
    };
    const r = await criarHandler(amb.adaptadores)(evento("PUT", { corpo: { telefone: "1" } }));
    assert.equal(r.statusCode, 500);
    assert.ok(!r.body.includes("segredo"));
  });
});
