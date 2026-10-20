import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} from "@aws-sdk/client-apigatewaymanagementapi";
import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
import { CONHECIMENTO } from "./conhecimento.mjs";

const MODELOS = (
  process.env.GEMINI_MODELS ||
  "gemini-3.5-flash,gemini-3.5-flash-lite,gemini-3.7-flash,gemini-3.1-flash-lite"
)
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);
const TENTATIVA_MS = 14000;

const REGRAS = `Você é o assistente do GymFlow, um sistema web de gestão de academia. Ajude o usuário a usar o sistema: onde fica cada tela, o que ela mostra e como executar tarefas.

Como responder:
- Português do Brasil, curto e objetivo. Pode usar **negrito** e listas com "*"; não use títulos, tabelas nem blocos de código.
- Indique caminhos no formato "menu > tela" e use exatamente os nomes de menus, telas e botões da base de conhecimento abaixo.
- Baseie-se somente na base de conhecimento. Se a informação não estiver nela, diga que não tem essa informação e sugira procurar a recepção ou a administração. Nunca invente telas, botões, regras ou valores.
- Responda para o perfil de quem pergunta e não pergunte o perfil quando ele estiver informado. Se a pergunta for sobre uma função de outro perfil, explique que ela é daquele perfil, que o usuário não tem acesso a ela e quem pode ajudar.
- Quando o usuário disser "essa tela", "aqui" ou "isso", considere a tela atual e a conversa anterior.
- Você só orienta: não executa ações e não vê dados de outras pessoas. Se a pergunta não tiver relação com a academia ou com o sistema, diga educadamente que só ajuda com o GymFlow.`;

const DADOS_ALUNO = `Dados que as telas do aluno exibem hoje (demonstração, podem estar desatualizados):
- Matrícula #2026-0142, plano Mensal Fit (R$ 129,90, 1 mês), início 02/09/2026, válida até 02/10/2026, instrutor Carla Menezes. É renovação da matrícula #2025-0388.
- Mensalidade de R$ 129,90 com vencimento em 17/09/2026, em aberto (dentro do prazo, então o check-in não está bloqueado).
- Treino prescrito por Carla Menezes, atualizado em 12/08/2026. Divisão A (peito e tríceps): supino reto com barra, supino inclinado com halteres, crucifixo na máquina, tríceps corda. Divisão B (costas e bíceps): puxada frontal, remada curvada, rosca direta, rosca martelo. Divisão C (pernas e core): agachamento livre, leg press 45°, cadeira extensora, panturrilha em pé.
- Última avaliação (12/08/2026): peso 79,2 kg, altura 1,78 m, 19,4% de gordura, cintura 86 cm. Em 4 meses o peso caiu 4,2 kg (de 83,4 kg para 79,2 kg), a meta é 76,0 kg, o IMC é 25,0 e a próxima avaliação é em outubro de 2026. São 3 avaliações no histórico.`;
const LIMITE_TOTAL_MS = 54000;

const PERFIS = new Set(["Aluno", "Instrutor", "Recepcionista", "Administrador"]);

const TELAS = {
  "/aluno": "Aluno > Início",
  "/aluno/treino": "Aluno > Meu treino",
  "/aluno/frequencia": "Aluno > Frequência",
  "/aluno/avaliacoes": "Aluno > Avaliações físicas",
  "/aluno/financeiro": "Aluno > Financeiro",
  "/aluno/perfil": "Aluno > Meu perfil",
  "/instrutor": "Instrutor > Início",
  "/instrutor/alunos": "Instrutor > Meus alunos",
  "/recepcao": "Recepção > Início",
  "/recepcao/alunos": "Recepção > Alunos",
  "/recepcao/matricula": "Recepção > Matrícula",
  "/recepcao/checkin": "Recepção > Check-in manual",
  "/recepcao/pagamentos": "Recepção > Pagamentos",
  "/admin": "Administrador > Indicadores",
  "/admin/usuarios": "Administrador > Usuários e perfis",
  "/admin/planos": "Administrador > Planos",
  "/admin/relatorios": "Administrador > Relatórios",
  "/admin/alunos": "Administrador > Alunos e matrículas",
  "/admin/checkin": "Administrador > Check-in manual",
  "/admin/pagamentos": "Administrador > Pagamentos",
  "/admin/treinos": "Administrador > Treinos e avaliações",
};

const HISTORICO_MAX = 6;

function telaDe(pagina) {
  if (typeof pagina !== "string") return undefined;
  const caminho = pagina.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  const chave = Object.keys(TELAS)
    .filter((c) => caminho === c || caminho.startsWith(`${c}/`))
    .sort((a, b) => b.length - a.length)[0];
  return chave && TELAS[chave];
}

function historicoDe(bruto) {
  if (!Array.isArray(bruto)) return [];
  const turnos = bruto
    .filter((t) => (t?.role === "user" || t?.role === "model") && typeof t.text === "string")
    .slice(-HISTORICO_MAX)
    .map((t) => ({ role: t.role, parts: [{ text: t.text.slice(0, 800) }] }));
  while (turnos.length && turnos[0].role !== "user") turnos.shift();
  return turnos.filter((t, i) => i === 0 || t.role !== turnos[i - 1].role);
}

function instrucaoPara({ perfil, tela }) {
  let texto = `${REGRAS}\n\n# BASE DE CONHECIMENTO${CONHECIMENTO}`;
  if (perfil === "Aluno") texto += `\n${DADOS_ALUNO}`;
  if (perfil) texto += `\n\nPerfil de quem está perguntando: ${perfil}.`;
  if (tela) texto += `\nTela em que o usuário está agora: ${tela}.`;
  return texto;
}

const lambda = new LambdaClient({});

async function consultar(modelo, { pergunta, perfil, tela, historico }) {
  const resposta = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY,
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: instrucaoPara({ perfil, tela }),
            },
          ],
        },
        contents: [...historico, { role: "user", parts: [{ text: pergunta }] }],
      }),
      signal: AbortSignal.timeout(TENTATIVA_MS),
    },
  );

  if (!resposta.ok) {
    const erro = new Error(`Gemini respondeu ${resposta.status}`);
    erro.status = resposta.status;
    erro.detalhe = (await resposta.text()).slice(0, 300);
    throw erro;
  }

  const dados = await resposta.json();
  const partes = dados.candidates?.[0]?.content?.parts ?? [];
  return partes.map((p) => p.text ?? "").join("") || "Não consegui gerar uma resposta.";
}

async function perguntarAoGemini(contexto) {
  const inicio = Date.now();
  let ultimoErro;

  for (const modelo of MODELOS) {
    if (Date.now() - inicio + TENTATIVA_MS > LIMITE_TOTAL_MS) break;
    try {
      const texto = await consultar(modelo, contexto);
      return { texto, modelo };
    } catch (erro) {
      ultimoErro = erro;
      console.warn("modelo não respondeu, tentando o próximo", {
        modelo,
        ms: Date.now() - inicio,
        nome: erro.name,
        status: erro.status,
        detalhe: erro.detalhe ?? erro.message,
      });
      if (erro.status === 401 || erro.status === 403) break;
    }
  }

  throw ultimoErro ?? new Error("nenhum modelo configurado");
}

async function processar(event) {
  const { connectionId, apiId, stage } = event.requestContext;

  let pergunta = "";
  let perfil;
  let tela;
  let historico = [];
  try {
    const corpo = JSON.parse(event.body ?? "{}");
    pergunta = String(corpo.message ?? "").trim().slice(0, 500);
    perfil = PERFIS.has(corpo.profile) ? corpo.profile : undefined;
    tela = telaDe(corpo.page);
    historico = historicoDe(corpo.history);
  } catch {
    pergunta = "";
  }
  console.log("mensagem recebida", { connectionId, perfil, tela, turnos: historico.length, pergunta });

  const cliente = new ApiGatewayManagementApiClient({
    endpoint: `https://${apiId}.execute-api.${process.env.AWS_REGION}.amazonaws.com/${stage}`,
  });
  const enviar = async (dados) => {
    try {
      await cliente.send(
        new PostToConnectionCommand({
          ConnectionId: connectionId,
          Data: JSON.stringify(dados),
        }),
      );
    } catch (erro) {
      console.warn("não foi possível entregar ao cliente", { nome: erro.name });
    }
  };

  if (!pergunta) {
    await enviar({ type: "error", message: "Mensagem vazia." });
    return;
  }

  const inicio = Date.now();
  console.log("consultando o Gemini", { modelos: MODELOS });
  try {
    const { texto, modelo } = await perguntarAoGemini({ pergunta, perfil, tela, historico });
    console.log("resposta do Gemini enviada", {
      connectionId,
      modelo,
      caracteres: texto.length,
      ms: Date.now() - inicio,
    });
    await enviar({ type: "answer", message: texto });
  } catch (erro) {
    console.error("falha ao consultar o Gemini", {
      ms: Date.now() - inicio,
      nome: erro.name,
      mensagem: erro.message,
      detalhe: erro.detalhe,
    });
    await enviar({
      type: "error",
      message:
        erro.status === 401 || erro.status === 403
          ? "O assistente está com um problema de configuração. Avise o administrador."
          : "O assistente está sobrecarregado agora. Tente novamente em instantes.",
    });
  }
}

export const handler = async (event) => {
  const { routeKey } = event.requestContext;

  if (routeKey === "$connect" || routeKey === "$disconnect") {
    return { statusCode: 200 };
  }

  // O API Gateway espera no máximo 29 s pela integração. Para não depender
  // desse limite, a função se reinvoca em segundo plano e responde na hora.
  if (!event.processar) {
    try {
      await lambda.send(
        new InvokeCommand({
          FunctionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
          InvocationType: "Event",
          Payload: JSON.stringify({ ...event, processar: true }),
        }),
      );
      return { statusCode: 200 };
    } catch (erro) {
      console.error("segundo plano indisponível, processando direto", erro.name, erro.message);
    }
  }

  await processar(event);
  return { statusCode: 200 };
};
