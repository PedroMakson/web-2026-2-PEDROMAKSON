#!/usr/bin/env bash
# Publica a API de dados (backend/dados/api/index.mjs) na conta do laboratório do projeto:
#   - Lambda pedromaksonfontesdacosta-dados (Node.js 24, LabRole)
#   - rotas GET /dados, PUT /dados/{colecao}/{id} e DELETE /dados/{colecao}/{id} na HTTP API do projeto, com o JWT
#     authorizer do Cognito que já existe (e o DELETE liberado no CORS)
#
# Pode rodar de novo: a Lambda só tem o código atualizado e o que já existe é reaproveitado.
#   bash backend/dados/criar-api.sh
#
# Exige credenciais do Learner Lab válidas (variáveis AWS_* ou ~/.aws/credentials) na conta do projeto.
set -euo pipefail
cd "$(dirname "$0")"

PREFIXO="pedromaksonfontesdacosta"
REGIAO="us-east-1"
CONTA_ESPERADA="199730069200"
API_ID="4m40qdelgj"                      # HTTP API do projeto (perfil e dados)
FUNCAO="${PREFIXO}-dados"
export AWS_DEFAULT_REGION="$REGIAO"

# o aws.exe do Windows termina as linhas com \r\n; o \r sobraria nos valores lidos pelo script
aws() { command aws "$@" | tr -d '\r'; }
caminho() { cygpath -m "$1" 2>/dev/null || echo "$1"; }

conta=$(aws sts get-caller-identity --query Account --output text)
if [ "$conta" != "$CONTA_ESPERADA" ]; then
  echo "Conta $conta não é a do projeto ($CONTA_ESPERADA). Nada foi criado." >&2
  exit 1
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
(cd api && python -m zipfile -c "$(caminho "$TMP")/dados.zip" index.mjs)

echo "== 1/3 Lambda $FUNCAO"
ROLE_ARN=$(aws iam get-role --role-name LabRole --query Role.Arn --output text)
if aws lambda get-function --function-name "$FUNCAO" >/dev/null 2>&1; then
  aws lambda update-function-code --function-name "$FUNCAO" --zip-file "fileb://$(caminho "$TMP")/dados.zip" >/dev/null
  echo "código atualizado"
else
  aws lambda create-function --function-name "$FUNCAO" --runtime nodejs24.x --handler index.handler \
    --role "$ROLE_ARN" --zip-file "fileb://$(caminho "$TMP")/dados.zip" --timeout 15 --memory-size 256 \
    --tags projeto=gymflow >/dev/null
  echo "criada"
fi
aws lambda wait function-active-v2 --function-name "$FUNCAO"
aws lambda wait function-updated-v2 --function-name "$FUNCAO"
FUNCAO_ARN=$(aws lambda get-function --function-name "$FUNCAO" --query Configuration.FunctionArn --output text)

echo "== 2/3 Integração e rotas na HTTP API $API_ID"
INTEGRACAO=$(aws apigatewayv2 get-integrations --api-id "$API_ID" --query "Items[?IntegrationUri=='$FUNCAO_ARN'].IntegrationId | [0]" --output text)
if [ "$INTEGRACAO" = "None" ]; then
  INTEGRACAO=$(aws apigatewayv2 create-integration --api-id "$API_ID" --integration-type AWS_PROXY \
    --integration-uri "$FUNCAO_ARN" --payload-format-version 2.0 --query IntegrationId --output text)
fi
AUTORIZADOR=$(aws apigatewayv2 get-authorizers --api-id "$API_ID" --query "Items[?AuthorizerType=='JWT'].AuthorizerId | [0]" --output text)
if [ "$AUTORIZADOR" = "None" ]; then
  echo "Nenhum JWT authorizer na API $API_ID: as rotas não podem ficar abertas." >&2
  exit 1
fi
for rota in "GET /dados" "PUT /dados/{colecao}/{id}" "DELETE /dados/{colecao}/{id}"; do
  existe=$(aws apigatewayv2 get-routes --api-id "$API_ID" --query "Items[?RouteKey=='$rota'].RouteId | [0]" --output text)
  if [ "$existe" = "None" ]; then
    aws apigatewayv2 create-route --api-id "$API_ID" --route-key "$rota" --target "integrations/$INTEGRACAO" \
      --authorization-type JWT --authorizer-id "$AUTORIZADOR" >/dev/null
    echo "rota criada: $rota"
  else
    echo "rota já existe: $rota"
  fi
done

echo "== CORS: método DELETE liberado"
aws apigatewayv2 get-api --api-id "$API_ID" --query CorsConfiguration --output json > "$TMP/cors.json"
node -e '
const fs = require("fs");
const [, entrada, saida] = process.argv;
const c = JSON.parse(fs.readFileSync(entrada, "utf8"));
if (!c.AllowMethods.includes("DELETE")) c.AllowMethods.push("DELETE");
fs.writeFileSync(saida, JSON.stringify(c));
' "$(caminho "$TMP/cors.json")" "$(caminho "$TMP/cors-novo.json")"
aws apigatewayv2 update-api --api-id "$API_ID" --cors-configuration "file://$(caminho "$TMP/cors-novo.json")" >/dev/null

echo "== 3/3 Permissão do API Gateway para chamar a Lambda"
aws lambda add-permission --function-name "$FUNCAO" --statement-id apigateway-dados \
  --action lambda:InvokeFunction --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:${REGIAO}:${CONTA_ESPERADA}:${API_ID}/*/*/dados*" >/dev/null 2>&1 || true

echo
echo "Pronto: https://${API_ID}.execute-api.${REGIAO}.amazonaws.com/dados (depois da troca do api., https://api.<dominio>/dados)"
