/**
 * Ciclo de cobrança mensal (assinatura sempre mensal) — lógica pura de datas,
 * compartilhada pela server function e pelos testes.
 *
 * Estágios (aviso de cobrança):
 * - "amanha": 1 dia antes do vencimento;
 * - "venceu_hoje": no dia do vencimento;
 * - "atrasado": 1 dia após o vencimento;
 * - "urgente": 2º e 3º dias após o vencimento (tolerância máxima);
 * - "bloqueado": 4º dia após o vencimento — painel fixo na tela de assinaturas;
 * - "ok": fatura paga (ou nenhuma fatura a vencer ainda).
 */

export type BillingStage =
  | "ok"
  | "amanha"
  | "venceu_hoje"
  | "atrasado"
  | "urgente"
  | "bloqueado";

const DAY_MS = 86_400_000;

export type BillingCycleInput = {
  createdAt: string;
  trialDays: number | null;
  trialCreatedAt: string | null;
  /** Meses de referência ("YYYY-MM") com assinatura paga. */
  paidMonths: string[];
  /** Injetável para testes; em produção usa a data atual. */
  now?: Date | string;
};

export type BillingCycleResult = {
  stage: BillingStage;
  paid: boolean;
  daysLate: number;
  referenceMonth: string | null;
  dueDate: string | null;
  nextDue: string;
};

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** Soma meses preservando o dia (clamp em meses curtos: 31 → 28/30). */
function addMonthsClamped(date: Date, months: number) {
  const year = date.getFullYear();
  const month = date.getMonth() + months;
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(date.getDate(), lastDay));
}

export function computeBillingCycle(input: BillingCycleInput): BillingCycleResult {
  const now = startOfDay(input.now ? new Date(input.now) : new Date());
  const created = startOfDay(new Date(input.createdAt));

  // 1º vencimento: fim do teste (quando existe) ou o dia de criação — contas
  // "Sem Período de teste" nascem exatamente no dia do vencimento.
  let firstDue = created;
  if (input.trialDays != null && input.trialCreatedAt) {
    firstDue = startOfDay(new Date(input.trialCreatedAt));
    firstDue = new Date(firstDue.getTime() + input.trialDays * DAY_MS);
  }

  // Vencimento do ciclo atual: o mais recente que já chegou. Antes do 1º
  // vencimento a conta ainda não tem fatura a cobrar.
  let due: Date | null = null;
  if (now >= firstDue) {
    due = new Date(firstDue);
    for (let guard = 0; guard < 600; guard += 1) {
      const next = addMonthsClamped(due, 1);
      if (next > now) break;
      due = next;
    }
  }
  const nextDue = due ? addMonthsClamped(due, 1) : firstDue;

  let paid = false;
  let referenceMonth: string | null = null;
  if (due) {
    referenceMonth = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, "0")}`;
    paid = input.paidMonths.includes(referenceMonth);
  }

  const daysUntilNext = Math.round((nextDue.getTime() - now.getTime()) / DAY_MS);
  let stage: BillingStage = "ok";
  let daysLate = 0;
  if (due && !paid) {
    daysLate = Math.round((now.getTime() - due.getTime()) / DAY_MS);
    stage =
      daysLate <= 0
        ? "venceu_hoje"
        : daysLate === 1
          ? "atrasado"
          : daysLate <= 3
            ? "urgente"
            : "bloqueado";
  } else if (daysUntilNext === 1) {
    stage = "amanha";
  }

  return {
    stage,
    paid,
    daysLate,
    referenceMonth,
    dueDate: due ? due.toISOString() : null,
    nextDue: nextDue.toISOString(),
  };
}
