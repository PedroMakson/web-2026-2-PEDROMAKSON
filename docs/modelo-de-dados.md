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

Hoje os textos são fixos nos layouts; com a tabela, o job diário (RF22 a RF24) os gera.

### `exportacoes`
- **Chave**: `relatorio` + `criadoEm`.

| Atributo | Tipo | Obrigatório | Observação / exemplo |
|---|---|---|---|
| `relatorio` | S | sim | `Receita e inadimplência`, `Frequência de treino`, `Matrículas` ou `Avaliações físicas` |
| `criadoEm` | S | sim | instante ISO |
| `periodo` | S | sim | `7`, `30` ou `90` (dias) |
| `geradoPor` | S | sim | nome do administrador |
| `arquivoKey` | S | sim | PDF no S3 |

## Fora do banco por enquanto
- **Mensagens do chat**: o assistente não guarda histórico; cada pergunta é respondida na hora. Se for guardar, entra uma tabela `conversas` (`usuario` + `criadoEm`).
- **Senhas e contas**: ficam no Cognito, nunca em tabela.

## Próximo passo para o app usar as tabelas
1. Uma Lambda por área (pessoas, matrículas e pagamentos, check-ins, acompanhamento do aluno), com rotas na HTTP API do projeto e o mesmo JWT authorizer.
2. A API checa o perfil do token (grupo do Cognito) antes de cada operação: aluno só lê os próprios dados; instrutor, os alunos vinculados.
3. O `StoreProvider` passa a ler e gravar pela API, mantendo as regras de `src/lib/checkins.ts`.
