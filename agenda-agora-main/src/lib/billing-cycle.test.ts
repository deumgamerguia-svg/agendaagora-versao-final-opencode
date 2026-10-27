import { describe, expect, it } from "vitest";
import { computeBillingCycle } from "./billing-cycle";

/** Conta de referência: criada em 26/10/2026, sem teste. */
const base = {
  createdAt: "2026-10-26T10:00:00.000Z",
  trialDays: null,
  trialCreatedAt: null,
  paidMonths: [] as string[],
};

/** Conta de teste: criada 26/10/2026 com 7 dias de teste (vence 02/11/2026). */
const comTeste = {
  createdAt: "2026-10-26T10:00:00.000Z",
  trialDays: 7,
  trialCreatedAt: "2026-10-26T10:00:00.000Z",
  paidMonths: [] as string[],
};

// Datas em horário local para bater com o startOfDay do cálculo.
const em = (iso: string) => new Date(iso);

describe("ciclo de cobrança — 5 estágios", () => {
  it("conta criada no dia do vencimento: estágio 'venceu_hoje'", () => {
    const r = computeBillingCycle({ ...base, now: em("2026-10-26T16:40:00.000Z") });
    expect(r.stage).toBe("venceu_hoje");
    expect(r.daysLate).toBe(0);
    expect(r.referenceMonth).toBe("2026-10");
  });

  it("1 dia após o vencimento: estágio 'atrasado'", () => {
    const r = computeBillingCycle({ ...base, now: em("2026-10-27T09:00:00.000Z") });
    expect(r.stage).toBe("atrasado");
    expect(r.daysLate).toBe(1);
  });

  it("2º e 3º dias após o vencimento: estágio 'urgente'", () => {
    expect(computeBillingCycle({ ...base, now: em("2026-10-28T09:00:00.000Z") }).stage).toBe(
      "urgente",
    );
    expect(computeBillingCycle({ ...base, now: em("2026-10-29T22:00:00.000Z") }).stage).toBe(
      "urgente",
    );
  });

  it("4º dia após o vencimento: 'bloqueado' (e nos dias seguintes)", () => {
    expect(computeBillingCycle({ ...base, now: em("2026-10-30T09:00:00.000Z") }).stage).toBe(
      "bloqueado",
    );
    expect(computeBillingCycle({ ...base, now: em("2026-11-20T09:00:00.000Z") }).stage).toBe(
      "bloqueado",
    );
  });

  it("mês pago: 'ok' — mesmo depois do vencimento", () => {
    const r = computeBillingCycle({
      ...base,
      paidMonths: ["2026-10"],
      now: em("2026-10-28T09:00:00.000Z"),
    });
    expect(r.stage).toBe("ok");
    expect(r.paid).toBe(true);
  });

  it("mês pago e fatura do próximo mês vence amanhã: 'amanha'", () => {
    const r = computeBillingCycle({
      ...base,
      paidMonths: ["2026-10"],
      now: em("2026-11-25T09:00:00.000Z"),
    });
    expect(r.stage).toBe("amanha");
    expect(r.nextDue.startsWith("2026-11-26")).toBe(true);
  });

  it("mês pago no meio do ciclo: 'ok'", () => {
    const r = computeBillingCycle({
      ...base,
      paidMonths: ["2026-10"],
      now: em("2026-11-15T09:00:00.000Z"),
    });
    expect(r.stage).toBe("ok");
  });

  it("conta com teste: nenhum aviso durante o teste", () => {
    const r = computeBillingCycle({ ...comTeste, now: em("2026-10-28T09:00:00.000Z") });
    expect(r.stage).toBe("ok");
    expect(r.dueDate).toBeNull();
  });

  it("conta com teste: 'amanha' no dia anterior ao fim do teste", () => {
    const r = computeBillingCycle({ ...comTeste, now: em("2026-11-01T09:00:00.000Z") });
    expect(r.stage).toBe("amanha");
  });

  it("conta com teste: vence no fim do teste e segue o ciclo", () => {
    expect(computeBillingCycle({ ...comTeste, now: em("2026-11-02T09:00:00.000Z") }).stage).toBe(
      "venceu_hoje",
    );
    expect(computeBillingCycle({ ...comTeste, now: em("2026-11-03T09:00:00.000Z") }).stage).toBe(
      "atrasado",
    );
    expect(computeBillingCycle({ ...comTeste, now: em("2026-11-05T09:00:00.000Z") }).stage).toBe(
      "urgente",
    );
    expect(computeBillingCycle({ ...comTeste, now: em("2026-11-06T09:00:00.000Z") }).stage).toBe(
      "bloqueado",
    );
  });

  it("teste pago no fim do teste: mês do vencimento pago libera o ciclo", () => {
    const r = computeBillingCycle({
      ...comTeste,
      paidMonths: ["2026-11"],
      now: em("2026-11-06T09:00:00.000Z"),
    });
    expect(r.stage).toBe("ok");
  });

  it("vencimento no dia 31 clamp para meses curtos", () => {
    const r = computeBillingCycle({
      ...base,
      createdAt: "2026-01-31T10:00:00.000Z",
      now: em("2026-02-28T09:00:00.000Z"),
    });
    expect(r.stage).toBe("venceu_hoje");
    expect(r.referenceMonth).toBe("2026-02");
  });

  it("após pagar um ciclo atrasado, o próximo vencimento é no mês seguinte", () => {
    // Venceu 26/10, bloqueou no 30/10, pagou em 05/11 (referência novembro
    // ainda não — o dono paga a fatura de outubro; a de novembro vence 26/11).
    const atrasadaPaga = computeBillingCycle({
      ...base,
      paidMonths: ["2026-10"],
      now: em("2026-11-06T09:00:00.000Z"),
    });
    expect(atrasadaPaga.stage).toBe("ok");

    const novembroNaoPago = computeBillingCycle({
      ...base,
      now: em("2026-11-26T09:00:00.000Z"),
    });
    expect(novembroNaoPago.stage).toBe("venceu_hoje");
  });
});
