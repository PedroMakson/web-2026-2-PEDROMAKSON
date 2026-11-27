> **Estado atual (nov/2026):** o app lê e grava nas tabelas pela API de dados (`backend/dados/api/index.mjs`, rotas `GET /dados`,
> `PUT /dados/{colecao}/{id}` e `DELETE /dados/pagamentos/{id}`). Os documentos têm o **formato do app** (`src/data/store.tsx`:
> ids numéricos, valores como texto `R$ 129,90`, datas dos pagamentos em `DD/MM/AAAA`) mais as chaves de cada tabela, e não o formato
> idealizado nas seções abaixo, que ficam como referência de uma futura normalização. O que vale hoje:
>
> | Coleção do app | Tabela | Chave | Quem lê | Quem grava |
> |---|---|---|---|---|
> | `alunos` | `pessoas` | `pessoaId` = `A#<id>` | admin e recepção: todos; instrutor: os dele; aluno: o próprio | recepção e admin |
> | `usuarios` | `pessoas` | `pessoaId` = `U#<id>` | admin: todos; os demais: só o próprio | admin |
> | `planos` | `planos` | `planoId` | todos | admin |
> | `pagamentos` | `pagamentos` | `pagamentoId` | admin e recepção: todos; aluno: os próprios | recepção e admin; o aluno só marca a própria parcela em aberto como paga via Pix (simulado) |
> | `matriculas` | `matriculas` | `matriculaId` (`2026-0142`) | admin e recepção (instrutor e aluno não recebem); situação `ATIVA`, `VENCIDA` ou `CANCELADA`; no cancelamento por saída do aluno também `canceladaEm`, `motivo` e `multa` | recepção e admin |
> | `checkins` | `checkins` | `alunoId` + `dataId` (`data#id`) | admin e recepção: todos; instrutor: dos alunos dele; aluno: os próprios | aluno (os próprios), recepção e admin; só dá para acrescentar a remoção, nunca apagar |
> | `treinos` | `treinos` | `alunoId` + `divisao` (A, B, C) | admin; instrutor (dos alunos dele); aluno (o próprio) | instrutor (só dos alunos dele) e admin |
> | `avaliacoes` | `avaliacoes` | `alunoId` + `dataId` (`data#id`) | idem treinos | idem treinos |
> | `observacoes` | `observacoes` | `alunoId` + `criadoEm` | admin e instrutor (dos alunos dele); o aluno **não** vê | instrutor (só dos alunos dele) e admin |
> | `exportacoes` | `exportacoes` | `relatorio` + `criadoEm` | admin | admin (histórico dos PDFs gerados em Relatórios; campos `id`, `relatorio`, `periodo`, `por`, `criadoEm`) |
> | `notificacoes` | `notificacoes` | `destino` (`usuario#<e-mail do login>`, posto pelo servidor) + `criadoEm` | cada pessoa lê só as suas | cada pessoa grava só as suas (as notificações que já leu; o texto é calculado dos dados pelo app) |
>
> A ligação entre o login (Cognito) e o cadastro é o atributo `loginEmails` de `alunos` e `usuarios`, gravado só pela carga inicial
> (`backend/dados/carregar-demo.mjs`) e nunca aceito pela API. Para voltar à demonstração limpa depois de testes: `node backend/dados/carregar-demo.mjs --forcar --limpar` (regrava o demo e apaga o que não faz parte dele).

# Modelo de dados (DynamoDB)

Tabelas do GymFlow na conta do laboratório do projeto (`us-east-1`), todas no modo **on-demand**. O nome segue o padrão
da disciplina: `pedromaksonfontesdacosta-<tabela>-2026.2`. O script que cria tudo é `backend/dados/criar-tabelas.sh`
(pode rodar de novo: o que já existe é pulado).

O DynamoDB só exige a definição das **chaves** (e dos índices) ao criar a tabela; os demais atributos são livres. Por isso este
documento é o contrato: a API deve gravar exatamente os atributos abaixo, com estes tipos, e recusar o resto.

## Situação

| Dado | Onde está hoje |
|---|---|
| Foto, telefone e e-mail de contato de cada usuário | **Na nuvem**: tabela `message` + bucket S3 `profile` (Avaliação 11) |
| Alunos, equipe, planos, matrículas, pagamentos, check-ins, treinos, avaliações, observações, notificações e exportações | **Em memória**, no `src/data/store.tsx` e em constantes, com dados de demonstração. As tabelas abaixo já existem para recebê-los, mas o app ainda não lê nem grava nelas: falta a API (Lambda + API Gateway) e a troca do store |

## Convenções

- **Tipos**: `S` texto, `N` número, `BOOL` verdadeiro/falso, `M` mapa (objeto), `L` lista. **Obrigatório**: *sim* = a API recusa a gravação sem ele; *não* = pode faltar.
- **Identificadores** (`...Id`): texto, UUID gerado pela API. Os `id` numéricos do store viram UUIDs ao migrar; a matrícula usa o próprio código (`2026-0142`).
- **Datas**: ISO `AAAA-MM-DD`. **Instantes**: ISO 8601 em UTC (`2026-09-14T08:30:00Z`). Ordenam como texto, por isso servem de chave de ordenação.
- **Dinheiro**: centavos em inteiro (`12990`), nunca texto como `"R$ 129,90"`.
- **Quem é quem**: `pessoas.cognitoSub` liga o cadastro ao usuário do Cognito (o `sub` do token). É o mesmo `sub` que a tabela `message` usa como chave.
- Os campos de texto livre do store (`ultimo`, `alerta`, `fin`, `checkin`) **não são gravados**: são derivados dos check-ins e dos pagamentos.

## Tabelas

### `message`: perfil do usuário (já em uso)
Gravada por `PUT /profile` e lida por `GET /profile`; a foto fica em `s3://…-profile-2026.2/profile/<sub>.<jpg|png|webp>`.
- **Chave**: `userId` (partição).
- O endereço é guardado em atributos de texto soltos (`cep`, `logradouro`, `numero`…): ou vão todos os campos obrigatórios do endereço juntos, ou a API recusa (400). O CPF **não** está aqui: o usuário não o altera (só a recepção ou a administração).
- Esses campos são o que o usuário corrige no "Meu perfil". Quando a API de `pessoas` existir, ela passa a ser a fonte do cadastro e estes valores migram para lá.

| Atributo | Tipo | Obrigatório | Observação / exemplo |
|---|---|---|---|
| `userId` | S | sim | `sub` do Cognito: `a4085498-10d1-700d-52ee-271de9466ca8` |
| `email` | S | sim | do token: `maksonjp080@gmail.com` |
| `nome` | S | sim | do token: `Pedro Makson` |
| `telefone` | S | não | `(84) 99812-4477` (até 30 caracteres: dígitos, `+ ( ) - .` e espaço) |
| `emailContato` | S | não | `pedro@email.com` |
| `nascimento` | S | não | data `AAAA-MM-DD`, entre 1900 e hoje: `2001-05-14` |
| `sexo` | S | não | `Feminino`, `Masculino`, `Outro`, `Prefiro não informar` ou vazio |
| `cep` | S | com endereço | `59900-000` (a API normaliza para `00000-000`) |
| `logradouro` | S | com endereço | `Rua das Flores` (até 100 caracteres) |
| `numero` | S | com endereço | `120` ou `S/N` |
| `complemento` | S | não | `Apto 2` (até 60 caracteres; vazio se não houver) |
| `bairro` | S | com endereço | `Centro` |
| `cidade` | S | com endereço | `Pau dos Ferros` |
| `uf` | S | com endereço | uma das 27 UFs |
| `fotoKey` | S | não | `profile/a4085498-….jpg` |
| `fotoAtualizadaEm` | S | não | instante ISO |
| `atualizadoEm` | S | sim | instante ISO |

### `pessoas`: alunos e equipe (`Aluno` e `Usuario` do store)
- **Chave**: `pessoaId`.
- **Índices**: `por-email` (`email`), `por-perfil` (`perfil` + `nome`, para listar alunos ou a equipe em ordem alfabética).

| Atributo | Tipo | Obrigatório | Observação / exemplo |
|---|---|---|---|
| `pessoaId` | S | sim | UUID |
| `nome` | S | sim | `Ana Beatriz Lima` |
| `email` | S | sim | minúsculo, único: `ana.lima@email.com` |
| `perfil` | S | sim | `Aluno`, `Instrutor`, `Recepcionista` ou `Administrador` |
| `ativo` | BOOL | sim | acesso liberado (`true`) ou bloqueado |
| `cpf` | S | sim | `390.533.447-05`, dígitos verificadores válidos, único por grupo (alunos ou equipe) |
| `nascimento` | S | sim | data, entre 1900 e hoje |
| `sexo` | S | não | `Feminino`, `Masculino`, `Outro` ou `Prefiro não informar` |
| `tel` | S | não | `(84) 99123-2211` |
| `endereco` | M | sim | `cep` (`59900-000`), `logradouro`, `numero` (aceita `S/N`), `complemento` (opcional), `bairro`, `cidade`, `uf` (uma das 27) |
| `admissao` | S | só equipe | data, não anterior ao nascimento |
| `instrutorId` | S | só aluno | `pessoaId` do instrutor responsável |
| `cognitoSub` | S | não | preenchido no primeiro login |

### `planos`
- **Chave**: `planoId`.

| Atributo | Tipo | Obrigatório | Observação / exemplo |
|---|---|---|---|
| `planoId` | S | sim | UUID |
| `nome` | S | sim | `Trimestral` |
| `valorCentavos` | N | sim | `34900` (valor total do plano) |
| `duracaoMeses` | N | não | `3` (padrão 1) |
| `regra` | S | não | `Multa de 10% sobre as parcelas restantes.` |

A quantidade de alunos "ativos" de cada plano é contada nas matrículas, não gravada.

### `matriculas`
- **Chave**: `matriculaId` (código, ex.: `2026-0142`).
- **Índice**: `por-aluno` (`alunoId` + `inicio`).

| Atributo | Tipo | Obrigatório | Observação / exemplo |
|---|---|---|---|
| `matriculaId` | S | sim | `2026-0142` |
| `alunoId` | S | sim | `pessoaId` do aluno |
| `planoId` | S | sim | |
| `inicio` | S | sim | data: `2026-09-02` |
| `fim` | S | sim | vencimento da matrícula: `2026-10-02` |
| `matriculaAnteriorId` | S | não | a matrícula que esta renova: `2025-0388` |
| `situacao` | S | sim | `ATIVA`, `VENCIDA` ou `CANCELADA` |

### `pagamentos`
- **Chave**: `pagamentoId`.
- **Índices**: `por-aluno` (`alunoId` + `vencimento`), `por-situacao` (`situacao` + `vencimento`, para as telas "em aberto" da Recepção).

| Atributo | Tipo | Obrigatório | Observação / exemplo |
|---|---|---|---|
| `pagamentoId` | S | sim | UUID |
| `alunoId` | S | sim | |
| `matriculaId` | S | sim | |
| `planoId` | S | sim | |
| `parcela` | S | sim | `2/3` ou `Única` |
| `valorCentavos` | N | sim | `11633` |
| `vencimento` | S | sim | data: `2026-09-20` |
| `situacao` | S | sim | `PENDENTE` ou `PAGO` |
| `pagoEm` | S | se `PAGO` | data |
| `forma` | S | se `PAGO` | `Pix`, `Cartão` ou `Dinheiro` |
| `origem` | S | se `PAGO` | `App` ou `Recepção` |

"Atrasado" não é gravado: é `PENDENTE` com `vencimento` anterior a hoje.

### `checkins`
- **Chave**: `alunoId` (partição) + `dataId` (ordenação), então a consulta de um aluno já vem em ordem de data.
- **Índice**: `por-data` (`data` + `alunoId`, para "check-ins de hoje" e os indicadores).

| Atributo | Tipo | Obrigatório | Observação / exemplo |
|---|---|---|---|
| `alunoId` | S | sim | |
| `dataId` | S | sim | `2026-09-14#<uuid>` |
| `data` | S | sim | data do check-in: `2026-09-14` |
| `hora` | S | não | `07:42`; vazio nos retroativos |
| `origem` | S | sim | `App`, `Recepção` ou `Retroativo` |
| `registradoPor` | S | sim | nome de quem registrou |
| `perfilRegistro` | S | sim | `Aluno`, `Recepcionista` ou `Administrador` |
| `registradoEm` | S | sim | instante ISO |
| `motivo` | S | se `Retroativo` | mínimo de 5 caracteres |
| `cancelado` | M | não | `por`, `em` (instante) e `motivo`: o removido continua guardado |

Um check-in vigente por dia por aluno é regra da aplicação, não do banco.

### `treinos`
- **Chave**: `alunoId` + `divisao`.

| Atributo | Tipo | Obrigatório | Observação / exemplo |
|---|---|---|---|
| `alunoId` | S | sim | |
| `divisao` | S | sim | `A`, `B` ou `C` |
| `titulo` | S | sim | `Peito e tríceps` |
| `exercicios` | L | sim | cada item: `nome`, `series` (`4`), `reps` (`8-10`), `carga` (`40 kg`) |
| `atualizadoPor` | S | sim | nome do instrutor |
| `atualizadoEm` | S | sim | instante ISO; a "idade do treino" vem daqui e gera o alerta "Treino desatualizado" |

### `avaliacoes`
- **Chave**: `alunoId` + `dataId`.

| Atributo | Tipo | Obrigatório | Observação / exemplo |
|---|---|---|---|
| `alunoId` | S | sim | |
| `dataId` | S | sim | `2026-08-12#<uuid>` |
| `instrutor` | S | sim | `Carla Menezes` |
| `pesoKg` | N | sim | `79.2` |
| `alturaM` | N | sim | `1.78` |
| `gorduraPct` | N | não | `19.4` |
| `cinturaCm` | N | não | `86` |
| `obs` | S | não | texto livre |

O IMC é calculado a partir do peso e da altura.

### `observacoes`
- **Chave**: `alunoId` + `criadoEm`.

| Atributo | Tipo | Obrigatório | Observação / exemplo |
|---|---|---|---|
| `alunoId` | S | sim | |
| `criadoEm` | S | sim | instante ISO |
| `autor` | S | sim | `Carla Menezes` |
| `texto` | S | sim | |

### `notificacoes`
- **Chave**: `destino` + `criadoEm`.

| Atributo | Tipo | Obrigatório | Observação / exemplo |
|---|---|---|---|
| `destino` | S | sim | `perfil#Recepcionista`, `perfil#Administrador`… ou `usuario#<sub>` |
| `criadoEm` | S | sim | instante ISO |
| `tipo` | S | sim | `Pagamento`, `Matrícula`, `Movimento`, `Aluno`, `Avaliação`, `Treino`, `Indicador`, `Relatório` ou `Usuários` |
| `texto` | S | sim | `Igor Bezerra está com a mensalidade vencida…` |
| `lida` | BOOL | sim | |

Hoje os textos são calculados dos dados pelo app (`src/lib/notificacoes.ts`) e a tabela guarda só o que cada pessoa já leu (`destino`, `criadoEm` = instante da leitura, `tipo`, `texto`, `lida`).

### `exportacoes`
- **Chave**: `relatorio` + `criadoEm`.

| Atributo | Tipo | Obrigatório | Observação / exemplo |
|---|---|---|---|
| `relatorio` | S | sim | `Receita e inadimplência`, `Frequência de treino`, `Matrículas` ou `Avaliações físicas` |
| `criadoEm` | S | sim | instante ISO |
| `periodo` | S | sim | `7`, `30` ou `90` (dias) |
| `geradoPor` | S | sim | nome do administrador |
| `arquivoKey` | S | sim | PDF no S3 |

### `sessoes`: memória do agente de IA (Strands Agents)
Gravada pela Lambda do `POST /chat` (`backend/agente/lambda_chat.py`): a Lambda não guarda estado, então o histórico da conversa
de cada usuário fica aqui.
- **Chave**: `sessaoId` (partição).

| Atributo | Tipo | Obrigatório | Observação / exemplo |
|---|---|---|---|
| `sessaoId` | S | sim | `usuario-<sub do Cognito>` (ou `teste-<nome>` em chamadas sem login, como no teste do console) |
| `mensagens` | S | sim | histórico em JSON (formato de mensagens do Strands: texto, chamadas de ferramenta e resultados), até as últimas 20 |
| `atualizadoEm` | S | sim | instante ISO |
| `expira` | N | sim | segundos desde 1970 (TTL ligado): a conversa some 30 dias depois da última mensagem |

## Fora do banco por enquanto
- **Mensagens do chat do assistente do sistema** (WebSocket + Gemini): esse assistente não guarda histórico; cada pergunta é respondida na hora. A memória só existe no agente Strands (tabela `sessoes`).
- **Senhas e contas**: ficam no Cognito, nunca em tabela.

## Próximo passo para o app usar as tabelas
1. Uma Lambda por área (pessoas, matrículas e pagamentos, check-ins, acompanhamento do aluno), com rotas na HTTP API do projeto e o mesmo JWT authorizer.
2. A API checa o perfil do token (grupo do Cognito) antes de cada operação: aluno só lê os próprios dados; instrutor, os alunos vinculados.
3. O `StoreProvider` passa a ler e gravar pela API, mantendo as regras de `src/lib/checkins.ts`.
