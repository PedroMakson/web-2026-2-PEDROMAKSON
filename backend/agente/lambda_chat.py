"""Lambda do recurso /chat (API REST do API Gateway): o agente Strands na AWS.

    POST   /chat   {"mensagem": "...", "pagina": "/aluno/perfil", "anexo": {"dados": "<base64>"}}
                   -> {"resposta": "...", "acoes": ["foto_atualizada"]}
    GET    /chat   -> {"mensagens": [{"autor": "usuario"|"assistente", "texto": "..."}]}   (a conversa guardada)
    DELETE /chat   -> {"ok": true}                                                          (nova conversa)

Cada chamada é independente (a Lambda não guarda estado), então a memória fica no DynamoDB: carrega o histórico da
sessão, roda o agente, salva o histórico de volta. A sessão é o `sub` do usuário do Cognito (authorizer do API Gateway),
então cada pessoa tem a sua memória e ninguém lê a conversa de outro; o perfil de acesso vem do mesmo token. Sem login
(teste no console do API Gateway, que ignora o authorizer) vale o campo/parâmetro `sessao`.

O anexo (imagem JPEG, PNG ou WebP de até 3 MB) vai para o S3 e o agente decide, pela conversa, se troca a foto de perfil.

Variáveis de ambiente: TABLE (tabela de sessões) e GEMINI_API_KEY (obrigatórias); GEMINI_MODELS, BUCKET (fotos),
PROFILE_TABLE (tabela do perfil) e ALLOWED_ORIGIN (opcionais; os padrões são os recursos do projeto e "*").
"""

from __future__ import annotations

import base64
import binascii
import copy
import json
import os
import re
import time
from typing import Callable

from ferramentas_chat import LIMITE_ANEXO, ContextoChat, detectar_tipo

MAX_MENSAGEM = 2000
TIMEOUT_MODELO_MS = 12_000  # por chamada ao Gemini; duas tentativas cabem nos 29 s do API Gateway
ORCAMENTO_S = 22  # depois disso não começa outra tentativa
JANELA = 20  # mensagens mantidas no histórico (o item do DynamoDB tem limite de 400 KB)
VALIDADE_DIAS = 30  # a tabela pode usar o atributo "expira" como TTL
SESSAO_VALIDA = re.compile(r"^[A-Za-z0-9_-]{1,64}$")
BASE64 = re.compile(r"^[A-Za-z0-9+/]+={0,2}$")
MARCA_ANEXO = re.compile(r"\n*\[Imagem anexada:[^\]]*\]")
PERFIS = ("Aluno", "Instrutor", "Recepcionista", "Administrador")


class RepositorioDynamo:
    """Guarda o histórico de cada sessão como texto JSON em um item do DynamoDB (chave `sessaoId`)."""

    def __init__(self, tabela: str, cliente=None):
        import boto3

        self.tabela = tabela
        self.cliente = cliente or boto3.client("dynamodb")

    def ler(self, sessao: str) -> list:
        r = self.cliente.get_item(TableName=self.tabela, Key={"sessaoId": {"S": sessao}})
        item = r.get("Item")
        return json.loads(item["mensagens"]["S"]) if item else []

    def guardar(self, sessao: str, mensagens: list) -> None:
        agora = int(time.time())
        self.cliente.put_item(
            TableName=self.tabela,
            Item={
                "sessaoId": {"S": sessao},
                "mensagens": {"S": json.dumps(mensagens, ensure_ascii=False)},
                "atualizadoEm": {"S": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(agora))},
                "expira": {"N": str(agora + VALIDADE_DIAS * 86400)},
            },
        )

    def apagar(self, sessao: str) -> None:
        self.cliente.delete_item(TableName=self.tabela, Key={"sessaoId": {"S": sessao}})


class ErroDeRequisicao(Exception):
    def __init__(self, status: int, mensagem: str):
        super().__init__(mensagem)
        self.status = status
        self.mensagem = mensagem


def _resposta(status: int, corpo: dict) -> dict:
    return {
        "statusCode": status,
        "headers": {
            "Content-Type": "application/json; charset=utf-8",
            "Access-Control-Allow-Origin": os.environ.get("ALLOWED_ORIGIN", "*"),
            "Access-Control-Allow-Headers": "Content-Type,Authorization",
            "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
        },
        "body": json.dumps(corpo, ensure_ascii=False),
    }


def _claims(evento: dict) -> dict:
    autorizador = (evento.get("requestContext") or {}).get("authorizer") or {}
    return autorizador.get("claims") or {}


def _perfil_do_token(claims: dict) -> str | None:
    """Grupo do Cognito do usuário (o API Gateway entrega a lista como texto, ex.: "[Aluno]")."""
    grupos = re.split(r"[\s,\[\]]+", str(claims.get("cognito:groups", "")))
    return next((g for g in grupos if g in PERFIS), None)


def _token_do_cabecalho(evento: dict) -> str | None:
    """O ID token que o app mandou em Authorization (já validado pelo authorizer); serve para chamar a API de dados."""
    cabecalhos = {str(k).lower(): v for k, v in (evento.get("headers") or {}).items()}
    bruto = cabecalhos.get("authorization")
    if not isinstance(bruto, str):
        return None
    token = bruto[7:] if bruto.lower().startswith("bearer ") else bruto
    return token.strip() or None


def _sub_do_token(claims: dict) -> str | None:
    sub = claims.get("sub")
    return sub if isinstance(sub, str) and SESSAO_VALIDA.match(sub) else None


def _sessao_do_evento(claims: dict, livre) -> str | None:
    """O `sub` do login vale mais que qualquer coisa vinda do cliente; sem login (teste), usa `sessao`."""
    sub = _sub_do_token(claims)
    if sub:
        return f"usuario-{sub}"
    if isinstance(livre, str) and SESSAO_VALIDA.match(livre):
        return f"teste-{livre}"
    return None


def _ler_anexo(anexo) -> tuple[bytes, str]:
    """Valida a imagem anexada (base64 em `dados`); o formato vem do conteúdo do arquivo, não do que o cliente diz."""
    dados = anexo.get("dados") if isinstance(anexo, dict) else None
    limpo = dados.replace("\n", "").replace("\r", "").strip() if isinstance(dados, str) else ""
    if not BASE64.match(limpo):
        raise ErroDeRequisicao(400, "Anexo inválido: envie a imagem em base64.")
    try:
        corpo = base64.b64decode(limpo, validate=True)
    except (binascii.Error, ValueError):
        raise ErroDeRequisicao(400, "Anexo inválido: envie a imagem em base64.") from None
    if len(corpo) > LIMITE_ANEXO:
        raise ErroDeRequisicao(413, f"Imagem muito grande: o limite é de {LIMITE_ANEXO // 1024 // 1024} MB.")
    tipo = detectar_tipo(corpo)
    if tipo is None:
        raise ErroDeRequisicao(415, "Formato não suportado: envie uma imagem JPEG, PNG ou WebP.")
    return corpo, tipo


def _texto_visivel(mensagens: list) -> list[dict]:
    """Só o que o usuário vê: falas dele e do assistente (sem as chamadas de ferramenta)."""
    saida = []
    for m in mensagens:
        if m.get("role") not in ("user", "assistant"):
            continue
        partes = [b["text"] for b in m.get("content", []) if isinstance(b, dict) and isinstance(b.get("text"), str)]
        texto = "\n".join(partes).strip()
        anexou = bool(MARCA_ANEXO.search(texto))
        texto = MARCA_ANEXO.sub("", texto).strip()
        if anexou:
            texto = (texto + "\n" if texto else "") + "📎 Imagem anexada"
        if texto:
            saida.append({"autor": "usuario" if m["role"] == "user" else "assistente", "texto": texto})
    return saida


def _registrar_tempos(t0: float, t1: float, t2: float, t3: float, resultado, modelo=None) -> None:
    """Uma linha no CloudWatch com o tempo de cada etapa, para achar o que deixa o /chat lento."""
    metricas = getattr(resultado, "metrics", None)  # o Gemini não informa latência: só contamos os ciclos
    print(
        "tempos /chat",
        json.dumps(
            {
                "modelo": modelo,
                "ler_ms": round((t1 - t0) * 1000),
                "agente_ms": round((t2 - t1) * 1000),
                "gravar_ms": round((t3 - t2) * 1000),
                "ciclos": getattr(metricas, "cycle_count", None),
            }
        ),
    )


def criar_handler(repositorio, criar_agente: Callable, modelos=(None,), armazenamento=None) -> Callable:
    """`criar_agente(mensagens, modelo, contexto)` devolve um agente Strands com o histórico dado.

    Se um modelo falhar (ex.: 503 de sobrecarga), tenta o próximo da lista, desde que ainda haja tempo.
    `armazenamento` guarda o anexo (S3); sem ele, anexos são recusados.
    """

    def conversa(evento: dict, claims: dict, corpo: dict) -> dict:
        mensagem = corpo.get("mensagem")
        anexo = corpo.get("anexo")
        if mensagem is None and anexo is not None:
            mensagem = "Anexei uma imagem."
        if not isinstance(mensagem, str) or not mensagem.strip():
            return _resposta(400, {"message": 'Envie a pergunta no campo "mensagem".'})
        if len(mensagem) > MAX_MENSAGEM:
            return _resposta(400, {"message": f"Mensagem muito longa (máximo {MAX_MENSAGEM} caracteres)."})

        sessao = _sessao_do_evento(claims, corpo.get("sessao"))
        if sessao is None:
            return _resposta(401, {"message": "Não autorizado."})

        contexto = ContextoChat(
            sub=_sub_do_token(claims),
            perfil=_perfil_do_token(claims),
            tela=corpo.get("pagina") if isinstance(corpo.get("pagina"), str) else None,
            email=claims.get("email"),
            nome=claims.get("name"),
            token=_token_do_cabecalho(evento) if _sub_do_token(claims) else None,
        )

        texto_agente = mensagem.strip()
        if anexo is not None:
            if armazenamento is None or contexto.sub is None:
                return _resposta(400, {"message": "Anexos exigem login."})
            imagem, tipo = _ler_anexo(anexo)
            texto_agente += f"\n\n[Imagem anexada: {tipo}, {max(1, len(imagem) // 1024)} KB]"

        t0 = time.perf_counter()
        try:
            historico = repositorio.ler(sessao)
            if anexo is not None:
                armazenamento.guardar_anexo(contexto.sub, imagem, tipo)
        except Exception as erro:
            print("erro em /chat (ler)", {"tipo": type(erro).__name__, "mensagem": str(erro)[:200]})
            return _resposta(502, {"message": "Não foi possível responder agora. Tente novamente."})
        t1 = time.perf_counter()

        for tentativa, modelo in enumerate(modelos):
            if tentativa and time.perf_counter() - t0 > ORCAMENTO_S:
                break
            contexto.acoes.clear()
            try:
                # cada tentativa parte do histórico original: uma tentativa que falhou não deixa rastro
                agente = criar_agente(copy.deepcopy(historico), modelo, contexto)
                resultado = agente(texto_agente)
                resposta = str(resultado).strip()
                t2 = time.perf_counter()
                repositorio.guardar(sessao, agente.messages)
            except Exception as erro:  # modelo sobrecarregado, cota, DynamoDB... sem vazar detalhes
                print("erro em /chat", {"modelo": modelo, "tipo": type(erro).__name__, "mensagem": str(erro)[:200]})
                continue
            _registrar_tempos(t0, t1, t2, time.perf_counter(), resultado, modelo)
            return _resposta(200, {"resposta": resposta, "acoes": list(contexto.acoes)})
        return _resposta(502, {"message": "Não foi possível responder agora. Tente novamente."})

    def handler(evento, contexto=None):
        metodo = evento.get("httpMethod")
        if metodo == "OPTIONS":
            return _resposta(200, {})
        if metodo not in ("GET", "POST", "DELETE"):
            return _resposta(405, {"message": "Método não permitido."})

        claims = _claims(evento)
        if metodo in ("GET", "DELETE"):
            sessao = _sessao_do_evento(claims, (evento.get("queryStringParameters") or {}).get("sessao"))
            if sessao is None:
                return _resposta(401, {"message": "Não autorizado."})
            try:
                if metodo == "DELETE":
                    repositorio.apagar(sessao)
                    return _resposta(200, {"ok": True})
                return _resposta(200, {"mensagens": _texto_visivel(repositorio.ler(sessao))})
            except Exception as erro:
                print("erro em /chat", {"metodo": metodo, "tipo": type(erro).__name__, "mensagem": str(erro)[:200]})
                return _resposta(502, {"message": "Não foi possível acessar a conversa agora."})

        try:
            corpo = json.loads(evento.get("body") or "")
        except ValueError:
            return _resposta(400, {"message": "Corpo inválido: envie um JSON."})
        if not isinstance(corpo, dict):
            return _resposta(400, {"message": "Corpo inválido: envie um JSON."})
        try:
            return conversa(evento, claims, corpo)
        except ErroDeRequisicao as erro:
            return _resposta(erro.status, {"message": erro.mensagem})

    return handler


_padrao = None


def handler(evento, contexto=None):
    """Ponto de entrada da Lambda (Handler: lambda_chat.handler)."""
    global _padrao
    if _padrao is None:
        import logging

        # no CloudWatch aparecem as retentativas do Strands e o status HTTP de cada chamada ao Gemini
        logging.getLogger().setLevel(os.environ.get("LOG_LEVEL", "INFO"))

        from strands import ModelRetryStrategy
        from strands.agent.conversation_manager import SlidingWindowConversationManager
        from strands.vended_tools import http_request

        from agente import carregar_conhecimento, criar_modelo, modelos_configurados, montar_agente, montar_prompt_chat
        from ferramentas_chat import ArmazenamentoPerfil, criar_ferramenta_dados, criar_ferramenta_foto

        armazenamento = ArmazenamentoPerfil(
            os.environ.get("BUCKET", "pedromaksonfontesdacosta-profile-2026.2"),
            os.environ.get("PROFILE_TABLE", "pedromaksonfontesdacosta-message-2026.2"),
        )
        conhecimento = carregar_conhecimento()

        def fabricar(mensagens, modelo, contexto_chat):
            return montar_agente(
                criar_modelo(modelo, TIMEOUT_MODELO_MS),
                mensagens,
                # http_request: a hora pela URL do NTP.br; consultar_meus_dados: os dados do usuário pela API de dados;
                # trocar_foto_perfil: troca a foto pelo anexo do chat
                ferramentas=[
                    http_request,
                    criar_ferramenta_dados(contexto_chat),
                    criar_ferramenta_foto(contexto_chat, armazenamento),
                ],
                prompt=montar_prompt_chat(conhecimento, contexto_chat.perfil, contexto_chat.tela),
                conversation_manager=SlidingWindowConversationManager(window_size=JANELA),
                # sem as pausas longas do padrão: se o modelo falhar, a Lambda troca de modelo
                retry_strategy=ModelRetryStrategy(max_attempts=1),
            )

        _padrao = criar_handler(
            RepositorioDynamo(os.environ["TABLE"]), fabricar, modelos_configurados(), armazenamento
        )
    return _padrao(evento, contexto)
