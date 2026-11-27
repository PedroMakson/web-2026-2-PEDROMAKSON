"""Agente de IA do GymFlow feito com o Strands Agents.

- Modelo: Google Gemini (chave em GEMINI_API_KEY; modelo em GEMINI_MODEL).
- Ferramenta: ``hora_certa_brasil`` (NTP.br), para o agente nunca "adivinhar" a hora.
- Memória: o Strands guarda o histórico da conversa na sessão; com um gerenciador de sessão ele
  é salvo e recarregado, então o agente lembra das mensagens anteriores mesmo depois de reiniciar.
"""

from __future__ import annotations

import os
from pathlib import Path

from strands import Agent, tool
from strands.models import Model
from strands.session.file_session_manager import FileSessionManager

from hora_certa import FUSOS, descrever, obter_hora

# Mesmos modelos do chat do GymFlow. O flash-lite vai primeiro porque o gemini-3.5-flash devolveu 429 (cota) e
# 503/504 (sobrecarga) com frequência; se um modelo falhar, a Lambda tenta o próximo.
MODELOS_PADRAO = ["gemini-3.5-flash-lite", "gemini-3.5-flash", "gemini-3.7-flash", "gemini-3.1-flash-lite"]

PROMPT = """Você é o assistente de IA do GymFlow, um sistema de gestão de academia.
Responda sempre em português do Brasil, de forma curta e amigável.

Regras:
- Para qualquer pergunta sobre a hora, a data ou o dia da semana, use SEMPRE a ferramenta
  hora_certa_brasil. Nunca responda a hora de cabeça: ela vem do NTP.br e é a hora correta do Brasil.
  Se a ferramenta avisar que usou o relógio do sistema, diga isso ao usuário.
- Lembre-se do que o usuário disse antes nesta conversa (nome, preferências, perguntas anteriores)
  e use essas informações quando ajudarem.
"""


# Endereço que responde a hora certa do NTP.br (o do relógio https://relogio.ntp.br/horacerta/glight.php):
# o corpo vem como "HH:MM:SS#epoch" já na hora de Brasília (zone=-3).
URL_HORA = "https://relogio.ntp.br/horacerta/s.php?zone=-3"

# Prompt da versão da Lambda: em vez da ferramenta própria, o agente usa a ferramenta http_request do Strands
# e recebe aqui a URL da hora atual.
PROMPT_HTTP = f"""Você é o assistente de IA do GymFlow, um sistema de gestão de academia.
Responda sempre em português do Brasil, de forma curta e amigável.

Regras:
- Para qualquer pergunta sobre a hora, a data ou o dia da semana, use SEMPRE a ferramenta http_request
  com method GET e url {URL_HORA} . Nunca responda a hora de cabeça. Esse endereço é o do relógio oficial
  do NTP.br (https://relogio.ntp.br/horacerta/glight.php).
  O corpo da resposta tem o formato HH:MM:SS#número: a hora de Brasília é a parte antes do #.
  O cabeçalho "date" vem em GMT, 3 horas à frente de Brasília: se a hora de Brasília for maior que a hora
  do cabeçalho, a data em Brasília é a do dia anterior ao do cabeçalho.
  Para outros fusos, troque zone=-3 na url por -2 (Fernando de Noronha), -4 (Amazonas) ou -5 (Acre).
- Se a requisição falhar, diga que não conseguiu consultar o NTP.br e não invente a hora.
- Lembre-se do que o usuário disse antes nesta conversa (nome, preferências, perguntas anteriores)
  e use essas informações quando ajudarem.
"""


@tool
def hora_certa_brasil(fuso: str = "brasilia") -> str:
    """Informa a hora, a data e o dia da semana corretos do Brasil, consultando o NTP.br.

    Args:
        fuso: fuso horário do Brasil. Um de: brasilia (padrão), noronha, amazonas ou acre.
    """
    try:
        return descrever(obter_hora(fuso))
    except ValueError as erro:
        return f"Não foi possível informar a hora: {erro}"


def modelos_configurados() -> list[str]:
    """Modelos em ordem de preferência: GEMINI_MODELS (lista separada por vírgula), GEMINI_MODEL ou o padrão."""
    texto = os.environ.get("GEMINI_MODELS") or os.environ.get("GEMINI_MODEL") or ",".join(MODELOS_PADRAO)
    return [m.strip() for m in texto.split(",") if m.strip()]


def criar_modelo(modelo_id: str | None = None, timeout_ms: int | None = None) -> Model:
    """Gemini, com a chave vinda do ambiente (nunca escrita no código).

    ``timeout_ms`` limita cada chamada HTTP: um 503 do Gemini costuma demorar para chegar, e atrás do
    API Gateway (29 s) não dá para esperar.
    """
    from strands.models.gemini import GeminiModel

    chave = os.environ.get("GEMINI_API_KEY")
    if not chave:
        raise RuntimeError("Defina a variável de ambiente GEMINI_API_KEY com a chave do Google AI Studio.")
    cliente = {"api_key": chave}
    if timeout_ms:
        cliente["http_options"] = {"timeout": timeout_ms}
    return GeminiModel(
        client_args=cliente,
        model_id=modelo_id or modelos_configurados()[0],
        params={"temperature": 0.3},
    )


def config_http() -> dict:
    """Ferramenta http_request do Strands e o prompt com a URL da hora atual (usados pela Lambda do /chat)."""
    from strands.vended_tools import http_request

    return {"ferramentas": [http_request], "prompt": PROMPT_HTTP}


# Nome de cada tela do app (a rota que o balão informa -> "menu > tela"), para o agente entender "esta tela".
TELAS = {
    "/aluno": "Aluno > Início",
    "/aluno/treino": "Aluno > Meu treino",
    "/aluno/frequencia": "Aluno > Frequência",
    "/aluno/avaliacoes": "Aluno > Avaliações físicas",
    "/aluno/financeiro": "Aluno > Financeiro",
    "/aluno/perfil": "Aluno > Meu perfil",
    "/instrutor": "Instrutor > Início",
    "/instrutor/alunos": "Instrutor > Meus alunos",
    "/instrutor/perfil": "Instrutor > Meu perfil",
    "/recepcao": "Recepção > Início",
    "/recepcao/alunos": "Recepção > Alunos",
    "/recepcao/matricula": "Recepção > Matrícula",
    "/recepcao/checkin": "Recepção > Check-in manual",
    "/recepcao/pagamentos": "Recepção > Pagamentos",
    "/recepcao/perfil": "Recepção > Meu perfil",
    "/admin": "Administrador > Indicadores",
    "/admin/usuarios": "Administrador > Usuários e perfis",
    "/admin/planos": "Administrador > Planos",
    "/admin/relatorios": "Administrador > Relatórios",
    "/admin/alunos": "Administrador > Alunos e matrículas",
    "/admin/checkin": "Administrador > Check-in manual",
    "/admin/pagamentos": "Administrador > Pagamentos",
    "/admin/treinos": "Administrador > Treinos e avaliações",
    "/admin/perfil": "Administrador > Meu perfil",
}

PERFIS = {"Aluno", "Instrutor", "Recepcionista", "Administrador"}

# Regras que o chat antigo já seguia (backend/chat.mjs), ajustadas: agora o agente também age (troca a foto).
REGRAS_SISTEMA = """- Formato: pode usar **negrito** e listas com "*"; não use títulos, tabelas nem blocos de código. Indique caminhos
  no formato "menu > tela" e use exatamente os nomes de menus, telas e botões da base de conhecimento.
- Sobre o uso do sistema, baseie-se somente na base de conhecimento abaixo. Se a informação não estiver nela, diga que
  não tem essa informação e sugira procurar a recepção ou a administração. Nunca invente telas, botões, regras ou valores.
- Responda para o perfil de quem pergunta e não pergunte o perfil quando ele estiver informado. Se a pergunta for sobre
  uma função de outro perfil, explique que ela é daquele perfil, que o usuário não tem acesso a ela e quem pode ajudar.
- Quando o usuário disser "essa tela", "aqui" ou "isso", considere a tela atual e a conversa anterior.
- Dados do próprio usuário (plano, matrícula, mensalidade e parcelas, frequência, treino, avaliações; para instrutor, recepção
  e administração, os alunos e as pendências): use a ferramenta consultar_meus_dados antes de responder e responda com o que
  ela devolver. Ela só traz o que o perfil de quem pergunta pode ver. Se ela falhar, diga que não conseguiu consultar agora.
  Nunca invente valores, datas ou nomes e não mande o usuário fazer o que os dados mostram que já está feito (por exemplo,
  não mande pagar uma mensalidade que já está paga).
- Foto de perfil: o usuário pode anexar uma imagem no chat (o clipe ao lado do campo de texto). A mensagem então termina
  com "[Imagem anexada: ...]". Se ele pedir para trocar a foto de perfil e houver imagem anexada, use a ferramenta
  trocar_foto_perfil e confirme o resultado. Se ele anexar uma imagem sem dizer o que quer, pergunte se é para trocar a foto
  de perfil. Nunca troque a foto sem o usuário pedir.
- Você orienta sobre o sistema, informa a hora e troca a foto de perfil de quem pede. Não executa outras ações nem vê
  dados de outras pessoas. Se a pergunta não tiver relação com a academia ou com o sistema, diga educadamente que só ajuda
  com o GymFlow (a hora certa e a conversa em si estão dentro desse escopo)."""


def carregar_conhecimento() -> str:
    """Base de conhecimento do sistema (gerada de backend/conhecimento.mjs pelo empacotar.py); vazia se não existir."""
    arquivo = Path(__file__).with_name("conhecimento.txt")
    return arquivo.read_text(encoding="utf-8") if arquivo.exists() else ""


def montar_prompt_chat(conhecimento: str, perfil: str | None, pagina: str | None) -> str:
    """Prompt do chat do app: a hora pelo http_request, as regras do sistema, o conhecimento e quem está perguntando."""
    partes = [PROMPT_HTTP.rstrip(), REGRAS_SISTEMA]
    if conhecimento.strip():
        partes.append("BASE DE CONHECIMENTO DO GYMFLOW:\n" + conhecimento.strip())
    tela = TELAS.get(pagina or "")
    atual = [f"perfil de acesso: {perfil}" if perfil in PERFIS else None, f"tela atual: {tela}" if tela else None]
    atual = [item for item in atual if item]
    if atual:
        partes.append("USUÁRIO QUE ESTÁ PERGUNTANDO (informado pelo sistema): " + "; ".join(atual) + ".")
    return "\n\n".join(partes)


def montar_agente(
    modelo: Model | None = None,
    mensagens: list | None = None,
    ferramentas: list | None = None,
    prompt: str | None = None,
    **extras,
) -> Agent:
    """Agente do GymFlow; ``mensagens`` é o histórico a retomar. Sem ``ferramentas``/``prompt``, usa a
    ferramenta própria ``hora_certa_brasil``."""
    return Agent(
        model=modelo or criar_modelo(),
        system_prompt=prompt or PROMPT,
        tools=ferramentas or [hora_certa_brasil],
        messages=mensagens,
        callback_handler=None,  # a resposta é mostrada por quem chama
        **extras,
    )


def criar_agente(sessao: str, pasta: str = ".sessoes", modelo: Model | None = None) -> Agent:
    """Cria o agente ligado à sessão ``sessao`` (em disco): se ela já existe, o histórico volta junto."""
    return montar_agente(modelo, session_manager=FileSessionManager(session_id=sessao, storage_dir=pasta))


__all__ = ["FUSOS", "criar_agente", "criar_modelo", "hora_certa_brasil"]
