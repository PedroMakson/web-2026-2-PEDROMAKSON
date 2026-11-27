#!/usr/bin/env bash
# Cria na AWS o POST /chat do agente (API REST + Lambda + tabela de sessões), na conta do laboratório do projeto.
# Seguro para rodar de novo: o que já existe é reaproveitado (a Lambda só tem o código atualizado, as variáveis ficam).
#
#   python empacotar.py            # antes: gera lambda-chat.zip
#   bash criar-na-aws.sh
#
# Depois, no console da Lambda, falta só definir a variável GEMINI_API_KEY (a chave nunca passa por este script).
# Exige credenciais do Learner Lab válidas (~/.aws/credentials ou variáveis de ambiente) na conta do projeto.
set -euo pipefail
cd "$(dirname "$0")"

PREFIXO="pedromaksonfontesdacosta"
SUFIXO="2026.2"
REGIAO="us-east-1"
CONTA_ESPERADA="199730069200"
USER_POOL="us-east-1_YEZPqwKq8"
FUNCAO="${PREFIXO}-agente"
API_NOME="${PREFIXO}-agente-api"
TABELA="${PREFIXO}-sessoes-${SUFIXO}"
ESTAGIO="V1"
export AWS_DEFAULT_REGION="$REGIAO"

conta=$(aws sts get-caller-identity --query Account --output text)
if [ "$conta" != "$CONTA_ESPERADA" ]; then
  echo "Conta $conta não é a do projeto ($CONTA_ESPERADA). Nada foi criado." >&2
  exit 1
fi
[ -f lambda-chat.zip ] || { echo "Falta o lambda-chat.zip: rode python empacotar.py antes." >&2; exit 1; }
ZIP="fileb://$(pwd -W 2>/dev/null || pwd)/lambda-chat.zip"

echo "== 1/3 Tabela de sessões"
bash ../dados/criar-tabelas.sh | grep -E "sessoes" || true

echo "== 2/3 Lambda $FUNCAO"
ROLE_ARN=$(aws iam get-role --role-name LabRole --query Role.Arn --output text)
if aws lambda get-function --function-name "$FUNCAO" >/dev/null 2>&1; then
  aws lambda update-function-code --function-name "$FUNCAO" --zip-file "$ZIP" >/dev/null
  echo "código atualizado (variáveis mantidas)"
else
  aws lambda create-function --function-name "$FUNCAO" --runtime python3.12 --handler lambda_chat.handler \
    --role "$ROLE_ARN" --zip-file "$ZIP" --timeout 60 --memory-size 512 \
    --environment "Variables={TABLE=$TABELA}" --tags projeto=gymflow >/dev/null
  echo "criada"
fi
aws lambda wait function-active-v2 --function-name "$FUNCAO"
aws lambda wait function-updated-v2 --function-name "$FUNCAO"
FUNCAO_ARN=$(aws lambda get-function --function-name "$FUNCAO" --query Configuration.FunctionArn --output text)

echo "== 3/3 API REST $API_NOME"
API_ID=$(aws apigateway get-rest-apis --query "items[?name=='$API_NOME'].id | [0]" --output text)
if [ "$API_ID" = "None" ]; then
  API_ID=$(aws apigateway create-rest-api --name "$API_NOME" --endpoint-configuration types=REGIONAL \
    --description "POST /chat: agente de IA (Strands Agents + Gemini)" --query id --output text)
  echo "API criada: $API_ID"
fi

RAIZ=$(aws apigateway get-resources --rest-api-id "$API_ID" --query "items[?path=='/'].id | [0]" --output text)
RECURSO=$(aws apigateway get-resources --rest-api-id "$API_ID" --query "items[?path=='/chat'].id | [0]" --output text)
if [ "$RECURSO" = "None" ]; then
  RECURSO=$(aws apigateway create-resource --rest-api-id "$API_ID" --parent-id "$RAIZ" --path-part chat --query id --output text)
fi

AUTORIZADOR=$(aws apigateway get-authorizers --rest-api-id "$API_ID" --query "items[?name=='cognito-gymflow'].id | [0]" --output text)
if [ "$AUTORIZADOR" = "None" ]; then
  AUTORIZADOR=$(aws apigateway create-authorizer --rest-api-id "$API_ID" --name cognito-gymflow --type COGNITO_USER_POOLS \
    --provider-arns "arn:aws:cognito-idp:${REGIAO}:${CONTA_ESPERADA}:userpool/${USER_POOL}" \
    --identity-source method.request.header.Authorization --query id --output text)
fi

URI="arn:aws:apigateway:${REGIAO}:lambda:path/2015-03-31/functions/${FUNCAO_ARN}/invocations"

# metodo <POST|OPTIONS> <tipo de autorização> [id do autorizador]: método + integração com a Lambda (proxy)
metodo() {
  if ! aws apigateway get-method --rest-api-id "$API_ID" --resource-id "$RECURSO" --http-method "$1" >/dev/null 2>&1; then
    if [ -n "${3:-}" ]; then
      aws apigateway put-method --rest-api-id "$API_ID" --resource-id "$RECURSO" --http-method "$1" \
        --authorization-type "$2" --authorizer-id "$3" >/dev/null
    else
      aws apigateway put-method --rest-api-id "$API_ID" --resource-id "$RECURSO" --http-method "$1" \
        --authorization-type "$2" >/dev/null
    fi
  fi
  aws apigateway put-integration --rest-api-id "$API_ID" --resource-id "$RECURSO" --http-method "$1" \
    --type AWS_PROXY --integration-http-method POST --uri "$URI" >/dev/null
}
metodo POST COGNITO_USER_POOLS "$AUTORIZADOR"   # só entra quem está logado no Cognito
metodo GET COGNITO_USER_POOLS "$AUTORIZADOR"    # a conversa guardada (para o balão reabrir de onde parou)
metodo DELETE COGNITO_USER_POOLS "$AUTORIZADOR" # nova conversa (apaga a memória do usuário)
metodo OPTIONS NONE                             # consulta prévia do navegador (CORS); a Lambda responde

aws lambda add-permission --function-name "$FUNCAO" --statement-id apigateway-chat \
  --action lambda:InvokeFunction --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:${REGIAO}:${CONTA_ESPERADA}:${API_ID}/*/*/chat" >/dev/null 2>&1 || true

aws apigateway create-deployment --rest-api-id "$API_ID" --stage-name "$ESTAGIO" \
  --description "POST /chat" >/dev/null

echo
echo "Pronto."
echo "  API:    $API_NOME ($API_ID)"
echo "  URL:    https://${API_ID}.execute-api.${REGIAO}.amazonaws.com/${ESTAGIO}/chat"
echo "  Falta:  definir GEMINI_API_KEY nas variáveis de ambiente da Lambda $FUNCAO (console)."
