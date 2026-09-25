import { createContext, type ReactNode, useContext, useState } from "react";

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
};

export type Plano = {
  id: number;
  nome: string;
  valor: string;
  duracao: string;
  ativos: number;
  regra: string;
};

const ALUNOS_INICIAL: Aluno[] = [
  { id: 1, nome: "Pedro Makson", email: "pedro@email.com", tel: "(84) 99812-4477", plano: "Mensal Fit", instrutor: "Carla Menezes", fim: "02/10/2026", fin: "Pendente", ultimo: "há 1 dia", alerta: "Treino desatualizado", checkin: false, matricula: "#2026-0142", matriculaAnterior: "#2025-0388", ativo: true },
  { id: 2, nome: "Ana Beatriz Lima", email: "ana.lima@email.com", tel: "(84) 99123-2211", plano: "Trimestral", instrutor: "Carla Menezes", fim: "20/11/2026", fin: "Em dia", ultimo: "hoje", alerta: "", checkin: true, matricula: "#2026-0118", matriculaAnterior: "", ativo: true },
  { id: 3, nome: "Rafael Torres", email: "rafael.t@email.com", tel: "(84) 98812-0099", plano: "Mensal Fit", instrutor: "Carla Menezes", fim: "28/09/2026", fin: "Em dia", ultimo: "há 9 dias", alerta: "Sem check-in há 9 dias", checkin: false, matricula: "#2026-0091", matriculaAnterior: "", ativo: true },
  { id: 4, nome: "Marcela Duarte", email: "marcela.d@email.com", tel: "(84) 99700-1122", plano: "Anual", instrutor: "Diego Rocha", fim: "14/03/2027", fin: "Em dia", ultimo: "há 2 dias", alerta: "", checkin: false, matricula: "#2025-0447", matriculaAnterior: "", ativo: true },
  { id: 5, nome: "Igor Bezerra", email: "igor.b@email.com", tel: "(84) 98123-4455", plano: "Mensal Fit", instrutor: "Diego Rocha", fim: "18/09/2026", fin: "Atrasado", ultimo: "há 4 dias", alerta: "Mensalidade atrasada", checkin: false, matricula: "#2026-0133", matriculaAnterior: "", ativo: false },
  { id: 6, nome: "Luana Freire", email: "luana.f@email.com", tel: "(84) 99988-7766", plano: "Trimestral", instrutor: "Carla Menezes", fim: "02/12/2026", fin: "Em dia", ultimo: "hoje", alerta: "", checkin: true, matricula: "#2026-0126", matriculaAnterior: "", ativo: true },
];

const PAGAMENTOS_INICIAL: Pagamento[] = [
  { id: 1, nome: "Pedro Makson", plano: "Mensal Fit", venc: "17/09/2026", valor: "R$ 129,90", parcela: "Única", pago: false, atraso: false },
  { id: 2, nome: "Igor Bezerra", plano: "Mensal Fit", venc: "05/09/2026", valor: "R$ 129,90", parcela: "Única", pago: false, atraso: true },
  { id: 3, nome: "Rafael Torres", plano: "Mensal Fit", venc: "28/09/2026", valor: "R$ 129,90", parcela: "Única", pago: false, atraso: false },
  { id: 4, nome: "Ana Beatriz Lima", plano: "Trimestral", venc: "20/09/2026", valor: "R$ 116,33", parcela: "2/3", pago: false, atraso: false },
  { id: 5, nome: "Luana Freire", plano: "Trimestral", venc: "02/09/2026", valor: "R$ 116,33", parcela: "1/3", pago: true, pagoEm: "02/09/2026", forma: "Cartão", origem: "Recepção", atraso: false },
];

const USUARIOS_INICIAL: Usuario[] = [
  { id: 1, nome: "Pedro Makson", email: "pedro@email.com", tel: "(84) 99812-4477", perfil: "Aluno", ativo: true },
  { id: 2, nome: "Carla Menezes", email: "carla@gymflow.com", tel: "(84) 99700-0001", perfil: "Instrutor", ativo: true },
  { id: 3, nome: "Diego Rocha", email: "diego@gymflow.com", tel: "(84) 99700-0002", perfil: "Instrutor", ativo: true },
  { id: 4, nome: "Júlia Alves", email: "julia@gymflow.com", tel: "(84) 99700-0003", perfil: "Recepcionista", ativo: true },
  { id: 5, nome: "Igor Bezerra", email: "igor.b@email.com", tel: "(84) 98123-4455", perfil: "Aluno", ativo: false },
  { id: 6, nome: "Walber Silva", email: "walber@gymflow.com", tel: "(84) 99700-0004", perfil: "Administrador", ativo: true },
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

type StoreValue = {
  alunos: Aluno[];
  pagamentos: Pagamento[];
  usuarios: Usuario[];
  planos: Plano[];
  toggleAcessoAluno: (id: number) => void;
  registrarCheckinManual: (id: number) => { ok: boolean; motivo?: string };
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

  function toggleAcessoAluno(id: number) {
    setAlunos((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ativo: !a.ativo } : a)),
    );
  }

  function registrarCheckinManual(id: number) {
    const aluno = alunos.find((a) => a.id === id);
    if (!aluno) return { ok: false };
    if (aluno.fin === "Atrasado") {
      return { ok: false, motivo: "Aluno inadimplente não pode registrar check-in (regra 1)." };
    }
    if (aluno.checkin) return { ok: false, motivo: "Já registrado hoje." };
    setAlunos((prev) =>
      prev.map((a) => (a.id === id ? { ...a, checkin: true, ultimo: "hoje" } : a)),
    );
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
        registrarCheckinManual,
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
