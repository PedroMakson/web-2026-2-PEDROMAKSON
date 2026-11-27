"""Os dados do próprio usuário para o agente responder "qual é o meu plano?" ou "tenho parcela em aberto?".

O agente chama a MESMA API de dados do app (GET /dados) com o token de quem está perguntando; por isso cada perfil só
recebe o que já pode ver (o aluno, o que é dele; o instrutor, os alunos dele; e assim por diante) e não existe uma segunda
regra de permissão para manter. Aqui só se busca e se resume em texto o que a API devolveu.
"""

from __future__ import annotations

import json
import os
import urllib.request
from datetime import date, timedelta
from decimal import Decimal
from typing import Callable

# O "hoje" da demonstração é fixo, o mesmo do app (src/lib/datas.ts).
HOJE_DEMO = "2026-09-14"
URL_PADRAO = "https://4m40qdelgj.execute-api.us-east-1.amazonaws.com"


def buscar_dados(token: str, url: str | None = None, abrir: Callable = urllib.request.urlopen, timeout: float = 8.0) -> dict:
    """GET /dados com o token do usuário (o mesmo ID token do Cognito que o app usa)."""
    base = (url or os.environ.get("DATA_API_URL", URL_PADRAO)).rstrip("/")
    pedido = urllib.request.Request(f"{base}/dados", headers={"Authorization": f"Bearer {token}"})
    with abrir(pedido, timeout=timeout) as resposta:
        return json.loads(resposta.read().decode("utf-8"))


# ---------------------------------------------------------------- formatação

def _br(iso: str) -> str:
    return f"{iso[8:10]}/{iso[5:7]}/{iso[:4]}"


def _iso(br: str) -> str:
    return f"{br[6:10]}-{br[3:5]}-{br[:2]}"


def _dinheiro(texto: str) -> Decimal:
    return Decimal(texto.replace("R$", "").replace(".", "").replace(",", ".").strip() or "0")


def _reais(valor: Decimal) -> str:
    inteiro, centavos = f"{valor:.2f}".split(".")
    return "R$ " + f"{int(inteiro):,}".replace(",", ".") + "," + centavos


def _num(n: float, casas: int) -> str:
    return f"{n:.{casas}f}".replace(".", ",")


def _sequencia(dias: set[str]) -> int:
    dia = date.fromisoformat(HOJE_DEMO)
    if HOJE_DEMO not in dias:
        dia -= timedelta(days=1)
    total = 0
    while dia.isoformat() in dias:
        total += 1
        dia -= timedelta(days=1)
    return total


def _parcela(p: dict) -> str:
    texto = f"{p['valor']} com vencimento em {p['venc']}"
    if p.get("parcela"):
        texto += f" (parcela {p['parcela']})"
    return texto + (" — ATRASADA" if p.get("atraso") else "")


# ---------------------------------------------------------------- um resumo por perfil

def _do_aluno(d: dict) -> list[str]:
    if not d["alunos"]:
        return ["Este login ainda não está ligado a um cadastro de aluno (a recepção precisa vincular)."]
    a = d["alunos"][0]
    linhas = [
        f"Aluno: {a['nome']}",
        f"Plano: {a['plano']} — matrícula {a['matricula']}, válida até {a['fim']}, instrutor {a['instrutor']}"
        + (f"; renova a matrícula {a['matriculaAnterior']}" if a.get("matriculaAnterior") else ""),
        f"Situação financeira no cadastro: {a['fin']}",
    ]
    abertas = sorted((p for p in d["pagamentos"] if not p["pago"]), key=lambda p: _iso(p["venc"]))
    linhas.append("Parcelas em aberto: " + ("; ".join(_parcela(p) for p in abertas) if abertas else "nenhuma"))
    pagas = sorted((p for p in d["pagamentos"] if p["pago"]), key=lambda p: _iso(p["venc"]), reverse=True)[:3]
    if pagas:
        linhas.append(
            "Últimas parcelas pagas: "
            + "; ".join(f"{p['valor']} (venc. {p['venc']}, paga em {p.get('pagoEm', '—')} via {p.get('forma', '—')})" for p in pagas)
        )

    dias = {c["data"] for c in d["checkins"] if not c.get("cancelado")}
    mes = HOJE_DEMO[:7]
    no_mes = sum(1 for x in dias if x.startswith(mes))
    ultimo = max((x for x in dias if x <= HOJE_DEMO), default=None)
    linhas.append(
        f"Check-ins: {no_mes} em {mes[5:7]}/{mes[:4]}; sequência atual de {_sequencia(dias)} dias seguidos; "
        f"check-in de hoje: {'já feito' if HOJE_DEMO in dias else 'ainda não feito'}"
        + (f"; último em {_br(ultimo)}" if ultimo else "")
    )

    treinos = sorted(d.get("treinos", []), key=lambda t: t["divisao"])
    if treinos:
        linhas.append(
            "Treino: "
            + "; ".join(f"divisão {t['divisao']} — {t['titulo']} ({len(t['exercicios'])} exercícios)" for t in treinos)
            + f" (prescrito por {treinos[0]['atualizadoPor']})"
        )
    avaliacoes = sorted(d.get("avaliacoes", []), key=lambda x: (x["data"], x["id"]))
    if avaliacoes:
        ultima, primeira = avaliacoes[-1], avaliacoes[0]
        imc = ultima["peso"] / (ultima["altura"] ** 2)
        texto = f"Última avaliação ({_br(ultima['data'])}): {_num(ultima['peso'], 1)} kg, {_num(ultima['altura'], 2)} m, IMC {_num(imc, 1)}"
        if ultima.get("gordura") is not None:
            texto += f", {_num(ultima['gordura'], 1)}% de gordura"
        if len(avaliacoes) > 1:
            texto += f"; {_num(ultima['peso'] - primeira['peso'], 1)} kg desde a primeira avaliação, em {len(avaliacoes)} avaliações"
        linhas.append(texto)
    return linhas


def _do_instrutor(d: dict, nome: str | None) -> list[str]:
    alunos = d["alunos"]
    linhas = [f"Instrutor: {nome or 'sem nome'}", f"Alunos que você acompanha: {len(alunos)}"]
    for a in alunos:
        marcas = [a["plano"], f"financeiro {a['fin']}", f"último check-in {a['ultimo']}"]
        if a.get("alerta"):
            marcas.append(f"ALERTA: {a['alerta']}")
        if not a["ativo"]:
            marcas.append("acesso bloqueado")
        linhas.append(f"- {a['nome']}: " + ", ".join(marcas))
    return linhas


def _da_recepcao(d: dict, nome: str | None) -> list[str]:
    abertas = [p for p in d["pagamentos"] if not p["pago"]]
    atrasadas = [p for p in abertas if p.get("atraso")]
    bloqueados = [a["nome"] for a in d["alunos"] if not a["ativo"]]
    hoje = {c["alunoId"] for c in d["checkins"] if c["data"] == HOJE_DEMO and not c.get("cancelado")}
    return [
        f"Recepcionista: {nome or 'sem nome'}",
        f"Alunos cadastrados: {len(d['alunos'])}; com check-in hoje: {len(hoje)}",
        f"Parcelas em aberto: {len(abertas)}, somando {_reais(sum((_dinheiro(p['valor']) for p in abertas), Decimal(0)))}",
        "Parcelas atrasadas: "
        + ("; ".join(f"{p['nome']} — {_parcela(p)}" for p in atrasadas) if atrasadas else "nenhuma"),
        "Alunos com acesso bloqueado: " + (", ".join(bloqueados) if bloqueados else "nenhum"),
    ]


def _da_administracao(d: dict, nome: str | None) -> list[str]:
    linhas = _da_recepcao(d, nome)
    linhas[0] = f"Administrador: {nome or 'sem nome'}"
    equipe: dict[str, int] = {}
    for u in d["usuarios"]:
        if u["perfil"] != "Aluno":
            equipe[u["perfil"]] = equipe.get(u["perfil"], 0) + 1
    linhas.append("Equipe: " + (", ".join(f"{n} {p.lower()}(es)" for p, n in sorted(equipe.items())) or "sem dados"))
    linhas.append("Planos: " + "; ".join(f"{p['nome']} ({p['valor']}, {p['duracao']})" for p in d["planos"]))
    return linhas


def resumir(dados: dict) -> str:
    """Texto com o que o perfil de quem perguntou pode ver, para o agente responder sem inventar."""
    voce = dados.get("voce") or {}
    perfil = voce.get("perfil")
    if perfil == "Instrutor":
        linhas = _do_instrutor(dados, voce.get("nome"))
    elif perfil == "Recepcionista":
        linhas = _da_recepcao(dados, voce.get("nome"))
    elif perfil == "Administrador":
        linhas = _da_administracao(dados, voce.get("nome"))
    else:
        linhas = _do_aluno(dados)
    linhas.append(f"(Hoje no sistema, que usa dados de demonstração, é {_br(HOJE_DEMO)}.)")
    return "\n".join(linhas)
