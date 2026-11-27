from datetime import datetime, timezone

import pytest

from hora_certa import (
    HoraCerta,
    consultar_ntpbr,
    descrever,
    interpretar_resposta,
    obter_hora,
)

# 23/11/2026 22:55:27 UTC = 19:55:27 em Brasília (resposta real do NTP.br para zone=-3)
EPOCH_MS = 1795474527844
UTC = datetime.fromtimestamp(EPOCH_MS / 1000, tz=timezone.utc)


class RespostaFalsa:
    def __init__(self, corpo: bytes):
        self.corpo = corpo

    def read(self):
        return self.corpo

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False


def test_interpreta_a_resposta_do_ntpbr():
    assert interpretar_resposta("19:55:27#1795474527844") == EPOCH_MS
    assert interpretar_resposta(" 19:55:27#1795474527844\r\n") == EPOCH_MS


@pytest.mark.parametrize("texto", ["", "erro", "<html></html>", "19:55#123", "19:55:27#abc"])
def test_recusa_resposta_que_nao_e_do_relogio(texto):
    with pytest.raises(ValueError):
        interpretar_resposta(texto)


def test_consulta_o_endereco_do_relogio_com_a_zona():
    vistos = {}

    def abrir(pedido, timeout):
        vistos["url"] = pedido.full_url
        vistos["timeout"] = timeout
        return RespostaFalsa(b"19:55:27#1795474527844")

    assert consultar_ntpbr(-3, timeout=2, abrir=abrir) == UTC
    assert vistos["url"].startswith("https://relogio.ntp.br/horacerta/s.php?zone=-3&ltime=")
    assert vistos["timeout"] == 2


def test_hora_de_brasilia_vem_do_ntpbr():
    hora = obter_hora("brasilia", consulta=lambda zona: UTC)
    assert (hora.instante.hour, hora.instante.minute, hora.instante.second) == (19, 55, 27)
    assert hora.instante.day == 23
    assert "NTP.br" in hora.fonte


@pytest.mark.parametrize(
    "fuso, hora_esperada", [("brasilia", 19), ("noronha", 20), ("amazonas", 18), ("acre", 17), (" Acre ", 17)]
)
def test_fusos_do_brasil(fuso, hora_esperada):
    assert obter_hora(fuso, consulta=lambda zona: UTC).instante.hour == hora_esperada


def test_cai_para_o_relogio_do_sistema_quando_o_ntpbr_falha():
    def fora_do_ar(zona):
        raise OSError("sem rede")

    hora = obter_hora("brasilia", consulta=fora_do_ar, agora=lambda: UTC)
    assert hora.instante.hour == 19
    assert "não respondeu" in hora.fonte


def test_fuso_desconhecido_e_recusado():
    with pytest.raises(ValueError):
        obter_hora("lua")


def test_descricao_em_portugues():
    texto = descrever(obter_hora("brasilia", consulta=lambda zona: UTC))
    assert texto == (
        "segunda-feira, 23/11/2026, 19:55:27 (horário de Brasília, UTC-3). Fonte: NTP.br (relogio.ntp.br)."
    )


def test_hora_certa_e_imutavel():
    hora = HoraCerta(UTC, "x", "y")
    with pytest.raises(Exception):
        hora.fuso = "z"
