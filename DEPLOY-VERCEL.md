# Deploy do Agenda Agora na Vercel

## 1. Arquivo do projeto

- `agenda-agora-SaaS-vercel.zip` (nesta mesma pasta) — código completo **sem** `node_modules` e **sem** arquivos `.env` (nenhum segredo dentro).
- Suba na Vercel via **Add New Project → Import** (conecte o repositório Git de preferência; o zip serve para upload manual) ou `vercel` CLI dentro da pasta extraída.

## 2. Configuração do projeto na Vercel

- **Framework Preset:** TanStack Start (o `vercel.json` já vem configurado).
- **Build Command:** padrão do preset (`vite build` / saída do TanStack Start).
- **Node.js:** 22.x.

## 3. Variáveis de ambiente (obrigatórias)

Copie os nomes do `.env.example` do projeto e preencha com os valores do `.env.local` local:

| Variável | Onde pegar |
|---|---|
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_PROJECT_ID` (+ versões `VITE_*`) | Dashboard Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Dashboard Supabase → API (service_role, **secreta**) |
| `UAZAPI_BASE_URL`, `UAZAPI_TOKEN`, `UAZAPI_ADMIN_TOKEN` | Painel UazAPI |
| `AGPAY_API_TOKEN` | Painel AgPay |
| `AGENDA_CRON_SECRET` (+ `AGENDA_CRON_SECRET_PREVIOUS`) | Gere um aleatório (`openssl rand -hex 32`) |
| `PUBLIC_APP_URL` | URL pública do deploy (ex.: `https://app.agendagora.company`) |
| `WHATSAPP_WEBHOOK_SECRET` | Segredo do webhook UazAPI |
| `PUBLIC_BOOKING_BASE_URL` | Base do link de agendamento (padrão: `app.agendagora.company`) |
| `AGPAY_EGRESS_PROXY_URL`, `AGPAY_EGRESS_PROXY_SECRET` | Opcional — só se o AgPay exigir IP fixo |

Marque as secretas como **Sensitive** na Vercel.

## 4. Banco de dados (Supabase) — migrations pendentes

No **SQL Editor** do Supabase, execute nesta ordem (só as que ainda não foram aplicadas):

1. `supabase/migrations/20261013000000_withdrawal_pin.sql` — coluna da senha de transferência (Ag Pay).
2. `supabase/migrations/20261014000000_payment_rules.sql` — colunas das regras de pagamento (modo Pix + exceções).

Sem elas, a tela de regras e o cadastro da senha falham.

## 5. Domínios

O app separa superfícies por host:

- `app.agendagora.company` — página pública/agendamento
- `painel.agendagora.company` — painel do estabelecimento
- `admin.agendagora.company` — administração

Adicione os 3 domínios no projeto da Vercel (ou ajuste em `src/lib/app-hosts.ts` antes do deploy).

## 6. Webhooks (após o deploy)

- **UazAPI/WhatsApp:** aponte o webhook para `https://<seu-dominio>/api/...` com o `WHATSAPP_WEBHOOK_SECRET` configurado.
- **AgPay:** cadastre a URL pública do app + segredo `AGPAY_API_TOKEN`.

## 7. Checklist pós-deploy

- [ ] `/auth` abre e login funciona
- [ ] Painel → Ag Pay → Configuração de regras salva sem erro
- [ ] Painel → Lembretes carrega
- [ ] Agendamento público (`/agendar/:slug`) abre
