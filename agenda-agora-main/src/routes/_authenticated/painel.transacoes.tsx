import { useState, useMemo, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { requireMasterAccess } from "@/lib/master.functions";
import { getTransactions } from "@/lib/transactions.functions";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ClipboardList,
  ArrowLeftRight,
  Search,
  Filter,
  X,
  Check,
  Edit3,
  Trash2,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/painel/transacoes")({
  loader: () => (typeof window === "undefined" ? undefined : requireMasterAccess()),
  head: () => ({
    meta: [
      { title: "Transações — Painel master" },
      { name: "description", content: "Gerenciar depósitos e saques de todos os usuários." },
    ],
  }),
  component: TransacoesPage,
});

function money(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function TransacoesPage() {
  const fn = useServerFn(getTransactions);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("Todos");
  const [depositStatus, setDepositStatus] = useState("Todos");
  const [withdrawalStatus, setWithdrawalStatus] = useState("Todos");
  const [activeTab, setActiveTab] = useState<"deposits" | "withdrawals">("deposits");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["transactions", search, type, depositStatus, withdrawalStatus],
    queryFn: () =>
      fn({ data: { search, type, depositStatus, withdrawalStatus } }),
  });

  const deposits = data?.deposits ?? [];
  const withdrawals = data?.withdrawals ?? [];
  const metrics = data?.metrics;

  const filteredDeposits = useMemo(() => {
    return deposits.filter((d) => {
      if (search && !`${d.id} ${d.uuid} ${d.clientName} ${d.email}`.toLowerCase().includes(search.toLowerCase())) return false;
      if (type !== "Todos" && d.type !== type) return false;
      if (depositStatus !== "Todos" && !d.status.includes(depositStatus.toUpperCase())) return false;
      return true;
    });
  }, [deposits, search, type, depositStatus]);

  const filteredWithdrawals = useMemo(() => {
    return withdrawals.filter((w) => {
      if (search && !`${w.id} ${w.uuid} ${w.clientName} ${w.email}`.toLowerCase().includes(search.toLowerCase())) return false;
      if (type !== "Todos" && w.type !== type) return false;
      if (withdrawalStatus !== "Todos" && !w.status.includes(withdrawalStatus.toUpperCase())) return false;
      return true;
    });
  }, [withdrawals, search, type, withdrawalStatus]);

  useEffect(() => { setPage(1); }, [activeTab, search, type, depositStatus, withdrawalStatus]);

  const currentList = activeTab === "deposits" ? filteredDeposits : filteredWithdrawals;
  const totalPages = Math.max(1, Math.ceil(currentList.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedList = currentList.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const statusBadge = (status: string) => {
    const s = status.toUpperCase();
    if (s.includes("PEND") || s === "AGUARDANDO" || s.includes("SOLICIT")) {
      return (
        <span className="px-2.5 py-1 rounded-full bg-amber-950/40 border border-amber-800/40 text-amber-500 font-bold text-[10px] inline-flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> AGUARDANDO
        </span>
      );
    }
    if (s.includes("FALH") || s.includes("RECUS") || s.includes("CANCEL")) {
      return (
        <span className="px-2.5 py-1 rounded-full bg-red-950/40 border border-red-800/40 text-red-500 font-bold text-[10px] inline-flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> {status}
        </span>
      );
    }
    if (s.includes("PAGO") || s.includes("CONCL") || s.includes("COMPLET") || s.includes("APROV")) {
      return (
        <span className="px-2.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 font-bold text-[10px] inline-flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> PAGO
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full bg-slate-800/40 border border-slate-700/40 text-gray-300 font-bold text-[10px] inline-flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span> {status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#07080b] text-white font-sans p-6">
      <div className="max-w-[1400px] mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-950/40 border border-red-800/40 flex items-center justify-center text-red-500">
            <ArrowLeftRight className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-wide uppercase">TRANSAÇÕES</h1>
            <p className="text-xs text-gray-400">Gerenciar depósitos e saques de todos os usuários</p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="ml-auto text-xs text-gray-400 hover:text-white transition flex items-center gap-1"
          >
            <Filter className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} /> Atualizar
          </button>
        </div>

        {isLoading && <p className="text-muted-foreground">Carregando transações…</p>}
        {isError && <p className="text-destructive">Erro ao carregar dados.</p>}

        {metrics && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-[#0c0d12] border border-slate-800/80 rounded-xl p-4">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">TOTAL DEPÓSITOS</span>
              <span className="text-2xl font-black text-white mt-1 block">{metrics.totalDeposits}</span>
            </div>
            <div className="bg-[#0c0d12] border border-slate-800/80 rounded-xl p-4">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">TOTAL SAQUES</span>
              <span className="text-2xl font-black text-white mt-1 block">{metrics.totalWithdrawals}</span>
            </div>
            <div className="bg-[#0c0d12] border border-slate-800/80 rounded-xl p-4">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">DEPÓSITOS PENDENTES</span>
              <span className="text-2xl font-black text-amber-500 mt-1 block">{metrics.pendingDeposits}</span>
            </div>
            <div className="bg-[#0c0d12] border border-slate-800/80 rounded-xl p-4">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">SAQUES PENDENTES</span>
              <span className="text-2xl font-black text-amber-500 mt-1 block">{metrics.pendingWithdrawals}</span>
            </div>
            <div className="bg-[#0c0d12] border border-slate-800/80 rounded-xl p-4">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">TOTAL PROCESSADO</span>
              <span className="text-2xl font-black text-emerald-400 mt-1 block">{money(metrics.totalProcessedCents)}</span>
            </div>
          </div>
        )}

        <div className="bg-[#0c0d12] border border-slate-800/80 rounded-xl p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1.5">BUSCAR</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="UUID, ID, nome..."
                  className="w-full bg-[#07080b] border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1.5">TIPO</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-[#07080b] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option>Todos</option>
                <option>PIX</option>
                <option>SAQUE</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1.5">STATUS DEPÓSITO</label>
              <select
                value={depositStatus}
                onChange={(e) => setDepositStatus(e.target.value)}
                className="w-full bg-[#07080b] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option>Todos</option>
                <option>Aguardando</option>
                <option>Pago</option>
                <option>Falhou</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1.5">STATUS SAQUE</label>
              <select
                value={withdrawalStatus}
                onChange={(e) => setWithdrawalStatus(e.target.value)}
                className="w-full bg-[#07080b] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option>Todos</option>
                <option>Pendente</option>
                <option>Concluído</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => refetch()}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-5 py-2.5 rounded-lg flex items-center gap-2 transition shadow-lg shadow-blue-600/20"
            >
              <Filter className="w-3.5 h-3.5" /> FILTRAR RESULTADOS
            </button>
            <button
              onClick={() => { setSearch(""); setType("Todos"); setDepositStatus("Todos"); setWithdrawalStatus("Todos"); }}
              className="bg-[#12141d] hover:bg-slate-800 text-white text-xs font-bold px-5 py-2.5 rounded-lg border border-slate-700/60 flex items-center gap-2 transition"
            >
              <X className="w-3.5 h-3.5" /> LIMPAR
            </button>
          </div>
        </div>

        <div className="border-b border-slate-800/80 flex gap-6 text-xs font-bold uppercase tracking-wider">
          <button
            onClick={() => setActiveTab("deposits")}
            className={`pb-3 transition relative ${activeTab === "deposits" ? "text-red-500 border-b-2 border-red-500" : "text-gray-400 hover:text-white"}`}
          >
            SINAIS PAGOS ({filteredDeposits.length})
          </button>
          <button
            onClick={() => setActiveTab("withdrawals")}
            className={`pb-3 transition relative ${activeTab === "withdrawals" ? "text-red-500 border-b-2 border-red-500" : "text-gray-400 hover:text-white"}`}
          >
            SAQUES ESTABELECIMENTO ({filteredWithdrawals.length})
          </button>
        </div>

        <div className="bg-[#0c0d12] border border-slate-800/80 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/80 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-[#090a0f]">
                  <th className="py-4 px-4">ID</th>
                  <th className="py-4 px-4">CLIENTE</th>
                  <th className="py-4 px-4">TIPO</th>
                  <th className="py-4 px-4">VALOR BRUTO</th>
                  <th className="py-4 px-4">LUCRO AGPAY</th>
                  <th className="py-4 px-4">STATUS</th>
                  <th className="py-4 px-4">DATA</th>
                  <th className="py-4 px-4 text-center">AÇÕES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-xs">
                {paginatedList.map((item, idx) => (
                  <tr key={idx} className="hover:bg-[#10121a] transition">
                    <td className="py-4 px-4 font-bold text-white">
                      <div>{item.id}</div>
                      <div className="text-[10px] text-gray-500 font-normal">{item.uuid.slice(0, 8)}...</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-bold text-white uppercase">{item.clientName}</div>
                      <div className="text-[11px] text-gray-400 font-normal">{item.email}</div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-2 py-0.5 rounded bg-blue-950/60 border border-blue-800/60 text-blue-400 font-bold text-[10px]">
                        {item.type}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-bold text-white">{money(item.grossCents)}</td>
                    <td className="py-4 px-4 font-bold text-emerald-400">{money(item.netCents)}</td>
                    <td className="py-4 px-4">{statusBadge(item.status)}</td>
                    <td className="py-4 px-4 text-gray-400 text-[11px]">
                      {format(new Date(item.date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-center gap-1.5">
                        {(item.status.includes("PEND") || item.status === "AGUARDANDO" || item.status.includes("SOLICIT")) && (
                          <button className="p-1.5 rounded-md bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 hover:bg-emerald-900/60 transition">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button className="p-1.5 rounded-md bg-slate-800/60 border border-slate-700/60 text-gray-300 hover:bg-slate-700 transition">
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button className="p-1.5 rounded-md bg-slate-800/60 border border-slate-700/60 text-gray-300 hover:bg-slate-700 transition">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800/80">
            <span className="text-[11px] text-gray-400">
              Página {safePage} de {totalPages} · {currentList.length} registros
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="px-3 py-1.5 rounded-lg bg-[#12141d] border border-slate-700/60 text-xs text-white disabled:opacity-40"
              >
                ← Anterior
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="px-3 py-1.5 rounded-lg bg-[#12141d] border border-slate-700/60 text-xs text-white disabled:opacity-40"
              >
                Próxima →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
