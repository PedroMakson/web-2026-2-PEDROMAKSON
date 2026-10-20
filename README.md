# GymFlow

Sistema de gestão de academia desenvolvido como projeto da disciplina de Desenvolvimento Web (UFERSA). Simula o dia a dia de uma academia com quatro perfis de acesso, cada um com seu próprio painel.

## Perfis e funcionalidades

- **Aluno** — treino do dia, evolução física, frequência (com calendário de check-ins), financeiro (pagamento via Pix) e perfil.
- **Instrutor** — alunos vinculados, edição de treino, registro de avaliações físicas e acompanhamento de frequência.
- **Recepção** — matrícula de novos alunos, check-in manual, controle de pagamentos e troca/renovação de plano.
- **Administrador** — indicadores da academia (receita, inadimplência, frequência), gestão de usuários, planos e relatórios.

## Tecnologias

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vite.dev/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [React Router v6](https://reactrouter.com/)
- [lucide-react](https://lucide.dev/) para ícones

Os dados são simulados em memória (`src/data/store.tsx`), sem backend — o objetivo é demonstrar a interface e as regras de negócio da aplicação.

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
```
