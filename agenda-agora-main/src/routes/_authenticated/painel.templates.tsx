import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import type { LucideIcon } from "lucide-react";
import {
  Brush,
  Download,
  Eye,
  Flower2,
  Hand,
  Palette,
  PawPrint,
  PenTool,
  Scissors,
  Sparkles,
  Sun,
  X,
} from "lucide-react";
import { useBusiness } from "@/lib/business";
import type { OutreachDesign, OutreachDesignLayer } from "@/lib/outreach-design";
import { listVisualOutreachTemplates } from "@/lib/outreach-templates.functions";
import { downloadOutreachPng } from "@/components/template-editor/export";
import { TemplateCanvas } from "@/components/template-editor/TemplateCanvas";
import { TemplateIconGlyph } from "@/components/template-editor/icons";
import { PageHeader, NoBusiness } from "@/components/painel/PageHeader";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/painel/templates")({
  head: () => ({
    meta: [
      { title: "Templates — Agenda Agora" },
      { name: "description", content: "Escolha uma categoria e baixe os templates prontos." },
    ],
  }),
  component: TemplatesPage,
});

// Página somente de visualização: escolhe a categoria do segmento, vê os
// templates dela e baixa em PNG. Sem edição, seleção ou compartilhamento.
type VisualTemplate = {
  id: string;
  title: string;
  design: OutreachDesign;
  isDefault: boolean;
  isCustomized: boolean;
};

type IconLayer = Extract<OutreachDesignLayer, { type: "icon" }>;

type TemplateCategory = {
  id: string;
  name: string;
  icon: LucideIcon;
  color: string;
  keywords: string[];
};

/** Ciclo violeta → azul → verde, igual ao painel de segmentos. */
const VIOLET = "#8b5cf6";
const BLUE = "#3b82f6";
const GREEN = "#22c55e";

const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  {
    id: "cabeleireiro",
    name: "CABELEIREIRO(A)",
    icon: Scissors,
    color: VIOLET,
    keywords: ["cabelo", "corte", "escova", "alisamento", "coloracao", "mechas", "luzes", "cauterizacao"],
  },
  {
    id: "manicure",
    name: "MANICURE/NAIL DESIGNER",
    icon: Hand,
    color: BLUE,
    keywords: ["unha", "manicure", "alongamento", "esmaltacao", "nail", "gel", "fibra"],
  },
  {
    id: "lash",
    name: "LASH DESIGNER - CÍLIOS",
    icon: Eye,
    color: GREEN,
    keywords: ["cilio", "lash", "pestana", "volume", "hibrid"],
  },
  {
    id: "sobrancelha",
    name: "DESIGNER DE SOMBRANCELHA",
    icon: Brush,
    color: VIOLET,
    keywords: ["sobrancelha", "design", "henna", "brow"],
  },
  {
    id: "maquiadora",
    name: "MAQUIADORA",
    icon: Palette,
    color: BLUE,
    keywords: ["maquiagem", "maquiadora", "maqui", "noiva", "social"],
  },
  {
    id: "bronze",
    name: "BRONZE/DEPILAÇÃO",
    icon: Sun,
    color: GREEN,
    keywords: ["bronze", "depenilacao", "cera", "laser", "pele"],
  },
  {
    id: "barbearia",
    name: "BARBEARIA",
    icon: Scissors,
    color: VIOLET,
    keywords: ["barba", "barbeiro", "barbearia", "masculino", "degrade", "navalha"],
  },
  {
    id: "petshop",
    name: "PETSHOP",
    icon: PawPrint,
    color: BLUE,
    keywords: ["pet", "cachorro", "gato", "banho", "tosa", "veterin"],
  },
  {
    id: "tatuador",
    name: "TATUADOR",
    icon: PenTool,
    color: GREEN,
    keywords: ["tatuagem", "tattoo", "tatuador", "micropigmentacao"],
  },
  {
    id: "estetica",
    name: "ESTÉTICA/BOTOX",
    icon: Sparkles,
    color: VIOLET,
    keywords: ["estetica", "botox", "preenchimento", "limpeza de pele", "skincare", "peeling"],
  },
  {
    id: "massagem",
    name: "MASSAGEM/SPA",
    icon: Flower2,
    color: BLUE,
    keywords: ["massagem", "spa", "relaxante", "drenagem", "shiatsu", "reflexologia"],
  },
];

function hexToRgb(hex: string) {
  const raw = hex.replace("#", "");
  const full = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
  const value = Number.parseInt(full, 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

/** Cor com alfa, usada no gradiente/glow das caixinhas de ícone. */
function rgba(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Brilho neon em camadas: halo saturado ao redor da caixinha, com um brilho
 * interno sutil — igual ao print de referência.
 */
function neonGlow(hex: string, strength: number) {
  return [
    `0 0 8px ${rgba(hex, strength * 0.45)}`,
    `0 0 22px ${rgba(hex, strength * 0.75)}`,
    `0 0 42px ${rgba(hex, strength * 0.55)}`,
    `0 0 70px ${rgba(hex, strength * 0.3)}`,
    `inset 0 0 8px ${rgba(hex, strength * 0.3)}`,
  ].join(", ");
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/**
 * Encaixa o template na categoria pelo título. Templates genéricos
 * (agenda aberta, promoção, novo horário, indique um amigo) não batem com
 * nenhum termo e aparecem em todas as categorias.
 */
function matchesCategory(title: string, category: TemplateCategory) {
  const normalized = normalize(title);
  return category.keywords.some((keyword) => normalized.includes(normalize(keyword)));
}

/** Usa o ícone e a cor da própria arte; sem eles, cai para sparkles + fundo. */
function templateAccent(design: OutreachDesign) {
  const iconLayer = design.layers.find((layer): layer is IconLayer => layer.type === "icon");
  return {
    iconKey: iconLayer?.iconKey ?? "sparkles",
    accent: iconLayer?.color ?? design.background,
  };
}

function TemplatesPage() {
  const { businessId } = useBusiness();
  const listFn = useServerFn(listVisualOutreachTemplates);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

  const templates = useQuery({
    queryKey: ["visual-outreach-templates", businessId],
    enabled: !!businessId,
    queryFn: () => listFn({ data: { businessId: businessId! } }),
  });

  const download = async (template: VisualTemplate) => {
    setDownloadingId(template.id);
    try {
      const filename = `${template.title.toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]+/g, "-")}.png`;
      await downloadOutreachPng(template.design, filename);
      toast.success("Template baixado.");
    } catch {
      toast.error("Não foi possível baixar o template.");
    } finally {
      setDownloadingId(null);
    }
  };

  if (!businessId) return <NoBusiness />;

  const downloading = (id: string) => downloadingId === id;
  const allTemplates: VisualTemplate[] = templates.data ?? [];
  const activeCategory =
    TEMPLATE_CATEGORIES.find((category) => category.id === activeCategoryId) ?? null;
  const visibleTemplates = activeCategory
    ? allTemplates.filter((template) => matchesCategory(template.title, activeCategory))
    : [];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Templates de divulgação"
        subtitle="Escolha o seu segmento para ver os templates prontos."
      />

      <section aria-labelledby="template-categories-title" className="space-y-4">
        <div>
          <h2 id="template-categories-title" className="text-lg font-bold">
            Escolha uma categoria
          </h2>
          <p className="text-sm text-muted-foreground">
            Toque numa caixa para abrir os templates dela.
          </p>
        </div>

        <div className="grid gap-2.5">
          {TEMPLATE_CATEGORIES.map((category) => {
            const Icon = category.icon;
            const isActive = category.id === activeCategoryId;
            const count = allTemplates.filter((template) =>
              matchesCategory(template.title, category),
            ).length;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => setActiveCategoryId(isActive ? null : category.id)}
                aria-pressed={isActive}
                className={`group flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  isActive
                    ? "border-white/[0.22] bg-white/[0.05]"
                    : "border-white/[0.07] bg-[#0c0e12] hover:border-white/[0.14] hover:bg-white/[0.03]"
                }`}
                style={{
                  boxShadow: isActive
                    ? `0 0 0 1px ${rgba(category.color, 0.12)}, 0 0 34px ${rgba(category.color, 0.08)}`
                    : "none",
                }}
              >
                <span
                  className="grid shrink-0 place-items-center rounded-lg border p-2 transition-all duration-300 group-hover:scale-105"
                  style={{
                    color: category.color,
                    background: `linear-gradient(to bottom right, ${rgba(category.color, 0.22)}, ${rgba(category.color, 0.09)})`,
                    borderColor: rgba(category.color, isActive ? 0.45 : 0.3),
                    boxShadow: neonGlow(category.color, isActive ? 0.35 : 0.2),
                  }}
                >
                  <Icon className="size-4" aria-hidden="true" />
                </span>

                <span className="min-w-0 flex-1 text-[12.012px] font-semibold uppercase leading-tight tracking-wider text-white transition-colors group-hover:text-white">
                  {category.name}
                </span>

                <span className="shrink-0 text-[10px] font-medium text-white/70">
                  {count === 0 ? "Em breve" : count}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {activeCategory ? (
        <section
          aria-labelledby="active-category-title"
          className="space-y-4 rounded-xl border border-white/[0.07] bg-[#0a0c10] p-4"
        >
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span
                className="grid size-8 shrink-0 place-items-center rounded-lg border"
                style={{
                  color: activeCategory.color,
                  background: `linear-gradient(to bottom right, ${rgba(activeCategory.color, 0.26)}, ${rgba(activeCategory.color, 0.08)})`,
                  borderColor: rgba(activeCategory.color, 0.32),
                }}
              >
                <activeCategory.icon className="size-4" aria-hidden="true" />
              </span>
              <h2 id="active-category-title" className="text-[11px] font-semibold uppercase tracking-wider text-white">
                {activeCategory.name}
              </h2>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setActiveCategoryId(null)}
              className="gap-1.5 text-white hover:text-white"
            >
              <X className="size-4" />
              Fechar
            </Button>
          </header>

          {templates.isLoading ? (
            <p role="status" className="text-sm text-muted-foreground">
              Carregando templates...
            </p>
          ) : visibleTemplates.length === 0 ? (
            <p className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center text-sm text-muted-foreground">
              Nenhum template nessa categoria ainda.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visibleTemplates.map((template) => {
                const { iconKey, accent } = templateAccent(template.design);
                return (
                  <article
                    key={template.id}
                    className="group relative overflow-hidden rounded-xl border border-white/[0.07] bg-[#0c0e12] transition-colors hover:border-white/[0.14] hover:bg-white/[0.03]"
                  >
                    <div className="flex items-center gap-3 border-b border-white/[0.05] px-3.5 py-3">
                      <span
                        className="grid size-8 shrink-0 place-items-center rounded-lg border"
                        style={{
                          color: accent,
                          background: `linear-gradient(to bottom right, ${rgba(accent, 0.24)}, ${rgba(accent, 0.08)})`,
                          borderColor: rgba(accent, 0.3),
                          boxShadow: `0 0 16px ${rgba(accent, 0.18)}`,
                        }}
                      >
                        <TemplateIconGlyph iconKey={iconKey} className="size-4" />
                      </span>
                      <p className="text-[10px] font-semibold uppercase leading-tight tracking-wider text-white">
                        {template.title}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => void download(template)}
                      disabled={downloading(template.id)}
                      aria-label={`Baixar ${template.title}`}
                      className="block w-full bg-black/30 px-3.5 py-3.5 transition-opacity hover:opacity-90 disabled:opacity-60"
                    >
                      <TemplateCanvas
                        design={template.design}
                        className="mx-auto max-h-[340px] w-full rounded-md object-contain"
                      />
                    </button>

                    <div className="px-3.5 pb-3.5">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="w-full justify-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.03] text-white/80 hover:bg-white/[0.07] hover:text-white"
                        disabled={downloading(template.id)}
                        onClick={() => void download(template)}
                      >
                        <Download className="size-4" />
                        {downloading(template.id) ? "Baixando..." : "Baixar"}
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      ) : (
        <p className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center text-sm text-muted-foreground">
          Selecione uma categoria acima para ver os templates disponíveis.
        </p>
      )}
    </div>
  );
}
