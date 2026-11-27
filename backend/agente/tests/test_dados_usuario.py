import io
import json

from dados_usuario import buscar_dados, resumir
from ferramentas_chat import ContextoChat, criar_ferramenta_dados


def aluno(id, nome, **extra):
    base = {
        "id": id, "nome": nome, "email": f"{id}@x.com", "tel": "", "plano": "Mensal Fit", "instrutor": "Carla Menezes",
        "fim": "02/10/2026", "fin": "Em dia", "ultimo": "hoje", "alerta": "", "checkin": False,
        "matricula": "#2026-0142", "matriculaAnterior": "#2025-0388", "ativo": True,
    }
    return {**base, **extra}


def parcela(id, nome, venc, **extra):
    base = {"id": id, "nome": nome, "plano": "Mensal Fit", "venc": venc, "valor": "R$ 129,90", "parcela": "Única", "pago": False, "atraso": False}
    return {**base, **extra}


def checkin(id, data, alunoId=1, **extra):
    return {"id": id, "alunoId": alunoId, "data": data, "hora": "07:00", "origem": "App", **extra}


DADOS_ALUNO = {
    "voce": {"perfil": "Aluno", "nome": "Pedro Makson", "alunoId": 1},
    "alunos": [aluno(1, "Pedro Makson", fin="Pendente")],
    "usuarios": [],
    "planos": [],
    "pagamentos": [
        parcela(1, "Pedro Makson", "17/09/2026"),
        parcela(6, "Pedro Makson", "17/08/2026", parcela="1/1", pago=True, pagoEm="15/08/2026", forma="Pix"),
        parcela(7, "Pedro Makson", "17/07/2026", parcela="1/1", pago=True, pagoEm="17/07/2026", forma="Cartão"),
    ],
    # 12, 13 e 14 seguidos; 10 solto; 11 removido não conta
    "checkins": [
        checkin(1, "2026-09-10"), checkin(2, "2026-09-11", cancelado={"por": "x", "em": "y", "motivo": "z"}),
        checkin(3, "2026-09-12"), checkin(4, "2026-09-13"), checkin(5, "2026-09-14"), checkin(6, "2026-08-30"),
    ],
    "treinos": [
        {"divisao": "B", "titulo": "Costas e bíceps", "exercicios": [{}] * 4, "atualizadoPor": "Carla Menezes"},
        {"divisao": "A", "titulo": "Peito e tríceps", "exercicios": [{}] * 5, "atualizadoPor": "Carla Menezes"},
    ],
    "avaliacoes": [
        {"id": 2, "data": "2026-08-12", "peso": 79.2, "altura": 1.78, "gordura": 19.4},
        {"id": 1, "data": "2026-04-05", "peso": 83.4, "altura": 1.78, "gordura": 23.0},
    ],
    "observacoes": [],
}


def test_resumo_do_aluno_traz_o_que_ele_precisa_para_responder():
    texto = resumir(DADOS_ALUNO)
    assert "Plano: Mensal Fit — matrícula #2026-0142, válida até 02/10/2026, instrutor Carla Menezes" in texto
    assert "renova a matrícula #2025-0388" in texto
    assert "Parcelas em aberto: R$ 129,90 com vencimento em 17/09/2026 (parcela Única)" in texto
    assert "15/08/2026 via Pix" in texto
    assert "Situação financeira no cadastro: Pendente" in texto
    # 10, 12, 13 e 14 (o dia 11 foi removido): 4 no mês e 3 dias seguidos (12 a 14)
    assert "4 em 09/2026" in texto and "sequência atual de 3 dias" in texto
    assert "check-in de hoje: já feito" in texto and "último em 14/09/2026" in texto
    assert "divisão A — Peito e tríceps (5 exercícios); divisão B — Costas e bíceps (4 exercícios)" in texto
    assert "Última avaliação (12/08/2026): 79,2 kg, 1,78 m, IMC 25,0, 19,4% de gordura" in texto
    assert "-4,2 kg desde a primeira avaliação, em 2 avaliações" in texto
    assert "14/09/2026" in texto.splitlines()[-1]


def test_aluno_sem_parcela_em_aberto_e_sem_check_in_hoje():
    dados = json.loads(json.dumps(DADOS_ALUNO))
    dados["pagamentos"][0]["pago"] = True
    dados["checkins"] = [c for c in dados["checkins"] if c["data"] != "2026-09-14"]
    texto = resumir(dados)
    assert "Parcelas em aberto: nenhuma" in texto
    assert "check-in de hoje: ainda não feito" in texto
    assert "sequência atual de 2 dias" in texto  # conta até ontem (12 e 13)


def test_parcela_atrasada_e_destacada():
    dados = json.loads(json.dumps(DADOS_ALUNO))
    dados["pagamentos"][0].update(venc="05/09/2026", atraso=True)
    assert "05/09/2026 (parcela Única) — ATRASADA" in resumir(dados)


def test_aluno_sem_cadastro_ligado_ao_login():
    dados = {"voce": {"perfil": "Aluno", "nome": None, "alunoId": None}, "alunos": [], "pagamentos": [], "checkins": []}
    assert "não está ligado a um cadastro de aluno" in resumir(dados)


def test_resumo_do_instrutor_lista_os_alunos_dele_com_alertas():
    dados = {
        "voce": {"perfil": "Instrutor", "nome": "Carla Menezes"},
        "alunos": [aluno(1, "Pedro Makson", alerta="Treino desatualizado"), aluno(3, "Rafael Torres", ultimo="há 9 dias", ativo=False)],
        "pagamentos": [], "checkins": [], "usuarios": [], "planos": [],
    }
    texto = resumir(dados)
    assert "Alunos que você acompanha: 2" in texto
    assert "Pedro Makson: Mensal Fit, financeiro Em dia, último check-in hoje, ALERTA: Treino desatualizado" in texto
    assert "Rafael Torres" in texto and "acesso bloqueado" in texto


def test_resumo_da_recepcao_e_da_administracao():
    dados = {
        "voce": {"perfil": "Recepcionista", "nome": "Júlia Alves"},
        "alunos": [aluno(1, "Pedro Makson"), aluno(5, "Igor Bezerra", ativo=False)],
        "pagamentos": [
            parcela(1, "Pedro Makson", "17/09/2026"),
            parcela(2, "Igor Bezerra", "05/09/2026", atraso=True, valor="R$ 1.190,00"),
            parcela(3, "Luana Freire", "02/09/2026", pago=True),
        ],
        "checkins": [checkin(1, "2026-09-14", alunoId=1)],
        "usuarios": [{"perfil": "Instrutor"}, {"perfil": "Instrutor"}, {"perfil": "Aluno"}, {"perfil": "Recepcionista"}],
        "planos": [{"nome": "Anual", "valor": "R$ 1.190,00", "duracao": "12 meses"}],
    }
    recepcao = resumir(dados)
    assert "Alunos cadastrados: 2; com check-in hoje: 1" in recepcao
    assert "Parcelas em aberto: 2, somando R$ 1.319,90" in recepcao
    assert "Igor Bezerra — R$ 1.190,00 com vencimento em 05/09/2026 (parcela Única) — ATRASADA" in recepcao
    assert "Alunos com acesso bloqueado: Igor Bezerra" in recepcao

    dados["voce"] = {"perfil": "Administrador", "nome": "Walber Silva"}
    adm = resumir(dados)
    assert adm.startswith("Administrador: Walber Silva")
    assert "Equipe: 2 instrutor(es), 1 recepcionista(es)" in adm and "Planos: Anual (R$ 1.190,00, 12 meses)" in adm


def test_buscar_dados_chama_a_api_com_o_token_do_usuario():
    vistos = {}

    class Resposta(io.BytesIO):
        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

    def abrir(pedido, timeout):
        vistos["url"], vistos["auth"], vistos["timeout"] = pedido.full_url, pedido.get_header("Authorization"), timeout
        return Resposta(json.dumps({"voce": {"perfil": "Aluno"}}).encode())

    assert buscar_dados("tok123", url="https://api.exemplo.com/", abrir=abrir, timeout=3) == {"voce": {"perfil": "Aluno"}}
    assert vistos == {"url": "https://api.exemplo.com/dados", "auth": "Bearer tok123", "timeout": 3}


def test_ferramenta_usa_o_token_do_contexto_e_nao_vaza_erro():
    chamadas = []
    ferramenta = criar_ferramenta_dados(ContextoChat(token="abc"), consultar=lambda t: chamadas.append(t) or DADOS_ALUNO)
    assert "Plano: Mensal Fit" in ferramenta()
    assert chamadas == ["abc"]

    def falha(token):
        raise OSError("sem rede: segredo-do-servidor")

    quebrada = criar_ferramenta_dados(ContextoChat(token="abc"), consultar=falha)
    resultado = quebrada()
    assert "Não foi possível consultar" in resultado and "segredo" not in resultado

    assert "não está identificado" in criar_ferramenta_dados(ContextoChat(token=None), consultar=falha)()
