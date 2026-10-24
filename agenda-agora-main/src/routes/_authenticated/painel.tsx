import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Users,
  Scissors,
  UserRound,
  Menu,
  Bell,
  BellRing,
  Gem,
  PieChart,
  MessageSquareText,
  CircleX,
  Settings2,
  MessageCircle,
  Clock3,
  X,
  Link2,
  Copy,
  Check,
  ShieldCheck,
  FlaskConical,
  BadgeCheck,
  LifeBuoy,
  KeyRound,
  AlertTriangle,
  Camera,
  LockKeyhole,
  CreditCard,
  TrendingUp,
  ClipboardList,
  SlidersHorizontal,
  Paintbrush,
  Palette,
} from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { useAuth } from "@/hooks/useAuth";
import { useServerFn } from "@tanstack/react-start";
import { getMasterStatus } from "@/lib/admin.functions";
import { useBusiness, type Business } from "@/lib/business";
import { publicBookingUrl } from "@/lib/public-booking-link";
import { listBroadcasts } from "@/lib/broadcasts.functions";
import { isExpiredTrial, trialInfo } from "@/lib/trial-store";
import { formatPhoneBR } from "@/lib/format-phone";
import { panelPathHref, publicBookingOrigin } from "@/lib/app-hosts";
import {
  panelAvatarPathFromMetadata,
  uploadPanelAvatar,
  usePanelAvatarUrl,
} from "@/lib/panel-avatar";
import { LOGO_ACCEPT } from "@/lib/logo";
import { useAnimatedModal } from "@/lib/use-animated-modal";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { FloatingSupportButton } from "@/components/ui/floating-support-button";
import { SidebarProfileWidget } from "@/components/painel/SidebarProfileWidget";
import { SupportFaq } from "@/components/painel/SupportFaq";
import SecurityPinModal from "@/components/painel/SecurityPinModal";

/**
 * Logo da sidebar por tema de cor. O CSS também substitui a imagem via
 * `content: url(...)`, mas isso não funciona no Safari/iOS. Manter o `src`
 * sincronizado com o tema garante o logo correto em todos os navegadores.
 */
const brandLogoByTheme = {
  azul: "/agenda-agora-sidebar-logo-v2.png",
  rosa: "/agenda-agora-sidebar-logo-rosa.png",
  dourado: "/agenda-agora-sidebar-logo-dourada.png",
} as const;

type TemaSistema = keyof typeof brandLogoByTheme;

function useTemaSistema(): TemaSistema {
  // Começa em "azul" para bater com o HTML renderizado no servidor; o efeito
  // sincroniza com o tema real logo após a hidratação (sem mismatch).
  const [tema, setTema] = useState<TemaSistema>("azul");

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => {
      const atual = root.getAttribute("data-theme");
      setTema(atual === "rosa" || atual === "dourado" ? atual : "azul");
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  return tema;
}

const brandMark = "/favicon-256.png";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({
    meta: [
      { title: "Painel — Agenda Agora" },
      { name: "description", content: "Gerencie a agenda, os serviços e os clientes do negócio." },
      { property: "og:title", content: "Painel — Agenda Agora" },
      { property: "og:description", content: "Gerencie a agenda do seu negócio." },
    ],
  }),
  notFoundComponent: PanelNotFoundComponent,
  component: PainelLayout,
});

function PanelNotFoundComponent() {
  const navigate = useNavigate();

  return (
    <section className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-2xl font-semibold text-white">Página não encontrada</h1>
      <p className="text-sm text-[var(--c-9ca3af)]">Não encontramos esta página do painel.</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button variant="outline" onClick={() => window.history.back()}>
          Voltar
        </Button>
        <Button onClick={() => void navigate({ to: "/painel" })}>Ir para a agenda</Button>
      </div>
    </section>
  );
}

const nav = [
  {
    title: "Agenda",
    items: [
      {
        to: "/painel",
        label: "Agenda",
        hint: "Visão dos horários",
        icon: CalendarDays,
        exact: true,
      },
      {
        to: "/painel/bloqueios",
        label: "Horários Bloqueados",
        hint: "Folgas e indisponibilidades",
        icon: CircleX,
      },
      {
        to: "/painel/funcionamento",
        label: "Funcionamento",
        hint: "Dias e horários",
        icon: Clock3,
      },
    ],
  },
  {
    title: "Gestão",
    items: [
      { to: "/painel/clientes", label: "Clientes", hint: "Cadastro de clientes", icon: Users },
      {
        to: "/painel/profissionais",
        label: "Profissionais",
        hint: "Equipe e permissões",
        icon: UserRound,
      },
      { to: "/painel/servicos", label: "Serviço", hint: "Serviços e valores", icon: Scissors },
    ],
  },
  {
    title: "Financeiro",
    items: [
      { to: "/painel/as-pay", label: "Ag Pay", hint: "Saldo dos sinais", icon: Gem },
      {
        to: "/painel/relatorio",
        label: "Relatório",
        hint: "Métricas e resultados",
        icon: PieChart,
      },
    ],
  },
  {
    title: "Comunicação",
    items: [
      {
        to: "/painel/templates",
        label: "Templates",
        hint: "Mensagens prontas",
        icon: MessageSquareText,
      },
      {
        to: "/painel/integracoes",
        label: "Integrações",
        hint: "Conexão e mensagens",
        icon: MessageCircle,
      },
      { to: "/painel/lembretes", label: "Lembretes", hint: "Envios automáticos", icon: BellRing },
    ],
  },
  {
    title: "Sistema",
    items: [
      {
        to: "/painel/configuracoes",
        label: "Configurações",
        hint: "Preferências do negócio",
        icon: Settings2,
        children: [
          {
            to: "/painel/configuracoes?secao=preferencias",
            label: "Preferências",
            icon: SlidersHorizontal,
          },
          { to: "/painel/configuracoes?secao=aparencia", label: "Aparências", icon: Paintbrush },
        ],
      },
    ],
  },
] as const;

const platformNav = [
  {
    title: "Gestão",
    items: [
      {
        to: "/painel/master",
        label: "Visão geral",
        hint: "Métricas da plataforma",
        icon: ShieldCheck,
        exact: true,
      },
      {
        to: "/painel/em-teste",
        label: "(Em teste)",
        hint: "Contas em avaliação",
        icon: FlaskConical,
      },
      {
        to: "/painel/assinantes",
        label: "(Assinantes)",
        hint: "Comércios com assinatura",
        icon: BadgeCheck,
      },
      {
        to: "/painel/pix-aprovacao",
        label: "(Pix em Aprovação)",
        hint: "Chaves Pix pendentes",
        icon: KeyRound,
      },
      {
        to: "/painel/agpay-performance",
        label: "AG Pay — Performance",
        hint: "Performance financeira da AG Pay",
        icon: TrendingUp,
      },
      {
        to: "/painel/notificacoes-alertas",
        label: "(Notificações e Alertas)",
        hint: "Avisos para todos os usuários",
        icon: BellRing,
      },
      {
        to: "/painel/precisa-de-atencao",
        label: "(Precisa de atenção)",
        hint: "Contas expiradas e canceladas",
        icon: AlertTriangle,
      },
    ],
  },
  {
    title: "Sistema",
    items: [
      {
        to: "/painel/suporte",
        label: "Suporte técnico",
        hint: "Tickets e atendimento",
        icon: LifeBuoy,
      },
    ],
  },
] as const;

const routePermission: Partial<Record<string, string | string[]>> = {
  "/painel": "view_agenda",
  "/painel/bloqueios": ["block_schedule", "block_agenda"],
  "/painel/clientes": "view_customer_phone",
  "/painel/relatorio": "view_reports",
};

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [seenAt, setSeenAt] = useState(0);
  const listBroadcastsFn = useServerFn(listBroadcasts);
  const { data: list = [] } = useQuery({
    queryKey: ["broadcasts"],
    queryFn: () => listBroadcastsFn(),
    refetchInterval: 10000,
  });
  const unread = list.filter((b) => new Date(b.createdAt).getTime() > seenAt).length;

  useEffect(() => {
    try {
      setSeenAt(Number(window.localStorage.getItem("agenda-agora:broadcasts-seen") ?? "0"));
    } catch {
      setSeenAt(0);
    }
  }, []);

  const toggle = () => {
    setOpen((v) => {
      const next = !v;
      if (next) {
        const now = Date.now();
        setSeenAt(now);
        try {
          window.localStorage.setItem("agenda-agora:broadcasts-seen", String(now));
        } catch {
          // Ignora.
        }
      }
      return next;
    });
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        style={{ width: 39, height: 39 }}
        className="relative size-[39px] shrink-0 rounded-xl border border-[#2b2b2e] bg-[var(--c-0d0d10)] text-[#8a8f98] shadow-none hover:bg-[var(--c-121216)] hover:text-white"
        aria-label="Notificações"
        onClick={toggle}
      >
        <Bell className="size-[39px]" />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 size-2.5 rounded-full bg-destructive ring-2 ring-[#050607]" />
        )}
      </Button>
      {open && (
        <div className="absolute right-0 top-12 z-50 w-80 rounded-xl border border-[#25282c] bg-[var(--c-0d0d10)] p-3 shadow-2xl">
          <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-[#626872]">
            Notificações
          </p>
          {!list.length ? (
            <p className="px-1 py-4 text-center text-sm text-[#626872]">
              Nenhuma notificação por enquanto.
            </p>
          ) : (
            <ul className="max-h-80 space-y-2 overflow-y-auto">
              {list.map((b) => (
                <li
                  key={b.id}
                  className="rounded-lg border border-[var(--c-1f232b)] bg-[var(--c-12141a)] p-3"
                >
                  <p className="text-sm font-semibold text-[var(--c-f3f4f6)]">{b.title}</p>
                  <p className="mt-0.5 text-xs text-[var(--c-9ca3af)]">{b.message}</p>
                  <p className="mt-1 text-[10px] text-[#626872]">
                    {new Date(b.createdAt).toLocaleString("pt-BR")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

const subscribeToOrigin = () => () => {};

/** Origem do navegador; null no servidor e na hidratação, evitando divergência de HTML. */
function useBrowserOrigin() {
  return useSyncExternalStore(
    subscribeToOrigin,
    () => window.location.origin,
    () => null,
  );
}

function PublicBookingLinkCard({ slug }: { slug: string | null | undefined }) {
  const origin = useBrowserOrigin();
  const [feedback, setFeedback] = useState<"idle" | "copied" | "failed">("idle");
  const url = publicBookingUrl(publicBookingOrigin(origin), slug);

  useEffect(() => {
    setFeedback("idle");
  }, [url]);

  useEffect(() => {
    if (feedback !== "copied") return;
    const timer = window.setTimeout(() => setFeedback("idle"), 2500);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  if (!url) return null;

  const copy = async () => {
    const absolute = publicBookingUrl(publicBookingOrigin(window.location.origin), slug);
    try {
      if (!absolute || !navigator.clipboard) throw new Error("Clipboard indisponível");
      await navigator.clipboard.writeText(absolute);
      setFeedback("copied");
    } catch {
      setFeedback("failed");
    }
  };

  return (
    <section
      aria-labelledby="public-booking-link-title"
      className="mb-5 flex flex-col gap-3 rounded-lg border border-primary/30 bg-card p-3 sm:flex-row sm:items-center sm:gap-4 sm:p-4"
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Link2 className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 id="public-booking-link-title" className="text-sm font-medium text-foreground">
            Link de agendamento
          </h2>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="block break-all rounded-sm text-sm text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {url}
          </a>
        </div>
      </div>
      <div className="flex flex-col gap-1 sm:items-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void copy()}
          className="w-full focus-visible:ring-2 sm:w-auto"
        >
          {feedback === "copied" ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
          {feedback === "copied" ? "Link copiado" : "Copiar link"}
        </Button>
        <p aria-live="polite" role="status" className="min-h-0 text-xs text-muted-foreground">
          {feedback === "copied"
            ? "Link copiado para a área de transferência."
            : feedback === "failed"
              ? "Não foi possível copiar. Selecione o link e copie manualmente."
              : ""}
        </p>
      </div>
    </section>
  );
}

const subAccountTabs = [
  { id: "visao", label: "Visão Geral", enabled: true },
  { id: "assinatura", label: "Assinatura", enabled: true },
  { id: "suporte", label: "Suporte & FAQ", enabled: true },
];

/** Opções de cor do sistema exibidas no seletor "Cor do Tema". */
const temaOpcoes = [
  { id: "azul", label: "Azul", swatch: "#3b82f6", soft: "#60a5fa" },
  { id: "rosa", label: "Rosa", swatch: "#f63b99", soft: "#f472b6" },
  { id: "dourado", label: "Dourado", swatch: "#c19b35", soft: "#e8ce72" },
] as const;

// Página de conta/assinatura exibida dentro do painel (branch `subOpen`).
// Estrutura e classes replicam o HTML original; apenas os dados são dinâmicos.
function AssinaturaContaPanel({
  business,
  user,
  platformMode,
}: {
  business: Business | null;
  user: User | null;
  platformMode: boolean;
}) {
  const [tab, setTab] = useState("visao");
  const [idCopied, setIdCopied] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const avatarPath = panelAvatarPathFromMetadata(user);
  const { data: avatarUrl } = usePanelAvatarUrl(avatarPath);
  const [temaSistema, setTemaSistema] = useState<"azul" | "rosa" | "dourado">(() => {
    if (typeof document !== "undefined") {
      const t = document.documentElement.dataset["theme"];
      if (t === "rosa" || t === "dourado") return t;
    }
    return "azul";
  });
  const temaAtual = temaOpcoes.find((o) => o.id === temaSistema) ?? temaOpcoes[0];

  /**
   * Alterna o tema de cor do sistema do SaaS (azul | rosa | dourado). Aplica na
   * hora (1 atributo no <html>), persiste no banco por estabelecimento e
   * recarrega em seguida para redesenhar também os canvases com a cor nova.
   */
  async function trocarTemaSistema(op: "azul" | "rosa" | "dourado") {
    if (op === temaSistema) return;
    setTemaSistema(op);
    const root = document.documentElement;
    if (op === "rosa" || op === "dourado") root.setAttribute("data-theme", op);
    else root.removeAttribute("data-theme");
    window.localStorage.setItem("agendaagora:tema", op);
    if (business?.id) {
      // Se a coluna `theme` ainda não existir no banco (migração pendente),
      // o erro é ignorado em silêncio e a preferência continua valendo pelo
      // localStorage — nada de ruído no console.
      const { error } = await supabase
        .from("businesses")
        .update({ theme: op })
        .eq("id", business.id);
      void error;
    }
    const labels: Record<typeof op, string> = {
      azul: "Tema azul aplicado.",
      rosa: "Tema rosa aplicado.",
      dourado: "Tema dourado aplicado.",
    };
    toast.success(labels[op]);
    window.setTimeout(() => window.location.reload(), 900);
  }

  function openAvatarPicker() {
    if (!business?.id) {
      toast.error("Selecione um estabelecimento para alterar a foto.");
      return;
    }
    avatarInputRef.current?.click();
  }

  async function handleAvatarFile(file: File | undefined) {
    if (!file || !business?.id) return;
    setAvatarBusy(true);
    try {
      await uploadPanelAvatar({ businessId: business.id, file, previousPath: avatarPath });
      toast.success("Foto de perfil atualizada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível alterar a foto.");
    } finally {
      setAvatarBusy(false);
    }
  }

  useEffect(() => {
    if (!idCopied) return;
    const timer = window.setTimeout(() => setIdCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [idCopied]);

  const trial = business ? trialInfo(business) : null;
  const planExpired = business?.status === "suspenso" || (trial ? trial.remaining <= 0 : false);
  const planLabel = planExpired ? "Renovar" : trial ? "Teste Grátis" : "Assinante Premium";
  const accountId = business?.id ?? null;
  const shortId = accountId ? `${accountId.slice(0, 8)}...` : "—";
  const monthlyValue = business?.monthly_fee_cents
    ? (business.monthly_fee_cents / 100).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      })
    : "—";
  const memberSince = business?.created_at
    ? new Date(business.created_at).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";
  const lastAccess = user?.last_sign_in_at
    ? new Date(user.last_sign_in_at).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

  const planBadgeClass = planExpired
    ? "border-destructive/50 bg-destructive/10 text-destructive"
    : "border-emerald-400/35 bg-emerald-400/[0.10] text-emerald-300";

  const copyAccountId = async () => {
    if (!accountId || typeof navigator === "undefined" || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(accountId);
      setIdCopied(true);
    } catch {
      // Clipboard indisponível: o ID permanece visível no botão.
    }
  };

  return (
    <div className="owner-route-content">
      <div className="mx-auto w-full max-w-5xl pb-8">
        <section className="overflow-hidden rounded-[20px] border border-[var(--c-26292f)] bg-[#050607] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.22)] sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="relative shrink-0">
              <div className="flex size-[88px] items-center justify-center overflow-hidden rounded-[20px] bg-[#f4f4f5] text-2xl font-semibold text-[var(--c-111318)]">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="size-full object-cover" />
                ) : (
                  (business?.name ?? user?.email ?? "G").charAt(0).toUpperCase()
                )}
              </div>
              <button
                type="button"
                onClick={openAvatarPicker}
                disabled={avatarBusy}
                aria-label="Alterar foto do perfil"
                title="Alterar foto"
                className="absolute -bottom-1 -right-1 flex size-8 items-center justify-center rounded-[9px] border-2 border-[#050607] bg-[var(--c-146cff)] text-white shadow-[0_4px_14px_var(--c-rgba-20-108-255-a0d35)] transition-colors hover:bg-[var(--c-2a7cff)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c-146cff)]/60 disabled:opacity-60"
              >
                <Camera className="size-4" aria-hidden="true" />
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept={LOGO_ACCEPT}
                style={{ display: "none" }}
                aria-label="Selecionar foto do perfil"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  void handleAvatarFile(file);
                }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[26px]! leading-tight! font-semibold! tracking-[-0.035em] text-[#f5f5f6]">
                {business?.name ??
                  (platformMode ? "Administração da plataforma" : "Acesso do estabelecimento")}
              </h1>
              <p className="mt-1 truncate text-sm text-[#777d87]">
                {business?.phone ? formatPhoneBR(business.phone) : "—"}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold ${planBadgeClass}`}
                >
                  {planLabel}
                </span>
                <button
                  type="button"
                  onClick={() => void copyAccountId()}
                  title="Copiar ID da conta"
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#2d3037] bg-[var(--c-15171b)] px-3 py-1 text-[10px] font-medium text-[#7f858f] transition-colors hover:border-[var(--c-3b4049)] hover:text-[var(--c-b8bdc5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c-146cff)]/60"
                >
                  {idCopied ? (
                    <Check className="size-3" aria-hidden="true" />
                  ) : (
                    <Copy className="size-3" aria-hidden="true" />
                  )}
                  {idCopied ? "ID copiado" : shortId}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-[17px] border border-[var(--c-0e4eaf)] bg-[linear-gradient(145deg,var(--c-07101f)_0%,var(--c-060b14)_55%,var(--c-070a0f)_100%)] p-5 sm:p-6">
            <p className="text-[11px] font-medium uppercase tracking-[0.10em] text-[#69717f]">
              Seu plano
            </p>
            <p className="mt-1.5 text-[22px] font-semibold tracking-[-0.03em] text-[var(--c-f4f5f7)]">
              {planLabel}
            </p>
            <p
              className={`mt-0.5 text-xs ${planExpired ? "text-destructive" : "text-[var(--c-3479ff)]"}`}
            >
              {planExpired ? "Plano inativo" : "Plano ativo"}
            </p>
            <a
              href="/painel/pagamentos"
              className="mt-4 flex h-10 w-full items-center justify-center rounded-[9px] bg-[var(--c-0d4bc3)] text-sm font-medium text-white transition-colors hover:bg-[var(--c-1558d5)]"
            >
              Gerenciar assinatura
            </a>
          </div>
        </section>

        <section className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-[14px] border border-[var(--c-282b31)] bg-[var(--c-0d0e11)] p-4">
            <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-[#676d77]">
              MEMBRO DESDE
            </p>
            <p className="mt-1.5 text-[15px] font-semibold tracking-[-0.02em] text-[var(--c-e6e8eb)]">
              {memberSince}
            </p>
          </div>
          <div className="rounded-[14px] border border-[var(--c-282b31)] bg-[var(--c-0d0e11)] p-4">
            <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-[#676d77]">
              ÚLTIMO ACESSO
            </p>
            <p className="mt-1.5 text-[15px] font-semibold tracking-[-0.02em] text-[var(--c-e6e8eb)]">
              {lastAccess}
            </p>
          </div>
          <div className="col-span-1 rounded-[14px] border border-[var(--c-282b31)] bg-[var(--c-0d0e11)] p-4">
            <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-[#676d77]">
              CONTAS CONECTADAS
            </p>
            <p className="mt-1.5 text-[15px] font-semibold tracking-[-0.02em] text-[var(--c-e6e8eb)]">
              1
            </p>
          </div>
        </section>

        <nav className="mt-7 flex flex-wrap gap-x-7 gap-y-1 border-b border-[var(--c-272a30)] px-1">
          {subAccountTabs.map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                disabled={!item.enabled}
                onClick={() => item.enabled && setTab(item.id)}
                className={`relative py-3 text-sm font-medium transition-colors ${
                  active ? "text-white" : "text-[#666d78]"
                } ${item.enabled ? (active ? "cursor-pointer" : "cursor-pointer hover:text-[var(--c-d9dce1)]") : "cursor-default"}`}
              >
                {item.label}
                {active && (
                  <span className="absolute inset-x-0 bottom-[-1px] h-[2px] rounded-full bg-[var(--c-1774ff)]" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="mt-4 space-y-4">
          {tab === "assinatura" && (
            <>
              <section className="rounded-[18px] border border-[var(--c-272a30)] bg-[#050607] p-5 sm:p-6">
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#686f7b]">
                  Plano atual
                </p>
                <p className="mt-5 text-[11px] font-medium uppercase tracking-[0.10em] text-[#69717f]">
                  Seu plano
                </p>
                <p className="mt-1.5 text-[22px] font-semibold tracking-[-0.03em] text-[var(--c-f4f5f7)]">
                  {planLabel}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full border border-emerald-400/35 bg-emerald-400/[0.10] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-emerald-300">
                    {planExpired ? "Inativo" : "Ativo"}
                  </span>
                  <span className="text-sm font-medium text-emerald-300">
                    {planExpired ? "Conta inativa no momento" : "Conta ativa em período de teste"}
                  </span>
                </div>
                <div className="mt-5 flex items-center gap-2 border-t border-[var(--c-202329)] pt-4 text-sm">
                  <CreditCard className="size-4 text-[#6d7480]" aria-hidden="true" />
                  <span className="text-[#6d7480]">Valor mensal</span>
                  <span className="ml-auto font-semibold text-[var(--c-e8eaed)]">
                    {monthlyValue}
                  </span>
                </div>
              </section>
              <section className="rounded-[18px] border border-[var(--c-272a30)] bg-[#050607] p-5 sm:p-6">
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#686f7b]">
                  Uso
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2.5">
                  {[
                    { label: "Agendamentos", value: planExpired ? "—" : "Ilimitado" },
                    { label: "Lembretes", value: planExpired ? "—" : "Auto" },
                    { label: "Sinal Pix", value: planExpired ? "—" : "Ativo" },
                    { label: "Campanhas", value: planExpired ? "—" : "Ativo" },
                    { label: "Relatórios", value: planExpired ? "—" : "Ativo" },
                    { label: "Suporte", value: planExpired ? "—" : "Ativo" },
                  ].map((f) => (
                    <div
                      key={f.label}
                      className="rounded-xl border border-[var(--c-24272e)] bg-[var(--c-0d0e11)] p-3.5"
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8b8e96]">
                        {f.label}
                      </p>
                      <p className="mt-1.5 text-[15px] font-semibold text-[var(--c-e7e9ed)]">
                        {f.value}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          {tab === "suporte" && <SupportFaq />}

          {tab !== "assinatura" && tab !== "suporte" && (
            <>
              <section className="rounded-[18px] border border-[var(--c-272a30)] bg-[#050607] p-5 sm:p-6">
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#686f7b]">
                  Segurança
                </p>
                <div className="mt-4 rounded-[15px] border border-[var(--c-282b31)] bg-[var(--c-0a0b0d)] p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--c-08162d)] text-[var(--c-3485ff)]">
                      <LockKeyhole className="size-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-semibold text-[var(--c-eef0f3)]">
                        Senha de acesso
                      </p>
                      <p className="mt-1 text-xs leading-5 text-[#6e747e]">
                        Consulte o usuário desta conta e os dados disponíveis do acesso atual
                      </p>
                      <button
                        type="button"
                        className="mt-4 rounded-full border border-[#383c44] bg-[var(--c-121317)] px-5 py-2 text-sm font-semibold text-[var(--c-e2e5e9)] transition-colors hover:border-[#4b505a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c-146cff)]/60"
                      >
                        Ver acesso
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-[18px] border border-[var(--c-272a30)] bg-[#050607] p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#686f7b]">
                    Informações da conta
                  </p>
                  <button
                    type="button"
                    className="rounded-[9px] border border-[var(--c-30343b)] bg-transparent px-3 py-2 text-xs font-medium text-[var(--c-b9bec7)] transition-colors hover:border-[var(--c-3b4049)] hover:text-[var(--c-d9dce1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c-146cff)]/60"
                  >
                    Atualizar dados
                  </button>
                </div>
                <div className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#666d77]">
                      NOME
                    </p>
                    <p className="mt-1 break-words text-sm font-medium leading-5 text-[var(--c-aeb4bd)]">
                      {business?.name ?? "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#666d77]">
                      TELEFONE
                    </p>
                    <p className="mt-1 break-words text-sm font-medium leading-5 text-[var(--c-aeb4bd)]">
                      {business?.phone ? formatPhoneBR(business.phone) : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#666d77]">
                      CPF / CNPJ
                    </p>
                    <p className="mt-1 break-words text-sm font-medium leading-5 text-[var(--c-aeb4bd)]">
                      —
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#666d77]">
                      PLANO
                    </p>
                    <p className="mt-1 break-words text-sm font-medium leading-5 text-[var(--c-aeb4bd)]">
                      {planLabel}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#666d77]">
                      MEMBRO DESDE
                    </p>
                    <p className="mt-1 break-words text-sm font-medium leading-5 text-[var(--c-aeb4bd)]">
                      {memberSince}
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#666d77]">
                      ID DA CONTA
                    </p>
                    <p className="mt-1 break-words text-sm font-medium leading-5 text-[var(--c-aeb4bd)]">
                      {accountId ?? "—"}
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <div
                      className="sys-theme-card"
                      style={
                        {
                          "--sys-theme-accent": temaAtual.swatch,
                          "--sys-theme-accent-soft": temaAtual.soft,
                        } as CSSProperties
                      }
                    >
                      <div className="sys-theme-header">
                        <div className="sys-theme-icon" aria-hidden="true">
                          <Palette className="size-4" strokeWidth={2} />
                        </div>
                        <div>
                          <h4 className="sys-theme-title">Cor do Tema</h4>
                          <p className="sys-theme-sub">Personalize a interface</p>
                        </div>
                      </div>

                      <div className="sys-theme-options" role="group" aria-label="Cor do Tema">
                        {temaOpcoes.map(({ id, label, swatch }) => {
                          const selected = temaSistema === id;
                          return (
                            <button
                              key={id}
                              type="button"
                              aria-pressed={selected}
                              aria-label={label}
                              title={label}
                              onClick={() => void trocarTemaSistema(id)}
                              className={`sys-theme-swatch${selected ? " is-active" : ""}`}
                              style={
                                {
                                  "--active-color": swatch,
                                  background:
                                    id === "dourado"
                                      ? "linear-gradient(135deg, #e8ce72, #c19b35 52%, #a9801f)"
                                      : swatch,
                                } as CSSProperties
                              }
                            >
                              <Check
                                className="sys-theme-check"
                                strokeWidth={3}
                                aria-hidden="true"
                              />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Tela de pagamentos da assinatura: faturas do estabelecimento. */
function PagamentosView({ business }: { business: Business | null }) {
  const [planOpen, setPlanOpen] = useState(true);
  const {
    isOpen: checkoutOpen,
    closing: checkoutClosing,
    open: openCheckout,
    close: closeCheckout,
  } = useAnimatedModal();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const trial = business ? trialInfo(business) : null;
  const expired = business?.status === "suspenso" || (trial ? trial.remaining <= 0 : false);
  const status = expired ? "Vencido" : trial ? "A vencer" : "Pago";
  const rowClass =
    status === "Vencido" ? "bg-[#c0392b]" : status === "Pago" ? "bg-[#1e7e4d]" : "bg-[#8a6d1c]";
  const value = business?.monthly_fee_cents
    ? (business.monthly_fee_cents / 100).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      })
    : "—";
  const date = business?.created_at
    ? new Date(business.created_at).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      })
    : "—";

  return (
    <div className="owner-route-content">
      <div className="mx-auto w-full max-w-5xl pb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Pagamentos</h1>
        <div className="report-luminous-card report-effect-strong relative mx-auto mt-8 w-full max-w-sm p-6 pt-7">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-0 right-0 top-0 z-10 h-[2px] bg-gradient-to-r from-transparent via-[var(--c-4a90e2)] to-transparent shadow-[0_0_16px_var(--c-rgba-74-144-226-a0d9)]"
          />
          <span className="absolute left-6 top-3 rounded-full bg-[var(--c-1f6df9)] px-3 py-1 font-[General_Sans] text-[0.65rem] font-normal tracking-wide text-white">
            MAIS POPULAR
          </span>
          <p className="mt-6 font-[General_Sans] text-xs font-normal uppercase tracking-[0.14em] text-[var(--c-5b8def)]">
            Premium
          </p>
          <button
            type="button"
            onClick={() => setPlanOpen((v) => !v)}
            aria-expanded={planOpen}
            aria-label={planOpen ? "Recolher assinatura" : "Expandir assinatura"}
            className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-lg border border-[var(--c-1f6df9)]/30 bg-[var(--c-1f6df9)]/10 text-[var(--c-8fb5ff)] transition-colors hover:bg-[var(--c-1f6df9)]/20"
          >
            {planOpen ? (
              <ChevronUp className="size-4" aria-hidden="true" />
            ) : (
              <ChevronDown className="size-4" aria-hidden="true" />
            )}
          </button>
          <div
            className={`grid transition-all duration-300 ease-in-out ${planOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
          >
            <div className="overflow-hidden">
              <p className="mt-4 text-4xl font-extrabold tracking-tight text-white">
                R$&nbsp;89,90<span className="text-base font-medium text-[#8a8f98]">/mês</span>
              </p>
              <p className="mt-1 text-sm text-[#8a8f98]">Para o seu negócio crescer</p>
              <button
                type="button"
                onClick={openCheckout}
                className="mt-5 h-11 w-full rounded-xl bg-white text-sm font-bold text-black transition-colors hover:bg-[#e5e5e5]"
              >
                Assinar Premium
              </button>
              <ul className="mt-5 space-y-2.5 border-t border-white/10 pt-5 text-sm text-[var(--c-c9cdd4)]">
                {" "}
                <li className="flex items-center gap-2">
                  <Check className="size-4 shrink-0 text-[#49db7e]" strokeWidth={2.5} />
                  <span>
                    <strong className="text-white">Agendamentos ilimitados</strong>
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 shrink-0 text-[#49db7e]" strokeWidth={2.5} />
                  <span>
                    <strong className="text-white">Lembretes automáticos</strong> no WhatsApp
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 shrink-0 text-[#49db7e]" strokeWidth={2.5} />
                  <span>
                    <strong className="text-white">Sinal antecipado</strong> via Pix
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 shrink-0 text-[#49db7e]" strokeWidth={2.5} />
                  <span>
                    <strong className="text-white">Página de agendamento</strong> própria
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 shrink-0 text-[#49db7e]" strokeWidth={2.5} />
                  <span>
                    <strong className="text-white">Suporte prioritário</strong>
                  </span>
                </li>
              </ul>
              <div className="mt-2.5 rounded-lg border border-[var(--c-2f83ff)]/40 bg-[var(--c-2f83ff)]/10 px-4 py-[7px] text-center text-sm font-semibold text-[var(--c-8fb5ff)]">
                + Bônus Adicionais
              </div>
              <ul className="mt-2.5 space-y-2.5 text-sm text-[var(--c-c9cdd4)]">
                <li className="flex items-center gap-2">
                  <Check className="size-4 shrink-0 text-[#49db7e]" strokeWidth={2.5} />
                  <span>
                    <strong className="text-white">Campanha de retorno</strong>
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 shrink-0 text-[#49db7e]" strokeWidth={2.5} />
                  <span>
                    <strong className="text-white">Relatórios gerais</strong>
                  </span>
                </li>
              </ul>
            </div>
          </div>
          {!planOpen && (
            <div
              className={`mt-4 flex items-center justify-between gap-4 rounded-lg border border-white/20 px-6 py-3.5 text-white ${rowClass}`}
            >
              <span className="text-[0.95rem]">{date}</span>
              <span className="text-[0.95rem]">{value}</span>
              <span className="text-[0.95rem]">{status}</span>
            </div>
          )}
        </div>
      </div>
      {checkoutOpen && mounted
        ? createPortal(
            <div
              className="fixed inset-0 z-[70] grid overflow-y-auto p-4"
              role="dialog"
              aria-modal="true"
              aria-label="Confirmar assinatura"
            >
              <button
                type="button"
                aria-label="Fechar"
                onClick={closeCheckout}
                className={`fixed inset-0 h-full w-full cursor-default bg-black/60 ${checkoutClosing ? "animate-backdrop-out" : "animate-backdrop"}`}
              />
              <div
                className={`relative m-auto w-full max-w-md rounded-2xl border border-[var(--c-272a30)] bg-[var(--c-0b0b0e)] p-6 ${checkoutClosing ? "animate-modal-out" : "animate-modal-in"}`}
              >
                <button
                  type="button"
                  onClick={closeCheckout}
                  aria-label="Fechar"
                  className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-full border border-[#30333a] text-[var(--c-9aa4b2)] transition-colors hover:text-white"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
                <h3 className="text-center text-[1.18rem] font-bold text-white">
                  Confirmar assinatura
                </h3>
                <p className="mt-1.5 text-center text-sm text-[var(--c-9aa4b2)]">
                  Revise seu pedido antes do pagamento
                </p>

                <div className="mt-5 rounded-[10px] border border-[var(--c-2a2e35)] bg-[var(--c-101218)] p-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">Premium</p>
                      <p className="mt-0.5 text-xs text-[#8b8e96]">Cobrança mensal</p>
                    </div>
                    <p className="font-bold text-white">R$&nbsp;89,90</p>
                  </div>
                </div>

                <p className="mb-2 mt-4 text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-[#8b8e96]">
                  Forma de pagamento
                </p>
                <div className="flex items-center gap-2.5 rounded-[10px] border border-[var(--c-2f83ff)]/60 bg-[var(--c-rgba-59-130-246-a0d1)] p-3 text-white">
                  <svg viewBox="0 0 24 24" width="21" height="21" fill="#32BCAD" aria-hidden="true">
                    <path d="M5.283 18.36c.85 0 1.647-.331 2.246-.932l3.243-3.242c.228-.228.625-.228.853 0l3.255 3.254a3.152 3.152 0 0 0 2.245.93h.638l-4.106 4.107c-1.282 1.283-3.363 1.283-4.646 0l-4.118-4.117h.39zm12.472-12.72c-.85 0-1.647.33-2.246.93l-3.254 3.255a.604.604 0 0 1-.854 0L8.16 6.573a3.153 3.153 0 0 0-2.246-.932h-.39l4.118-4.117a3.286 3.286 0 0 1 4.646 0l4.106 4.106h-.638zM1.817 9.633l2.492-2.492h.974c.587 0 1.161.238 1.575.652l3.254 3.254a1.55 1.55 0 0 0 1.096.451c.398 0 .796-.15 1.097-.45l3.254-3.255a2.24 2.24 0 0 1 1.575-.652h1.113l2.505 2.505c1.282 1.283 1.282 3.364 0 4.646l-2.505 2.505h-1.113a2.24 2.24 0 0 1-1.575-.651l-3.254-3.254a1.594 1.594 0 0 0-2.193 0l-3.254 3.254a2.24 2.24 0 0 1-1.575.651h-.974l-2.492-2.492c-1.283-1.282-1.283-3.363 0-4.646" />
                  </svg>
                  <span>
                    <span className="block text-[0.86rem] font-semibold">PIX</span>
                    <span className="block text-xs text-[#8b8e96]">Liberação imediata</span>
                  </span>
                </div>

                <div className="mt-3.5 flex items-center justify-between border-t border-white/10 py-3.5">
                  <p className="font-semibold text-white">Total</p>
                  <p className="text-[1.4rem] font-bold text-white">R$&nbsp;89,90</p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    toast.info("Checkout Pix em breve. Fale com o suporte para assinar.")
                  }
                  className="h-11 w-full rounded-xl bg-white text-sm font-bold text-black transition-colors hover:bg-[#e5e5e5]"
                >
                  Continuar para PIX
                </button>
                <p className="mt-2.5 text-center text-xs text-[#8b8e96]">
                  Pagamento via PIX (instantâneo) — liberação automática.
                </p>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

/**
 * Esqueleto neutro exibido entre o clique no menu e a montagem da nova rota.
 * Substitui a tela anterior na hora, evitando o "congelamento" enquanto os dados
 * da próxima página chegam do servidor.
 */
function RoutePendingSkeleton() {
  return (
    <div
      className="owner-route-skeleton animate-slide-up"
      role="status"
      aria-live="polite"
      aria-label="Carregando página"
    >
      <span className="sr-only">Carregando…</span>
      <div className="owner-skeleton-line w-52 max-w-[60%]" />
      <div className="owner-skeleton-line w-80 max-w-[85%]" />
      <div className="owner-skeleton-cards">
        <div className="owner-skeleton-card" />
        <div className="owner-skeleton-card" />
        <div className="owner-skeleton-card" />
      </div>
    </div>
  );
}

function PainelLayout() {
  const { user, signOut } = useAuth();
  const { businesses, business, businessId, isPlatformAdmin } = useBusiness();
  const temaSistema = useTemaSistema();
  const { data: profileAvatarUrl } = usePanelAvatarUrl(panelAvatarPathFromMetadata(user));
  const masterStatusFn = useServerFn(getMasterStatus);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem("agenda-agora:sidebar-collapsed") === "true");
    } catch {
      setCollapsed(false);
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem("agenda-agora:sidebar-collapsed", String(next));
      } catch {
        // O estado continua funcionando durante a sessão mesmo sem armazenamento disponível.
      }
      return next;
    });
  };
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [subOpen, setSubOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [notificationsAuthorized, setNotificationsAuthorized] = useState(() => {
    try {
      if (typeof window === "undefined") return false;
      return window.sessionStorage.getItem("agenda-agora:notif-auth") === "1";
    } catch {
      return false;
    }
  });
  const [pixPinModalOpen, setPixPinModalOpen] = useState(false);
  const [pixAuthorized, setPixAuthorized] = useState(() => {
    try {
      if (typeof window === "undefined") return false;
      return window.sessionStorage.getItem("agenda-agora:pix-auth") === "1";
    } catch {
      return false;
    }
  });
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  useEffect(() => {
    if (pathname === "/painel/configuracoes") setConfigOpen(true);
  }, [pathname]);
  // `location` é otimista (muda no instante do clique); `resolvedLocation` só muda
  // quando a rota nova termina de montar. É esse segundo sinal que revela a página.
  const resolvedPathname = useRouterState({
    select: (state) => (state.resolvedLocation ?? state.location).pathname,
  });
  const { data: member } = useQuery({
    queryKey: ["current-professional", user?.id, businessId],
    enabled: !!user?.id && !!businessId,
    queryFn: async () => {
      const { data } = await supabase
        .from("professionals")
        .select("permissions")
        .eq("user_id", user!.id)
        .eq("business_id", businessId!)
        .maybeSingle();
      return data;
    },
  });
  const { data: masterStatus } = useQuery({
    queryKey: ["master-status"],
    enabled: !!user,
    queryFn: () => masterStatusFn(),
    retry: false,
  });
  const platformMode = isPlatformAdmin || masterStatus?.isMaster === true;
  const permissions =
    member?.permissions &&
    typeof member.permissions === "object" &&
    !Array.isArray(member.permissions)
      ? (member.permissions as Record<string, boolean>)
      : null;
  const canOpen = (to: string) => {
    if (!permissions || !!permissions["admin"]) return true;
    const need = routePermission[to] ?? "admin";
    return Array.isArray(need) ? need.some((k) => !!permissions[k]) : !!permissions[need];
  };

  useEffect(() => {
    if (!masterStatus) return;
    const href = panelPathHref(pathname, window.location);
    if (!href.startsWith("/") && href !== window.location.href) window.location.replace(href);
  }, [masterStatus, pathname]);

  // A rota de destino terminou de montar (o `resolvedLocation` mudou): limpa o estado
  // de espera para a página nova aparecer já com a animação de entrada. Usar o
  // `resolvedLocation` (e não o `location`, otimista) evita revelar a tela nova antes
  // da hora — antes o overlay ficava parado sobre a tela nova.
  useEffect(() => {
    setPendingPath(null);
  }, [resolvedPathname]);

  // Rede de segurança: se a navegação não completar, não deixa a tela presa no esqueleto.
  useEffect(() => {
    if (pendingPath === null) return;
    const timer = window.setTimeout(() => setPendingPath(null), 1800);
    return () => window.clearTimeout(timer);
  }, [pendingPath]);

  // Esqueleto visível enquanto a rota de destino ainda não terminou de montar.
  const isRoutePending = pendingPath !== null && pendingPath !== resolvedPathname;

  const beginNavigation = (to?: string) => {
    setOpen(false);
    setSubOpen(false);
    setPayOpen(false);
    setProfileOpen(false);
    // Já estamos na rota de destino: apenas fecha o menu, sem exibir esqueleto.
    if (!to || to === pathname) return;
    setPendingPath(to);
  };

  const handleNotificationsClick = () => {
    setOpen(false);
    setSubOpen(false);
    setPayOpen(false);
    setProfileOpen(false);
    if (notificationsAuthorized) {
      beginNavigation("/painel/notificacoes-alertas");
      void navigate({ to: "/painel/notificacoes-alertas" });
    } else {
      setPinModalOpen(true);
    }
  };

  const handlePinSuccess = () => {
    setNotificationsAuthorized(true);
    try {
      window.sessionStorage.setItem("agenda-agora:notif-auth", "1");
    } catch {
      // Ignora falhas de armazenamento.
    }
    setPinModalOpen(false);
    beginNavigation("/painel/notificacoes-alertas");
    void navigate({ to: "/painel/notificacoes-alertas" });
  };

  const handlePixAprovacaoClick = () => {
    setOpen(false);
    setSubOpen(false);
    setPayOpen(false);
    setProfileOpen(false);
    if (pixAuthorized) {
      beginNavigation("/painel/pix-aprovacao");
      void navigate({ to: "/painel/pix-aprovacao" });
    } else {
      setPixPinModalOpen(true);
    }
  };

  const handlePixPinSuccess = () => {
    setPixAuthorized(true);
    try {
      window.sessionStorage.setItem("agenda-agora:pix-auth", "1");
    } catch {
      // Ignora falhas de armazenamento.
    }
    setPixPinModalOpen(false);
    beginNavigation("/painel/pix-aprovacao");
    void navigate({ to: "/painel/pix-aprovacao" });
  };

  const visibleNav = platformMode ? platformNav : nav;
  const trial = business ? trialInfo(business) : null;

  // Conta criada com período de teste vencido: o painel fica bloqueado até a
  // assinatura ser ativada pela plataforma. O acesso de plataforma não é travado.
  if (!platformMode && business && isExpiredTrial(business)) {
    return (
      <div className="owner-panel flex min-h-screen min-h-[100dvh] flex-col items-center justify-center px-4 text-[var(--c-f3f4f6)]">
        <div className="w-full max-w-md rounded-2xl border border-amber-400/30 bg-[var(--c-0d1015)] p-7 text-center shadow-[0_18px_60px_rgba(0,0,0,0.45)]">
          <span
            aria-hidden="true"
            className="mx-auto flex size-12 items-center justify-center rounded-full border border-amber-400/40 bg-amber-400/10 text-amber-300"
          >
            <svg viewBox="0 0 24 24" fill="none" className="size-6">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
              <path
                d="M12 7.5v5.2M12 16.4h.01"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <h1 className="mt-4 text-xl font-semibold text-white">Período de teste expirado</h1>
          <p className="mt-2 text-sm leading-relaxed text-[var(--c-98a0ab)]">
            O teste gratuito de{" "}
            <span className="font-medium text-amber-300">{trial?.days} dias</span> do
            estabelecimento <span className="font-medium text-white">{business?.name ?? ""}</span>{" "}
            terminou. Para voltar a usar o painel, ative a assinatura falando com a Agenda Agora.
          </p>
          <button
            type="button"
            onClick={async () => {
              await signOut();
              await navigate({ to: "/auth" });
            }}
            className="mt-6 w-full rounded-xl border border-[var(--c-262a30)] bg-[var(--c-111317)] px-3 py-2.5 text-sm font-medium text-[var(--c-cfd3d9)] transition-colors hover:border-amber-400/40 hover:text-white"
          >
            Sair da conta
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="owner-panel relative min-h-screen min-h-[100dvh] overflow-x-clip bg-[#050607] text-[var(--c-f3f4f6)] lg:flex">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_0%_20%,var(--c-rgba-15-48-86-a0d42),transparent_38%),radial-gradient(circle_at_100%_100%,var(--c-rgba-0-70-150-a0d16),transparent_34%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(115deg,var(--c-rgba-11-29-49-a0d18),transparent_32%,transparent_70%,var(--c-rgba-4-15-28-a0d18))]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -left-40 top-1/4 z-0 size-[28rem] rounded-full bg-[var(--c-2563eb)]/[0.055] blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -right-40 bottom-0 z-0 size-[30rem] rounded-full bg-[var(--c-22d3ee)]/[0.045] blur-3xl"
      />
      <Button
        type="button"
        variant="ghost"
        aria-label="Fechar menu"
        onClick={() => {
          setOpen(false);
          setProfileOpen(false);
        }}
        className={`${open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"} fixed inset-0 z-40 h-auto w-auto rounded-none bg-[#050607]/75 p-0 backdrop-blur-[2px] transition-opacity hover:bg-[#050607]/75 lg:hidden`}
      />
      <aside
        data-collapsed={collapsed}
        className={`${open ? "translate-x-0" : "-translate-x-full"} fixed inset-y-0 left-0 z-50 flex w-[17.5rem] max-w-[82vw] flex-col overflow-hidden border-r border-[var(--c-1b2d47)] bg-[radial-gradient(ellipse_120%_54%_at_0%_0%,var(--c-rgba-22-119-255-a0d28)_0%,var(--c-rgba-22-119-255-a0d15)_28%,var(--c-rgba-22-119-255-a0d055)_49%,transparent_72%),linear-gradient(180deg,var(--c-rgba-6-9-15-a0d72)_0%,var(--c-rgba-5-7-11-a0d68)_34%,rgba(5,6,7,0.62)_100%)] px-5 py-4 shadow-[18px_0_55px_rgba(0,0,0,0.35),inset_0_1px_0_var(--c-rgba-93-168-255-a0d10),inset_-1px_0_0_var(--c-rgba-22-119-255-a0d08)] backdrop-blur-xl lg:fixed lg:top-0 lg:h-screen lg:w-[15.5rem] lg:max-w-none lg:shrink-0 lg:translate-x-0 lg:px-5 lg:shadow-[inset_0_1px_0_var(--c-rgba-93-168-255-a0d10),inset_-1px_0_0_var(--c-rgba-22-119-255-a0d08)] ${collapsed ? "lg:w-[4.5rem] lg:px-2" : ""}`}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-28 -top-32 z-0 h-[23rem] w-[23rem] rounded-full bg-[var(--c-1677ff)]/[0.16] blur-[86px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 z-0 h-[18rem] w-px bg-gradient-to-b from-[var(--c-5da8ff)]/70 via-[var(--c-1677ff)]/30 to-transparent"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 z-0 h-32 bg-[linear-gradient(180deg,var(--c-rgba-93-168-255-a0d075)_0%,var(--c-rgba-22-119-255-a0d025)_42%,transparent_100%)]"
        />

        <Link
          to="/painel"
          onClick={() => beginNavigation("/painel")}
          className={`group relative z-10 flex h-[5.25rem] shrink-0 items-center border-b border-[#25282c] px-1 ${collapsed ? "lg:justify-center" : ""}`}
        >
          {collapsed ? (
            <span
              className="hidden size-10 items-center justify-center lg:flex"
              aria-label="Agenda Agora"
            >
              <img
                src={brandMark}
                alt="Agenda Agora"
                decoding="async"
                className="size-9 object-contain"
              />
            </span>
          ) : (
            <img
              src={brandLogoByTheme[temaSistema]}
              alt="Agenda Agora"
              decoding="async"
              // Se o arquivo do tema não existir no ambiente, volta ao logo azul
              // em vez de exibir um espaço vazio na sidebar.
              onError={(event) => {
                const target = event.currentTarget;
                if (target.src.endsWith(brandLogoByTheme.azul)) return;
                target.src = brandLogoByTheme.azul;
              }}
              className="aa-logo-theme h-12 w-auto max-w-[210px] object-contain object-left px-2 transition-transform duration-300 group-hover:scale-[1.01]"
            />
          )}
        </Link>

        <div
          className={`relative z-20 shrink-0 border-b border-[#25282c] px-1 py-3 ${collapsed ? "lg:hidden" : ""}`}
        >
          <SidebarProfileWidget
            businessId={businessId ?? null}
            name={
              business?.name ??
              user?.email ??
              (platformMode ? "Administração da plataforma" : "Acesso do estabelecimento")
            }
            initial={(business?.name ?? user?.email ?? "A").charAt(0).toUpperCase()}
            role={platformMode ? "Plataforma" : "Usuário"}
            statusLabel={
              business?.status === "suspenso"
                ? "Bloqueado"
                : trial
                  ? trial.remaining > 0
                    ? "Teste Grátis"
                    : "Renovar"
                  : "Ativo"
            }
            profileOpen={profileOpen}
            onProfileClick={() => setProfileOpen((v) => !v)}
            platformMode={platformMode}
            onLogout={async () => {
              await signOut();
              void navigate({ to: "/auth" });
            }}
          />
          {!business && !platformMode && (
            <div className="mt-2 rounded-xl border border-dashed border-[var(--c-262a30)] px-3 py-2 text-[11px] text-[#646b75]">
              Aguardando configuração pelo painel Master.
            </div>
          )}
          {profileOpen && (
            <div className="absolute inset-x-0 top-full z-50 mt-2 rounded-2xl border border-[#2b2b2e] bg-black py-[17px] px-3.5 shadow-2xl">
              <div className="flex items-center gap-2">
                {profileAvatarUrl ? (
                  <div className="size-9 shrink-0 overflow-hidden rounded-[11px]">
                    <img src={profileAvatarUrl} alt="" className="size-full object-cover" />
                  </div>
                ) : (
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-[11px] bg-[var(--c-f2f3f5)] text-xs font-semibold text-[var(--c-111318)]">
                    {(business?.name ?? user?.email ?? "A").charAt(0).toUpperCase()}
                  </span>
                )}
                <div>
                  <p className="text-[13px] font-semibold text-white">
                    {business?.name ?? user?.email ?? "Usuário"}
                  </p>
                  <p className="text-[11px] text-[#626872]">Dados da conta</p>
                </div>
              </div>
              <div className="mt-4 border-t border-[#2b2b2e]" />
              <div className="mt-3 space-y-1.5 text-[11.5px]">
                <div className="flex justify-between">
                  <span className="text-[#626872]">Estabelecimento</span>
                  <span className="text-white">{business?.name ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#626872]">Telefone</span>
                  <span className="text-white">
                    {business?.phone ? formatPhoneBR(business.phone) : "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#626872]">Plano</span>
                  <span>
                    {(() => {
                      const trial = business ? trialInfo(business) : null;
                      const badge =
                        business?.status === "suspenso" || (trial && trial.remaining <= 0)
                          ? {
                              label: "Renovar",
                              cls: "border-destructive/50 text-destructive bg-destructive/10",
                            }
                          : trial
                            ? {
                                label: "Teste Grátis",
                                cls: "border-amber-400/50 text-amber-400 bg-amber-400/10",
                              }
                            : {
                                label: "Assinante Premium",
                                cls: "border-emerald-500/50 text-emerald-400 bg-emerald-500/10",
                              };
                      return (
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-semibold ${badge.cls}`}
                        >
                          {badge.label}
                        </span>
                      );
                    })()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#626872]">Acesso</span>
                  <span
                    className={business?.status === "suspenso" ? "text-destructive" : "text-white"}
                  >
                    {business?.status === "suspenso" ? "Bloqueado" : "Ativo"}
                  </span>
                </div>
              </div>
              <a
                href="/painel/assinatura"
                data-status="active"
                aria-current="page"
                onClick={(event) => {
                  event.preventDefault();
                  setPayOpen(false);
                  setSubOpen(true);
                  setOpen(false);
                  setProfileOpen(false);
                }}
                className="mt-3 flex w-full items-center justify-center rounded-xl border border-[var(--c-262a30)] bg-[var(--c-111317)] px-3 py-2 text-[11px] font-medium text-[var(--c-cfd3d9)] transition-colors hover:border-[var(--c-1677ff)]/30 hover:bg-[var(--c-1677ff)]/[0.06] hover:text-white active"
              >
                Ver dados da assinatura
              </a>
            </div>
          )}
        </div>

        <nav
          className={`relative z-10 min-h-0 flex-1 overflow-y-auto pr-1 ${collapsed ? "space-y-2 py-2 lg:space-y-1" : "space-y-6 py-5"}`}
        >
          {visibleNav.map((group) => (
            <section key={group.title}>
              <div className="owner-sidebar-collapsible">
                <p className="px-3 pb-2 text-[0.66rem] font-semibold uppercase tracking-[0.12em] text-[#4f5660]">
                  {group.title}
                </p>
              </div>
              <div className="space-y-1">
                {group.items
                  .filter((item) => canOpen(item.to))
                  .map((item) => {
                    if ("children" in item && item.children) {
                      const isExpanded = configOpen;
                      return (
                        <div key={item.to} className="space-y-1">
                          <button
                            type="button"
                            aria-expanded={isExpanded}
                            onClick={() => setConfigOpen((v) => !v)}
                            className={`owner-nav-item group relative flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left transition-all duration-200 ${pathname === "/painel/configuracoes" ? "owner-nav-active border-[var(--c-1677ff)]/15 bg-[var(--c-1677ff)]/[0.09] text-[var(--c-f3f4f6)]" : ""}`}
                          >
                            <item.icon
                              className="size-5 shrink-0 transition-colors group-hover:text-[var(--c-5da8ff)]"
                              strokeWidth={1.8}
                            />
                            <span className="min-w-0 flex-1 leading-[1.25]">
                              <span className="owner-nav-label block text-[0.86rem] font-medium">
                                {item.label}
                              </span>
                              <span className="owner-nav-hint block truncate text-[0.7rem] font-normal text-[var(--c-555d68)]">
                                {item.hint}
                              </span>
                            </span>
                            <ChevronDown
                              className={`size-4 shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                            />
                          </button>
                          <div
                            className={`ml-2 space-y-1 rounded-xl border border-[var(--c-1677ff)]/10 bg-[var(--c-1677ff)]/[0.045] p-1.5 transition-all duration-200 ease-in-out ${isExpanded ? "" : "hidden"}`}
                          >
                            {item.children.map((child) => (
                              <Link
                                key={child.to}
                                to={child.to as never}
                                activeOptions={{ exact: false }}
                                onClick={() => {
                                  setConfigOpen(false);
                                  beginNavigation(child.to);
                                }}
                                className="flex items-center gap-2 rounded-lg px-3 py-2 text-[0.82rem] font-medium text-[var(--c-c9ced6)] transition-colors hover:bg-[var(--c-1677ff)]/10 hover:text-white"
                              >
                                {child.icon ? (
                                  <child.icon className="size-4 text-[var(--c-5da8ff)]" />
                                ) : null}
                                {child.label}
                              </Link>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    if (item.to === "/painel/pix-aprovacao") {
                      return (
                        <Link
                          key={item.to}
                          to={item.to}
                          activeOptions={{ exact: false }}
                          onClick={(e) => {
                            e.preventDefault();
                            handlePixAprovacaoClick();
                          }}
                          className={`owner-nav-item group relative flex items-center gap-3 rounded-xl border border-transparent py-2.5 text-[#7f8793] transition-all duration-200 hover:border-[var(--c-1677ff)]/10 hover:bg-[var(--c-1677ff)]/[0.055] hover:text-[var(--c-e5e7eb)] ${collapsed ? "lg:justify-center lg:px-0" : "px-3"}`}
                          activeProps={
                            payOpen || subOpen
                              ? {
                                  className: `owner-nav-item group relative flex items-center gap-3 rounded-xl border border-transparent py-2.5 text-[#7f8793] ${collapsed ? "lg:justify-center lg:px-0" : "px-3"}`,
                                }
                              : {
                                  className: `owner-nav-item owner-nav-active group relative flex items-center gap-3 rounded-xl border border-[var(--c-1677ff)]/15 bg-[var(--c-1677ff)]/[0.09] py-2.5 text-[var(--c-f3f4f6)] shadow-[0_8px_24px_rgba(0,0,0,0.12)] ${collapsed ? "lg:justify-center lg:px-0" : "px-3"}`,
                                }
                          }
                        >
                          <item.icon
                            className="size-5 shrink-0 transition-colors group-hover:text-[var(--c-5da8ff)]"
                            strokeWidth={1.8}
                          />
                          <span className="owner-nav-copy min-w-0 leading-[1.25]">
                            <span className="owner-nav-label block text-[0.86rem] font-medium">
                              {item.label}
                            </span>
                            <span className="owner-nav-hint block truncate text-[0.7rem] font-normal text-[var(--c-555d68)]">
                              {item.hint}
                            </span>
                          </span>
                        </Link>
                      );
                    }
                    if (item.to === "/painel/notificacoes-alertas") {
                      return (
                        <Link
                          key={item.to}
                          to={item.to}
                          activeOptions={{ exact: false }}
                          onClick={(e) => {
                            e.preventDefault();
                            handleNotificationsClick();
                          }}
                          className={`owner-nav-item group relative flex items-center gap-3 rounded-xl border border-transparent py-2.5 text-[#7f8793] transition-all duration-200 hover:border-[var(--c-1677ff)]/10 hover:bg-[var(--c-1677ff)]/[0.055] hover:text-[var(--c-e5e7eb)] ${collapsed ? "lg:justify-center lg:px-0" : "px-3"}`}
                          activeProps={
                            payOpen || subOpen
                              ? {
                                  className: `owner-nav-item group relative flex items-center gap-3 rounded-xl border border-transparent py-2.5 text-[#7f8793] ${collapsed ? "lg:justify-center lg:px-0" : "px-3"}`,
                                }
                              : {
                                  className: `owner-nav-item owner-nav-active group relative flex items-center gap-3 rounded-xl border border-[var(--c-1677ff)]/15 bg-[var(--c-1677ff)]/[0.09] py-2.5 text-[var(--c-f3f4f6)] shadow-[0_8px_24px_rgba(0,0,0,0.12)] ${collapsed ? "lg:justify-center lg:px-0" : "px-3"}`,
                                }
                          }
                        >
                          <item.icon
                            className="size-5 shrink-0 transition-colors group-hover:text-[var(--c-5da8ff)]"
                            strokeWidth={1.8}
                          />
                          <span className="owner-nav-copy min-w-0 leading-[1.25]">
                            <span className="owner-nav-label block text-[0.86rem] font-medium">
                              {item.label}
                            </span>
                            <span className="owner-nav-hint block truncate text-[0.7rem] font-normal text-[var(--c-555d68)]">
                              {item.hint}
                            </span>
                          </span>
                        </Link>
                      );
                    }
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        activeOptions={{ exact: "exact" in item ? item.exact : false }}
                        onClick={() => beginNavigation(item.to)}
                        className={`owner-nav-item group relative flex items-center gap-3 rounded-xl border border-transparent py-2.5 text-[#7f8793] transition-all duration-200 hover:border-[var(--c-1677ff)]/10 hover:bg-[var(--c-1677ff)]/[0.055] hover:text-[var(--c-e5e7eb)] ${collapsed ? "lg:justify-center lg:px-0" : "px-3"}`}
                        activeProps={
                          payOpen || subOpen
                            ? {
                                className: `owner-nav-item group relative flex items-center gap-3 rounded-xl border border-transparent py-2.5 text-[#7f8793] ${collapsed ? "lg:justify-center lg:px-0" : "px-3"}`,
                              }
                            : {
                                className: `owner-nav-item owner-nav-active group relative flex items-center gap-3 rounded-xl border border-[var(--c-1677ff)]/15 bg-[var(--c-1677ff)]/[0.09] py-2.5 text-[var(--c-f3f4f6)] shadow-[0_8px_24px_rgba(0,0,0,0.12)] ${collapsed ? "lg:justify-center lg:px-0" : "px-3"}`,
                              }
                        }
                      >
                        <item.icon
                          className="size-5 shrink-0 transition-colors group-hover:text-[var(--c-5da8ff)]"
                          strokeWidth={1.8}
                        />
                        <span className="owner-nav-copy min-w-0 leading-[1.25]">
                          <span className="owner-nav-label block text-[0.86rem] font-medium">
                            {item.label}
                          </span>
                          <span className="owner-nav-hint block truncate text-[0.7rem] font-normal text-[var(--c-555d68)]">
                            {item.hint}
                          </span>
                        </span>
                      </Link>
                    );
                  })}
                {!platformMode && group.title === "Financeiro" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setPayOpen(true);
                      setSubOpen(false);
                      setOpen(false);
                      setProfileOpen(false);
                    }}
                    className={`owner-assinatura-nav owner-nav-item group relative flex w-full items-center gap-3 rounded-xl border border-transparent py-2.5 text-left text-[#7f8793] transition-all duration-200 hover:border-[var(--c-1677ff)]/10 hover:bg-[var(--c-1677ff)]/[0.055] hover:text-[var(--c-e5e7eb)] ${payOpen ? "owner-nav-active" : ""} ${collapsed ? "lg:justify-center lg:px-0" : "px-3"}`}
                  >
                    <CreditCard
                      className="size-5 shrink-0 text-[#25d366] transition-colors group-hover:text-[#2fe873]"
                      strokeWidth={1.8}
                    />
                    <span className="owner-nav-copy min-w-0 leading-[1.25]">
                      <span className="owner-nav-label block text-[0.86rem] font-medium text-[#25d366]">
                        Assinatura
                      </span>
                      <span className="owner-nav-hint block truncate text-[0.7rem] font-normal text-[var(--c-555d68)]">
                        Seu plano e upgrades
                      </span>
                    </span>
                  </button>
                ) : null}
              </div>
            </section>
          ))}
        </nav>
      </aside>

      <div
        className={`owner-main-content relative z-10 min-w-0 flex-1 ${collapsed ? "lg:pl-[4.5rem]" : "lg:pl-[15.5rem]"}`}
      >
        <div
          aria-hidden="true"
          className={`owner-route-progress ${isRoutePending ? "is-visible" : ""}`}
        />
        <header className="sticky top-0 z-30 grid min-h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-[#25282c] bg-[#050607]/90 px-3 py-[8.5px] shadow-[0_10px_35px_rgba(0,0,0,0.16)] backdrop-blur-xl sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            style={{ width: 39, height: 39 }}
            className="size-[39px] shrink-0 rounded-xl border border-[#2b2b2e] bg-[var(--c-0d0d10)] text-[#e6e6e6] shadow-none hover:bg-[var(--c-121216)] hover:text-white"
            onClick={() => {
              if (window.matchMedia("(min-width: 1024px)").matches) toggleCollapsed();
              else setOpen((v) => !v);
            }}
            aria-label="Alternar menu lateral"
          >
            <Menu className="size-[39px]" />
          </Button>
          <Link
            to="/painel"
            onClick={() => beginNavigation("/painel")}
            className="flex min-w-0 items-center justify-center"
            aria-label="Agenda Agora — início"
          >
            <span className="relative flex size-[47px] items-center justify-center overflow-hidden rounded-2xl border border-[var(--c-1677ff)]/70 bg-[var(--c-0d0d10)] shadow-[0_0_16px_var(--c-rgba-22-119-255-a0d25)]">
              <span
                aria-hidden="true"
                className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,var(--c-rgba-56-150-255-a0d42)_0%,var(--c-rgba-22-119-255-a0d13)_48%,transparent_72%)]"
              />
              <img
                src={brandMark}
                alt="Agenda Agora"
                decoding="async"
                className="relative h-[38px] w-auto -translate-y-[1px] object-contain"
              />
            </span>
          </Link>
          <NotificationBell />
          <FloatingSupportButton />
        </header>
        <main
          className={`relative mx-auto w-full ${
            resolvedPathname.startsWith("/painel/aparencia-editor")
              ? "max-w-none p-0 sm:p-0 lg:p-0"
              : "max-w-7xl p-4 sm:p-7 lg:p-8"
          }`}
        >
          {payOpen ? (
            <div key="as-pay" className="owner-route-content">
              <PagamentosView business={business ?? null} />
            </div>
          ) : subOpen ? (
            <div key="assinatura" className="owner-route-content">
              <AssinaturaContaPanel business={business} user={user} platformMode={platformMode} />
            </div>
          ) : isRoutePending ? (
            <RoutePendingSkeleton />
          ) : (
            <div key={resolvedPathname} className="owner-route-content">
              <Outlet />
            </div>
          )}
        </main>
      </div>
      <SecurityPinModal
        isOpen={pinModalOpen}
        onClose={() => setPinModalOpen(false)}
        onSuccess={handlePinSuccess}
      />
      <SecurityPinModal
        isOpen={pixPinModalOpen}
        onClose={() => setPixPinModalOpen(false)}
        onSuccess={handlePixPinSuccess}
      />
    </div>
  );
}
