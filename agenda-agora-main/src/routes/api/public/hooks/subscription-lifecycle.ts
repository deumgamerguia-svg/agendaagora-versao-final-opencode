import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";
import { classifyLifecycle } from "@/lib/subscription-lifecycle";


/**
 * Varredura automática do ciclo de assinaturas (Painel 3 Master).
 *
 * Chamada pelo agendador externo (mesmo mecanismo dos lembretes de WhatsApp:
 * POST com `Authorization: Bearer AGENDA_CRON_SECRET`). Idempotente: cada aviso
 * só é gravado uma vez por (estabelecimento, título) — duas execuções
 * simultâneas não duplicam movimentações, pois as categorias são derivadas das
 * datas reais e os avisos são deduplicados contra `master_business_events`.
 *
 * Regras de aviso (dias calculados das datas reais):
 * - Em teste: 3 dias restantes, 1 dia, último dia.
 * - Assinante: fatura vence em 7 / 3 / 1 dias e no dia do vencimento.
 * - Recuperação: dia 1 (pendente), dia 3 (fim da tolerância), dia 4 (acesso do
 *   dono bloqueado — estágio "bloqueado" existente), dia 7 (recuperação comercial).
 * - Dia 15: cancelamento por inadimplência — NÃO executado automaticamente,
 *   pois a regra/flag de configuração ainda não existe no projeto.
 */
export const Route = createFileRoute("/api/public/hooks/subscription-lifecycle")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authError = await authenticateCronRequest(request);
        if (authError) return authError;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const [businessesRes] = await Promise.all([
          supabaseAdmin
            .from("businesses")
            .select(
              "id, status, trial_days, access_until, cancel_requested_at, cancelled_at",
            ),
        ]);
        if (businessesRes.error) return Response.json({ error: businessesRes.error.message }, { status: 500 });

        type Notice = { businessId: string; title: string };
        const notices: Notice[] = [];

        for (const business of businessesRes.data ?? []) {
          const lifecycle = classifyLifecycle({
            status: business.status,
            isTrial: business.trial_days != null,
            accessUntil: business.access_until,
            cancelRequestedAt: business.cancel_requested_at,
            cancelledAt: business.cancelled_at,
          });

          if (lifecycle.category === "em_teste" && lifecycle.trialAlert != null) {
            notices.push({
              businessId: business.id,
              title:
                lifecycle.trialAlert === 3
                  ? "Teste acaba em 3 dias"
                  : lifecycle.trialAlert === 1
                    ? "Teste acaba amanhã"
                    : "Teste acaba hoje",
            });
          } else if (lifecycle.category === "assinante" && lifecycle.dueAlert != null) {
            notices.push({
              businessId: business.id,
              title:
                lifecycle.dueAlert === 7
                  ? "Fatura vence em 7 dias"
                  : lifecycle.dueAlert === 3
                    ? "Fatura vence em 3 dias"
                    : lifecycle.dueAlert === 1
                      ? "Fatura vence amanhã"
                      : "Fatura vence hoje",
            });
          } else if (lifecycle.reason === "pagamento_pendente") {
            notices.push({
              businessId: business.id,
              title:
                lifecycle.daysLate === 1
                  ? "Pagamento pendente (dia 1)"
                  : lifecycle.daysLate >= 3
                    ? "Último dia de tolerância (dia 3)"
                    : "Pagamento pendente",
            });
          } else if (lifecycle.reason === "assinatura_vencida") {
            if (lifecycle.daysLate === 4) {
              notices.push({ businessId: business.id, title: "Assinatura vencida (dia 4)" });
            }
            if (lifecycle.daysLate === 7) {
              notices.push({ businessId: business.id, title: "Recuperação comercial (dia 7)" });
            }
          }
        }

        if (!notices.length) return Response.json({ created: 0, skipped: 0 });

        const businessIds = [...new Set(notices.map((n) => n.businessId))];
        const since = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString();
        const { data: existingEvents, error: eventsError } = await supabaseAdmin
          .from("master_business_events")
          .select("business_id, title")
          .in("business_id", businessIds)
          .gte("created_at", since);
        if (eventsError) return Response.json({ error: eventsError.message }, { status: 500 });

        const existing = new Set(
          (existingEvents ?? []).map((e) => `${e.business_id}|${e.title}`),
        );

        const toInsert = notices
          .filter((notice) => !existing.has(`${notice.businessId}|${notice.title}`))
          .map((notice) => ({
            business_id: notice.businessId,
            actor_id: null,
            type: "assinatura",
            title: notice.title,
          }));

        if (toInsert.length) {
          const { error: insertError } = await supabaseAdmin
            .from("master_business_events")
            .insert(toInsert);
          if (insertError) return Response.json({ error: insertError.message }, { status: 500 });
        }

        return Response.json({
          created: toInsert.length,
          skipped: notices.length - toInsert.length,
        });
      },
    },
  },
});
