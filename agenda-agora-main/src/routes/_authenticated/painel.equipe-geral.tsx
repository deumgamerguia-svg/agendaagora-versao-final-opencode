import { createFileRoute } from "@tanstack/react-router";
import { BriefcaseBusiness, Plus, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyList } from "@/components/painel/PageHeader";
import { requireMasterAccess } from "@/lib/master.functions";

export const Route = createFileRoute("/_authenticated/painel/equipe-geral")({
  loader: () => (typeof window === "undefined" ? undefined : requireMasterAccess()),
  head: () => ({
    meta: [
      { title: "Equipe Geral — Painel master" },
      { name: "description", content: "Equipe geral da plataforma." },
    ],
  }),
  component: EquipeGeralPage,
});

function EquipeGeralPage() {
  return (
    <div className="mx-auto w-full p-4 sm:p-8">
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-xl border border-[var(--c-1677ff)]/20 bg-[var(--c-1677ff)]/10 text-[var(--c-5da8ff)]">
          <UsersRound className="size-5" />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold uppercase tracking-tight">Equipe Geral</h1>
          <p className="text-sm text-muted-foreground">
            Pessoas com acesso à administração da plataforma.
          </p>
        </div>
      </div>

      {/* Caixa clonada do Painel 2 (Profissionais) — visual idêntico, sem alterar o painel 2. */}
      <section className="professional-list-panel mt-6">
        <div className="professional-segmented-header">
          <button type="button" className="is-active">
            Profissionais
          </button>
          <button type="button" disabled>
            Equipe
          </button>
        </div>
        <div className="relative z-10 border-b border-[#25272d] px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="professional-icon-box !size-9">
                <BriefcaseBusiness className="size-4" strokeWidth={2} aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-[0.98rem] font-semibold text-[var(--c-eef0f4)]">
                  Profissionais cadastrados
                </h2>
                <p className="mt-0.5 text-xs text-[#62656e]">
                  Gerencie equipe, acesso individual, vínculos e permissões.
                </p>
              </div>
            </div>
            <Button
              className="professional-primary-button"
              onClick={() => toast.info("Cadastro de membro da equipe em breve.")}
            >
              <Plus className="size-4" /> Cadastrar profissional
            </Button>
          </div>
        </div>
        <div className="p-4">
          <EmptyList text="Nenhum profissional cadastrado." />
        </div>
      </section>
    </div>
  );
}
