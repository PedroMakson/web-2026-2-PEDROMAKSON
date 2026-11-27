"""Hora certa do Brasil, consultada no NTP.br.

O relógio de referência (https://relogio.ntp.br/horacerta/glight.php) pergunta a hora a
``s.php?zone=<UTC-n>&ltime=<ms do PC>`` e recebe ``HH:MM:SS#<epoch em ms, UTC>``. Aqui o agente
faz a mesma pergunta e usa o epoch (que é UTC) para montar a hora no fuso pedido. Se o NTP.br
não responder, cai para o relógio do sistema e avisa que a hora não veio do NTP.br.
"""

from __future__ import annotations

import re
import time
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Callable

URL_NTPBR = "https://relogio.ntp.br/horacerta/s.php"

# O Brasil não tem horário de verão desde 2019, então os fusos são fixos.
FUSOS = {
    "brasilia": ("horário de Brasília", -3),
    "noronha": ("horário de Fernando de Noronha", -2),
    "amazonas": ("horário do Amazonas", -4),
    "acre": ("horário do Acre", -5),
}

DIAS = ["segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado", "domingo"]

_RESPOSTA = re.compile(r"\d{2}:\d{2}:\d{2}#(\d{10,14})")


@dataclass(frozen=True)
class HoraCerta:
    instante: datetime  # com fuso
    fuso: str  # nome legível, ex.: "horário de Brasília"
    fonte: str  # de onde veio a hora


def interpretar_resposta(texto: str) -> int:
    """Extrai o epoch (ms, UTC) de uma resposta do s.php, como ``19:55:27#1795474527844``."""
    achou = _RESPOSTA.fullmatch(texto.strip())
    if not achou:
        raise ValueError(f"Resposta inesperada do NTP.br: {texto[:60]!r}")
    return int(achou.group(1))


def consultar_ntpbr(zona: int = -3, timeout: float = 5.0, abrir: Callable = urllib.request.urlopen) -> datetime:
    """Pergunta a hora ao NTP.br e devolve o instante em UTC (com fuso)."""
    url = f"{URL_NTPBR}?zone={zona}&ltime={int(time.time() * 1000)}"
    pedido = urllib.request.Request(url, headers={"User-Agent": "gymflow-agente/1.0"})
    with abrir(pedido, timeout=timeout) as resposta:
        texto = resposta.read().decode("latin-1")
    return datetime.fromtimestamp(interpretar_resposta(texto) / 1000, tz=timezone.utc)


def obter_hora(
    fuso: str = "brasilia",
    consulta: Callable[[int], datetime] = consultar_ntpbr,
    agora: Callable[[], datetime] = lambda: datetime.now(timezone.utc),
) -> HoraCerta:
    """Hora certa no fuso pedido; usa o relógio do sistema se o NTP.br falhar."""
    chave = fuso.strip().lower()
    if chave not in FUSOS:
        raise ValueError(f"Fuso desconhecido: {fuso!r}. Use um de: {', '.join(FUSOS)}.")
    nome, horas = FUSOS[chave]
    try:
        utc = consulta(horas)
        fonte = "NTP.br (relogio.ntp.br)"
    except Exception:
        utc = agora()
        fonte = "relógio do sistema (o NTP.br não respondeu)"
    return HoraCerta(utc.astimezone(timezone(timedelta(hours=horas))), nome, fonte)


def descrever(hora: HoraCerta) -> str:
    """Texto pronto para o agente responder."""
    t = hora.instante
    desvio = int(t.utcoffset().total_seconds() // 3600)
    return (
        f"{DIAS[t.weekday()]}, {t:%d/%m/%Y}, {t:%H:%M:%S} ({hora.fuso}, UTC{desvio:+d}). "
        f"Fonte: {hora.fonte}."
    )
