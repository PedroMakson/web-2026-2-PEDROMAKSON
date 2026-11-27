from chat import ferramentas_do_turno


def test_lista_o_que_cada_ferramenta_devolveu():
    mensagens = [
        {"role": "user", "content": [{"text": "Que horas são?"}]},
        {"role": "assistant", "content": [{"toolUse": {"toolUseId": "t1", "name": "hora_certa_brasil", "input": {}}}]},
        {
            "role": "user",
            "content": [
                {
                    "toolResult": {
                        "toolUseId": "t1",
                        "status": "success",
                        "content": [{"text": "segunda-feira, 23/11/2026, 20:48:12 (horário de Brasília, UTC-3). Fonte: NTP.br."}],
                    }
                }
            ],
        },
        {"role": "assistant", "content": [{"text": "Agora são 20:48."}]},
    ]
    assert ferramentas_do_turno(mensagens) == [
        ("hora_certa_brasil", "segunda-feira, 23/11/2026, 20:48:12 (horário de Brasília, UTC-3). Fonte: NTP.br.")
    ]


def test_sem_ferramenta_nao_lista_nada():
    mensagens = [
        {"role": "user", "content": [{"text": "Oi"}]},
        {"role": "assistant", "content": [{"text": "Olá!"}]},
    ]
    assert ferramentas_do_turno(mensagens) == []
