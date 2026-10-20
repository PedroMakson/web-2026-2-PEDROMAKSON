// Base de conhecimento do assistente. Descreve o GymFlow como ele é hoje; ao mudar
// telas, regras ou menus do sistema, atualize este texto junto.

export const CONHECIMENTO = `
# VISÃO GERAL
O GymFlow é um sistema web de gestão de academia (projeto acadêmico da UFERSA, com dados de demonstração). Tem quatro perfis de acesso: Aluno, Instrutor, Recepcionista e Administrador. Cada perfil entra em uma área própria, com menu lateral próprio. Quem tenta abrir a área de outro perfil é levado de volta ao início do seu próprio perfil.

## Recursos comuns a todos os perfis
- Login: na tela de entrada o usuário informa e-mail e senha, ou usa "Entrar com Google". Conta bloqueada não entra (aparece "Conta bloqueada. Procure o administrador."). Usuário sem perfil de acesso também não entra.
- "Esqueceu sua senha?" (link na tela de login): informa o e-mail, recebe um código de 6 dígitos, digita o código e define a nova senha. A senha precisa ter no mínimo 8 caracteres, uma maiúscula, uma minúscula, um número e um símbolo, e a confirmação deve ser igual. O código expira; se expirar, solicita-se um novo.
- Menu lateral: botão para recolher/expandir (no celular abre pelo botão de menu no topo) e o botão "Sair" no fim.
- Sino de notificações (canto superior direito): abre o painel de notificações, com "Marcar todas como lidas". Os alertas são operacionais e variam por perfil.
- Balão azul-marinho no canto inferior direito: este assistente. Ele só orienta; não executa ações nem mostra dados de outras pessoas.

## Regras de negócio
- Check-in: no máximo um por dia. Fica bloqueado quando a mensalidade está em atraso ou a matrícula está vencida. Cobrança em aberto mas ainda dentro do prazo não bloqueia.
- Aluno inadimplente (mensalidade em atraso) é bloqueado no check-in, inclusive no manual da recepção.
- Conta bloqueada (por recepção ou administração) tem o login negado.
- Troca de plano ou renovação encerra a matrícula atual e cria uma nova que referencia a anterior; treino, avaliações e check-ins são preservados, as parcelas já pagas ficam no histórico, as em aberto do plano antigo são canceladas e novas parcelas são geradas.
- Somente o instrutor vinculado ao aluno edita o treino dele.
- Plano, preço e perfil de acesso só podem ser alterados pela recepção ou pela administração; o aluno não altera.
- Alterações financeiras e de cadastro ficam registradas com usuário e horário.
- Pagamento por Pix: a confirmação atualiza a matrícula e libera o check-in.

## Planos de exemplo (editáveis pelo administrador)
- Mensal Fit: R$ 129,90, 1 mês. Cancelamento antecipado: carência de 30 dias.
- Trimestral: R$ 349,00, 3 meses (3 parcelas de R$ 116,33). Multa de 10% sobre as parcelas restantes.
- Anual: R$ 1.190,00, 12 meses. Multa de 15% ou transferência de titularidade.

# PERFIL ALUNO (menu: Início, Meu treino, Frequência, Avaliações físicas, Financeiro, Meu perfil)
O aluno só consulta e faz o próprio check-in e pagamento; não edita treino nem avaliações.
- Início: cartão "Check-in de hoje" com a sequência de dias seguidos, mensagem do estado do check-in e o botão "Fazer check-in" (vira "Check-in feito" depois, ou "Check-in bloqueado" se houver atraso ou matrícula vencida). Cartão Financeiro (cobrança em aberto com valor e vencimento e botão "Pagar com Pix", ou "Mensalidade em dia"). Cartão "Treino de hoje" (divisão, quantidade de exercícios, duração estimada) com "Ver treino completo". Gráfico "Frequência — últimos 14 dias" e cartão "Minha matrícula" (matrícula, status, plano, início, válida até, renovação de, instrutor).
- Meu treino: ficha prescrita pelo instrutor, com botões das divisões A, B e C. Cada divisão lista exercício, séries, repetições e carga. Mostra quem prescreveu e a data da última atualização.
- Frequência: calendário do mês com os dias de check-in marcados e o dia de hoje destacado, contador "check-ins no mês" e setas para mês anterior e próximo.
- Avaliações físicas: quatro cartões (peso atual, % de gordura, IMC e número de avaliações, com a variação), gráfico "Evolução do peso" (avaliações passadas e a meta) e "Histórico de avaliações" com data, instrutor, peso, altura, % de gordura, medidas (cintura) e observação do instrutor. As avaliações são registradas pelo instrutor, não pelo aluno.
- Financeiro: cartão "Mensalidade atual" com valor, situação e botão "Pagar com Pix"; tabela de parcelas com plano e matrícula, vencimento, parcela, valor, pago em, forma de pagamento e status (Pago, Pendente ou Atrasado).
- Pagar com Pix (no Início ou em Financeiro): abre uma janela com QR Code e o código "copia e cola" (botão "Copiar código Pix"). O botão "Simular pagamento confirmado" conclui o pagamento (na versão real, a confirmação chega do gateway de pagamento); depois a matrícula é atualizada e o check-in é liberado.
- Meu perfil: foto (Trocar foto), telefone, e-mail e nova senha, com "Salvar alterações"; ao lado, "Dados cadastrais" (somente leitura). Renovar ou trocar de plano é feito na recepção.
- Notificações do aluno: vencimento da mensalidade, incentivo quando passa dias sem check-in e vencimento da matrícula.

# PERFIL INSTRUTOR (menu: Início, Meus alunos)
O instrutor vê apenas os alunos vinculados a ele.
- Início (Painel do instrutor): cartões "Alunos vinculados", "Precisam de atenção" (sem check-in ou treino vencido) e "Avaliações do mês"; abaixo, cartões dos alunos que precisam de atenção, com o motivo e o botão "Abrir aluno".
- Meus alunos: lista com busca (nome, e-mail ou matrícula), mostrando plano, último check-in e alertas; clicar abre o aluno.
- Tela do aluno, com três abas:
  - Treino: "Editor de treino" (divisão A). Dá para editar nome, séries, repetições e carga de cada exercício, adicionar com "+ Exercício", remover com o X e gravar em "Salvar treino".
  - Avaliação: formulário "Nova avaliação física" (peso, altura, % de gordura, cintura e observação; peso e altura são obrigatórios) e botão "Registrar avaliação". Ao lado, "Histórico do aluno" e "Observações do aluno" (campo "Registrar observação…" e botão "Registrar").
  - Frequência: gráfico das últimas 8 semanas, média de check-ins por semana e a meta do plano.
- Notificações do instrutor: aluno sem check-in há dias, avaliação a vencer e treino sem atualização.

# PERFIL RECEPCIONISTA (menu: Início, Alunos, Check-in manual, Pagamentos)
- Início: cartões "Check-ins hoje" (autoatendimento e recepção), "Pagamentos pendentes" (quantidade e valor em aberto), "Matrículas vencendo" e "Novas matrículas". Lista "Matrículas vencendo" com o botão "Renovar" e "Ver todas"; lista "Check-ins recentes" (nome, hora, origem App ou Recepção) com o botão "Registrar check-in manual".
- Alunos: lista com busca por nome, e-mail ou matrícula e botão "Novo aluno". Para cada aluno: matrícula (e de qual é a renovação), plano, "Matrícula até", situação financeira, selo "Acesso bloqueado" quando for o caso. Ações por ícones: editar dados do aluno (lápis), trocar plano (setas) e bloquear ou desbloquear o acesso (cadeado).
- Nova matrícula (Novo aluno) em 2 passos: 1) Dados do aluno: nome completo, e-mail (obrigatórios), telefone e instrutor responsável; 2) Matrícula e plano: escolher o plano, informar o início e o dia de vencimento da mensalidade (todo dia 05, 10, 15 ou 20) e "Concluir matrícula". A forma de pagamento é definida na hora de pagar. Ao editar um aluno existente, o plano não muda ali: usa-se "Trocar plano" na lista.
- Trocar plano / Renovar matrícula: janela com os planos, o dia de vencimento das novas parcelas e o resumo "O que acontece ao confirmar"; "Confirmar troca" leva à tela de Pagamentos. Renovar também está no Início, em "Matrículas vencendo". Não é possível trocar para o mesmo plano, exceto na renovação.
- Check-in manual: busca o aluno e mostra a situação (liberado, check-in já feito hoje, liberado com cobrança em aberto, bloqueado por mensalidade atrasada); o botão "Registrar" faz o check-in, e fica desabilitado para inadimplente ou quem já fez hoje.
- Pagamentos: filtros "Mês atual", "Em atraso", "Futuras" e "Todas", busca por aluno ou plano e contador de cobranças em aberto. Tabela com aluno, plano e parcela, vencimento, valor, pago em e forma, status (Pago, Pendente, Atrasado) e ação. Para baixar um pagamento: escolher a forma (Pix, Cartão ou Dinheiro) e clicar em "Registrar"; o aluno volta a "Em dia".
- Notificações da recepção: aluno com mensalidade vencida e check-in bloqueado, matrículas vencendo e movimento do dia.

# PERFIL ADMINISTRADOR
O menu tem três seções. Além da gestão, o administrador acessa as telas da recepção e do instrutor.
- Gestão
  - Indicadores (Painel de indicadores): períodos 7, 30 e 90 dias; cartões Receita, Inadimplência, Matrículas e Frequência média, com a variação; gráficos "Receita por mês" e "Frequência por faixa de horário"; botão "Relatório completo" abre Relatórios.
  - Usuários e perfis (Usuários e permissões): lista da equipe (instrutores, recepcionistas e administradores) com busca. "Novo usuário" (nome, e-mail, telefone e perfil de acesso), "Editar", troca do perfil direto na lista e "Bloquear" ou "Desbloquear" (bloqueado não consegue entrar). Alunos são cadastrados pela recepção, não aqui.
  - Planos: cartões dos planos com valor, duração, regra de cancelamento e quantidade de alunos ativos; "Editar plano" e "Novo plano" (nome, valor, duração e regra).
  - Relatórios: Receita e inadimplência, Frequência de treino, Matrículas e Avaliações físicas. Escolhe-se o período (7, 30 ou 90 dias) e clica-se em "Exportar PDF"; as "Exportações recentes" ficam listadas abaixo.
- Recepção (mesmas telas do perfil Recepcionista): Alunos e matrículas, Check-in manual e Pagamentos.
- Instrutor: Treinos e avaliações, que lista todos os alunos da academia (e não só os de um instrutor) e abre a mesma tela do aluno do instrutor (abas Treino, Avaliação e Frequência).
- Notificações do administrador: indicadores (como inadimplência subindo), relatórios disponíveis e bloqueios de usuários.

# COMO FAZER (tarefas comuns)
- Fazer check-in (aluno): Início > botão "Fazer check-in". Se estiver bloqueado, regularizar a mensalidade ou renovar a matrícula na recepção. Alternativa: pedir o check-in manual na recepção.
- Pagar a mensalidade (aluno): Financeiro > "Pagar com Pix" (ou no Início, cartão Financeiro). Na recepção também dá para pagar em cartão ou dinheiro.
- Ver ou conferir o treino (aluno): Meu treino. Para alterar, falar com o instrutor.
- Ver evolução física (aluno): Avaliações físicas.
- Recuperar senha: "Esqueceu sua senha?" na tela de login.
- Renovar matrícula ou trocar de plano: feito pela recepção ou administração, em Alunos (ícone de trocar plano) ou, para renovar, no Início da recepção em "Matrículas vencendo".
- Matricular um aluno novo: Recepção > Alunos > "Novo aluno".
- Bloquear ou liberar um aluno: Recepção > Alunos > ícone de cadeado. Para a equipe: Administrador > Usuários e perfis > Bloquear.
- Dar baixa em um pagamento: Pagamentos > escolher a forma > "Registrar".
- Registrar avaliação física: Instrutor > Meus alunos > escolher o aluno > aba Avaliação.
- Editar treino: Instrutor > Meus alunos > escolher o aluno > aba Treino > "Salvar treino".
- Criar ou editar plano: Administrador > Planos.
- Cadastrar funcionário ou mudar perfil: Administrador > Usuários e perfis.
- Gerar relatório em PDF: Administrador > Relatórios > "Exportar PDF".
`;
