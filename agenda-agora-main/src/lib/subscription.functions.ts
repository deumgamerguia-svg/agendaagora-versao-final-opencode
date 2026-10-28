import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { hasSuperAdminRole } from "@/lib/auth/require-super-admin";
import {
  computeAccessCycle,
  computeInvoiceStatus,
  subscriptionTotalCents,
} from "@/lib/billing-cycle";

const schema = z.object({ businessId: z.string().uuid() });

/**
 * Ciclo de acesso do estabelecimento (vencimento rolante) — visto pelo dono:
 * dias restantes, estágio de aviso atual do Painel 2 e o histórico de faturas
 * pagas (uma caixa verde por pagamento confirmado).
 */
export const getBillingCycle = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ context, data }) => {
    const { data: business } = await context.supabase
      .from("businesses")
      .select(
        "owner_id, monthly_fee_cents, access_until, cancel_requested_at, cancelled_at, trial_days",
      )
      .eq("id", data.businessId)
      .maybeSingle();
    if (!business) throw new Error("Negócio não encontrado.");
    if (business.owner_id !== context.userId && !(await hasSuperAdminRole(context.userId))) {
      throw new Error("Você não tem permissão para ver esta assinatura.");
    }

    // Histórico real: cada pagamento confirmado é uma caixa "Pago" permanente.
    const { data: payments } = await context.supabase
      .from("subscription_payments")
      .select("id, amount_cents, paid_at, created_at")
      .eq("business_id", data.businessId)
      .eq("status", "pago")
      .order("paid_at", { ascending: false })
      .limit(60);
    const pagoHistory = (payments ?? []).map((p) => ({
      id: p.id,
      amountCents: p.amount_cents ?? 0,
      paidAt: p.paid_at ?? p.created_at,
    }));

    // Valor da assinatura: base + R$ 10 por profissional adicional (1º é grátis).
    const { count: professionalsCount } = await context.supabase
      .from("professionals")
      .select("id", { count: "exact", head: true })
      .eq("business_id", data.businessId);
    const amountCents = subscriptionTotalCents(
      business.monthly_fee_cents ?? 8990,
      professionalsCount ?? 0,
    );

    const now = new Date();
    const cycle = computeAccessCycle({ accessUntil: business.access_until, now });
    const statusCard = computeInvoiceStatus(business.access_until, now);

    return {
      stage: cycle.stage,
      daysLeft: cycle.daysLeft,
      accessUntil: cycle.accessUntil,
      baseCents: business.monthly_fee_cents ?? 8990,
      professionalsCount: professionalsCount ?? 0,
      amountCents,
      statusCard,
      pagoHistory,
    };
  });