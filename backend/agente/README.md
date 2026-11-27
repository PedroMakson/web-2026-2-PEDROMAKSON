# Agente de IA do GymFlow (Strands Agents + Gemini)

Agente feito com o [Strands Agents](https://strandsagents.com) (Python) e o Google Gemini. Ele:

- **lembra das mensagens anteriores**: o Strands guarda o histórico da conversa na sessão e o recarrega, mesmo depois de fechar o programa;
- **responde a hora correta do Brasil**: a ferramenta `hora_certa_brasil` consulta o NTP.br (a mesma fonte do relógio
  <https://relogio.ntp.br/horacerta/glight.php>), então o modelo nunca "chuta" a hora.

## Como funciona

| Arquivo | O que faz |
|---|---|
| `hora_certa.py` | Pergunta a hora a `relogio.ntp.br/horacerta/s.php?zone=<UTC-n>`, que responde `HH:MM:SS#<epoch em ms, UTC>`; converte para o fuso pedido (Brasília, Noronha, Amazonas ou Acre). Se o NTP.br não responder, usa o relógio do sistema e avisa na resposta |
| `agente.py` | Monta o agente: modelo Gemini, instruções em português, a ferramenta de hora e a sessão (memória) em disco |
| `chat.py` | Conversa pelo terminal |
| `tests/` | Testes sem rede e sem chave: um modelo falso responde e registra o que recebeu |

Fluxo de uma pergunta como "que horas são?": o Gemini decide chamar `hora_certa_brasil` → a ferramenta consulta o NTP.br
→ o resultado volta ao Gemini → ele escreve a resposta. O histórico (pergunta, chamada da ferramenta e resposta) é salvo
em `.sessoes/session_<nome>/`.

## Rodando

Precisa de Python 3.10+ e de uma chave do [Google AI Studio](https://aistudio.google.com/).

```powershell
cd backend\agente
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

$env:GEMINI_API_KEY = "cole-a-chave-aqui"   # só nesta janela; a chave nunca vai para o código
python chat.py
```

Opções do chat: `--sessao ana` (outra pessoa, outra memória), `--novo` (apaga a memória da sessão),
`--pasta` (onde guardar). O modelo padrão é `gemini-3.5-flash-lite`; troque com `$env:GEMINI_MODEL = "..."`
(no cmd: `set GEMINI_MODEL=...`). Na Lambda dá para dar uma lista em `GEMINI_MODELS`, separada por vírgula, em ordem de preferência.

Para ver a memória funcionar, converse, feche (`sair`) e abra de novo:

```
Você: Meu nome é Pedro e treino de manhã.
Agente: Prazer, Pedro! ...
(sair, e rodar python chat.py de novo)
[memória: 2 mensagens recuperadas da conversa anterior]
Você: Qual é o meu nome e quando eu treino?
Agente: Você é o Pedro e treina de manhã.
Você: Que horas são agora?

  [ferramenta hora_certa_brasil: segunda-feira, 23/11/2026, 20:48:35 (horário de Brasília, UTC-3). Fonte: NTP.br (relogio.ntp.br).]

Agente: Pedro, agora são 20:48 (horário de Brasília).
```

A linha `[ferramenta ...]` é impressa pelo `chat.py` e mostra o que o NTP.br devolveu; a resposta do Gemini usa esse valor.

## Na AWS: `POST /chat` (API REST + Lambda + DynamoDB)

A Lambda não guarda nada entre uma chamada e outra, então na AWS a memória fica no DynamoDB: a cada pergunta,
`lambda_chat.py` carrega o histórico da sessão, roda o mesmo agente e grava o histórico de volta.

```
cliente ──POST /chat──▶ API Gateway (REST, authorizer Cognito) ──▶ Lambda (Strands + Gemini) ──▶ DynamoDB (sessoes)
                                                                          └──▶ NTP.br (hora certa)
```

- **Entrada:** `{"mensagem": "Que horas são?"}`. **Saída:** `{"resposta": "..."}`.
- **Sessão = usuário:** o `sub` do token do Cognito vira a chave da conversa (`usuario-<sub>`), então cada pessoa tem a sua memória e
  o corpo da requisição não escolhe a sessão de outra pessoa. Sem login (teste no console do API Gateway, que ignora o authorizer)
  vale o campo `sessao` do corpo (`teste-<sessao>`).
- **Hora atual com a ferramenta do Strands:** na Lambda o agente não usa a ferramenta própria (`hora_certa_brasil`), e sim a
  `http_request` que já vem no Strands (`from strands.vended_tools import http_request`). O prompt (`PROMPT_HTTP`, em `agente.py`)
  passa a ela a URL da hora atual, `https://relogio.ntp.br/horacerta/s.php?zone=-3`, a mesma que alimenta o relógio de referência
  `glight.php` (essa página é só o desenho do relógio; os dados vêm do `s.php`). O corpo responde `HH:MM:SS#epoch` na hora de Brasília
  e o cabeçalho `date` (GMT) dá a data. Nas versões antigas do pacote `strands-agents-tools` essa ferramenta ficava lá; na 0.9 ela foi
  para o próprio Strands, então esse pacote nem é necessário.
- Recusas: corpo inválido (400), sem login e sem `sessao` (401), falha do modelo ou do banco (502, sem detalhes na resposta).
- **Troca de modelo:** o Gemini às vezes responde 429 (cota) ou 503/504 (sobrecarga) e demora a avisar. A Lambda limita cada chamada a
  12 s, não deixa o Strands repetir a mesma tentativa com pausas longas e, se o modelo falhar, tenta o próximo da lista
  (`gemini-3.5-flash-lite`, `gemini-3.5-flash`, `gemini-3.7-flash`, `gemini-3.1-flash-lite`, os mesmos do chat do GymFlow), sempre
  dentro dos 29 s que o API Gateway aceita. Uma tentativa que falhou não deixa rastro na memória.
- Cada chamada registra no CloudWatch uma linha `tempos /chat` (modelo usado, tempo no banco e no agente, ciclos) e o status HTTP de cada pedido ao Gemini.

### Montar o pacote

```powershell
pip install uv
python empacotar.py
```

Gera `lambda-chat.zip` (cerca de 15 MB) com as bibliotecas compiladas para Linux; o `boto3` fica de fora porque a Lambda já o tem.
(O `pip` sozinho não serve: no Windows ele pede o `pywin32`, que não existe para Linux; o `uv` resolve para a plataforma certa.)

### Atalho: criar tudo por script

`bash criar-na-aws.sh` (com o lab ligado e o `lambda-chat.zip` já gerado) cria a tabela, a Lambda e a API REST com o
recurso `/chat`, o autorizador Cognito, o CORS e o estágio `V1`, e mostra a URL. Pode rodar de novo sem duplicar nada.
Só a variável `GEMINI_API_KEY` fica de fora, para a chave nunca passar pelo script: defina-a no console da Lambda
(*Configuração → Variáveis de ambiente*).

### Criar no console da AWS (região `us-east-1`)

O mesmo que o script faz, passo a passo:

1. **DynamoDB → Criar tabela:** nome `pedromaksonfontesdacosta-sessoes-2026.2`, chave de partição `sessaoId` (String), capacidade sob demanda.
   Depois, em *Configurações adicionais → Time to Live*, ligue o TTL no atributo `expira`.
2. **Lambda → Criar função:** nome `pedromaksonfontesdacosta-agente`, Python 3.12, função de execução existente `LabRole`.
   Envie o `lambda-chat.zip` (Código → Fazer upload de .zip). Em *Configurações de runtime* o **Handler** é `lambda_chat.handler`.
   Em *Configuração geral*: memória 512 MB e tempo limite 60 s. Em *Variáveis de ambiente*: `TABLE` = nome da tabela e
   `GEMINI_API_KEY` = a chave (opcional: `GEMINI_MODELS`).
3. **API Gateway → Criar API → API REST** (não a HTTP API): nome `pedromaksonfontesdacosta-agente-api`, regional.
   - *Criar recurso* `chat` e, nele, *Criar método* `POST`: tipo **Função do Lambda**, com **Integração de proxy do Lambda ligada**, apontando para a função acima.
   - *Autorizadores → Criar*: tipo Cognito, user pool do GymFlow, origem do token `Authorization`. Em *Solicitação de método* do `POST`, escolha esse autorizador.
   - No recurso `/chat`, **Habilitar CORS**. Depois, **Implantar API** em um estágio chamado `V1` e copie a URL de invocação
     (`https://<id>.execute-api.us-east-1.amazonaws.com/V1/chat`; o nome do estágio diferencia maiúsculas de minúsculas).
4. **Testar:** em `/chat` → `POST` → aba **Testar**, corpo `{"mensagem": "Meu nome é Pedro", "sessao": "aluno"}`; depois
   `{"mensagem": "Qual é o meu nome? E que horas são?", "sessao": "aluno"}`. A segunda resposta lembra o nome e traz a hora do NTP.br.
   Com um token do Cognito (ID token, no cabeçalho `Authorization`) a mesma URL funciona sem o campo `sessao`.

## Testes

```powershell
pytest
```

Cobrem a leitura da resposta do NTP.br, os quatro fusos, a queda para o relógio do sistema, a memória na mesma
conversa e depois de reiniciar, o isolamento entre sessões e o uso da ferramenta no lugar da hora "de cabeça".
Para a Lambda: memória entre chamadas separadas, sessão por usuário do Cognito, recusas (400, 401 e 502 sem vazar detalhes),
CORS e o formato do item no DynamoDB.
