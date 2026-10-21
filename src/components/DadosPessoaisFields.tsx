import Obrigatorio from "./Obrigatorio";
import {
  type DadosPessoais,
  formatarCpf,
  hojeIso,
  NASCIMENTO_MINIMO,
  SEXOS,
} from "../lib/pessoa";

const rotulo = "flex flex-col gap-1.5 text-xs font-bold";
const campo = "rounded-[9px] border border-navy/16 px-2.5 py-2.5 text-sm font-normal";

// Devolve três campos soltos (CPF, nascimento e sexo) para entrar na grade de 2 colunas do formulário.
export default function DadosPessoaisFields({
  value,
  onChange,
}: {
  value: DadosPessoais;
  onChange: (dados: DadosPessoais) => void;
}) {
  return (
    <>
      <label className={rotulo}>
        <span>
          CPF
          <Obrigatorio />
        </span>
        <input
          value={value.cpf}
          onChange={(e) => onChange({ ...value, cpf: formatarCpf(e.target.value) })}
          inputMode="numeric"
          maxLength={14}
          placeholder="000.000.000-00"
          aria-required="true"
          className={campo}
        />
      </label>
      <label className={rotulo}>
        <span>
          Data de nascimento
          <Obrigatorio />
        </span>
        <input
          type="date"
          value={value.nascimento}
          min={NASCIMENTO_MINIMO}
          max={hojeIso()}
          onChange={(e) => onChange({ ...value, nascimento: e.target.value })}
          aria-required="true"
          className={campo}
        />
      </label>
      <label className={rotulo}>
        Sexo
        <select
          value={value.sexo}
          onChange={(e) => onChange({ ...value, sexo: e.target.value as DadosPessoais["sexo"] })}
          className={`${campo} bg-white`}
        >
          <option value="">Selecione</option>
          {SEXOS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}
