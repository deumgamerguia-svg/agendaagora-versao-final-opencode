import { useEffect, useState, type ReactNode } from "react";
import { MessageCircle, X } from "lucide-react";
import type { BillingStage } from "@/lib/billing-cycle";

type AvisoCobrancaProps = {
  stage: BillingStage;
  businessName: string;
  onRenovar: () => void;
};

/**
 * Avisos de cobrança da assinatura mensal (ciclo de 5 estágios):
 * - 1 dia antes: lembrete verde junto ao ícone de notificações;
 * - no dia do vencimento: popup verde "fatura venceu hoje";
 * - 1 dia após: popup vermelho "ATENÇÃO!";
 * - 2º e 3º dias após: modal escuro "Urgente!" (fechável, só aviso);
 * - 4º dia: o painel é travado na tela de assinaturas (fora deste componente).
 * Aparecem a cada abertura/login do painel e podem ser fechados pelo dono.
 */
export function AvisoCobranca({ stage, businessName, onRenovar }: AvisoCobrancaProps) {
  const [fechado, setFechado] = useState(false);

  // Novo estágio = popup volta a aparecer (ex.: "amanhã" → "venceu hoje").
  useEffect(() => {
    setFechado(false);
  }, [stage]);

  if (fechado) return null;

  const fechar = () => setFechado(true);
  const renovar = () => {
    onRenovar();
    setFechado(true);
  };

  if (stage === "amanha") {
    return (
      <TopAviso tom="verde" fechar={fechar}>
        <p className="text-[0.92rem] font-medium leading-relaxed">
          Passando pra lembrar que sua fatura vai vencer{" "}
          <span className="font-bold">amanhã!</span>
        </p>
        <p className="mt-1 text-[0.92rem] leading-relaxed">
          <button
            type="button"
            onClick={renovar}
            className="font-bold underline decoration-1 underline-offset-2 transition-opacity hover:opacity-80"
          >
            Clique aqui
          </button>{" "}
          para renovar o pagamento.
        </p>
      </TopAviso>
    );
  }

  if (stage === "venceu_hoje") {
    return (
      <TopAviso tom="verde" fechar={fechar}>
        <p className="text-[1.05rem] font-bold">Olá {businessName}!</p>
        <p className="mt-0.5 text-[0.92rem] font-medium leading-relaxed">
          😊 Passando pra lembrar que sua fatura venceu{" "}
          <span className="font-bold">hoje!</span>
        </p>
        <p className="mt-1 text-[0.92rem] leading-relaxed">
          <button
            type="button"
            onClick={renovar}
            className="font-bold underline decoration-1 underline-offset-2 transition-opacity hover:opacity-80"
          >
            Clique aqui
          </button>{" "}
          para renovar o pagamento.
        </p>
      </TopAviso>
    );
  }

  if (stage === "atrasado") {
    return (
      <TopAviso tom="vermelho" fechar={fechar}>
        <p className="text-[1.05rem] font-extrabold tracking-wide">ATENÇÃO!</p>
        <p className="mt-0.5 text-[0.92rem] font-medium leading-relaxed">
          😅 Sua fatura do sistema venceu.
        </p>
        <p className="mt-1 text-[0.92rem] leading-relaxed">
          <button
            type="button"
            onClick={renovar}
            className="font-bold underline decoration-1 underline-offset-2 transition-opacity hover:opacity-80"
          >
            Clique aqui
          </button>{" "}
          para renova-la e evite bloqueios!
        </p>
      </TopAviso>
    );
  }

  if (stage === "urgente") {
    return (
      <div
        role="alertdialog"
        aria-modal="false"
        aria-label="Pagamento pendente"
        className="fixed inset-0 z-[85] grid place-items-center bg-black/60 p-4"
      >
        <div className="smodal-card" id="expired-modal-card">
          <button type="button" className="smodal-x" onClick={fechar} aria-label="Fechar">
            ×
          </button>
          <div className="smodal-badge sm-badge-amber">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fff"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2>Pagamento pendente</h2>
          <p>
            Ainda <b>não identificamos</b> seu pagamento. O funcionamento do sistema poderá parar
            a qualquer momento. Renove agora pra manter sua agenda e seus lembretes no automático.
          </p>
          <button type="button" className="smodal-cta sm-cta-amber" onClick={renovar}>
            Renovar meu plano
          </button>
          <div className="smodal-sub">Pagamento via PIX · Liberação imediata</div>
        </div>
      </div>
    );
  }

  return null;
}

/** Cartão flutuante junto ao ícone de notificações (estágios 1 a 3). */
function TopAviso({
  tom,
  fechar,
  children,
}: {
  tom: "verde" | "vermelho";
  fechar: () => void;
  children: ReactNode;
}) {
  const verde = tom === "verde";
  return (
    <div
      role="status"
      className={`aa-aviso-in fixed left-3 right-3 top-[4.4rem] z-[80] rounded-2xl border-2 p-3.5 pr-10 shadow-[0_14px_40px_rgba(0,0,0,0.45)] sm:left-auto sm:w-[24rem] ${
        verde
          ? "border-[#3f9142] bg-[#eaf6e4] text-[#1c4520]"
          : "border-[#b3261e] bg-[#fbe9e7] text-[#7f1d1d]"
      }`}
    >
      <button
        type="button"
        aria-label="Fechar aviso"
        onClick={fechar}
        className={`absolute right-2.5 top-2.5 flex size-7 items-center justify-center rounded-full transition-opacity hover:opacity-70 ${
          verde ? "text-[#1c4520]" : "text-[#7f1d1d]"
        }`}
      >
        <X className="size-5" strokeWidth={2.5} aria-hidden="true" />
      </button>
      <div className="flex items-start gap-3">
        {verde ? (
          <span
            aria-hidden="true"
            className="relative mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-full bg-[#25d366]"
          >
            <MessageCircle className="size-7 text-white" fill="white" strokeWidth={0} />
            <span className="absolute inset-0 flex items-center justify-center pt-0.5 text-[0.82rem] font-extrabold text-[#1c7a3d]">
              $
            </span>
          </span>
        ) : (
          <span aria-hidden="true" className="mt-0.5 shrink-0">
            <svg viewBox="0 0 24 24" className="size-10" aria-hidden="true">
              <path
                d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
                fill="#c0392b"
              />
              <path d="M12 9v4" stroke="#fbe9e7" strokeWidth="2" strokeLinecap="round" />
              <path d="M12 17h.01" stroke="#fbe9e7" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </span>
        )}
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
