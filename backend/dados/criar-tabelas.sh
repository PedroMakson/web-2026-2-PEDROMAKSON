#!/usr/bin/env bash
# Cria as tabelas DynamoDB do GymFlow (modo on-demand) na conta do laboratório do projeto.
# Seguro para rodar de novo: tabela que já existe é pulada. Modelo completo em docs/modelo-de-dados.md.
#
#   bash backend/dados/criar-tabelas.sh            # cria o que falta
#   bash backend/dados/criar-tabelas.sh --listar   # só mostra o que existe
#
# Exige credenciais do Learner Lab válidas (~/.aws/credentials) na conta do projeto.
set -euo pipefail

PREFIXO="pedromaksonfontesdacosta"
SUFIXO="2026.2"
REGIAO="us-east-1"
CONTA_ESPERADA="199730069200"   # laboratório do projeto (o de IaC é outro e não deve receber estas tabelas)
export AWS_DEFAULT_REGION="$REGIAO"

conta=$(aws sts get-caller-identity --query Account --output text)
if [ "$conta" != "$CONTA_ESPERADA" ]; then
  echo "Conta $conta não é a do projeto ($CONTA_ESPERADA). Nada foi criado." >&2
  exit 1
fi

nome() { echo "${PREFIXO}-$1-${SUFIXO}"; }

existe() { aws dynamodb describe-table --table-name "$1" >/dev/null 2>&1; }

# criar <sufixo> <atributos...> -- <chaves> [-- <índices...>]
#   atributos: Nome=S|N  (só os usados em chaves e índices)
#   chaves:    "pk" ou "pk,sk"
criar() {
  local tabela atributos=() chaves indices=()
  tabela=$(nome "$1"); shift
  while [ "$1" != "--" ]; do atributos+=("AttributeName=${1%%=*},AttributeType=${1##*=}"); shift; done
  shift
  chaves="$1"; shift
  if [ "${1:-}" = "--" ]; then shift; indices=("$@"); fi

  if existe "$tabela"; then echo "já existe: $tabela"; return; fi

  local ks="AttributeName=${chaves%%,*},KeyType=HASH"
  [[ "$chaves" == *,* ]] && ks="$ks AttributeName=${chaves##*,},KeyType=RANGE"

  local args=(--table-name "$tabela" --billing-mode PAY_PER_REQUEST
    --attribute-definitions "${atributos[@]}"
    --tags Key=projeto,Value=gymflow)
  # shellcheck disable=SC2086
  args+=(--key-schema $ks)
  [ ${#indices[@]} -gt 0 ] && args+=(--global-secondary-indexes "${indices[@]}")

  aws dynamodb create-table "${args[@]}" >/dev/null
  aws dynamodb wait table-exists --table-name "$tabela"
  echo "criada:     $tabela"
}

# índice <nome> <pk> [sk]  -> definição de GSI com todos os atributos projetados
indice() {
  local ks="{AttributeName=$2,KeyType=HASH}"
  [ -n "${3:-}" ] && ks="$ks,{AttributeName=$3,KeyType=RANGE}"
  echo "IndexName=$1,KeySchema=[$ks],Projection={ProjectionType=ALL}"
}

if [ "${1:-}" = "--listar" ]; then
  aws dynamodb list-tables --query "TableNames[?contains(@, '-${SUFIXO}')]" --output text | tr '\t' '\n'
  exit 0
fi

# pessoas: alunos e equipe (cadastro, CPF, endereço, perfil de acesso, vínculo com o usuário do Cognito)
criar pessoas pessoaId=S email=S perfil=S nome=S -- pessoaId -- \
  "$(indice por-email email)" "$(indice por-perfil perfil nome)"

# planos: Mensal Fit, Trimestral, Anual...
criar planos planoId=S -- planoId

# matriculas: vínculo aluno x plano, com início, vencimento e a matrícula que ela renova
criar matriculas matriculaId=S alunoId=S inicio=S -- matriculaId -- \
  "$(indice por-aluno alunoId inicio)"

# pagamentos: parcelas de cada matrícula
criar pagamentos pagamentoId=S alunoId=S vencimento=S situacao=S -- pagamentoId -- \
  "$(indice por-aluno alunoId vencimento)" "$(indice por-situacao situacao vencimento)"

# checkins: um por dia por aluno (cancelados ficam guardados com quem cancelou e por quê)
criar checkins alunoId=S dataId=S data=S -- alunoId,dataId -- \
  "$(indice por-data data alunoId)"

# treinos: uma ficha por divisão (A, B, C) de cada aluno
criar treinos alunoId=S divisao=S -- alunoId,divisao

# avaliacoes: avaliações físicas, em ordem de data
criar avaliacoes alunoId=S dataId=S -- alunoId,dataId

# observacoes: anotações do instrutor sobre o aluno
criar observacoes alunoId=S criadoEm=S -- alunoId,criadoEm

# notificacoes: alertas por perfil ou por usuário (gerados pelo job diário)
criar notificacoes destino=S criadoEm=S -- destino,criadoEm

# exportacoes: relatórios exportados (arquivo no S3)
criar exportacoes relatorio=S criadoEm=S -- relatorio,criadoEm

# sessoes: memória do agente de IA (Strands Agents): o histórico da conversa de cada usuário (Lambda do /chat)
criar sessoes sessaoId=S -- sessaoId
# o atributo "expira" (segundos desde 1970) apaga a conversa sozinha depois de 30 dias
aws dynamodb update-time-to-live --table-name "$(nome sessoes)" \
  --time-to-live-specification "Enabled=true,AttributeName=expira" >/dev/null 2>&1 || true

echo
echo "Tabelas do projeto:"
aws dynamodb list-tables --query "TableNames[?contains(@, '-${SUFIXO}')]" --output text | tr '\t' '\n'
