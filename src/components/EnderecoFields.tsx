import { useEffect, useRef, useState } from "react";
import { buscarCep, type Endereco, formatarCep, soDigitos, UFS } from "../lib/endereco";
import Obrigatorio from "./Obrigatorio";

const rotulo = "flex flex-col gap-1.5 text-xs font-bold";
const campo = "rounded-[9px] border border-navy/16 px-2.5 py-2.5 text-sm font-normal";

type Status = "ocioso" | "buscando" | "ok" | "nao_encontrado" | "rede";

const MENSAGENS: Record<Exclude<Status, "ocioso">, { texto: string; cor: string }> = {
  buscando: { texto: "Consultando o CEP…", cor: "text-navy/55" },
  ok: { texto: "Endereço preenchido pelo CEP. Confira e informe o número.", cor: "text-teal-dark" },
  nao_encontrado: {
    texto: "CEP não encontrado. Preencha o endereço manualmente.",
    cor: "text-danger",
  },
  rede: {
    texto: "Não foi possível consultar o CEP agora. Preencha o endereço manualmente.",
    cor: "text-danger",
  },
};

export default function EnderecoFields({
  value,
  onChange,
}: {
  value: Endereco;
  onChange: (endereco: Endereco) => void;
}) {
  const [status, setStatus] = useState<Status>("ocioso");
  const atual = useRef(value);
  atual.current = value;
  const consulta = useRef(0);
  const logradouroRef = useRef<HTMLInputElement>(null);
  const numeroRef = useRef<HTMLInputElement>(null);

  useEffect(
    () => () => {
      consulta.current++;
    },
    [],
  );

  function alterar(parcial: Partial<Endereco>) {
    onChange({ ...atual.current, ...parcial });
  }

  async function aoDigitarCep(bruto: string) {
    const cep = formatarCep(bruto);
    const id = ++consulta.current;
    alterar({ cep });
    if (soDigitos(cep).length !== 8) {
      setStatus("ocioso");
      return;
    }

    setStatus("buscando");
    const resultado = await buscarCep(cep);
    if (id !== consulta.current) return;

    if (resultado.ok) {
      onChange({ ...atual.current, cep, ...resultado.dados });
      setStatus("ok");
      (resultado.dados.logradouro ? numeroRef : logradouroRef).current?.focus();
    } else {
      setStatus(resultado.motivo === "nao_encontrado" ? "nao_encontrado" : "rede");
    }
  }

  const mensagem = status === "ocioso" ? null : MENSAGENS[status];

  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
      <label className={rotulo}>
        <span>
          CEP
          <Obrigatorio />
        </span>
        <input
          value={value.cep}
          onChange={(e) => aoDigitarCep(e.target.value)}
          inputMode="numeric"
          maxLength={9}
          placeholder="00000-000"
          aria-required="true"
          className={campo}
        />
      </label>
      <label className={rotulo}>
        <span>
          Número
          <Obrigatorio />
        </span>
        <input
          ref={numeroRef}
          value={value.numero}
          onChange={(e) => alterar({ numero: e.target.value })}
          placeholder="123 ou S/N"
          aria-required="true"
          className={campo}
        />
      </label>

      {mensagem && (
        <p role="status" className={`text-xs font-semibold sm:col-span-2 ${mensagem.cor}`}>
          {mensagem.texto}
        </p>
      )}

      <label className={`${rotulo} sm:col-span-2`}>
        <span>
          Logradouro
          <Obrigatorio />
        </span>
        <input
          ref={logradouroRef}
          value={value.logradouro}
          onChange={(e) => alterar({ logradouro: e.target.value })}
          placeholder="Rua, avenida, travessa…"
          aria-required="true"
          className={campo}
        />
      </label>
      <label className={rotulo}>
        Complemento
        <input
          value={value.complemento}
          onChange={(e) => alterar({ complemento: e.target.value })}
          placeholder="Apto, bloco, referência…"
          className={campo}
        />
      </label>
      <label className={rotulo}>
        <span>
          Bairro
          <Obrigatorio />
        </span>
        <input
          value={value.bairro}
          onChange={(e) => alterar({ bairro: e.target.value })}
          aria-required="true"
          className={campo}
        />
      </label>
      <label className={rotulo}>
        <span>
          Cidade
          <Obrigatorio />
        </span>
        <input
          value={value.cidade}
          onChange={(e) => alterar({ cidade: e.target.value })}
          aria-required="true"
          className={campo}
        />
      </label>
      <label className={rotulo}>
        <span>
          UF
          <Obrigatorio />
        </span>
        <select
          value={value.uf}
          onChange={(e) => alterar({ uf: e.target.value })}
          aria-required="true"
          className={`${campo} bg-white`}
        >
          <option value="">Selecione</option>
          {UFS.map((uf) => (
            <option key={uf} value={uf}>
              {uf}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
