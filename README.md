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
