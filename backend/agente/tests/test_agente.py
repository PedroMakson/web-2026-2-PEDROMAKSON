"""Testa o agente sem chamar o Gemini: um modelo falso devolve respostas combinadas e registra o que recebeu."""

import copy
import json
from datetime import datetime, timezone

import agente as modulo
from strands.models import Model

from hora_certa import HoraCerta

EVENTOS_FINAIS = {"metadata": {"usage": {"inputTokens": 1, "outputTokens": 1, "totalTokens": 2}, "metrics": {"latencyMs": 1}}}


def texto(t):
    return [
        {"messageStart": {"role": "assistant"}},
        {"contentBlockStart": {"start": {}}},
        {"contentBlockDelta": {"delta": {"text": t}}},
        {"contentBlockStop": {}},
        {"messageStop": {"stopReason": "end_turn"}},
        EVENTOS_FINAIS,
    ]


def usa_ferramenta(nome, entrada=None):
    return [
        {"messageStart": {"role": "assistant"}},
        {"contentBlockStart": {"start": {"toolUse": {"toolUseId": "t1", "name": nome}}}},
        {"contentBlockDelta": {"delta": {"toolUse": {"input": json.dumps(entrada or {})}}}},
        {"contentBlockStop": {}},
        {"messageStop": {"stopReason": "tool_use"}},
        EVENTOS_FINAIS,
    ]


class ModeloFalso(Model):
    def __init__(self, *respostas):
        self.respostas = list(respostas)
        self.chamadas = []  # cópia das mensagens que o modelo recebeu em cada chamada

    def update_config(self, **kwargs):
        pass

    def get_config(self):
        return {}

    async def structured_output(self, output_model, prompt, system_prompt=None, **kwargs):
        raise NotImplementedError
        yield  # pragma: no cover

    async def stream(self, messages, tool_specs=None, system_prompt=None, **kwargs):
        self.chamadas.append(copy.deepcopy(messages))
        for evento in self.respostas.pop(0):
            yield evento


def textos(mensagens):
    """Todos os textos (do usuário, do agente e dos resultados de ferramenta) de uma lista de mensagens."""
    saida = []
    for m in mensagens:
        for bloco in m["content"]:
            if "text" in bloco:
                saida.append(bloco["text"])
            for parte in bloco.get("toolResult", {}).get("content", []):
                if "text" in parte:
                    saida.append(parte["text"])
    return saida


def test_lembra_das_mensagens_anteriores_na_mesma_conversa(tmp_path):
    modelo = ModeloFalso(texto("Prazer, Pedro!"), texto("Seu nome é Pedro."))
    agente = modulo.criar_agente("ana", str(tmp_path), modelo)
    agente("Meu nome é Pedro")
    agente("Qual é o meu nome?")
    # na segunda chamada o modelo recebeu a primeira pergunta e a primeira resposta
    assert "Meu nome é Pedro" in textos(modelo.chamadas[1])
    assert "Prazer, Pedro!" in textos(modelo.chamadas[1])


def test_lembra_mesmo_depois_de_reiniciar(tmp_path):
    primeiro = ModeloFalso(texto("Prazer, Pedro!"))
    modulo.criar_agente("ana", str(tmp_path), primeiro)("Meu nome é Pedro")

    # outro processo, outro agente, mesma sessão
    segundo = ModeloFalso(texto("Seu nome é Pedro."))
    agente = modulo.criar_agente("ana", str(tmp_path), segundo)
    assert len(agente.messages) == 2
    agente("Qual é o meu nome?")
    assert "Meu nome é Pedro" in textos(segundo.chamadas[0])


def test_cada_sessao_tem_a_propria_memoria(tmp_path):
    modulo.criar_agente("ana", str(tmp_path), ModeloFalso(texto("ok")))("Segredo da Ana")
    outro = ModeloFalso(texto("ok"))
    modulo.criar_agente("bia", str(tmp_path), outro)("Oi")
    assert "Segredo da Ana" not in textos(outro.chamadas[0])


def test_hora_vem_da_ferramenta_e_nao_do_modelo(tmp_path, monkeypatch):
    utc = datetime(2026, 11, 23, 22, 55, 27, tzinfo=timezone.utc)
    monkeypatch.setattr(modulo, "obter_hora", lambda fuso="brasilia": HoraCerta(
        utc.astimezone(timezone.utc).astimezone(), "horário de Brasília", "NTP.br (relogio.ntp.br)"
    ))
    modelo = ModeloFalso(usa_ferramenta("hora_certa_brasil"), texto("Agora são 19:55."))
    agente = modulo.criar_agente("ana", str(tmp_path), modelo)
    resposta = agente("Que horas são?")
    assert "19:55" in str(resposta)
    # o modelo só respondeu depois de receber o resultado da ferramenta
    assert any("NTP.br" in t for t in textos(modelo.chamadas[1]))
    assert "hora_certa_brasil" in [t["name"] for t in agente.tool_registry.get_all_tools_config().values()]


def test_ferramenta_avisa_quando_o_fuso_e_invalido():
    assert "Fuso desconhecido" in modulo.hora_certa_brasil(fuso="lua")


def test_config_http_usa_o_http_request_do_strands_e_a_url_da_hora():
    cfg = modulo.config_http()
    assert [t.tool_name for t in cfg["ferramentas"]] == ["http_request"]
    assert modulo.URL_HORA in cfg["prompt"]
    assert "glight.php" in cfg["prompt"]  # a referência do enunciado


def test_agente_da_lambda_tem_so_o_http_request_e_a_url_no_prompt():
    agente = modulo.montar_agente(ModeloFalso(texto("ok")), **modulo.config_http())
    assert list(agente.tool_registry.get_all_tools_config()) == ["http_request"]
    assert modulo.URL_HORA in agente.system_prompt


def test_hora_vem_do_http_request_consultando_a_url_do_ntpbr():
    import httpx
    from strands.vended_tools import make_http_request

    pedidos = []

    def ntpbr(pedido: httpx.Request) -> httpx.Response:
        pedidos.append(str(pedido.url))
        return httpx.Response(200, text="21:14:51#1795738491164\n", headers={"date": "Fri, 27 Nov 2026 00:14:51 GMT"})

    ferramenta = make_http_request(client=httpx.AsyncClient(transport=httpx.MockTransport(ntpbr)))
    modelo = ModeloFalso(
        usa_ferramenta("http_request", {"method": "GET", "url": modulo.URL_HORA}),
        texto("Agora são 21:14."),
    )
    agente = modulo.montar_agente(modelo, ferramentas=[ferramenta], prompt=modulo.PROMPT_HTTP)
    assert "21:14" in str(agente("Que horas são?"))
    assert pedidos == [modulo.URL_HORA]
    # o modelo só respondeu depois de receber o corpo do NTP.br
    assert any("21:14:51#" in str(chamada) for chamada in modelo.chamadas[1:])


def test_lista_de_modelos_vem_do_ambiente_ou_do_padrao(monkeypatch):
    monkeypatch.delenv("GEMINI_MODELS", raising=False)
    monkeypatch.delenv("GEMINI_MODEL", raising=False)
    assert modulo.modelos_configurados() == modulo.MODELOS_PADRAO
    monkeypatch.setenv("GEMINI_MODEL", "so-um")
    assert modulo.modelos_configurados() == ["so-um"]
    monkeypatch.setenv("GEMINI_MODELS", " a , b,,c ")
    assert modulo.modelos_configurados() == ["a", "b", "c"]


def test_modelo_usa_o_id_pedido_e_o_timeout(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "chave-de-teste")
    modelo = modulo.criar_modelo("gemini-x", timeout_ms=5000)
    assert modelo.get_config()["model_id"] == "gemini-x"


def test_sem_chave_o_erro_e_claro(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    try:
        modulo.criar_modelo()
    except RuntimeError as erro:
        assert "GEMINI_API_KEY" in str(erro)
    else:
        raise AssertionError("deveria exigir a chave")
