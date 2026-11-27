"""Ferramentas do chat do app que mexem no perfil do usuário (hoje: trocar a foto de perfil).

A imagem anexada no chat não entra no texto que o modelo lê: a Lambda a guarda no S3 (`chat-uploads/<sub>/ultimo`)
e o modelo só decide se chama `trocar_foto_perfil`, que copia essa imagem para `profile/<sub>.<ext>` e atualiza o item
do usuário na tabela `message` (a mesma foto e a mesma tabela do "Meu perfil").
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from datetime import datetime, timezone

from strands import tool

from dados_usuario import buscar_dados, resumir

LIMITE_ANEXO = 3 * 1024 * 1024  # mesmo limite da foto do perfil
VALIDADE_ANEXO_S = 3600  # uma imagem anexada há mais de 1 h não é usada
EXTENSAO = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}


def detectar_tipo(dados: bytes) -> str | None:
    """Identifica JPEG, PNG ou WebP pelo conteúdo do arquivo (e não pelo que o cliente diz)."""
    if dados[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if dados[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    if len(dados) >= 12 and dados[:4] == b"RIFF" and dados[8:12] == b"WEBP":
        return "image/webp"
    return None


@dataclass
class ContextoChat:
    """Quem está falando com o agente nesta chamada e o que ele fez (para a Lambda avisar o app)."""

    sub: str | None = None
    perfil: str | None = None
    tela: str | None = None
    email: str | None = None
    nome: str | None = None
    token: str | None = None  # o ID token do usuário, para consultar a API de dados em nome dele
    acoes: list[str] = field(default_factory=list)


@dataclass
class Anexo:
    corpo: bytes
    tipo: str
    idade_s: float


class ArmazenamentoPerfil:
    """S3 (foto e anexo do chat) e DynamoDB (item do usuário na tabela `message`)."""

    def __init__(self, bucket: str, tabela: str, s3=None, dynamo=None):
        import boto3
        from botocore.config import Config

        self.bucket = bucket
        self.tabela = tabela
        # o nome do bucket tem ponto (…-2026.2): sem path-style o certificado HTTPS do S3 não combina
        self.s3 = s3 or boto3.client("s3", config=Config(s3={"addressing_style": "path"}))
        self.dynamo = dynamo or boto3.client("dynamodb")

    def guardar_anexo(self, sub: str, corpo: bytes, tipo: str) -> None:
        self.s3.put_object(Bucket=self.bucket, Key=f"chat-uploads/{sub}/ultimo", Body=corpo, ContentType=tipo)

    def ler_anexo(self, sub: str) -> Anexo | None:
        try:
            r = self.s3.get_object(Bucket=self.bucket, Key=f"chat-uploads/{sub}/ultimo")
        except self.s3.exceptions.NoSuchKey:
            return None
        idade = (datetime.now(timezone.utc) - r["LastModified"]).total_seconds()
        return Anexo(r["Body"].read(), r.get("ContentType", "image/jpeg"), idade)

    def aplicar_foto(self, sub: str, corpo: bytes, tipo: str, email: str | None, nome: str | None) -> str:
        chave = f"profile/{sub}.{EXTENSAO[tipo]}"
        atual = self.dynamo.get_item(TableName=self.tabela, Key={"userId": {"S": sub}}).get("Item", {})
        antiga = atual.get("fotoKey", {}).get("S")

        self.s3.put_object(
            Bucket=self.bucket, Key=chave, Body=corpo, ContentType=tipo, CacheControl="private, no-cache"
        )
        if antiga and antiga != chave:
            self.s3.delete_object(Bucket=self.bucket, Key=antiga)

        agora = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        self.dynamo.update_item(
            TableName=self.tabela,
            Key={"userId": {"S": sub}},
            UpdateExpression=(
                "SET fotoKey = :k, fotoAtualizadaEm = :t, atualizadoEm = :t, "
                "email = if_not_exists(email, :e), nome = if_not_exists(nome, :n)"
            ),
            ExpressionAttributeValues={
                ":k": {"S": chave},
                ":t": {"S": agora},
                ":e": {"S": email or ""},
                ":n": {"S": nome or ""},
            },
        )
        return chave


def criar_ferramenta_dados(contexto: ContextoChat, consultar=buscar_dados):
    """A ferramenta `consultar_meus_dados`: a API de dados do app, chamada com o token de quem está perguntando."""

    @tool
    def consultar_meus_dados() -> str:
        """Consulta no sistema os dados de quem está perguntando.

        Para o aluno: plano, matrícula, mensalidade e parcelas em aberto, frequência, treino e avaliações. Para o
        instrutor: os alunos dele. Para a recepção e a administração: alunos, parcelas em aberto e atrasadas, acessos
        bloqueados. Use antes de responder perguntas sobre os dados do próprio usuário (ex.: "qual é o meu plano?",
        "tenho parcela em aberto?", "quantos check-ins fiz?", "quais alunos estão atrasados?").
        """
        if not contexto.token:
            return "Não foi possível consultar os dados: o usuário não está identificado."
        try:
            return resumir(consultar(contexto.token))
        except Exception as erro:  # API fora do ar, token vencido... sem vazar detalhes para o modelo
            print("erro ao consultar os dados do usuário", {"tipo": type(erro).__name__, "mensagem": str(erro)[:200]})
            return "Não foi possível consultar os dados agora."

    return consultar_meus_dados


def criar_ferramenta_foto(contexto: ContextoChat, armazenamento):
    """A ferramenta `trocar_foto_perfil` já ligada ao usuário desta chamada."""

    @tool
    def trocar_foto_perfil() -> str:
        """Troca a foto de perfil do usuário pela última imagem que ele anexou no chat.

        Use somente quando o usuário pedir para trocar a foto de perfil e tiver anexado uma imagem.
        """
        if not contexto.sub:
            return "Não foi possível trocar a foto: o usuário não está identificado."
        anexo = armazenamento.ler_anexo(contexto.sub)
        if anexo is None or anexo.idade_s > VALIDADE_ANEXO_S:
            return "Não há imagem anexada recentemente. Peça ao usuário para anexar a imagem pelo clipe do chat."
        armazenamento.aplicar_foto(contexto.sub, anexo.corpo, anexo.tipo, contexto.email, contexto.nome)
        contexto.acoes.append("foto_atualizada")
        return "Foto de perfil atualizada com a imagem anexada."

    return trocar_foto_perfil
