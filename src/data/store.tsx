import { createContext, type ReactNode, useContext, useState } from "react";
import type { Endereco } from "../lib/endereco";
import type { Sexo } from "../lib/pessoa";
import {
  bloqueioDoAluno,
  type Checkin,
  checkinDoDia,
  inicioDaMatricula as calcularInicio,
  type PerfilRegistro,
  validarNovoCheckin,
} from "../lib/checkins";
import { HOJE_DEMO, somarDias } from "../lib/datas";

export type Aluno = {
  id: number;
  nome: string;
  email: string;
  tel: string;
  plano: string;
  instrutor: string;
  fim: string; // vencimento da matrícula
  fin: "Em dia" | "Pendente" | "Atrasado";
  ultimo: string; // último check-in, texto livre
  alerta: string; // "" quando não precisa de atenção
  checkin: boolean; // já fez check-in hoje
  matricula: string;
  matriculaAnterior: string;
  ativo: boolean; // acesso liberado/bloqueado pelo admin ou por inadimplência
  endereco?: Endereco;
  cpf?: string;
  nascimento?: string; // AAAA-MM-DD
  sexo?: Sexo | "";
};

export type Pagamento = {
  id: number;
  nome: string;
  plano: string;
  venc: string;
  valor: string;
  parcela?: string;
  pago: boolean;
  atraso: boolean;
  pagoEm?: string;
  forma?: string;
  origem?: string;
};

export type Usuario = {
  id: number;
  nome: string;
  email: string;
  tel: string;
  perfil: "Aluno" | "Instrutor" | "Recepcionista" | "Administrador";
  ativo: boolean;
  endereco?: Endereco;
  cpf?: string;
  nascimento?: string; // AAAA-MM-DD
  sexo?: Sexo | "";
  admissao?: string; // AAAA-MM-DD, só para a equipe
};

export type Plano = {
  id: number;
  nome: string;
  valor: string;
  duracao: string;
  ativos: number;
  regra: string;
};

// Endereços de demonstração (Pau dos Ferros/RN); o CEP é o geral da cidade.
const endDemo = (logradouro: string, numero: string, bairro: string, complemento = ""): Endereco => ({
  cep: "59900-000",
  logradouro,
  numero,
  complemento,
  bairro,
  cidade: "Pau dos Ferros",
  uf: "RN",
});

const ALUNOS_INICIAL: Aluno[] = [
  { id: 1, nome: "Pedro Makson", email: "pedro@email.com", tel: "(84) 99812-4477", plano: "Mensal Fit", instrutor: "Carla Menezes", fim: "02/10/2026", fin: "Pendente", ultimo: "há 1 dia", alerta: "Treino desatualizado", checkin: false, matricula: "#2026-0142", matriculaAnterior: "#2025-0388", ativo: true, endereco: endDemo("Rua das Flores", "120", "Centro", "Apto 2"), cpf: "529.982.247-25", nascimento: "2001-05-14", sexo: "Masculino" },
  { id: 2, nome: "Ana Beatriz Lima", email: "ana.lima@email.com", tel: "(84) 99123-2211", plano: "Trimestral", instrutor: "Carla Menezes", fim: "20/11/2026", fin: "Em dia", ultimo: "hoje", alerta: "", checkin: true, matricula: "#2026-0118", matriculaAnterior: "", ativo: true, endereco: endDemo("Avenida Brasil", "455", "Centro"), cpf: "390.533.447-05", nascimento: "1998-11-03", sexo: "Feminino" },
  { id: 3, nome: "Rafael Torres", email: "rafael.t@email.com", tel: "(84) 98812-0099", plano: "Mensal Fit", instrutor: "Carla Menezes", fim: "28/09/2026", fin: "Em dia", ultimo: "há 9 dias", alerta: "Sem check-in há 9 dias", checkin: false, matricula: "#2026-0091", matriculaAnterior: "", ativo: true, endereco: endDemo("Rua do Comércio", "88", "Centro"), cpf: "111.444.777-35", nascimento: "1995-07-22", sexo: "Masculino" },
  { id: 4, nome: "Marcela Duarte", email: "marcela.d@email.com", tel: "(84) 99700-1122", plano: "Anual", instrutor: "Diego Rocha", fim: "14/03/2027", fin: "Em dia", ultimo: "há 2 dias", alerta: "", checkin: false, matricula: "#2025-0447", matriculaAnterior: "", ativo: true, endereco: endDemo("Rua São José", "301", "Centro", "Casa B"), cpf: "123.456.789-09", nascimento: "1989-02-17", sexo: "Feminino" },
  { id: 5, nome: "Igor Bezerra", email: "igor.b@email.com", tel: "(84) 98123-4455", plano: "Mensal Fit", instrutor: "Diego Rocha", fim: "18/09/2026", fin: "Atrasado", ultimo: "há 4 dias", alerta: "Mensalidade atrasada", checkin: false, matricula: "#2026-0133", matriculaAnterior: "", ativo: false, endereco: endDemo("Rua Projetada", "17", "Centro"), cpf: "987.654.321-00", nascimento: "2000-09-30", sexo: "Masculino" },
  { id: 6, nome: "Luana Freire", email: "luana.f@email.com", tel: "(84) 99988-7766", plano: "Trimestral", instrutor: "Carla Menezes", fim: "02/12/2026", fin: "Em dia", ultimo: "hoje", alerta: "", checkin: true, matricula: "#2026-0126", matriculaAnterior: "", ativo: true, endereco: endDemo("Avenida Getúlio Vargas", "762", "Centro"), cpf: "246.813.579-28", nascimento: "1993-12-08", sexo: "Feminino" },
];

const PAGAMENTOS_INICIAL: Pagamento[] = [
  { id: 1, nome: "Pedro Makson", plano: "Mensal Fit", venc: "17/09/2026", valor: "R$ 129,90", parcela: "Única", pago: false, atraso: false },
  { id: 2, nome: "Igor Bezerra", plano: "Mensal Fit", venc: "05/09/2026", valor: "R$ 129,90", parcela: "Única", pago: false, atraso: true },
  { id: 3, nome: "Rafael Torres", plano: "Mensal Fit", venc: "28/09/2026", valor: "R$ 129,90", parcela: "Única", pago: false, atraso: false },
  { id: 4, nome: "Ana Beatriz Lima", plano: "Trimestral", venc: "20/09/2026", valor: "R$ 116,33", parcela: "2/3", pago: false, atraso: false },
  { id: 5, nome: "Luana Freire", plano: "Trimestral", venc: "02/09/2026", valor: "R$ 116,33", parcela: "1/3", pago: true, pagoEm: "02/09/2026", forma: "Cartão", origem: "Recepção", atraso: false },
];

const USUARIOS_INICIAL: Usuario[] = [
  { id: 1, nome: "Pedro Makson", email: "pedro@email.com", tel: "(84) 99812-4477", perfil: "Aluno", ativo: true, endereco: endDemo("Rua das Flores", "120", "Centro", "Apto 2"), cpf: "529.982.247-25", nascimento: "2001-05-14", sexo: "Masculino" },
  { id: 2, nome: "Carla Menezes", email: "carla@gymflow.com", tel: "(84) 99700-0001", perfil: "Instrutor", ativo: true, endereco: endDemo("Rua da Paz", "45", "Centro"), cpf: "135.792.468-28", nascimento: "1990-03-12", sexo: "Feminino", admissao: "2022-02-01" },
  { id: 3, nome: "Diego Rocha", email: "diego@gymflow.com", tel: "(84) 99700-0002", perfil: "Instrutor", ativo: true, endereco: endDemo("Rua Nova", "210", "Centro"), cpf: "864.209.753-10", nascimento: "1988-08-25", sexo: "Masculino", admissao: "2023-05-15" },
  { id: 4, nome: "Júlia Alves", email: "julia@gymflow.com", tel: "(84) 99700-0003", perfil: "Recepcionista", ativo: true, endereco: endDemo("Avenida Brasil", "980", "Centro", "Sala 3"), cpf: "314.159.265-90", nascimento: "1996-01-19", sexo: "Feminino", admissao: "2024-03-04" },
  { id: 5, nome: "Igor Bezerra", email: "igor.b@email.com", tel: "(84) 98123-4455", perfil: "Aluno", ativo: false, endereco: endDemo("Rua Projetada", "17", "Centro"), cpf: "987.654.321-00", nascimento: "2000-09-30", sexo: "Masculino" },
  { id: 6, nome: "Walber Silva", email: "walber@gymflow.com", tel: "(84) 99700-0004", perfil: "Administrador", ativo: true, endereco: endDemo("Rua do Sol", "64", "Centro"), cpf: "271.828.182-05", nascimento: "1985-06-30", sexo: "Masculino", admissao: "2021-09-01" },
];

export const brl = (n: number) =>
  "R$ " + n.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
export const valorNum = (v: string) =>
  Number(String(v).replace(/[^\d,]/g, "").replace(".", "").replace(",", ".")) || 0;
export const mesesPlano = (d: string) => parseInt(String(d), 10) || 1;
export const somaMes = (dia: string, i: number) => {
  const base = 9 + i;
  const mes = ((base - 1) % 12) + 1;
  const ano = 2026 + Math.floor((base - 1) / 12);
  return String(dia).padStart(2, "0") + "/" + String(mes).padStart(2, "0") + "/" + ano;
};

const PLANOS_INICIAL: Plano[] = [
  { id: 1, nome: "Mensal Fit", valor: "R$ 129,90", duracao: "1 mês", ativos: 214, regra: "Cancelamento antecipado: carência de 30 dias." },
  { id: 2, nome: "Trimestral", valor: "R$ 349,00", duracao: "3 meses", ativos: 96, regra: "Multa de 10% sobre as parcelas restantes." },
  { id: 3, nome: "Anual", valor: "R$ 1.190,00", duracao: "12 meses", ativos: 48, regra: "Multa de 15% ou transferência de titularidade." },
];

const pad2 = (n: number) => String(n).padStart(2, "0");

// Check-ins de demonstração, coerentes com o "último check-in" de cada aluno e com o "hoje" fixo.
function gerarCheckinsDemo(): Checkin[] {
  const lista: Checkin[] = [];
  let id = 1;
  const adicionar = (c: Omit<Checkin, "id" | "registradoEm"> & { registradoEm?: string }) =>
    lista.push({
      id: id++,
      registradoEm: c.registradoEm ?? `${c.data}T${c.hora || "12:00"}:00`,
      ...c,
    });

  // Pedro: calendário já usado nas telas, com um retroativo (dele) e um lançado pela recepção.
  const diasPedro: Record<string, number[]> = {
    "2026-09": [1, 3, 4, 6, 8, 9, 10, 11, 12, 13],
    "2026-08": [2, 3, 5, 7, 9, 10, 12, 14, 16, 17, 19, 21, 23, 24, 26, 28, 30, 31],
  };
  const horas = ["07:12", "18:05", "06:48", "19:20"];
  for (const [mes, dias] of Object.entries(diasPedro)) {
    for (const dia of dias) {
      const data = `${mes}-${pad2(dia)}`;
      const base = {
        alunoId: 1,
        data,
        hora: horas[dia % 4],
        origem: "App" as const,
        registradoPor: "Pedro Makson",
        perfilRegistro: "Aluno" as const,
      };
      if (data === "2026-09-03") {
        adicionar({
          ...base,
          hora: "",
          origem: "Retroativo",
          motivo: "Esqueci de marcar depois do treino.",
          registradoEm: "2026-09-04T08:10:00",
        });
      } else if (data === "2026-09-09") {
        adicionar({
          ...base,
          hora: "07:50",
          origem: "Recepção",
          registradoPor: "Júlia Alves",
          perfilRegistro: "Recepcionista",
        });
      } else {
        adicionar(base);
      }
    }
  }

  const padroes = [
    { alunoId: 2, nome: "Ana Beatriz Lima", ultimo: 0, porSemana: 4, horaHoje: "08:20" },
    { alunoId: 3, nome: "Rafael Torres", ultimo: 9, porSemana: 3 },
    { alunoId: 4, nome: "Marcela Duarte", ultimo: 2, porSemana: 5 },
    { alunoId: 5, nome: "Igor Bezerra", ultimo: 4, porSemana: 3 },
    { alunoId: 6, nome: "Luana Freire", ultimo: 0, porSemana: 4, horaHoje: "08:42" },
  ];
  for (const p of padroes) {
    for (let atras = p.ultimo; atras < 56; atras++) {
      if (atras !== p.ultimo && (atras + p.alunoId) % 7 >= p.porSemana) continue;
      adicionar({
        alunoId: p.alunoId,
        data: somarDias(HOJE_DEMO, -atras),
        hora:
          atras === 0 && p.horaHoje
            ? p.horaHoje
            : `0${6 + ((atras + p.alunoId) % 3)}:${pad2(10 + ((atras * 7 + p.alunoId * 5) % 45))}`,
        origem: "App",
        registradoPor: p.nome,
        perfilRegistro: "Aluno",
      });
    }
  }
  return lista;
}

type StoreValue = {
  alunos: Aluno[];
  pagamentos: Pagamento[];
  usuarios: Usuario[];
  planos: Plano[];
  toggleAcessoAluno: (id: number) => void;
  checkins: Checkin[];
  registrarCheckin: (d: {
    alunoId: number;
    data: string;
    por: string;
    perfil: PerfilRegistro;
    motivo?: string;
  }) => { ok: boolean; erro?: string };
  cancelarCheckin: (
    id: number,
    motivo: string,
    por: string,
    perfil: PerfilRegistro,
  ) => { ok: boolean; erro?: string };
  inicioDaMatricula: (alunoId: number) => string;
  registrarPagamento: (id: number, forma: string) => void;
  salvarAluno: (dados: Omit<Aluno, "id" | "fin" | "ultimo" | "alerta" | "checkin" | "matriculaAnterior" | "ativo"> & { id?: number }) => void;
  toggleUsuario: (id: number) => void;
  setPerfilUsuario: (id: number, perfil: Usuario["perfil"]) => void;
  salvarUsuario: (dados: Omit<Usuario, "id" | "ativo"> & { id?: number }) => void;
  salvarPlano: (dados: Omit<Plano, "id" | "ativos"> & { id?: number }) => void;
  trocarPlano: (
    alunoId: number,
    novoPlanoNome: string,
    dia: string,
    renovacao: boolean,
  ) => { ok: boolean; motivo?: string; mensagem?: string };
};

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [alunos, setAlunos] = useState(ALUNOS_INICIAL);
  const [pagamentos, setPagamentos] = useState(PAGAMENTOS_INICIAL);
  const [usuarios, setUsuarios] = useState(USUARIOS_INICIAL);
  const [planos, setPlanos] = useState(PLANOS_INICIAL);
  const [checkins, setCheckins] = useState(gerarCheckinsDemo);

  function toggleAcessoAluno(id: number) {
    setAlunos((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ativo: !a.ativo } : a)),
    );
  }

  function inicioDaMatricula(alunoId: number) {
    const aluno = alunos.find((a) => a.id === alunoId);
    if (!aluno) return HOJE_DEMO;
    const plano = planos.find((p) => p.nome === aluno.plano);
    return calcularInicio(aluno.fim, mesesPlano(plano?.duracao ?? "1 mês"));
  }

  function registrarCheckin(d: {
    alunoId: number;
    data: string;
    por: string;
    perfil: PerfilRegistro;
    motivo?: string;
  }) {
    const aluno = alunos.find((a) => a.id === d.alunoId);
    if (!aluno) return { ok: false, erro: "Aluno não encontrado." };

    const erro = validarNovoCheckin({
      data: d.data,
      inicio: inicioDaMatricula(d.alunoId),
      motivo: d.motivo,
      jaTem: !!checkinDoDia(checkins, d.alunoId, d.data),
      bloqueio: bloqueioDoAluno(aluno),
    });
    if (erro) return { ok: false, erro };

    const retroativo = d.data !== HOJE_DEMO;
    const agora = new Date();
    setCheckins((prev) => [
      {
        id: Math.max(0, ...prev.map((c) => c.id)) + 1,
        alunoId: d.alunoId,
        data: d.data,
        hora: retroativo ? "" : agora.toTimeString().slice(0, 5),
        origem: retroativo ? "Retroativo" : d.perfil === "Aluno" ? "App" : "Recepção",
        registradoPor: d.por,
        perfilRegistro: d.perfil,
        registradoEm: agora.toISOString(),
        motivo: retroativo ? d.motivo?.trim() : undefined,
      },
      ...prev,
    ]);
    if (!retroativo) {
      setAlunos((prev) =>
        prev.map((a) => (a.id === d.alunoId ? { ...a, checkin: true, ultimo: "hoje" } : a)),
      );
    }
    return { ok: true };
  }

  function cancelarCheckin(id: number, motivo: string, por: string, perfil: PerfilRegistro) {
    if (motivo.trim().length < 5) {
      return { ok: false, erro: "Informe o motivo da remoção (mínimo de 5 caracteres)." };
    }
    const alvo = checkins.find((c) => c.id === id && !c.cancelado);
    if (!alvo) return { ok: false, erro: "Check-in não encontrado." };

    setCheckins((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              cancelado: { por: `${por} (${perfil})`, em: new Date().toISOString(), motivo: motivo.trim() },
            }
          : c,
      ),
    );
    if (alvo.data === HOJE_DEMO) {
      setAlunos((prev) => prev.map((a) => (a.id === alvo.alunoId ? { ...a, checkin: false } : a)));
    }
    return { ok: true };
  }

  function registrarPagamento(id: number, forma: string) {
    const pagamento = pagamentos.find((p) => p.id === id);
    if (!pagamento) return;
    setPagamentos((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, pago: true, atraso: false, forma, pagoEm: "14/09/2026", origem: "Recepção" }
          : p,
      ),
    );
    setAlunos((prev) =>
      prev.map((a) => (a.nome === pagamento.nome ? { ...a, fin: "Em dia" } : a)),
    );
  }

  function salvarAluno(dados: Omit<Aluno, "id" | "fin" | "ultimo" | "alerta" | "checkin" | "matriculaAnterior" | "ativo"> & { id?: number }) {
    if (dados.id) {
      setAlunos((prev) =>
        prev.map((a) => (a.id === dados.id ? { ...a, ...dados, id: a.id } : a)),
      );
    } else {
      const novoId = Math.max(0, ...alunos.map((a) => a.id)) + 1;
      setAlunos((prev) => [
        ...prev,
        {
          ...dados,
          id: novoId,
          fin: "Em dia",
          ultimo: "—",
          alerta: "",
          checkin: false,
          matriculaAnterior: "",
          ativo: true,
        },
      ]);
    }
  }

  function toggleUsuario(id: number) {
    setUsuarios((prev) =>
      prev.map((u) => (u.id === id ? { ...u, ativo: !u.ativo } : u)),
    );
  }

  function setPerfilUsuario(id: number, perfil: Usuario["perfil"]) {
    setUsuarios((prev) => prev.map((u) => (u.id === id ? { ...u, perfil } : u)));
  }

  function salvarUsuario(dados: Omit<Usuario, "id" | "ativo"> & { id?: number }) {
    if (dados.id) {
      setUsuarios((prev) =>
        prev.map((u) => (u.id === dados.id ? { ...u, ...dados, id: u.id } : u)),
      );
    } else {
      const novoId = Math.max(0, ...usuarios.map((u) => u.id)) + 1;
      setUsuarios((prev) => [...prev, { ...dados, id: novoId, ativo: true }]);
    }
  }

  function salvarPlano(dados: Omit<Plano, "id" | "ativos"> & { id?: number }) {
    if (dados.id) {
      setPlanos((prev) =>
        prev.map((p) => (p.id === dados.id ? { ...p, ...dados, id: p.id } : p)),
      );
    } else {
      const novoId = Math.max(0, ...planos.map((p) => p.id)) + 1;
      setPlanos((prev) => [...prev, { ...dados, id: novoId, ativos: 0 }]);
    }
  }

  function trocarPlano(alunoId: number, novoPlanoNome: string, dia: string, renovacao: boolean) {
    const aluno = alunos.find((a) => a.id === alunoId);
    if (!aluno) return { ok: false };
    if (aluno.plano === novoPlanoNome && !renovacao) {
      return { ok: false, motivo: "Escolha um plano diferente do atual." };
    }
    const novo = planos.find((p) => p.nome === novoPlanoNome) ?? planos[0];
    const n = mesesPlano(novo.duracao);
    const diaNum = dia.replace("Todo dia ", "");
    const parcela = valorNum(novo.valor) / n;
    const base = Date.now();
    const novasParcelas: Pagamento[] = Array.from({ length: n }, (_, i) => ({
      id: base + i,
      nome: aluno.nome,
      plano: novo.nome,
      venc: somaMes(diaNum, i + 1),
      valor: brl(parcela),
      parcela: `${i + 1}/${n}`,
      pago: false,
      atraso: false,
    }));
    setPagamentos((prev) => [
      ...novasParcelas,
      ...prev.filter((p) => p.nome !== aluno.nome || p.pago),
    ]);
    const novaMatricula = `#2026-0${200 + (aluno.id % 90)}`;
    setAlunos((prev) =>
      prev.map((a) =>
        a.id === alunoId
          ? {
              ...a,
              plano: novo.nome,
              fim: somaMes(diaNum, n),
              fin: "Pendente",
              matriculaAnterior: a.matricula,
              matricula: novaMatricula,
            }
          : a,
      ),
    );
    const mensagem =
      renovacao && aluno.plano === novo.nome
        ? `Matrícula de ${aluno.nome.split(" ")[0]} renovada em ${novo.nome} — nova vigência e parcelas geradas, histórico preservado (regra 5).`
        : `Plano de ${aluno.nome.split(" ")[0]} alterado para ${novo.nome} — nova matrícula criada referenciando a anterior.`;
    return { ok: true, mensagem };
  }

  return (
    <StoreContext.Provider
      value={{
        alunos,
        pagamentos,
        usuarios,
        planos,
        toggleAcessoAluno,
        checkins,
        registrarCheckin,
        cancelarCheckin,
        inicioDaMatricula,
        registrarPagamento,
        salvarAluno,
        toggleUsuario,
        setPerfilUsuario,
        salvarUsuario,
        salvarPlano,
        trocarPlano,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore deve ser usado dentro de StoreProvider");
  return ctx;
}
