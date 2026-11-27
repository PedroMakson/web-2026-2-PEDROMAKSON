"""Monta o zip da Lambda do /chat (Python 3.12, Linux x86_64), mesmo rodando no Windows.

    pip install uv                 # uma vez
    python empacotar.py            # gera lambda-chat.zip nesta pasta

O uv baixa as bibliotecas já compiladas para Linux. O boto3 e o botocore já existem no ambiente da Lambda,
então ficam de fora para o pacote ficar menor.
"""

from __future__ import annotations

import shutil
import subprocess
import sys
import zipfile
from pathlib import Path

AQUI = Path(__file__).parent
BUILD = AQUI / ".build"
SAIDA = AQUI / "lambda-chat.zip"
# todos os módulos da pasta vão para a Lambda (menos o chat do terminal e este script): uma lista fixa já deixou um
# módulo novo de fora e a Lambda parou de subir com "No module named ..."
FORA_DO_PACOTE = {"chat.py", "empacotar.py"}
CODIGO = sorted(p.name for p in AQUI.glob("*.py") if p.name not in FORA_DO_PACOTE)
CONHECIMENTO_MJS = AQUI.parent / "conhecimento.mjs"  # a base de conhecimento do assistente (texto do sistema)
JA_NA_LAMBDA = {"boto3", "botocore", "s3transfer", "jmespath"}  # prefixos de pasta a remover
LIMITE_DIRETO_MB = 50  # acima disso o console exige subir o zip pelo S3


def gerar_conhecimento(destino: Path) -> None:
    """Extrai o texto de backend/conhecimento.mjs (que o front e o chat antigo também usam) para o prompt do agente."""
    script = (
        "import { pathToFileURL } from 'node:url';"
        "import { writeFileSync } from 'node:fs';"
        "const m = await import(pathToFileURL(process.argv[1]).href);"
        "writeFileSync(process.argv[2], m.CONHECIMENTO);"
    )
    subprocess.run(
        ["node", "--input-type=module", "-e", script, str(CONHECIMENTO_MJS), str(destino)],
        check=True,
    )
    print(f"conhecimento: {destino.stat().st_size / 1024:.1f} KB")


def main() -> int:
    shutil.rmtree(BUILD, ignore_errors=True)
    BUILD.mkdir()
    # o pip aplicaria as regras do Windows (ex.: exigiria o pywin32); o uv resolve para a plataforma da Lambda
    subprocess.run(
        [
            sys.executable, "-m", "uv", "pip", "install", "--quiet",
            "--target", str(BUILD),
            "--python-platform", "x86_64-manylinux2014",
            "--python-version", "3.12",
            "--only-binary", ":all:",
            "-r", str(AQUI / "requirements-lambda.txt"),
        ],
        check=True,
    )

    for pasta in list(BUILD.iterdir()):
        nome = pasta.name.split("-")[0].lower()
        if nome in JA_NA_LAMBDA or nome == "bin":
            shutil.rmtree(pasta, ignore_errors=True)
    for cache in BUILD.rglob("__pycache__"):
        shutil.rmtree(cache, ignore_errors=True)
    for arquivo in CODIGO:
        shutil.copy(AQUI / arquivo, BUILD / arquivo)
    gerar_conhecimento(BUILD / "conhecimento.txt")

    SAIDA.unlink(missing_ok=True)
    with zipfile.ZipFile(SAIDA, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for caminho in sorted(BUILD.rglob("*")):
            if caminho.is_file():
                z.write(caminho, caminho.relative_to(BUILD).as_posix())
    shutil.rmtree(BUILD, ignore_errors=True)

    mb = SAIDA.stat().st_size / 1024 / 1024
    print(f"{SAIDA.name}: {mb:.1f} MB")
    print("Envio direto pelo console." if mb <= LIMITE_DIRETO_MB else "Passou de 50 MB: suba o zip por um bucket S3.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
