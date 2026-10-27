import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  CalendarCheck,
  ClipboardList,
  LogOut,
  Percent,
  Plus,
  ShoppingCart,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CATEGORIES } from "@/lib/format";
import { getSdrDashboard, sdrCreateBusiness } from "@/lib/sdr.functions";
import { clearSdrSession, readSdrSession } from "./sdr";

export const Route = createFileRoute("/painel-sdr")({
  head: () => ({
    meta: [
      { title: "Meu painel — Agenda Agora" },
      { name: "description", content: "Painel exclusivo do SDR: metas, cadastros e vendas." },
    ],
  }),
  component: SdrPanelPage,
});

const emptyForm = {
  businessName: "",
  category: "barbearia",
  ownerName: "",
  phone: "",
  password: "",
  trialDays: "7",
  semTeste: false,
};

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

function SdrPanelPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const dashboardFn = useServerFn(getSdrDashboard);
  const createBusinessFn = useServerFn(sdrCreateBusiness);

  const [session] = useState(() => (typeof window === "undefined" ? null : readSdrSession()));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!session) void navigate({ to: "/sdr", replace: true });
  }, [session, navigate]);

  const dashboard = useQuery({
    queryKey: ["sdr-dashboard", session?.token ?? ""],
    enabled: !!session,
    retry: false,
    queryFn: () => dashboardFn({ data: { token: session!.token } }),
  });

  useEffect(() => {
    if (!dashboard.data) return;
    try {
      if (window.sessionStorage.getItem("agenda-agora:sdr-welcome") === "1") {
        window.sessionStorage.removeItem("agenda-agora:sdr-welcome");
        setWelcomeOpen(true);
      }
    } catch {
      // Ignora armazenamento indisponível.
    }
  }, [dashboard.data]);

  useEffect(() => {
    if (!dashboard.error) return;
    const message = dashboard.error instanceof Error ? dashboard.error.message : "";
    if (message.includes("Sessão expirada") || message.includes("inativa")) {
      clearSdrSession();
      void navigate({ to: "/sdr", replace: true });
    }
  }, [dashboard.error, navigate]);

  const create = useMutation({
    mutationFn: (input: {
      businessName: string;
      category: string;
      ownerName: string;
      phone: string;
      password: string;
      trialDays: number | undefined;
    }) => createBusinessFn({ data: { token: session!.token, ...input } }),
    onSuccess: () => {
      toast.success("Estabelecimento cadastrado! O dono já pode acessar o Painel 2.");
      setDialogOpen(false);
      setForm(emptyForm);
      void queryClient.invalidateQueries({ queryKey: ["sdr-dashboard"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (!session) return null;

  const data = dashboard.data;
  const firstName = session.name.split(" ")[0] ?? session.name;
  const signupPercent = data && data.goals.signupGoal > 0
    ? Math.min(Math.round((data.month.cadastros / data.goals.signupGoal) * 100), 100)
    : 0;
  const salesPercent = data && data.goals.salesGoal > 0
    ? Math.min(Math.round((data.month.vendas / data.goals.salesGoal) * 100), 100)
    : 0;

  const submitCadastro = () => {
    if (!/^\d{10,11}$/.test(form.phone.replace(/\D/g, ""))) {
      toast.error("Informe o telefone com DDD (10 ou 11 dígitos).");
      return;
    }
    if (form.password.trim().length < 4) {
      toast.error("A senha do dono precisa de pelo menos 4 caracteres.");
      return;
    }
    create.mutate({
      businessName: form.businessName.trim(),
      category: form.category,
      ownerName: form.ownerName.trim(),
      phone: form.phone.trim(),
      password: form.password.trim(),
      trialDays: form.semTeste ? 0 : Math.max(Math.trunc(Number(form.trialDays)) || 0, 0),
    });
  };

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          "radial-gradient(ellipse 90% 40% at 50% -12%, rgba(22,119,255,0.14) 0%, transparent 70%), #050607",
      }}
    >
      <header className="sticky top-0 z-30 border-b border-[#1f232b] bg-[#050607]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <img
            src="/favicon-256.png"
            alt="Agenda Agora"
            decoding="async"
            className="size-9 object-contain"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-white">Agenda Agora · Painel do SDR</p>
            <p className="truncate text-xs text-[#626872]">{session.name}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-[#8a919c] hover:bg-white/10 hover:text-white"
            onClick={() => {
              clearSdrSession();
              void navigate({ to: "/sdr" });
            }}
          >
            <LogOut className="size-4" /> Sair
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white">
              Olá, {firstName}!
            </h1>
            <p className="text-sm text-[#777d87]">
              Suas metas, cadastros e vendas de {new Date().toLocaleDateString("pt-BR", { month: "long" })}.
            </p>
          </div>
          <Button
            onClick={() => setDialogOpen(true)}
            className="h-10 rounded-xl bg-[var(--c-1677ff)] px-4 text-sm font-bold text-white shadow-[0_8px_24px_rgba(22,119,255,0.35)] hover:bg-[var(--c-3b82f6)]"
          >
            <Plus className="size-4" /> Novo cadastro
          </Button>
        </div>

        {dashboard.isError ? (
          <p role="alert" className="rounded-xl border border-destructive/40 p-4 text-sm text-destructive">
            Não foi possível carregar seus dados. Atualize a página.
          </p>
        ) : null}

        <section className="rounded-2xl border border-[#22262e] bg-[#0d1015] p-5">
          <p className="flex items-center gap-2 text-[1.05rem] font-semibold text-[var(--c-eef1f6)]">
            <Target className="size-4 text-[var(--c-69a2ff)]" /> Metas do mês
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <GoalBar
              label="Cadastros"
              current={data?.month.cadastros ?? 0}
              goal={data?.goals.signupGoal ?? 0}
              percent={signupPercent}
            />
            <GoalBar
              label="Vendas"
              current={data?.month.vendas ?? 0}
              goal={data?.goals.salesGoal ?? 0}
              percent={salesPercent}
            />
          </div>
        </section>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MiniStat icon={<ClipboardList className="size-4" />} label="Cadastros no mês" value={String(data?.month.cadastros ?? 0)} />
          <MiniStat icon={<ShoppingCart className="size-4" />} label="Vendas no mês" value={String(data?.month.vendas ?? 0)} />
          <MiniStat icon={<Percent className="size-4" />} label="Conversão" value={`${data?.month.conversao ?? 0}%`} />
          <MiniStat
            icon={<ShoppingCart className="size-4" />}
            label="Comissão estimada"
            value={(data?.month.comissaoCents ?? 0) > 0
              ? ((data?.month.comissaoCents ?? 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
              : "R$ 0,00"}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-[#22262e] bg-[#0d1015] p-5">
            <p className="flex items-center gap-2 text-[1.05rem] font-semibold text-[var(--c-eef1f6)]">
              <CalendarCheck className="size-4 text-[var(--c-69a2ff)]" /> Meus cadastros
            </p>
            <ul className="mt-3 space-y-2">
              {(data?.cadastros ?? []).map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-black/25 px-3.5 py-2.5 text-sm"
                >
                  <span className="truncate text-[var(--c-dfe3ea)]">{item.name}</span>
                  <span className="ml-2 shrink-0 text-xs text-[#626872]">
                    {new Date(item.createdAt).toLocaleDateString("pt-BR")}
                  </span>
                </li>
              ))}
              {!data?.cadastros.length ? (
                <li className="rounded-xl border border-white/[0.05] bg-black/20 px-3.5 py-6 text-center text-sm text-[#777d87]">
                  Nenhum cadastro ainda. Clique em <strong className="text-white">Novo cadastro</strong>.
                </li>
              ) : null}
            </ul>
          </section>

          <section className="rounded-2xl border border-[#22262e] bg-[#0d1015] p-5">
            <p className="flex items-center gap-2 text-[1.05rem] font-semibold text-[var(--c-eef1f6)]">
              <ShoppingCart className="size-4 text-[var(--c-69a2ff)]" /> Minhas vendas
            </p>
            <ul className="mt-3 space-y-2">
              {(data?.vendas ?? []).map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-black/25 px-3.5 py-2.5 text-sm"
                >
                  <span className="min-w-0 truncate text-[var(--c-dfe3ea)]">
                    {item.businessName}{" "}
                    <span className="text-xs text-[#626872]">· {item.referenceMonth}</span>
                  </span>
                  <span className="ml-2 shrink-0 font-medium text-emerald-400">
                    {(item.amountCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </span>
                </li>
              ))}
              {!data?.vendas.length ? (
                <li className="rounded-xl border border-white/[0.05] bg-black/20 px-3.5 py-6 text-center text-sm text-[#777d87]">
                  Nenhuma venda paga ainda.
                </li>
              ) : null}
            </ul>
          </section>
        </div>
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md overflow-hidden rounded-2xl border-[#2a2f37] bg-[#0d1015] p-0">
          <div className="px-6 pb-6 pt-6">
            <DialogHeader>
              <DialogTitle className="text-[var(--c-eef1f6)]">Novo cadastro</DialogTitle>
            </DialogHeader>
            <div className="mt-4 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-[#9aa1ab]">Nome do estabelecimento</Label>
                <Input
                  value={form.businessName}
                  onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                  placeholder="Ex.: Barbaria Felip"
                  className="border-white/10 bg-black/40 text-[var(--c-e6e9ee)]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-[#9aa1ab]">Categoria</Label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="h-9 w-full rounded-md border border-white/10 bg-black/40 px-3 text-sm text-[var(--c-e6e9ee)]"
                  >
                    {CATEGORIES.map((category) => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-[#9aa1ab]">Telefone (WhatsApp)</Label>
                  <Input
                    value={formatPhone(form.phone)}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="(11) 98765-4321"
                    className="border-white/10 bg-black/40 text-[var(--c-e6e9ee)]"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-[#9aa1ab]">Nome do dono</Label>
                <Input
                  value={form.ownerName}
                  onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
                  placeholder="Ex.: Felipe Souza"
                  className="border-white/10 bg-black/40 text-[var(--c-e6e9ee)]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-[#9aa1ab]">Senha de acesso do dono</Label>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Mínimo 4 caracteres"
                    className="border-white/10 bg-black/40 text-[var(--c-e6e9ee)]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-[#9aa1ab]">Dias de teste grátis</Label>
                  <Input
                    type="number"
                    min={0}
                    disabled={form.semTeste}
                    value={form.semTeste ? "0" : form.trialDays}
                    onChange={(e) => setForm({ ...form, trialDays: e.target.value })}
                    className="border-white/10 bg-black/40 text-[var(--c-e6e9ee)] disabled:opacity-50"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-[#9aa1ab]">
                <input
                  type="checkbox"
                  checked={form.semTeste}
                  onChange={(e) => setForm({ ...form, semTeste: e.target.checked })}
                  className="size-4 accent-[var(--c-1677ff)]"
                />
                Sem período de teste (já nasce vencido)
              </label>
              <Button
                type="button"
                disabled={create.isPending}
                onClick={submitCadastro}
                className="w-full rounded-xl bg-[var(--c-1677ff)] font-bold text-white shadow-[0_8px_24px_rgba(22,119,255,0.35)] hover:bg-[var(--c-3b82f6)]"
              >
                {create.isPending ? "Cadastrando…" : "Cadastrar estabelecimento"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {welcomeOpen && data ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Boas-vindas"
          className="fixed inset-0 z-[95] grid place-items-center bg-black/60 p-4"
        >
          <div className="smodal-card sm-blue">
            <button
              type="button"
              className="smodal-x"
              onClick={() => setWelcomeOpen(false)}
              aria-label="Fechar"
            >
              ×
            </button>
            <img
              className="smodal-logo"
              src="/favicon-256.png"
              alt="Agenda Agora"
              decoding="async"
            />
            <h2>Bem-vindo ao time, {firstName}! 🎉</h2>
            <p>
              Seu painel está pronto. Cada cadastro de hoje é uma venda a mais no fim do mês — foco
              total nas metas!
            </p>
            <div className="smodal-feats">
              <div className="smodal-feat-h">Suas metas deste mês</div>
              <div className="smf">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>
                  Bater <b>{data.goals.signupGoal} cadastros</b> e <b>{data.goals.salesGoal} vendas</b>
                </span>
              </div>
              {data.goals.signupGoal > 0 ? (
                <div className="smf">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>
                    Ritmo semanal: cerca de <b>{Math.ceil(data.goals.signupGoal / 4)} cadastros por semana</b>
                  </span>
                </div>
              ) : null}
              {data.commissionCents > 0 ? (
                <div className="smf">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>
                    <b>
                      {(data.commissionCents / 100).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </b>{" "}
                    de comissão por venda paga
                  </span>
                </div>
              ) : null}
              <div className="smf">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>
                  <b>Bônus especial</b> a cada 10 novas assinaturas
                </span>
              </div>
            </div>
            <button
              type="button"
              className="smodal-cta sm-cta-blue"
              onClick={() => setWelcomeOpen(false)}
            >
              Bora bater metas
            </button>
            <div className="smodal-sub">Cadastros e vendas atualizados em tempo real</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function GoalBar({
  label,
  current,
  goal,
  percent,
}: {
  label: string;
  current: number;
  goal: number;
  percent: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-[#9aa1ab]">{label}</span>
        <span className="font-semibold text-white">
          {current}
          <span className="text-[#626872]"> / {goal}</span>
        </span>
      </div>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/[0.07]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#1677ff] to-[#5da8ff] transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-[#626872]">{percent}% da meta</p>
    </div>
  );
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#22262e] bg-[#0d1015] p-4">
      <span className="flex size-9 items-center justify-center rounded-xl border border-[var(--c-1677ff)]/25 bg-[var(--c-1677ff)]/10 text-[var(--c-69a2ff)]">
        {icon}
      </span>
      <p className="mt-2.5 text-[0.68rem] font-medium uppercase tracking-[0.14em] text-[#8a919c]">
        {label}
      </p>
      <p className="mt-1 text-2xl font-extrabold text-white">{value}</p>
    </div>
  );
}
