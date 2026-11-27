# GymFlow

Sistema de gestão de academia desenvolvido como projeto da disciplina de Desenvolvimento Web (UFERSA). Simula o dia a dia de uma academia com quatro perfis de acesso, cada um com seu próprio painel.

## Perfis e funcionalidades

- **Aluno** — treino do dia, evolução física, frequência (com calendário de check-ins), financeiro (pagamento via Pix) e perfil.
- **Instrutor** — alunos vinculados, edição de treino, registro de avaliações físicas e acompanhamento de frequência.
- **Recepção** — matrícula de novos alunos (com endereço preenchido pelo CEP), check-in manual, controle de pagamentos e troca/renovação de plano.
- **Administrador** — indicadores da academia (receita, inadimplência, frequência), gestão de usuários, planos e relatórios.

## Tecnologias

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vite.dev/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [React Router v6](https://reactrouter.com/)
- [lucide-react](https://lucide.dev/) para ícones

Os dados de alunos, equipe, planos, pagamentos, check-ins e acompanhamento são simulados em memória (`src/data/store.tsx`) — o objetivo é demonstrar a interface e as regras de negócio. Já na nuvem estão o login (Cognito), o assistente de chat e o **perfil do usuário** (foto no S3, dados no DynamoDB). As tabelas DynamoDB para persistir o restante estão descritas em [`docs/modelo-de-dados.md`](docs/modelo-de-dados.md) e são criadas por `backend/dados/criar-tabelas.sh`.

## Dados cadastrais e endereço

Alunos (cadastro pela Recepção) e funcionários (cadastro pelo Administrador) têm os atributos abaixo. Os campos com `*` são obrigatórios e aparecem com asterisco vermelho nos formulários.

| Atributo | Aluno | Funcionário | Observação |
|---|---|---|---|
| Nome completo | * | * | |
| E-mail | * | * | |
| CPF | * | * | máscara `000.000.000-00`, dígitos verificadores conferidos e sem repetição dentro do mesmo grupo (alunos ou equipe) |
| Data de nascimento | * | * | entre 1900 e hoje |
| Sexo | | | Feminino, Masculino, Outro ou Prefiro não informar |
| Data de admissão | — | * | só para a equipe; não pode ser anterior ao nascimento |
| Telefone | | | |
| Instrutor responsável / Perfil de acesso | instrutor | perfil | perfil só se altera pelo botão de editar |
| CEP | * | * | 8 dígitos, com máscara `00000-000` |
| Logradouro | * | * | preenchido pelo CEP |
| Número | * | * | aceita `S/N` |
| Complemento | | | |
| Bairro | * | * | preenchido pelo CEP |
| Cidade | * | * | preenchida pelo CEP |
| UF | * | * | lista das 27 UFs, preenchida pelo CEP |

Consulta de CEP: ao digitar os 8 dígitos, o formulário consulta o [ViaCEP](https://viacep.com.br) (base dos Correios) e preenche logradouro, bairro, cidade e UF; se o ViaCEP falhar ou não conhecer o CEP, usa o [BrasilAPI](https://brasilapi.com.br) como reserva. Os Correios não oferecem API pública aberta, por isso essas duas bases. CEPs gerais de cidade (como `59900-000`) vêm sem rua e bairro, que então são preenchidos à mão. Se nenhum serviço responder, o formulário avisa e o endereço pode ser digitado manualmente. A lógica fica em `src/lib/endereco.ts` e o bloco de campos reutilizável em `src/components/EnderecoFields.tsx`. CPF, data de nascimento e sexo ficam em `src/lib/pessoa.ts` (validação) e `src/components/DadosPessoaisFields.tsx`. Os CPFs dos dados de demonstração são fictícios, apenas com dígitos verificadores válidos. O asterisco vem de `src/components/Obrigatorio.tsx`.

Outros campos obrigatórios marcados com `*`: login (e-mail e senha), recuperação de senha (e-mail, código, nova senha e confirmação), plano (nome e valor) e avaliação física (peso e altura).

## Check-ins e check-ins retroativos

Todos os check-ins ficam em um registro único (`src/data/store.tsx`, regras em `src/lib/checkins.ts`), lido pelas telas do Aluno (Início e Frequência), da Recepção, do Instrutor e do Administrador. Cada lançamento guarda: aluno, data, hora, origem, quem registrou (nome e perfil), quando, e o motivo quando é retroativo.

| Origem | Significado |
|---|---|
| App | feito no dia pelo próprio aluno |
| Recepção | feito no dia pela equipe (check-in manual) |
| Retroativo | lançado depois do dia, pelo aluno ou pela equipe |

Regras:
- um check-in por dia por aluno; bloqueado com mensalidade em atraso ou matrícula vencida;
- retroativo: motivo obrigatório (mínimo de 5 caracteres), sem data futura, sem data anterior ao início da matrícula e sem dia que já tenha check-in; **não há limite de dias** para trás;
- o **aluno** registra o próprio retroativo na Frequência (clicando no dia de borda tracejada); a **Recepção** e o **Administrador** registram em Check-in manual (campo de data ou calendário do aluno);
- o retroativo conta na sequência de dias seguidos e no total do mês, e aparece em amarelo nos calendários;
- **remover** um check-in: o aluno (os dele), a Recepção e o Administrador podem, informando o motivo; o removido deixa de contar, mas continua guardado com quem removeu, quando e por quê;
- o **Instrutor** só consulta (aba Frequência do aluno), com os retroativos destacados;
- o painel do Administrador mostra os check-ins por origem nos últimos 30 dias.

Como os dados são de demonstração, o "hoje" é fixo em 14/09/2026 (`HOJE_DEMO`, em `src/lib/datas.ts`).

## Perfil do usuário (S3 + DynamoDB + HTTP API + Lambda)

Todos os perfis (Aluno, Instrutor, Recepção e Administrador) têm o item **Meu perfil** no menu (`/aluno/perfil`, `/instrutor/perfil`, `/recepcao/perfil`, `/admin/perfil`), montado pelo componente `src/components/PerfilCard.tsx`. Nele o usuário altera a foto ("Trocar foto") e os dados pessoais e de contato: telefone, e-mail de contato, data de nascimento, sexo e endereço (com o CEP preenchendo o endereço). Os campos abrem **travados**; o botão **Editar** libera todos, **menos o CPF**, que só a recepção ou a administração altera. Ao editar aparecem "Cancelar" e "Salvar alterações". A **senha** tem o botão "Alterar senha" (senha atual + nova, ou "Esqueci minha senha atual" com código por e-mail); para quem entrou com o Google o botão não aparece, porque a senha é da conta Google. O botão
abre a janela "Foto de perfil": a imagem atual fica no centro e "Selecionar imagem" abre o seletor de arquivos. A
escolha aparece como prévia na própria janela e só é enviada ao clicar em "Confirmar" ("Cancelar" descarta). A foto
exibida segue a ordem: foto enviada (S3), foto do login com Google (se o Cognito a repassar) e, por fim, as iniciais.

Recursos AWS (região `us-east-1`, criados pelo console):

| Recurso | Nome | Uso |
|---|---|---|
| Bucket S3 | `pedromaksonfontesdacosta-profile-2026.2` | fotos em `profile/<sub>.<jpg, png ou webp>`; privado, acesso público bloqueado |
| Tabela DynamoDB | `pedromaksonfontesdacosta-message-2026.2` | um item por usuário (chave `userId` = `sub` do Cognito) com telefone, e-mail de contato e chave da foto |
| Lambda | `pedromaksonfontesdacosta-profile` | código em `backend/perfil/index.mjs`; variáveis `BUCKET` e `TABLE`; usa a `LabRole` |
| HTTP API | `pedromaksonfontesdacosta-profile-api` | rotas `PUT /profile` e `GET /profile`, JWT authorizer do Cognito e CORS |

Fluxo:

1. O navegador reduz a imagem (lado maior de 512 px, JPEG) e chama `PUT /profile` com JSON
   (`telefone`, `emailContato`, `nascimento`, `sexo`, `endereco` e/ou `foto.dados` em base64) e `Authorization: Bearer <ID token do Cognito>`.
2. O **JWT authorizer** valida o token (emissor = user pool, audience = app client). Sem token válido, 401.
3. A Lambda valida os campos (telefone, e-mail, nascimento, sexo e endereço), confere o formato da foto pelo conteúdo (JPEG, PNG ou WebP), limita a foto a 3 MB, grava a imagem no S3 e o item no
   DynamoDB. Como o `sub` vem do token, ninguém lê nem altera o perfil de outro usuário.
4. `GET /profile` devolve o item do DynamoDB e a foto do S3. O app chama o GET ao entrar e depois de cada envio.

O nome do bucket tem ponto, então o cliente S3 da Lambda usa `forcePathStyle`.

Teste da Lambda sem a AWS: `node --test test/` em `backend/perfil`.

Variável do front (`.env.local` e Amplify, em Hospedagem → Variáveis de ambiente): `VITE_PROFILE_API_URL` com o
endereço base da API (sem `/profile`). Sem ela, o "Trocar foto" e o "Salvar alterações" avisam que o envio não está
configurado neste ambiente.

## Autenticação

O login usa o Amazon Cognito (User Pool). Os perfis são grupos do Cognito (`Aluno`, `Instrutor`, `Recepcionista`, `Administrador`) e cada área do sistema só abre para o perfil correspondente.

Crie um arquivo `.env.local` na raiz, copiando o `.env.example`:

```
VITE_COGNITO_USER_POOL_ID=...
VITE_COGNITO_CLIENT_ID=...
VITE_COGNITO_DOMAIN=...   # domínio do Cognito, usado no login com Google
```

O login com Google é federado pelo Cognito (provedor de identidade Google, fluxo de código de autorização). A chave secreta do Google fica somente no Cognito, nunca no código.

No Amplify, cadastre as mesmas variáveis em **Hospedagem → Variáveis de ambiente**.

## Assistente de chat (WebSocket + Lambda + Gemini)

O balão azul no canto inferior direito abre um assistente que responde dúvidas sobre o uso do sistema, de acordo com o perfil e a tela em que o usuário está.

Fluxo:

1. O usuário logado no Cognito tem um ID token; o front abre `wss://api.pedromaksonfontesdacosta.atchin.web.ufersa.dev.br/?token=<idToken>`.
2. O API Gateway (tipo WebSocket, estágio `prod`) valida o token na rota `$connect` com a Lambda `authorizer` (`backend/authorizer.mjs`).
3. Cada pergunta chega pela rota `$default` à Lambda `gymflow-chat` (`backend/chat.mjs`), que responde ao API Gateway na hora e se reinvoca em segundo plano para não depender do limite de 29 s da integração.
4. A Lambda consulta o Google Gemini (tentando uma lista de modelos em ordem, com fallback), usando a base de conhecimento em `backend/conhecimento.mjs`, e devolve a resposta pela API de gerenciamento de conexões (`PostToConnection`).
5. O front recebe a resposta pelo WebSocket e a exibe no balão.

A conexão usa o domínio personalizado `api.…` (certificado no ACM, política TLS 1.2, mapeado para o estágio `prod`).

Variáveis do front (`.env.local` e Amplify): `VITE_WS_URL` (veja `.env.example`). Sem ela, o balão indica que o assistente não está configurado.

Variáveis da Lambda `gymflow-chat`: `GEMINI_API_KEY` (obrigatória, nunca versionada), `GEMINI_MODELS` (opcional, modelos separados por vírgula). Tempo limite recomendado: 60 s. Para publicar a função, envie um `.zip` com `chat.mjs` renomeado para `index.mjs` e o `conhecimento.mjs`.

Ao mudar telas, menus ou regras do sistema, atualize `backend/conhecimento.mjs` para o assistente continuar correto.

## Rodando localmente

```bash
npm install
npm run dev
```

Acesse `http://localhost:5173`.

## Build de produção

```bash
npm run build
```

Gera a pasta `dist/`, pronta para hospedagem estática (o projeto está publicado via AWS Amplify).

## Estrutura

```
src/
  components/   componentes compartilhados (AppShell, modais, toasts)
  data/         store global (mock) e dados estáticos
  layouts/      layouts por perfil (Aluno, Instrutor, Recepção, Admin)
  pages/        telas de cada perfil
backend/
  perfil/       Lambda do PUT/GET /profile (S3 + DynamoDB) e seus testes
  dados/        script que cria as tabelas DynamoDB do projeto
  agente/       agente de IA em Python (Strands Agents + Gemini): lembra da conversa e informa a hora certa (NTP.br)
  chat.mjs, authorizer.mjs, conhecimento.mjs   assistente de chat (Lambdas e base de conhecimento)
docs/           modelo de dados (DynamoDB)
```
