"""Conversa com o agente no terminal.

    python chat.py                 # sessão "padrao" (continua de onde parou)
    python chat.py --sessao ana    # outra pessoa, outra memória
    python chat.py --novo          # apaga a memória da sessão e começa do zero
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path

from agente import criar_agente


def ferramentas_do_turno(mensagens: list[dict]) -> list[tuple[str, str]]:
    """(nome, texto devolvido) de cada ferramenta que o agente usou nas mensagens dadas."""
    nomes: dict[str, str] = {}
    usos: list[tuple[str, str]] = []
    for mensagem in mensagens:
        for bloco in mensagem["content"]:
            if "toolUse" in bloco:
                nomes[bloco["toolUse"]["toolUseId"]] = bloco["toolUse"]["name"]
            if "toolResult" in bloco:
                resultado = bloco["toolResult"]
                texto = " ".join(
                    parte["text"] if "text" in parte else json.dumps(parte.get("json", ""), ensure_ascii=False)
                    for parte in resultado["content"]
                ).strip()
                usos.append((nomes.get(resultado["toolUseId"], "ferramenta"), texto))
    return usos


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Chat com o agente de IA do GymFlow (Strands + Gemini).")
    ap.add_argument("--sessao", default="padrao", help="nome da sessão (cada uma tem a sua memória)")
    ap.add_argument("--pasta", default=".sessoes", help="onde as sessões ficam guardadas")
    ap.add_argument("--novo", action="store_true", help="apaga a memória desta sessão antes de começar")
    args = ap.parse_args(argv)

    if args.novo:
        shutil.rmtree(Path(args.pasta) / f"session_{args.sessao}", ignore_errors=True)

    try:
        agente = criar_agente(args.sessao, args.pasta)
    except RuntimeError as erro:
        print(erro, file=sys.stderr)
        return 1

    anteriores = len(agente.messages)
    print(f"Agente GymFlow (sessão '{args.sessao}'). Digite 'sair' para encerrar.")
    if anteriores:
        print(f"[memória: {anteriores} mensagens recuperadas da conversa anterior]")

    while True:
        try:
            texto = input("\nVocê: ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            break
        if texto.lower() in {"sair", "exit", "quit"}:
            break
        if not texto:
            continue
        try:
            antes = len(agente.messages)
            resposta = agente(texto)
            # mostra o que a ferramenta devolveu, para ficar claro de onde veio a hora
            for nome, resultado in ferramentas_do_turno(agente.messages[antes:]):
                print(f"\n  [ferramenta {nome}: {resultado}]")
            print(f"\nAgente: {resposta}")
        except Exception as erro:  # falha de rede, cota do Gemini, etc.
            print(f"\n[erro ao falar com o modelo: {erro}]", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
