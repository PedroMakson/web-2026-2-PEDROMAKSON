#!/usr/bin/env bash
# Configura os endereços do projeto final (Avaliação 15) na conta do laboratório do projeto:
#
#   www.<dominio>   -> o app (Amplify)
#   api.<dominio>   -> a API de dados (HTTP API do perfil e da persistência); troca o WebSocket do chat antigo, ver passo 4
#   chat.<dominio>  -> o chat de IA: a API REST do agente Strands (estágio V1), protegida com JWT do Cognito
#
# Só acrescenta: o que já existe é reaproveitado e nada é apagado. Pode rodar de novo.
#   bash backend/dominios/criar-dominios.sh
#
# Exige credenciais do Learner Lab válidas (~/.aws/credentials ou variáveis de ambiente) na conta do projeto.
set -euo pipefail

DOMINIO="pedromaksonfontesdacosta.atchin.web.ufersa.dev.br"
ZONA="Z01692598PREV36M22XW"            # zona do usuário no Route 53
CONTA_ESPERADA="199730069200"
REGIAO="us-east-1"
APP_AMPLIFY="d1dqhd9l7qpzun"
POOL="us-east-1_YEZPqwKq8"
CLIENTE="7p6f84fqc4u59078u3p0ak8iag"
API_DADOS="4m40qdelgj"                  # HTTP API (perfil e persistência)
API_AGENTE="swj7xebjb0"                 # API REST do agente (/chat)
ESTAGIO_AGENTE="V1"
export AWS_DEFAULT_REGION="$REGIAO"

# o aws.exe do Windows termina as linhas com \r\n; o \r sobraria nos valores lidos pelo script
aws() { command aws "$@" | tr -d '\r'; }

conta=$(aws sts get-caller-identity --query Account --output text)
if [ "$conta" != "$CONTA_ESPERADA" ]; then
  echo "Conta $conta não é a do projeto ($CONTA_ESPERADA). Nada foi alterado." >&2
  exit 1
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
# o aws.exe do Windows não lê caminhos do tipo /tmp/...
caminho() { cygpath -m "$1" 2>/dev/null || echo "$1"; }

echo "== 1/5 www.$DOMINIO (Amplify)"
if aws amplify get-domain-association --app-id "$APP_AMPLIFY" --domain-name "$DOMINIO" \
     --query "domainAssociation.subDomains[].subDomainSetting.prefix" --output text | tr '\t' '\n' | grep -qx www; then
  echo "já existe"
else
  aws amplify update-domain-association --app-id "$APP_AMPLIFY" --domain-name "$DOMINIO" \
    --sub-domain-settings prefix=gymflow,branchName=main prefix=www,branchName=main >/dev/null
  echo "subdomínio www acrescentado (o Amplify cria o certificado e o registro; leva alguns minutos)"
fi

echo "== 2/5 Cognito: URLs de retorno do login com o endereço www"
aws cognito-idp describe-user-pool-client --user-pool-id "$POOL" --client-id "$CLIENTE" --output json \
  > "$TMP/cliente.json"
# update-user-pool-client SUBSTITUI a configuração inteira: parte-se da atual e só se somam as URLs do www
node -e '
const fs = require("fs");
const [, entrada, saida, dominio] = process.argv;
const c = JSON.parse(fs.readFileSync(entrada, "utf8")).UserPoolClient;
for (const campo of ["CreationDate", "LastModifiedDate", "ClientSecret"]) delete c[campo];
const www = `https://www.${dominio}/login`;
for (const lista of ["CallbackURLs", "LogoutURLs"]) {
  c[lista] = c[lista] ?? [];
  if (!c[lista].includes(www)) c[lista].push(www);
}
fs.writeFileSync(saida, JSON.stringify(c));
' "$(caminho "$TMP/cliente.json")" "$(caminho "$TMP/cliente-novo.json")" "$DOMINIO"
aws cognito-idp update-user-pool-client --cli-input-json "file://$(caminho "$TMP/cliente-novo.json")" >/dev/null
echo "ok"

echo "== 3/5 CORS da API de dados: origem do www"
aws apigatewayv2 get-api --api-id "$API_DADOS" --query CorsConfiguration --output json > "$TMP/cors.json"
node -e '
const fs = require("fs");
const [, entrada, saida, dominio] = process.argv;
const c = JSON.parse(fs.readFileSync(entrada, "utf8"));
const origem = `https://www.${dominio}`;
if (!c.AllowOrigins.includes(origem)) c.AllowOrigins.push(origem);
fs.writeFileSync(saida, JSON.stringify(c));
' "$(caminho "$TMP/cors.json")" "$(caminho "$TMP/cors-novo.json")" "$DOMINIO"
aws apigatewayv2 update-api --api-id "$API_DADOS" --cors-configuration "file://$(caminho "$TMP/cors-novo.json")" >/dev/null
echo "ok"

echo "== 4/5 api.$DOMINIO: API de dados"
# O API Gateway não deixa misturar um WebSocket com APIs HTTP/REST no mesmo domínio. Hoje o api. serve o WebSocket do
# chat antigo; ele só é trocado pela API de dados quando o chat novo (chat.) já está no ar: TROCAR_WEBSOCKET=1.
if aws apigatewayv2 get-api-mappings --domain-name "api.$DOMINIO" --query "Items[?ApiId=='$API_DADOS'].ApiMappingId" --output text | grep -q .; then
  echo "já mapeada: https://api.$DOMINIO/"
else
  ANTIGOS=""
  while read -r mapeamento api; do
    [ -z "$mapeamento" ] && continue
    if [ "$(aws apigatewayv2 get-api --api-id "$api" --query ProtocolType --output text)" = "WEBSOCKET" ]; then
      ANTIGOS="$ANTIGOS $mapeamento"
    fi
  done < <(aws apigatewayv2 get-api-mappings --domain-name "api.$DOMINIO" --query "Items[].[ApiMappingId,ApiId]" --output text)
  if [ -n "$ANTIGOS" ] && [ "${TROCAR_WEBSOCKET:-0}" != "1" ]; then
    echo "PULADO: o api. ainda serve o WebSocket do chat antigo. Depois de publicar o chat novo, rode com TROCAR_WEBSOCKET=1."
  else
    for mapeamento in $ANTIGOS; do
      aws apigatewayv2 delete-api-mapping --domain-name "api.$DOMINIO" --api-mapping-id "$mapeamento"
      echo "mapeamento do WebSocket antigo removido"
    done
    aws apigatewayv2 create-api-mapping --domain-name "api.$DOMINIO" --api-id "$API_DADOS" --stage '$default' >/dev/null
    echo "mapeada: https://api.$DOMINIO/"
  fi
fi

echo "== 5/5 chat.$DOMINIO: API REST do agente"
CERT=$(aws acm list-certificates --query "CertificateSummaryList[?DomainName=='chat.$DOMINIO'].CertificateArn | [0]" --output text)
if [ "$CERT" = "None" ]; then
  CERT=$(aws acm request-certificate --domain-name "chat.$DOMINIO" --validation-method DNS --query CertificateArn --output text)
  echo "certificado pedido"
fi
# o registro de validação demora alguns segundos para aparecer no certificado
for _ in $(seq 1 20); do
  NOME_VAL=$(aws acm describe-certificate --certificate-arn "$CERT" --query "Certificate.DomainValidationOptions[0].ResourceRecord.Name" --output text)
  [ "$NOME_VAL" != "None" ] && break
  sleep 3
done
VALOR_VAL=$(aws acm describe-certificate --certificate-arn "$CERT" --query "Certificate.DomainValidationOptions[0].ResourceRecord.Value" --output text)
cat > "$TMP/validacao.json" <<EOF
{"Changes":[{"Action":"UPSERT","ResourceRecordSet":{"Name":"$NOME_VAL","Type":"CNAME","TTL":300,"ResourceRecords":[{"Value":"$VALOR_VAL"}]}}]}
EOF
aws route53 change-resource-record-sets --hosted-zone-id "$ZONA" --change-batch "file://$(caminho "$TMP/validacao.json")" >/dev/null
echo "validação do certificado no DNS criada; aguardando a emissão..."
aws acm wait certificate-validated --certificate-arn "$CERT"
echo "certificado emitido"

if ! aws apigateway get-domain-name --domain-name "chat.$DOMINIO" >/dev/null 2>&1; then
  aws apigateway create-domain-name --domain-name "chat.$DOMINIO" --regional-certificate-arn "$CERT" \
    --endpoint-configuration types=REGIONAL --security-policy TLS_1_2 >/dev/null
  echo "domínio da API criado"
fi
if ! aws apigateway get-base-path-mappings --domain-name "chat.$DOMINIO" --query "items[].restApiId" --output text | grep -q "$API_AGENTE"; then
  aws apigateway create-base-path-mapping --domain-name "chat.$DOMINIO" --rest-api-id "$API_AGENTE" --stage "$ESTAGIO_AGENTE" >/dev/null
  echo "mapeado ao estágio $ESTAGIO_AGENTE"
fi
ALVO=$(aws apigateway get-domain-name --domain-name "chat.$DOMINIO" --query regionalDomainName --output text)
ZONA_ALVO=$(aws apigateway get-domain-name --domain-name "chat.$DOMINIO" --query regionalHostedZoneId --output text)
cat > "$TMP/alias.json" <<EOF
{"Changes":[{"Action":"UPSERT","ResourceRecordSet":{"Name":"chat.$DOMINIO","Type":"A","AliasTarget":{"HostedZoneId":"$ZONA_ALVO","DNSName":"$ALVO","EvaluateTargetHealth":false}}}]}
EOF
aws route53 change-resource-record-sets --hosted-zone-id "$ZONA" --change-batch "file://$(caminho "$TMP/alias.json")" >/dev/null
echo "registro DNS criado"

echo
echo "Pronto:"
echo "  app   https://www.$DOMINIO"
echo "  dados https://api.$DOMINIO/profile  (depois de TROCAR_WEBSOCKET=1)"
echo "  chat  https://chat.$DOMINIO/chat"
