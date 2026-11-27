"""Testa a Lambda do /chat sem AWS e sem Gemini: banco em memória e modelo falso."""

import base64
import json
import types

import lambda_chat
from agente import montar_agente
from ferramentas_chat import Anexo, ArmazenamentoPerfil, criar_ferramenta_foto
from lambda_chat import RepositorioDynamo, criar_handler
from test_agente import ModeloFalso, textos, texto, usa_ferramenta


class RepositorioMemoria:
    def __init__(self):
        self.itens = {}

    def ler(self, sessao):
        return json.loads(json.dumps(self.itens.get(sessao, [])))

    def guardar(self, sessao, mensagens):
        self.itens[sessao] = json.loads(json.dumps(mensagens))

    def apagar(self, sessao):
        self.itens.pop(sessao, None)


def evento(corpo, sub=None, metodo="POST", grupos=None, query=None):
    ev = {"httpMethod": metodo, "body": corpo if isinstance(corpo, str) or corpo is None else json.dumps(corpo)}
    if query:
        ev["queryStringParameters"] = query
    if sub:
        claims = {"sub": sub, "email": "x@y.com", "name": "Pedro"}
        if grupos:
            claims["cognito:groups"] = grupos
        ev["requestContext"] = {"authorizer": {"claims": claims}}
    return ev


def novo(*respostas):
    modelo = ModeloFalso(*respostas)
    repo = RepositorioMemoria()
    return modelo, repo, criar_handler(repo, lambda msgs, m, ctx: montar_agente(modelo, msgs))


def corpo_de(resp):
    return json.loads(resp["body"])


SUB_A = "a4085498-10d1-700d-52ee-271de9466ca8"
SUB_B = "d4a8a4e8-8071-7017-62d4-51402e65c526"


def test_responde_e_lembra_entre_chamadas_separadas():
    modelo, repo, h = novo(texto("Prazer, Pedro!"), texto("Seu nome é Pedro."))
    r1 = h(evento({"mensagem": "Meu nome é Pedro"}, sub=SUB_A))
    assert r1["statusCode"] == 200 and corpo_de(r1) == {"resposta": "Prazer, Pedro!", "acoes": []}
    r2 = h(evento({"mensagem": "Qual é o meu nome?"}, sub=SUB_A))
    assert corpo_de(r2)["resposta"] == "Seu nome é Pedro."
    # na segunda chamada (outro "processo") o modelo recebeu a conversa que veio do banco
    assert "Meu nome é Pedro" in textos(modelo.chamadas[1])
    assert "Prazer, Pedro!" in textos(modelo.chamadas[1])


def test_historico_fica_gravado_com_acentos_sob_o_sub_do_usuario():
    _, repo, h = novo(texto("Olá!"))
    h(evento({"mensagem": "Oi, tudo bem?"}, sub=SUB_A))
    assert list(repo.itens) == [f"usuario-{SUB_A}"]
    assert textos(repo.itens[f"usuario-{SUB_A}"]) == ["Oi, tudo bem?", "Olá!"]


def test_cada_usuario_tem_a_propria_memoria():
    modelo, repo, h = novo(texto("ok"), texto("ok"))
    h(evento({"mensagem": "Segredo da Ana"}, sub=SUB_A))
    h(evento({"mensagem": "Oi"}, sub=SUB_B))
    assert "Segredo da Ana" not in textos(modelo.chamadas[1])


def test_com_login_o_corpo_nao_escolhe_a_sessao_de_outra_pessoa():
    _, repo, h = novo(texto("ok"))
    h(evento({"mensagem": "Oi", "sessao": "da-vitima"}, sub=SUB_A))
    assert list(repo.itens) == [f"usuario-{SUB_A}"]


def test_sem_login_aceita_sessao_do_corpo_para_teste_no_console():
    _, repo, h = novo(texto("ok"))
    r = h(evento({"mensagem": "Oi", "sessao": "meu-teste"}))
    assert r["statusCode"] == 200
    assert list(repo.itens) == ["teste-meu-teste"]


def test_sem_login_e_sem_sessao_valida_e_401():
    _, repo, h = novo()
    for corpo in ({"mensagem": "Oi"}, {"mensagem": "Oi", "sessao": "../x"}, {"mensagem": "Oi", "sessao": 7}):
        assert h(evento(corpo))["statusCode"] == 401
    assert repo.itens == {}


def test_valida_o_corpo_com_400():
    _, _, h = novo()
    for corpo in ("não é json", None, "[]", {}, {"mensagem": ""}, {"mensagem": "   "}, {"mensagem": 5}, {"mensagem": "x" * 2001}):
        assert h(evento(corpo, sub=SUB_A))["statusCode"] == 400, corpo


def test_options_responde_para_o_cors():
    _, _, h = novo()
    r = h(evento(None, metodo="OPTIONS"))
    assert r["statusCode"] == 200 and r["headers"]["Access-Control-Allow-Origin"] == "*"
    assert "Authorization" in r["headers"]["Access-Control-Allow-Headers"]
    assert "POST" in r["headers"]["Access-Control-Allow-Methods"]


def test_falha_do_modelo_vira_502_sem_vazar_detalhes_e_sem_gravar():
    class Quebrado(ModeloFalso):
        async def stream(self, *a, **k):
            raise RuntimeError("chave AQ.segredo recusada")
            yield  # pragma: no cover

    repo = RepositorioMemoria()
    h = criar_handler(repo, lambda msgs, m, ctx: montar_agente(Quebrado(), msgs))
    r = h(evento({"mensagem": "Oi"}, sub=SUB_A))
    assert r["statusCode"] == 502
    assert "segredo" not in r["body"]
    assert repo.itens == {}


class Quebrado(ModeloFalso):
    async def stream(self, *a, **k):
        raise RuntimeError("503 Service Unavailable")
        yield  # pragma: no cover


def com_modelos(modelos, **por_modelo):
    """Handler que usa, para cada nome de modelo, o modelo falso combinado em `por_modelo`."""
    repo = RepositorioMemoria()
    return repo, criar_handler(repo, lambda msgs, m, ctx: montar_agente(por_modelo[m], msgs), modelos)


def test_se_o_primeiro_modelo_falha_usa_o_proximo_sem_deixar_rastro():
    ok = ModeloFalso(texto("Resposta do segundo."))
    repo, h = com_modelos(("a", "b"), a=Quebrado(), b=ok)
    r = h(evento({"mensagem": "Oi"}, sub=SUB_A))
    assert r["statusCode"] == 200 and corpo_de(r)["resposta"] == "Resposta do segundo."
    # só a conversa que deu certo foi gravada (a tentativa que falhou não deixou nada)
    assert textos(repo.itens[f"usuario-{SUB_A}"]) == ["Oi", "Resposta do segundo."]


def test_todos_os_modelos_falhando_da_502_e_nao_grava():
    repo, h = com_modelos(("a", "b"), a=Quebrado(), b=Quebrado())
    r = h(evento({"mensagem": "Oi"}, sub=SUB_A))
    assert r["statusCode"] == 502 and "503" not in r["body"]
    assert repo.itens == {}


def test_sem_tempo_nao_tenta_outro_modelo(monkeypatch):
    monkeypatch.setattr(lambda_chat, "ORCAMENTO_S", -1)
    ok = ModeloFalso(texto("não deveria ser usado"))
    repo, h = com_modelos(("a", "b"), a=Quebrado(), b=ok)
    assert h(evento({"mensagem": "Oi"}, sub=SUB_A))["statusCode"] == 502
    assert ok.chamadas == []


class ClienteDynamoFalso:
    def __init__(self):
        self.itens = {}

    def get_item(self, TableName, Key):
        item = self.itens.get((TableName, Key["sessaoId"]["S"]))
        return {"Item": item} if item else {}

    def put_item(self, TableName, Item):
        self.itens[(TableName, Item["sessaoId"]["S"])] = Item


def test_repositorio_dynamo_guarda_e_le_o_historico():
    cliente = ClienteDynamoFalso()
    repo = RepositorioDynamo("tabela-x", cliente)
    assert repo.ler("s1") == []
    historico = [{"role": "user", "content": [{"text": "Olá, está tudo bem?"}]}]
    repo.guardar("s1", historico)
    assert repo.ler("s1") == historico
    item = cliente.itens[("tabela-x", "s1")]
    assert item["expira"]["N"].isdigit()  # TTL em segundos
    assert "Olá" in item["mensagens"]["S"]  # sem á: acentos preservados


PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
)
JPEG = b"\xff\xd8\xff\xe0" + bytes(60)


def anexo_de(dados: bytes) -> dict:
    return {"dados": base64.b64encode(dados).decode()}


class ArmazenamentoFalso:
    """Guarda em memória o que a Lambda mandaria para o S3 e para a tabela do perfil."""

    def __init__(self, idade_s=0):
        self.anexos = {}
        self.fotos = []
        self.idade_s = idade_s

    def guardar_anexo(self, sub, corpo, tipo):
        self.anexos[sub] = (corpo, tipo)

    def ler_anexo(self, sub):
        if sub not in self.anexos:
            return None
        corpo, tipo = self.anexos[sub]
        return Anexo(corpo, tipo, self.idade_s)

    def aplicar_foto(self, sub, corpo, tipo, email, nome):
        self.fotos.append((sub, corpo, tipo, email, nome))


def com_foto(*respostas, armazenamento=None):
    """Handler com a ferramenta de trocar foto ligada ao usuário de cada chamada."""
    modelo = ModeloFalso(*respostas)
    repo = RepositorioMemoria()
    arm = armazenamento or ArmazenamentoFalso()
    capturado = []

    def fabricar(msgs, m, ctx):
        capturado.append(ctx)
        return montar_agente(modelo, msgs, ferramentas=[criar_ferramenta_foto(ctx, arm)])

    return modelo, repo, arm, capturado, criar_handler(repo, fabricar, armazenamento=arm)


def test_anexo_vai_para_o_armazenamento_e_o_agente_so_recebe_o_aviso():
    modelo, repo, arm, _, h = com_foto(texto("Quer trocar sua foto?"))
    r = h(evento({"mensagem": "olha essa imagem", "anexo": anexo_de(PNG)}, sub=SUB_A))
    assert r["statusCode"] == 200 and corpo_de(r)["acoes"] == []
    assert arm.anexos[SUB_A] == (PNG, "image/png")
    enviado = textos(modelo.chamadas[0])[0]
    assert enviado.startswith("olha essa imagem") and "[Imagem anexada: image/png, 1 KB]" in enviado
    assert base64.b64encode(PNG).decode() not in json.dumps(modelo.chamadas[0])  # os bytes não vão para o modelo


def test_agente_troca_a_foto_pelo_anexo_quando_o_usuario_pede():
    modelo, repo, arm, _, h = com_foto(usa_ferramenta("trocar_foto_perfil"), texto("Pronto, foto trocada!"))
    r = h(evento({"mensagem": "troque minha foto de perfil", "anexo": anexo_de(JPEG)}, sub=SUB_A))
    assert r["statusCode"] == 200
    assert corpo_de(r) == {"resposta": "Pronto, foto trocada!", "acoes": ["foto_atualizada"]}
    assert arm.fotos == [(SUB_A, JPEG, "image/jpeg", "x@y.com", "Pedro")]


def test_foto_pode_ser_pedida_numa_mensagem_depois_do_anexo():
    modelo, repo, arm, _, h = com_foto(texto("Quer trocar a foto?"), usa_ferramenta("trocar_foto_perfil"), texto("Feito!"))
    h(evento({"mensagem": "essa aqui", "anexo": anexo_de(PNG)}, sub=SUB_A))
    r = h(evento({"mensagem": "sim, troque"}, sub=SUB_A))
    assert corpo_de(r)["acoes"] == ["foto_atualizada"]
    assert arm.fotos[0][1] == PNG


def test_sem_imagem_recente_a_ferramenta_nao_troca_nada():
    _, _, arm, _, h = com_foto(usa_ferramenta("trocar_foto_perfil"), texto("Anexe uma imagem."))
    r = h(evento({"mensagem": "troque minha foto"}, sub=SUB_A))
    assert corpo_de(r)["acoes"] == [] and arm.fotos == []

    velho = ArmazenamentoFalso(idade_s=7200)  # anexada há 2 h
    velho.anexos[SUB_A] = (PNG, "image/png")
    _, _, _, _, h = com_foto(usa_ferramenta("trocar_foto_perfil"), texto("Anexe de novo."), armazenamento=velho)
    r = h(evento({"mensagem": "troque minha foto"}, sub=SUB_A))
    assert corpo_de(r)["acoes"] == [] and velho.fotos == []


def test_so_o_anexo_basta_e_vira_uma_mensagem_padrao():
    modelo, _, _, _, h = com_foto(texto("Recebi a imagem."))
    r = h(evento({"anexo": anexo_de(PNG)}, sub=SUB_A))
    assert r["statusCode"] == 200
    assert textos(modelo.chamadas[0])[0].startswith("Anexei uma imagem.")


def test_anexo_invalido_e_recusado(monkeypatch):
    _, _, arm, _, h = com_foto()
    casos = [
        ({"mensagem": "x", "anexo": "texto"}, 400),
        ({"mensagem": "x", "anexo": {"dados": "***"}}, 400),
        ({"mensagem": "x", "anexo": {"dados": ""}}, 400),
        ({"mensagem": "x", "anexo": anexo_de(b"isto nao e uma imagem")}, 415),
        ({"mensagem": "x", "anexo": anexo_de(b"<svg/>")}, 415),
    ]
    for corpo, status in casos:
        assert h(evento(corpo, sub=SUB_A))["statusCode"] == status, corpo
    monkeypatch.setattr(lambda_chat, "LIMITE_ANEXO", 10)
    assert h(evento({"mensagem": "x", "anexo": anexo_de(PNG)}, sub=SUB_A))["statusCode"] == 413
    assert arm.anexos == {}


def test_anexo_exige_login():
    _, _, arm, _, h = com_foto()
    r = h(evento({"mensagem": "x", "sessao": "teste", "anexo": anexo_de(PNG)}))
    assert r["statusCode"] == 400 and arm.anexos == {}


def test_o_agente_recebe_perfil_e_tela_do_token_e_da_pagina():
    _, _, _, capturado, h = com_foto(texto("ok"), texto("ok"), texto("ok"))
    h(evento({"mensagem": "oi", "pagina": "/aluno/perfil"}, sub=SUB_A, grupos="[Aluno]"))
    h(evento({"mensagem": "oi"}, sub=SUB_A, grupos="Administrador"))
    h(evento({"mensagem": "oi"}, sub=SUB_A, grupos="[inventado]"))
    assert [(c.perfil, c.tela) for c in capturado] == [("Aluno", "/aluno/perfil"), ("Administrador", None), (None, None)]
    assert capturado[0].sub == SUB_A and capturado[0].email == "x@y.com" and capturado[0].nome == "Pedro"


def test_o_token_do_cabecalho_chega_ao_agente_so_para_quem_esta_logado():
    _, _, _, capturado, h = com_foto(texto("ok"), texto("ok"), texto("ok"))
    logado = evento({"mensagem": "oi"}, sub=SUB_A)
    logado["headers"] = {"authorization": "Bearer meu.id.token"}
    h(logado)
    cru = evento({"mensagem": "oi"}, sub=SUB_A)
    cru["headers"] = {"Authorization": "outro.token"}  # o API Gateway aceita o token sem "Bearer"
    h(cru)
    de_teste = evento({"mensagem": "oi", "sessao": "console"})
    de_teste["headers"] = {"Authorization": "nao-deve-valer"}
    h(de_teste)
    assert [c.token for c in capturado] == ["meu.id.token", "outro.token", None]


def test_get_devolve_a_conversa_guardada_sem_chamadas_de_ferramenta():
    modelo, repo, arm, _, h = com_foto(
        usa_ferramenta("trocar_foto_perfil"), texto("Foto trocada!"), texto("De nada!")
    )
    h(evento({"mensagem": "troque minha foto", "anexo": anexo_de(PNG)}, sub=SUB_A))
    h(evento({"mensagem": "obrigado"}, sub=SUB_A))
    r = h(evento(None, sub=SUB_A, metodo="GET"))
    assert r["statusCode"] == 200
    assert corpo_de(r)["mensagens"] == [
        {"autor": "usuario", "texto": "troque minha foto\n📎 Imagem anexada"},
        {"autor": "assistente", "texto": "Foto trocada!"},
        {"autor": "usuario", "texto": "obrigado"},
        {"autor": "assistente", "texto": "De nada!"},
    ]


def test_get_de_quem_nunca_conversou_vem_vazio_e_sem_login_e_401():
    _, _, h = novo()
    assert corpo_de(h(evento(None, sub=SUB_A, metodo="GET"))) == {"mensagens": []}
    assert h(evento(None, metodo="GET"))["statusCode"] == 401
    assert h(evento(None, metodo="GET", query={"sessao": "../x"}))["statusCode"] == 401
    assert h(evento(None, metodo="GET", query={"sessao": "meu-teste"}))["statusCode"] == 200


def test_delete_apaga_so_a_conversa_de_quem_pediu():
    _, repo, h = novo(texto("a"), texto("b"))
    h(evento({"mensagem": "oi"}, sub=SUB_A))
    h(evento({"mensagem": "oi"}, sub=SUB_B))
    assert corpo_de(h(evento(None, sub=SUB_A, metodo="DELETE"))) == {"ok": True}
    assert list(repo.itens) == [f"usuario-{SUB_B}"]
    assert h(evento(None, metodo="DELETE"))["statusCode"] == 401


def test_metodo_nao_previsto_e_405():
    _, _, h = novo()
    assert h(evento({}, sub=SUB_A, metodo="PUT"))["statusCode"] == 405


class S3Falso:
    exceptions = types.SimpleNamespace(NoSuchKey=KeyError)

    def __init__(self):
        self.objetos = {}
        self.apagados = []

    def put_object(self, Bucket, Key, Body, ContentType, **resto):
        self.objetos[Key] = (Body, ContentType)

    def get_object(self, Bucket, Key):
        from datetime import datetime, timezone

        if Key not in self.objetos:
            raise KeyError(Key)
        corpo, tipo = self.objetos[Key]
        return {
            "Body": types.SimpleNamespace(read=lambda: corpo),
            "ContentType": tipo,
            "LastModified": datetime.now(timezone.utc),
        }

    def delete_object(self, Bucket, Key):
        self.apagados.append(Key)
        self.objetos.pop(Key, None)


class DynamoFalso:
    def __init__(self, item=None):
        self.item = item or {}
        self.atualizacoes = []

    def get_item(self, TableName, Key):
        return {"Item": self.item} if self.item else {}

    def update_item(self, **parametros):
        self.atualizacoes.append(parametros)


def test_armazenamento_guarda_o_anexo_e_aplica_a_foto_no_s3_e_na_tabela():
    s3, dynamo = S3Falso(), DynamoFalso({"userId": {"S": SUB_A}, "fotoKey": {"S": f"profile/{SUB_A}.png"}})
    arm = ArmazenamentoPerfil("bucket-x", "tabela-x", s3=s3, dynamo=dynamo)
    assert arm.ler_anexo(SUB_A) is None
    arm.guardar_anexo(SUB_A, JPEG, "image/jpeg")
    anexo = arm.ler_anexo(SUB_A)
    assert anexo.corpo == JPEG and anexo.tipo == "image/jpeg" and anexo.idade_s < 60

    chave = arm.aplicar_foto(SUB_A, anexo.corpo, anexo.tipo, "x@y.com", "Pedro")
    assert chave == f"profile/{SUB_A}.jpg" and s3.objetos[chave][0] == JPEG
    assert s3.apagados == [f"profile/{SUB_A}.png"]  # a foto antiga, de outro formato, sai do S3
    atualizacao = dynamo.atualizacoes[0]
    assert atualizacao["Key"] == {"userId": {"S": SUB_A}}
    assert atualizacao["ExpressionAttributeValues"][":k"] == {"S": chave}
    assert "if_not_exists(email" in atualizacao["UpdateExpression"]  # não sobrescreve nome e e-mail já gravados


def test_lambda_expoe_o_handler_esperado():
    assert callable(lambda_chat.handler)
