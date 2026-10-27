import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { hasSuperAdminRole } from "@/lib/auth/require-super-admin";
import { computeBillingCycle } from "@/lib/billing-cycle";

const schema = z.object({ businessId: z.string().uuid() });

/**
 * Ciclo de cobrança do estabelecimento (assinatura sempre mensal) — cálculo em
 * `billing-cycle.ts`; aqui só buscamos os dados e aplicamos a permissão.
 */
export const getBillingCycle = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ context, data }) => {
    const { data: business } = await context.supabase
      .from("businesses")
      .select("owner_id, monthly_fee_cents, created_at, trial_days, trial_created_at")
      .eq("id", data.businessId)
      .maybeSingle();
    if (!business) throw new Error("Negócio não encontrado.");
    if (business.owner_id !== context.userId && !(await hasSuperAdminRole(context.userId))) {
      throw new Error("Você não tem permissão para ver esta assinatura.");
    }

    // Meses com fatura paga (qualquer ciclo — o cálculo escolhe o do vencimento atual).
    const { data: payments } = await context.supabase
      .from("subscription_payments")
      .select("reference_month")
      .eq("business_id", data.businessId)
      .eq("status", "pago");
    const paidMonths = (payments ?? []).map((p) => String(p.reference_month).slice(0, 7));

    const cycle = computeBillingCycle({
      createdAt: business.created_at,
      trialDays: business.trial_days,
      trialCreatedAt: business.trial_created_at,
      paidMonths,
    });

    return {
      ...cycle,
      amountCents: business.monthly_fee_cents ?? 8990,
    };
  });
