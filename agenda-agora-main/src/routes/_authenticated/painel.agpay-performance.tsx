import { useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { requireMasterAccess } from "@/lib/master.functions";
import { getAgpayPerformance } from "@/lib/agpay-performance.functions";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { RefreshCw, DollarSign, TrendingUp, Wallet, Building2, ArrowDownToLine, Activity, ClipboardList, ChevronDown, Check, Settings } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/painel/agpay-performance")({
  loader: () => (typeof window === "undefined" ? undefined : requireMasterAccess()),
  head: () => ({
    meta: [
      { title: "AG Pay — Performance — Painel master" },
      { name: "description", content: "Performance financeira e operacional da AG Pay." },
    ],
  }),
  component: AgpayPerformancePage,
});

type PeriodKey =
  | "today"
  | "7d"
  | "30d"
  | "90d"
  | "month"
  | "prevMonth"
  | "year";

function periodRange(key: PeriodKey): { from: string; to: string } {
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  let from: Date;
  let to: Date = new Date(now);
  switch (key) {
    case "today":
      from = startOfDay(now);
      break;
    case "7d":
      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "30d":
      from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "90d":
      from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case "month":
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "prevMonth":
      from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      break;
    case "year":
      from = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
  return { from: from.toISOString(), to: to.toISOString() };
}

const periodOptions: { value: PeriodKey; label: string }[] = [
  { value: "today", label: "Hoje" },
  { value: "7d", label: "Últimos 7 dias" },
  { value: "30d", label: "Últimos 30 dias" },
  { value: "90d", label: "Últimos 90 dias" },
  { value: "month", label: "Este mês" },
  { value: "prevMonth", label: "Mês anterior" },
  { value: "year", label: "Este ano" },
];

function periodLabel(key: PeriodKey): string {
  return periodOptions.find((o) => o.value === key)?.label ?? "Últimos 30 dias";
}

function money(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function AgpayPerformancePage() {
  const fn = useServerFn(getAgpayPerformance);
  const [period, setPeriod] = useState<PeriodKey>("30d");
  const [rankingOpen, setRankingOpen] = useState(false);
  const range = useMemo(() => periodRange(period), [period]);

  const agpayTaxCents = useMemo(() => {
    if (typeof window === "undefined") return 80;
    const raw = localStorage.getItem("agpay_fixed_tax");
    const n = raw ? parseFloat(raw) : 0.8;
    return Math.round((isNaN(n) ? 0.8 : n) * 100);
  }, []);
  const adquirenteTaxCents = useMemo(() => {
    if (typeof window === "undefined") return 25;
    const raw = localStorage.getItem("adquirente_fixed_tax");
    const n = raw ? parseFloat(raw) : 0.25;
    return Math.round((isNaN(n) ? 0.25 : n) * 100);
  }, []);
  const saqueAgPayTaxCents = useMemo(() => {
    if (typeof window === "undefined") return 300;
    const raw = localStorage.getItem("saque_agpay_fixed_tax");
    const n = raw ? parseFloat(raw) : 3.0;
    return Math.round((isNaN(n) ? 3.0 : n) * 100);
  }, []);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["agpay-performance", period],
    queryFn: () => fn({ data: range }),
  });

  const kpi = data?.kpi;

  const withdrawalProfitByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const w of data?.withdrawals ?? []) {
      const day = w.createdAt.slice(0, 10);
      map.set(day, (map.get(day) ?? 0) + (w.platformFeeCents ?? 0));
    }
    return map;
  }, [data?.withdrawals]);

  return (
    <div className="mx-auto w-full p-4 sm:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold uppercase tracking-tight">AG Pay — Performance</h1>
          <p className="text-sm text-muted-foreground">
            Acompanhamento financeiro e operacional da AG Pay.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodKey)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
              <SelectItem value="month">Este mês</SelectItem>
              <SelectItem value="prevMonth">Mês anterior</SelectItem>
              <SelectItem value="year">Este ano</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`size-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {isLoading && <p className="text-muted-foreground">Carregando indicadores…</p>}
      {isError && <p className="text-destructive">Erro ao carregar dados.</p>}

      {data && kpi && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard title="Volume transacionado" value={money(kpi.signalVolumeCents)} sub={`${kpi.signalCount} sinais pagos`} icon={<Activity className="size-5" />} />
            <KpiCard title="Receita AG Pay" value={money(kpi.revenueCents)} sub={`Média ${money(kpi.avgRevenuePerTx)}/tx`} icon={<DollarSign className="size-5" />} />
            <KpiCard title="Lucro Total" value={money(kpi.signalCount * (agpayTaxCents + adquirenteTaxCents))} sub="taxa adquirente+agpay" icon={<TrendingUp className="size-5" />} />
            <KpiCard title="Ticket médio sinal" value={money(kpi.avgSignalCents)} sub={`Receita média ${money(kpi.avgRevenuePerTx)}`} icon={<Wallet className="size-5" />} />
            <KpiCard title="Estabelecimentos ativos" value={String(kpi.businessesWithSignals)} sub={`de ${kpi.totalBusinesses} cadastrados`} icon={<Building2 className="size-5" />} />
            <KpiCard title="Saques pendentes" value={money(kpi.pendingWithdrawalsCents)} sub={`${kpi.pendingWithdrawalsCount} solicitações`} icon={<ArrowDownToLine className="size-5" />} />
            <KpiCard title="Saques concluídos" value={money(kpi.completedWithdrawalsCents)} sub={`${kpi.completedWithdrawalsCount} operações`} icon={<ArrowDownToLine className="size-5" />} />
            <KpiCard title="Lucro de saque" value={money(kpi.completedWithdrawalsCount * saqueAgPayTaxCents)} sub={`${kpi.completedWithdrawalsCount} saques × R$ ${(saqueAgPayTaxCents / 100).toFixed(2)}`} icon={<DollarSign className="size-5" />} />
          </div>

          {/* Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Evolução financeira da AG Pay</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.daily.map((d) => ({ ...d, profitCents: d.count * (agpayTaxCents + adquirenteTaxCents), withdrawalProfitCents: withdrawalProfitByDay.get(d.date) ?? 0 }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={(v) => format(new Date(v), "dd/MM", { locale: ptBR })} />
                  <YAxis tickFormatter={(v) => (v / 100).toLocaleString("pt-BR")} />
                  <Tooltip formatter={(v: number) => money(v)} labelFormatter={(v) => format(new Date(v), "dd/MM/yyyy", { locale: ptBR })} />
                  <Legend />
                  <Line type="monotone" dataKey="volumeCents" name="Volume" stroke="#3b82f6" />
                  <Line type="monotone" dataKey="revenueCents" name="Receita AG Pay" stroke="#22c55e" />
                  <Line type="monotone" dataKey="withdrawalProfitCents" name="Lucro Saque AG Pay" stroke="#f59e0b" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Cards de atalho */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/painel/transacoes"
              className="bg-[#0f1117] border border-slate-800 rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:border-slate-700 transition group"
            >
              <div className="w-12 h-12 rounded-xl bg-[#131927] border border-slate-700/50 flex items-center justify-center text-blue-400 group-hover:scale-105 transition">
                <ClipboardList className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-sm tracking-wide uppercase">TRANSAÇÕES</h3>
                <p className="text-[11px] font-semibold text-gray-400 tracking-wider uppercase">HISTÓRICO</p>
              </div>
            </Link>
            <Link
              to="/painel/agpay-config"
              className="bg-[#0f1117] border border-slate-800 rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:border-slate-700 transition group"
            >
              <div className="w-12 h-12 rounded-xl bg-[#1d1836] border border-purple-800/50 flex items-center justify-center text-purple-400 group-hover:scale-105 transition">
                <Settings className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-sm tracking-wide uppercase">CONFIGURAÇÕES</h3>
                <p className="text-[11px] font-semibold text-gray-400 tracking-wider uppercase">SISTEMA</p>
              </div>
            </Link>
          </div>

          {/* Businesses ranking */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between relative">
                <CardTitle>Estabelecimentos na AG Pay — ranking por volume</CardTitle>
                <div className="relative">
                  <button
                    onClick={() => setRankingOpen(!rankingOpen)}
                    className="bg-[#0a0b0e] border border-slate-800 hover:border-slate-700 text-xs font-medium text-gray-200 px-4 py-2.5 rounded-xl flex items-center gap-2 transition"
                  >
                    <span>{periodLabel(period)}</span>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </button>
                  {rankingOpen && (
                    <div className="absolute right-0 mt-2 w-52 bg-[#12141c] border border-slate-800 rounded-2xl shadow-2xl py-2 z-50">
                      {periodOptions.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => { setPeriod(opt.value); setRankingOpen(false); }}
                          className="w-full text-left px-4 py-2.5 text-xs text-gray-300 hover:bg-[#1a1d29] flex items-center justify-between transition"
                        >
                          <span>{opt.label}</span>
                          {period === opt.value && <Check className="w-4 h-4 text-white" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="text-left py-2">Estabelecimento</th>
                      <th className="text-right py-2">Sinais</th>
                      <th className="text-right py-2">Volume</th>
                      <th className="text-right py-2">Receita</th>
                      <th className="text-right py-2">Lucro est.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.businesses
                      .slice()
                      .sort((a, b) => b.volumeCents - a.volumeCents)
                      .map((b) => (
                        <tr key={b.businessId} className="border-t border-border">
                          <td className="py-2">{b.name}</td>
                          <td className="py-2 text-right">{b.signalCount}</td>
                          <td className="py-2 text-right">{money(b.volumeCents)}</td>
                          <td className="py-2 text-right">{money(b.revenueCents)}</td>
                          <td className="py-2 text-right">{money(b.profitCents)}</td>
                        </tr>
                      ))}
                    {!data.businesses.length && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-muted-foreground">
                          Sem dados no período.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>


        </>
      )}
    </div>
  );
}

function KpiCard({ title, value, sub, icon }: { title: string; value: string; sub: string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{sub}</p>
      </CardContent>
    </Card>
  );
}
