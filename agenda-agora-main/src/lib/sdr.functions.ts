import { createServerFn } from "@tanstack/react-start";
import { createHash } from "node:crypto";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertSuperAdmin } from "@/lib/auth/require-super-admin";
import { signSdrToken, verifySdrToken } from "@/lib/sdr-token";
import { conversionRate, monthKey, percentChange, weeklyBuckets } from "@/lib/sdr-stats";

const onlyDigits = (value: string) => value.replace(/\D/g, "");
const phoneLogin = (phone: string) => `${onlyDigits(phone)}@agenda.local`;
const phonePassword = (senha: string) => `agendaagora:${senha}`;

/** PIN de 4 dígitos é o "senha fixa" do SDR; guarda só o hash. */
const hashPin = (pin: string, email: string) =>
  createHash("sha256").update(`${email.trim().toLowerCase()}::${pin}`).digest("hex");

async function adminClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

type AdminClient = Awaited<ReturnType<typeof adminClient>>;

/** Segredo de assinatura dos tokens, guardado em `sdr_config` (criado na migração). */
async function getSdrSecret(supabaseAdmin: AdminClient) {
  const { data, error } = await supabaseAdmin
    .from("sdr_config")
    .select("secret")
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (data?.secret) return data.secret as string;
  const { data: created, error: insertError } = await supabaseAdmin
    .from("sdr_config")
    .insert({ id: true })
    .select("secret")
    .single();
  if (insertError) throw new Error(insertError.message);
  return created.secret as string;
}

/** Valida o token do painel do SDR e devolve o client admin + o SDR atual. */
async function requireSdr(token: string) {
  const supabaseAdmin = await adminClient();
  const secret = await getSdrSecret(supabaseAdmin);
  const sdrId = verifySdrToken(token, secret);
  if (!sdrId) throw new Error("Sessão expirada. Entre novamente com seu e-mail e senha.");
  const { data: sdr, error } = await supabaseAdmin
    .from("sdrs")
    .select("id, name, email, active, signup_goal, sales_goal, commission_cents")
    .eq("id", sdrId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!sdr || !sdr.active) throw new Error("Conta inativa. Fale com o administrador.");
  return { supabaseAdmin, sdr };
}

const emailField = z.string().trim().toLowerCase().min(5).email("Informe um e-mail válido.");
const pinField = z
  .string()
  .regex(/^\d{4}$/, "A senha deve ter exatamente 4 dígitos numéricos.");

const sdrFormSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do SDR."),
  email: emailField,
  pin: pinField,
  signupGoal: z.number().int().min(0).max(10000),
  salesGoal: z.number().int().min(0).max(10000),
  commissionCents: z.number().int().min(0).max(10000000),
});

/* ------------------------------------------------------------------ */
/* Login do SDR (público: e-mail + senha de 4 dígitos)                 */
/* ------------------------------------------------------------------ */

export const sdrLogin = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ email: emailField, pin: pinField }).parse(input),
  )
  .handler(async ({ data }) => {
    const supabaseAdmin = await adminClient();
    const { data: sdr, error } = await supabaseAdmin
      .from("sdrs")
      .select("id, name, pin, active")
      .eq("email", data.email)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!sdr || !sdr.active || sdr.pin !== hashPin(data.pin, data.email)) {
      throw new Error("E-mail ou senha incorretos.");
    }
    const secret = await getSdrSecret(supabaseAdmin);
    return {
      token: signSdrToken(sdr.id as string, secret),
      name: sdr.name as string,
    };
  });

/* ------------------------------------------------------------------ */
/* Painel 3 Master: equipe + performance                               */
/* ------------------------------------------------------------------ */

export type SdrTeamRow = {
  id: string;
  name: string;
  email: string;
  active: boolean;
  signupGoal: number;
  salesGoal: number;
  commissionCents: number;
  cadastros: number;
  vendas: number;
  conversao: number;
  comissaoCents: number;
  vendas30: number;
};

export const getSdrTeam = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabaseAdmin = await assertSuperAdmin(context);
    const now = new Date();
    const current = monthKey(now);
    const previous = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();

    const [sdrsRes, businessesRes, paymentsRes] = await Promise.all([
      supabaseAdmin.from("sdrs").select("*").order("created_at", { ascending: true }),
      supabaseAdmin
        .from("businesses")
        .select("id, name, created_at, sdr_id")
        .not("sdr_id", "is", null),
      supabaseAdmin
        .from("subscription_payments")
        .select("business_id, reference_month, status, paid_at")
        .eq("status", "pago"),
    ]);
    if (sdrsRes.error) throw new Error(sdrsRes.error.message);
    if (businessesRes.error) throw new Error(businessesRes.error.message);
    if (paymentsRes.error) throw new Error(paymentsRes.error.message);

    const sdrs = (sdrsRes.data ?? []) as Array<{
      id: string;
      name: string;
      email: string;
      active: boolean;
      signup_goal: number | null;
      sales_goal: number | null;
      commission_cents: number | null;
    }>;
    const businesses = (businessesRes.data ?? []) as Array<{
      id: string;
      name: string;
      created_at: string;
      sdr_id: string | null;
    }>;
    const payments = (paymentsRes.data ?? []) as Array<{
      business_id: string;
      reference_month: string;
      paid_at: string | null;
    }>;

    const sdrIdByBusiness = new Map(
      businesses
        .filter((b) => b.sdr_id)
        .map((b) => [b.id, b.sdr_id as string]),
    );

    const paidBySdr = new Map<string, Array<{ month: string; paidAt: string | null }>>();
    for (const payment of payments) {
      const sdrId = sdrIdByBusiness.get(payment.business_id);
      if (!sdrId) continue;
      const list = paidBySdr.get(sdrId) ?? [];
      list.push({ month: payment.reference_month.slice(0, 7), paidAt: payment.paid_at });
      paidBySdr.set(sdrId, list);
    }

    const rows: SdrTeamRow[] = sdrs.map((sdr) => {
      const paid = paidBySdr.get(sdr.id) ?? [];
      const cadastros = businesses.filter(
        (b) => b.sdr_id === sdr.id && b.created_at.slice(0, 7) === current,
      ).length;
      const cadastrosPrev = businesses.filter(
        (b) => b.sdr_id === sdr.id && b.created_at.slice(0, 7) === previous,
      ).length;
      const vendas = paid.filter((p) => p.month === current).length;
      const vendasPrev = paid.filter((p) => p.month === previous).length;
      const vendas30 = paid.filter(
        (p) => p.paidAt != null && p.paidAt >= thirtyDaysAgo,
      ).length;
      return {
        id: sdr.id,
        name: sdr.name,
        email: sdr.email,
        active: !!sdr.active,
        signupGoal: sdr.signup_goal ?? 0,
        salesGoal: sdr.sales_goal ?? 0,
        commissionCents: sdr.commission_cents ?? 0,
        cadastros,
        vendas,
        conversao: conversionRate(cadastros, vendas),
        comissaoCents: vendas * (sdr.commission_cents ?? 0),
        vendas30,
      };
    });

    const totalCadastros = rows.reduce((sum, row) => sum + row.cadastros, 0);
    const totalCadastrosPrev = businesses.filter(
      (b) => b.created_at.slice(0, 7) === previous,
    ).length;
    const totalVendas = rows.reduce((sum, row) => sum + row.vendas, 0);
    const totalVendasPrev = [...paidBySdr.values()]
      .flat()
      .filter((p) => p.month === previous).length;
    const conversao = conversionRate(totalCadastros, totalVendas);
    const conversaoPrev = conversionRate(totalCadastrosPrev, totalVendasPrev);

    const buckets = weeklyBuckets(4, now);
    const weekData = buckets.map((bucket) => ({
      label: bucket.label,
      cadastros: businesses.filter(
        (b) => b.created_at >= bucket.start && b.created_at <= bucket.end,
      ).length,
    }));

    return {
      generatedAt: now.toISOString(),
      sdrs: rows,
      kpis: {
        activeSdrs: rows.filter((row) => row.active).length,
        cadastros: { value: totalCadastros, delta: percentChange(totalCadastros, totalCadastrosPrev) },
        vendas: { value: totalVendas, delta: percentChange(totalVendas, totalVendasPrev) },
        conversao: { value: conversao, delta: percentChange(conversao, conversaoPrev) },
      },
      barData: rows.map((row) => ({
        name: row.name.split(" ")[0] ?? row.name,
        vendas: row.vendas30,
      })),
      weekData,
    };
  });

export const createSdr = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => sdrFormSchema.parse(input))
  .handler(async ({ context, data }) => {
    const supabaseAdmin = await assertSuperAdmin(context);
    const { data: created, error } = await supabaseAdmin
      .from("sdrs")
      .insert({
        name: data.name,
        email: data.email,
        pin: hashPin(data.pin, data.email),
        signup_goal: data.signupGoal,
        sales_goal: data.salesGoal,
        commission_cents: data.commissionCents,
      })
      .select("id")
      .single();
    if (error) {
      if (error.code === "23505") throw new Error("Já existe um SDR com este e-mail.");
      throw new Error(error.message);
    }
    return { id: created.id as string };
  });

export const updateSdr = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    sdrFormSchema
      .extend({
        id: z.string().uuid(),
        pin: z.union([pinField, z.literal("")]),
        active: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const supabaseAdmin = await assertSuperAdmin(context);
    const patch: {
      name: string;
      email: string;
      signup_goal: number;
      sales_goal: number;
      commission_cents: number;
      active: boolean;
      pin?: string;
    } = {
      name: data.name,
      email: data.email,
      signup_goal: data.signupGoal,
      sales_goal: data.salesGoal,
      commission_cents: data.commissionCents,
      active: data.active,
    };
    if (data.pin) patch.pin = hashPin(data.pin, data.email);
    const { error } = await supabaseAdmin.from("sdrs").update(patch).eq("id", data.id);
    if (error) {
      if (error.code === "23505") throw new Error("Já existe um SDR com este e-mail.");
      throw new Error(error.message);
    }
    return { ok: true as const };
  });

/* ------------------------------------------------------------------ */
/* Painel exclusivo do SDR                                             */
/* ------------------------------------------------------------------ */

export const getSdrDashboard = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ token: z.string().min(10) }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin, sdr } = await requireSdr(data.token);
    const now = new Date();
    const current = monthKey(now);

    const { data: businesses, error } = await supabaseAdmin
      .from("businesses")
      .select("id, name, created_at")
      .eq("sdr_id", sdr.id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const list = (businesses ?? []) as Array<{ id: string; name: string; created_at: string }>;
    const businessNames = new Map(list.map((b) => [b.id, b.name]));

    const ids = list.map((b) => b.id);
    const { data: payments, error: paymentsError } = await supabaseAdmin
      .from("subscription_payments")
      .select("business_id, reference_month, amount_cents, paid_at")
      .eq("status", "pago")
      .in("business_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"])
      .order("paid_at", { ascending: false });
    if (paymentsError) throw new Error(paymentsError.message);
    const paidList = (payments ?? []) as Array<{
      business_id: string;
      reference_month: string;
      amount_cents: number | null;
      paid_at: string | null;
    }>;

    const cadastros = list.filter((b) => b.created_at.slice(0, 7) === current).length;
    const vendas = paidList.filter((p) => p.reference_month.slice(0, 7) === current).length;

    return {
      sdr: { name: sdr.name as string, email: sdr.email as string },
      goals: {
        signupGoal: (sdr.signup_goal as number | null) ?? 0,
        salesGoal: (sdr.sales_goal as number | null) ?? 0,
      },
      commissionCents: (sdr.commission_cents as number | null) ?? 0,
      month: {
        cadastros,
        vendas,
        conversao: conversionRate(cadastros, vendas),
        comissaoCents: vendas * ((sdr.commission_cents as number | null) ?? 0),
      },
      cadastros: list.slice(0, 20).map((b) => ({
        id: b.id,
        name: b.name,
        createdAt: b.created_at,
      })),
      vendas: paidList.slice(0, 20).map((p) => ({
        id: `${p.business_id}-${p.reference_month}`,
        businessName: businessNames.get(p.business_id) ?? "Estabelecimento",
        referenceMonth: p.reference_month.slice(0, 7),
        paidAt: p.paid_at,
        amountCents: p.amount_cents ?? 0,
      })),
    };
  });

/* ------------------------------------------------------------------ */
/* Cadastro de estabelecimento feito pelo próprio SDR                  */
/* ------------------------------------------------------------------ */

export const sdrCreateBusiness = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        token: z.string().min(10),
        businessName: z.string().trim().min(2, "Informe o nome do estabelecimento."),
        category: z.string().min(1),
        ownerName: z.string().trim().min(2, "Informe o nome do dono."),
        phone: z.string().min(10, "Informe o telefone com DDD."),
        password: z.string().min(4, "A senha do dono precisa de pelo menos 4 caracteres."),
        trialDays: z.number().int().min(0).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin, sdr } = await requireSdr(data.token);
    const digits = onlyDigits(data.phone);
    const email = phoneLogin(digits);
    let ownerId: string | null = null;
    const created = await supabaseAdmin.auth.admin.createUser({
      email,
      password: phonePassword(data.password),
      email_confirm: true,
      user_metadata: { full_name: data.ownerName, phone: digits },
    });
    if (created.error) {
      const { data: existing } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();
      if (!existing) throw new Error(created.error.message);
      ownerId = existing.id;
      await supabaseAdmin.auth.admin.updateUserById(ownerId, {
        password: phonePassword(data.password),
      });
    } else ownerId = created.data.user?.id ?? null;
    if (!ownerId) throw new Error("Não foi possível criar o acesso do dono.");
    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: ownerId, role: "owner" }, { onConflict: "user_id,role" });
    const base = data.businessName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 40);
    const slug = `${base || "negocio"}-${Math.random().toString(36).slice(2, 6)}`;
    const { data: business, error } = await supabaseAdmin
      .from("businesses")
      .insert({
        name: data.businessName,
        slug,
        category: data.category,
        phone: digits,
        owner_id: ownerId,
        sdr_id: sdr.id,
        trial_days: data.trialDays ?? null,
        trial_created_at: data.trialDays != null ? new Date().toISOString() : null,
        access_until:
          data.trialDays != null
            ? new Date(Date.now() + data.trialDays * 86_400_000).toISOString()
            : new Date().toISOString(),
      })
      .select("id, slug")
      .single();
    if (error) throw new Error(error.message);
    return { businessId: business.id as string, slug: business.slug as string, phone: digits };
  });
