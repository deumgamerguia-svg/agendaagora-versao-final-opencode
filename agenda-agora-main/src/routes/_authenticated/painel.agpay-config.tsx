import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { requireMasterAccess } from "@/lib/master.functions";
import { Settings, DollarSign, Info, Save } from "lucide-react";

export const Route = createFileRoute("/_authenticated/painel/agpay-config")({
  loader: () => (typeof window === "undefined" ? undefined : requireMasterAccess()),
  head: () => ({
    meta: [
      { title: "Configurações de Taxas — AG Pay" },
      { name: "description", content: "Ajuste as taxas fixas por sinal pago." },
    ],
  }),
  component: AgPayConfigPage,
});

const STORAGE_AG = "agpay_fixed_tax";
const STORAGE_ADQ = "adquirente_fixed_tax";
const STORAGE_SAQUE_AG = "saque_agpay_fixed_tax";
const STORAGE_SAQUE_ADQ = "saque_adquirente_fixed_tax";

function readNum(key: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  return localStorage.getItem(key) ?? fallback;
}

function AgPayConfigPage() {
  const [agPayTax, setAgPayTax] = useState(() => readNum(STORAGE_AG, "0.80"));
  const [adquirenteTax, setAdquirenteTax] = useState(() => readNum(STORAGE_ADQ, "0.25"));
  const [saqueAgPayTax, setSaqueAgPayTax] = useState(() => readNum(STORAGE_SAQUE_AG, "3.00"));
  const [saqueAdquirenteTax, setSaqueAdquirenteTax] = useState(() => readNum(STORAGE_SAQUE_ADQ, "1.00"));
  const [isSaved, setIsSaved] = useState(false);

  const numericAgPay = parseFloat(agPayTax.replace(",", ".")) || 0;
  const numericAdquirente = parseFloat(adquirenteTax.replace(",", ".")) || 0;
  const numericSaqueAgPay = parseFloat(saqueAgPayTax.replace(",", ".")) || 0;
  const numericSaqueAdquirente = parseFloat(saqueAdquirenteTax.replace(",", ".")) || 0;
  const totalTax = numericAgPay + numericAdquirente;
  const totalSaqueTax = numericSaqueAgPay + numericSaqueAdquirente;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem(STORAGE_AG, String(numericAgPay));
    localStorage.setItem(STORAGE_ADQ, String(numericAdquirente));
    localStorage.setItem(STORAGE_SAQUE_AG, String(numericSaqueAgPay));
    localStorage.setItem(STORAGE_SAQUE_ADQ, String(numericSaqueAdquirente));
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="min-h-screen bg-[#07080b] text-white font-sans p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-800/80 pb-4">
          <div className="w-10 h-10 rounded-xl bg-[#1d1836] border border-purple-800/50 flex items-center justify-center text-purple-400">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-wide uppercase">
              CONFIGURAÇÕES DE TAXAS — AGPAY
            </h1>
            <p className="text-xs text-gray-400">
              Ajuste as taxas fixas por sinal pago/transação para alimentar os cálculos de performance
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-[#0c0d12] border border-slate-800/80 rounded-2xl p-6 shadow-2xl space-y-6">
            <div className="flex items-center gap-2 text-sm font-extrabold text-white border-b border-slate-800/60 pb-3">
              <DollarSign className="w-4 h-4 text-purple-400" />
              <span>AJUSTE DE TAXAS FIXAS POR TRANSAÇÃO</span>
            </div>
            <form onSubmit={handleSave} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                  TAXA FIXA AGPAY (R$) — <span className="text-emerald-400">NOSSO LUCRO LÍQUIDO</span>
                </label>
                <input
                  type="text"
                  value={agPayTax}
                  onChange={(e) => setAgPayTax(e.target.value)}
                  placeholder="0,80"
                  className="w-full bg-[#07080b] border border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-purple-500 transition"
                />
                <p className="mt-1.5 text-[11px] text-gray-500">
                  Valor fixo de lucro retido por nós (SaaS/Dono) por cada sinal pago/transação concluída.
                </p>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                  TAXA FIXA ADQUIRENTE (R$) — <span className="text-gray-400">CUSTO DO BANCO/GATEWAY</span>
                </label>
                <input
                  type="text"
                  value={adquirenteTax}
                  onChange={(e) => setAdquirenteTax(e.target.value)}
                  placeholder="0,25"
                  className="w-full bg-[#07080b] border border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-purple-500 transition"
                />
                <p className="mt-1.5 text-[11px] text-gray-500">
                  Valor repassado diretamente ao adquirente/banco processador (não entra no nosso lucro).
                </p>
              </div>
              <div className="pt-2 border-t border-slate-800/80">
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  TAXA FIXA SAQUE AGPAY (R$) — <span className="text-emerald-400">NOSSO LUCRO (SAQUE)</span>
                </label>
                <input
                  type="text"
                  value={saqueAgPayTax}
                  onChange={(e) => setSaqueAgPayTax(e.target.value)}
                  placeholder="3,00"
                  className="w-full bg-[#07080b] border border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-purple-500 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  TAXA FIXA SAQUE ADQUIRENTE (R$) — <span className="text-gray-400">CUSTO BANCO (SAQUE)</span>
                </label>
                <input
                  type="text"
                  value={saqueAdquirenteTax}
                  onChange={(e) => setSaqueAdquirenteTax(e.target.value)}
                  placeholder="1,00"
                  className="w-full bg-[#07080b] border border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-purple-500 transition"
                />
              </div>
              <div className="pt-3">
                <button
                  type="submit"
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider py-3.5 px-6 rounded-xl transition shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" /> SALVAR CONFIGURAÇÕES DE TAXA
                </button>
              </div>
              {isSaved && (
                <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 text-xs text-center font-bold">
                  ✓ Configurações de taxa salvas com sucesso! As métricas serão recalculadas.
                </div>
              )}
            </form>
          </div>

          <div className="space-y-6">
            <div className="bg-[#0c0d12] border border-slate-800/80 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Info className="w-4 h-4 text-blue-400" />
                <span>Como funciona o cálculo de performance</span>
              </div>
              <ul className="space-y-2.5 text-xs text-gray-300">
                <li className="flex items-start justify-between">
                  <span className="text-gray-400">• Lucro AGPay (SaaS):</span>
                  <span className="font-bold text-emerald-400">R$ {numericAgPay.toFixed(2)}</span>
                </li>
                <li className="flex items-start justify-between">
                  <span className="text-gray-400">• Custo Adquirente:</span>
                  <span className="font-bold text-gray-300">R$ {numericAdquirente.toFixed(2)}</span>
                </li>
                <li className="flex items-start justify-between">
                  <span className="text-gray-400">• Lucro saque AGPay:</span>
                  <span className="font-bold text-emerald-400">R$ {numericSaqueAgPay.toFixed(2)}</span>
                </li>
                <li className="flex items-start justify-between">
                  <span className="text-gray-400">• Custo saque adquirente:</span>
                  <span className="font-bold text-gray-300">R$ {numericSaqueAdquirente.toFixed(2)}</span>
                </li>
              </ul>
              <div className="bg-[#121522] border border-blue-900/40 rounded-xl p-3 text-[11px] text-blue-300 leading-relaxed">
                <strong>Regra:</strong> Como não há integração via API direta com a AGPay, o sistema pega o número total de sinais pagos e multiplica pela <strong>Taxa Fixa AGPay</strong> configurada para calcular o Lucro Líquido exato no menu AG Pay Performance.
              </div>
            </div>
            <div className="bg-[#0c0d12] border border-slate-800/80 rounded-2xl p-5 space-y-3">
              <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">
                SIMULAÇÃO POR SINAL PAGO
              </span>
              <div className="space-y-2 text-xs border-b border-slate-800/80 pb-3">
                <div className="flex justify-between text-gray-300">
                  <span>Nosso Lucro Líquido (AGPay):</span>
                  <span className="font-bold text-emerald-400">+ R$ {numericAgPay.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Taxa Banco/Gateway:</span>
                  <span className="font-bold text-gray-300">+ R$ {numericAdquirente.toFixed(2)}</span>
                </div>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-xs font-bold text-white">Total de Taxas por Sinal:</span>
                <span className="text-base font-black text-purple-400">R$ {totalTax.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
