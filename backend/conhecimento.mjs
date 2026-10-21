// Base de conhecimento do assistente. Descreve o GymFlow como ele é hoje; ao mudar
// telas, regras ou menus do sistema, atualize este texto junto.

export const CONHECIMENTO = `
# VISÃO GERAL
O GymFlow é um sistema web de gestão de academia (projeto acadêmico da UFERSA, com dados de demonstração). Tem quatro perfis de acesso: Aluno, Instrutor, Recepcionista e Administrador. Cada perfil entra em uma área própria, com menu lateral próprio. Quem tenta abrir a área de outro perfil é levado de volta ao início do seu próprio perfil.

## Recursos comuns a todos os perfis
- Login: na tela de entrada o usuário informa e-mail e senha, ou usa "Entrar com Google". Conta bloqueada não entra (aparece "Conta bloqueada. Procure o administrador."). Usuário sem perfil de acesso também não entra.
- "Esqueceu sua senha?" (link na tela de login): informa o e-mail, recebe um código de 6 dígitos, digita o código e define a nova senha. A senha precisa ter no mínimo 8 caracteres, uma maiúscula, uma minúscula, um número e um símbolo, e a confirmação deve ser igual. O código expira; se expirar, solicita-se um novo.
- Campos obrigatórios: nos formulários, os campos que precisam ser preenchidos têm um asterisco vermelho (*) ao lado do nome, e as telas avisam quando falta algum.
- Menu lateral: botão para recolher/expandir (no celular abre pelo botão de menu no topo) e o botão "Sair" no fim (antes de desconectar, o sistema pergunta "Sair do sistema?", com os botões "Cancelar" e "Sair").
- Sino de notificações (canto superior direito): abre o painel de notificações, com "Marcar todas como lidas". Os alertas são operacionais e variam por perfil.
- Balão azul-marinho no canto inferior direito: este assistente. Ele só orienta; não executa ações nem mostra dados de outras pessoas.

## Regras de negócio
- Check-in: no máximo um por dia. Fica bloqueado quando a mensalidade está em atraso ou a matrícula está vencida.
- Check-in retroativo (dia que ficou sem check-in): o aluno, a recepção e o administrador podem registrar, sem limite de dias para trás. Exige um motivo (mínimo de 5 caracteres), não aceita data futura, nem anterior ao início da matrícula, nem dia que já tenha check-in, e vale a mesma regra de bloqueio por atraso. O retroativo conta na sequência de dias seguidos e no total do mês, é marcado em amarelo no calendário e fica registrado com quem lançou, quando e o motivo.
- Remover um check-in: o aluno (os dele), a recepção e o administrador podem remover um check-in lançado por engano, informando o motivo (mínimo de 5 caracteres). O removido deixa de contar na sequência e nos totais, mas fica guardado com quem removeu, quando e por quê. O instrutor só consulta.
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
- Frequência: cartão com o mês, o contador "check-ins no mês", as setas de mês, a sequência de dias seguidos e o botão "Fazer check-in" (com as mesmas regras do Início: um por dia, bloqueado com atraso ou matrícula vencida). O calendário marca os dias de check-in em verde, os retroativos em amarelo e o dia de hoje em azul-escuro. Dias passados sem check-in, desde o início da matrícula, aparecem com borda tracejada: clicando, abre "Check-in retroativo", onde se informa o motivo (obrigatório) e confirma em "Registrar check-in". Clicar em um dia com check-in mostra os detalhes (origem, hora, quem registrou e motivo) e o botão "Remover check-in", que pede o motivo da remoção.
- Avaliações físicas: quatro cartões (peso atual, % de gordura, IMC e número de avaliações, com a variação), gráfico "Evolução do peso" (avaliações passadas e a meta) e "Histórico de avaliações" com data, instrutor, peso, altura, % de gordura, medidas (cintura) e observação do instrutor. As avaliações são registradas pelo instrutor, não pelo aluno.
- Financeiro: cartão "Mensalidade atual" com valor, situação e botão "Pagar com Pix"; tabela de parcelas com plano e matrícula, vencimento, parcela, valor, pago em, forma de pagamento e status (Pago, Pendente ou Atrasado).
- Pagar com Pix (no Início ou em Financeiro): abre uma janela com QR Code e o código "copia e cola" (botão "Copiar código Pix"). O botão "Simular pagamento confirmado" conclui o pagamento (na versão real, a confirmação chega do gateway de pagamento); depois a matrícula é atualizada e o check-in é liberado.
- Meu perfil: foto (Trocar foto), telefone, e-mail e nova senha, com "Salvar alterações"; ao lado, "Dados cadastrais" (somente leitura, com cadeado): CPF, data de nascimento, sexo, endereço e os dados da matrícula. O aluno só altera telefone e e-mail; CPF, nascimento, sexo e endereço são corrigidos pela recepção ou administração, e renovar ou trocar de plano também.
- Notificações do aluno: vencimento da mensalidade, incentivo quando passa dias sem check-in e vencimento da matrícula.

# PERFIL INSTRUTOR (menu: Início, Meus alunos)
O instrutor vê apenas os alunos vinculados a ele.
- Início (Painel do instrutor): cartões "Alunos vinculados", "Precisam de atenção" (sem check-in ou treino vencido) e "Avaliações do mês"; abaixo, cartões dos alunos que precisam de atenção, com o motivo e o botão "Abrir aluno".
- Meus alunos: lista com busca (nome, e-mail ou matrícula), mostrando plano, último check-in e alertas; clicar abre o aluno.
- Tela do aluno, com três abas:
  - Treino: "Editor de treino" (divisão A). Dá para editar nome, séries, repetições e carga de cada exercício, adicionar com "+ Exercício", remover com o X e gravar em "Salvar treino".
  - Avaliação: formulário "Nova avaliação física" (peso, altura, % de gordura, cintura e observação; peso e altura são obrigatórios) e botão "Registrar avaliação". Ao lado, "Histórico do aluno" e "Observações do aluno" (campo "Registrar observação…" e botão "Registrar").
  - Frequência: gráfico das últimas 8 semanas, média de check-ins por semana e a meta do plano, mais o calendário do mês do aluno (somente consulta), com os check-ins retroativos destacados em amarelo; clicar em um dia mostra os detalhes.
- Notificações do instrutor: aluno sem check-in há dias, avaliação a vencer e treino sem atualização.

# PERFIL RECEPCIONISTA (menu: Início, Alunos, Check-in manual, Pagamentos)
- Início: cartões "Check-ins hoje" (autoatendimento e recepção), "Pagamentos pendentes" (quantidade e valor em aberto), "Matrículas vencendo" e "Novas matrículas". Lista "Matrículas vencendo" com o botão "Renovar" e "Ver todas"; lista "Check-ins recentes" (nome, hora, origem App ou Recepção) com o botão "Registrar check-in manual".
- Alunos: lista com busca por nome, e-mail ou matrícula e botão "Novo aluno". Para cada aluno: matrícula (e de qual é a renovação), plano, "Matrícula até", situação financeira, selo "Acesso bloqueado" quando for o caso. Ações por ícones: editar dados do aluno (lápis), trocar plano (setas) e bloquear ou desbloquear o acesso (cadeado).
- Nova matrícula (Novo aluno) em 2 passos: 1) Dados do aluno: nome completo, e-mail, CPF e data de nascimento (obrigatórios; o CPF é conferido e não pode repetir entre alunos), sexo (opcional), telefone, instrutor responsável e o endereço (CEP, número, logradouro, bairro, cidade e UF obrigatórios; complemento opcional). Ao digitar o CEP (8 dígitos), o sistema consulta o ViaCEP e preenche logradouro, bairro, cidade e UF; falta só informar o número. Se o CEP não for encontrado, a consulta falhar ou for um CEP geral da cidade (sem rua), o endereço é preenchido à mão; 2) Matrícula e plano: escolher o plano, informar o início e o dia de vencimento da mensalidade (todo dia 05, 10, 15 ou 20) e "Concluir matrícula". A forma de pagamento é definida na hora de pagar. Ao editar um aluno existente (ícone de lápis), a aba "Matrícula e plano" mostra os planos com o atual marcado e travados; o botão "Editar plano" (canto superior direito do cartão) libera a troca, e "Cancelar troca" trava de novo. Com o plano liberado, escolhendo outro plano aparecem o vencimento das novas parcelas e o resumo "O que acontece ao confirmar", e o botão vira "Salvar e trocar plano" (faz o mesmo que "Trocar plano"). Mantendo o plano atual, só os dados cadastrais são salvos.
- Trocar plano / Renovar matrícula: janela com os planos, o dia de vencimento das novas parcelas e o resumo "O que acontece ao confirmar"; "Confirmar troca" leva à tela de Pagamentos. Renovar também está no Início, em "Matrículas vencendo". Não é possível trocar para o mesmo plano, exceto na renovação.
- Check-in manual: tem o campo "Data do check-in" (padrão hoje; não aceita data futura) e, quando a data não é hoje, o campo "Motivo do retroativo" (obrigatório). Busca o aluno e mostra a situação para a data escolhida (liberado, check-in já feito, liberado com cobrança em aberto, bloqueado por mensalidade atrasada ou matrícula vencida); o botão "Registrar" faz o check-in, e fica desabilitado para inadimplente ou quem já tem check-in naquele dia. O ícone de calendário em cada aluno abre o calendário de frequência dele: clicar em um dia passado com borda tracejada abre o registro retroativo, e clicar em um dia com check-in mostra os detalhes (também o botão "Remover check-in", com motivo). O Administrador usa a mesma tela, com as mesmas opções.
- Pagamentos: filtros "Mês atual", "Em atraso", "Futuras" e "Todas", busca por aluno ou plano e contador de cobranças em aberto. Tabela com aluno, plano e parcela, vencimento, valor, pago em e forma, status (Pago, Pendente, Atrasado) e ação. Para baixar um pagamento: escolher a forma (Pix, Cartão ou Dinheiro) e clicar em "Registrar"; o aluno volta a "Em dia".
- Notificações da recepção: aluno com mensalidade vencida e check-in bloqueado, matrículas vencendo e movimento do dia.

# PERFIL ADMINISTRADOR
O menu tem três seções. Além da gestão, o administrador acessa as telas da recepção e do instrutor.
- Gestão
  - Indicadores (Painel de indicadores): períodos 7, 30 e 90 dias; cartões Receita, Inadimplência, Matrículas e Frequência média, com a variação; gráficos "Receita por mês" e "Frequência por faixa de horário"; botão "Relatório completo" abre Relatórios. Há também o bloco "Check-ins por origem — últimos 30 dias" (App, Recepção e Retroativo).
  - Usuários e perfis (Usuários e permissões): lista da equipe (instrutores, recepcionistas e administradores) com busca. "Novo usuário" e o ícone de lápis abrem uma tela própria de cadastro (não é pop-up), no mesmo formato da edição do aluno: nome, e-mail, CPF, data de nascimento e data de admissão obrigatórios (o CPF é conferido e não pode repetir na equipe; a admissão não pode ser anterior ao nascimento), sexo opcional, telefone, perfil de acesso e o endereço completo, com o mesmo preenchimento automático pelo CEP; os botões são "Cancelar" e "Cadastrar usuário" (ou "Salvar alterações" ao editar). O ícone de lápis para editar (é só por ele que se altera o perfil de acesso; na lista o perfil aparece apenas para consulta) e o ícone de cadeado para bloquear ou desbloquear (bloqueado não consegue entrar). Alunos são cadastrados pela recepção, não aqui.
  - Planos: cartões dos planos com valor, duração, regra de cancelamento e quantidade de alunos ativos; "Editar plano" e "Novo plano" (nome e valor obrigatórios; duração e regra opcionais).
  - Relatórios: Receita e inadimplência, Frequência de treino, Matrículas e Avaliações físicas. Escolhe-se o período (7, 30 ou 90 dias) e clica-se em "Exportar PDF"; as "Exportações recentes" ficam listadas abaixo. O relatório de Frequência de treino também separa os check-ins por origem (App, Recepção e Retroativo).
- Recepção (mesmas telas do perfil Recepcionista): Alunos e matrículas, Check-in manual e Pagamentos.
- Instrutor: Treinos e avaliações, que lista todos os alunos da academia (e não só os de um instrutor) e abre a mesma tela do aluno do instrutor (abas Treino, Avaliação e Frequência).
- Notificações do administrador: indicadores (como inadimplência subindo), relatórios disponíveis e bloqueios de usuários.

# COMO FAZER (tarefas comuns)
- Fazer check-in (aluno): Início > botão "Fazer check-in". Se estiver bloqueado, regularizar a mensalidade ou renovar a matrícula na recepção. Alternativa: pedir o check-in manual na recepção.
- Registrar um check-in de um dia que ficou sem marcar (aluno): Frequência > clicar no dia com borda tracejada > informar o motivo > "Registrar check-in".
- Registrar check-in retroativo de um aluno (recepção ou administrador): Check-in manual > escolher a data e informar o motivo > "Registrar", ou abrir o calendário do aluno (ícone de calendário) e clicar no dia.
- Remover um check-in lançado por engano (aluno, recepção ou administrador): Frequência (aluno) ou Check-in manual > ícone de calendário do aluno > clicar no dia > informar o motivo da remoção > "Remover check-in".
- Pagar a mensalidade (aluno): Financeiro > "Pagar com Pix" (ou no Início, cartão Financeiro). Na recepção também dá para pagar em cartão ou dinheiro.
- Ver ou conferir o treino (aluno): Meu treino. Para alterar, falar com o instrutor.
- Ver evolução física (aluno): Avaliações físicas.
- Recuperar senha: "Esqueceu sua senha?" na tela de login.
- Renovar matrícula ou trocar de plano: feito pela recepção ou administração, em Alunos (ícone de trocar plano) ou, para renovar, no Início da recepção em "Matrículas vencendo".
- Matricular um aluno novo: Recepção > Alunos > "Novo aluno" (inclui o endereço, preenchido pelo CEP).
- Corrigir o endereço de um aluno: Recepção > Alunos > ícone de lápis (os dados do aluno abrem com o endereço). Para funcionários: Administrador > Usuários e perfis > ícone de lápis.
- Bloquear ou liberar um aluno: Recepção > Alunos > ícone de cadeado. Para a equipe: Administrador > Usuários e perfis > ícone de cadeado.
- Dar baixa em um pagamento: Pagamentos > escolher a forma > "Registrar".
- Registrar avaliação física: Instrutor > Meus alunos > escolher o aluno > aba Avaliação.
- Editar treino: Instrutor > Meus alunos > escolher o aluno > aba Treino > "Salvar treino".
- Criar ou editar plano: Administrador > Planos.
- Cadastrar funcionário ou mudar perfil: Administrador > Usuários e perfis > "Novo usuário", ou o ícone de lápis para mudar o perfil de acesso de quem já existe.
- Gerar relatório em PDF: Administrador > Relatórios > "Exportar PDF".
`;
