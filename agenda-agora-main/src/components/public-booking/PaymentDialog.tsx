import { useEffect, useRef, useState } from "react";
import { friendlyError } from "@/lib/error-page";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import QRCode from "qrcode";
import { Check, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatPrice } from "@/lib/format";
import {
  cancelDepositBooking,
  generateDepositPix,
  getDepositStatus,
} from "@/lib/booking.functions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

type PaymentDialogProps = {
  chargeId: string;
  booking: { amountCents: number; expiresAt: string | null } | null;
  reservedAmountCents: number | null;
  onClose: () => void;
};

export default function PaymentDialog({
  chargeId,
  booking,
  reservedAmountCents,
  onClose,
}: PaymentDialogProps) {
  const amountCents = booking?.amountCents ?? reservedAmountCents;
  const pixFn = useServerFn(generateDepositPix);
  const statusFn = useServerFn(getDepositStatus);
  const cancelFn = useServerFn(cancelDepositBooking);
  const generatingPix = useRef(false);
  const [pix, setPix] = useState<{
    qrCode: string;
    qrImageUrl: string | null;
  } | null>(null);
  const [pixError, setPixError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [paid, setPaid] = useState(false);
  const [left, setLeft] = useState(300);

  const expiresAt = booking?.expiresAt ? new Date(booking.expiresAt).getTime() : null;

  useEffect(() => {
    const tick = () => {
      if (!expiresAt) return;
      setLeft(Math.max(0, Math.round((expiresAt - Date.now()) / 1000)));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  useEffect(() => {
    if (paid) return;
    const id = setInterval(async () => {
      try {
        const r = await statusFn({ data: { chargeId } });
        if (r.status === "pago") setPaid(true);
        if (r.status === "expirado") {
          toast.error("O prazo do Pix acabou e o agendamento foi cancelado.");
          onClose();
        }
      } catch {
        /* tenta de novo */
      }
    }, 5000);
    return () => clearInterval(id);
  }, [chargeId, paid, statusFn, onClose]);

  const generate = useMutation({
    mutationFn: async () => {
      const result = await pixFn({ data: { chargeId } });
      const qrCode = result.qrCode?.trim();
      if (!qrCode) {
        throw new Error("O código Pix ainda não está disponível. Tente novamente.");
      }
      const qrImageUrl = await QRCode.toDataURL(qrCode, { margin: 1, width: 320 }).catch(
        () => null,
      );
      return { qrCode, qrImageUrl };
    },
    onSuccess: (result) => {
      setPix(result);
      setPixError(null);
    },
    onError: (error: Error) => {
      setPix(null);
      const message = error.message;
      if (/prazo|expirad|não está mais ativa/i.test(message)) {
        setPixError("O prazo desta reserva terminou. Faça um novo agendamento.");
      } else if (/não está habilitado|subconta|análise/i.test(message)) {
        setPixError("Este estabelecimento ainda não pode receber Pix. Entre em contato com ele.");
      } else {
        setPixError("Não foi possível gerar o Pix agora. Tente novamente.");
      }
    },
    onSettled: () => {
      generatingPix.current = false;
    },
  });

  const requestPix = () => {
    if (generatingPix.current || generate.isPending || pix) return;
    generatingPix.current = true;
    setPixError(null);
    generate.mutate();
  };

  const handleCopyPix = () => {
    if (!pix) return;
    void navigator.clipboard.writeText(pix.qrCode);
    setCopied(true);
    toast.success("Código Pix copiado!");
  };

  const cancel = useMutation({
    mutationFn: () => cancelFn({ data: { chargeId } }),
    onSuccess: () => {
      toast.success("Agendamento cancelado.");
      onClose();
    },
    onError: (e: Error) => toast.error(friendlyError(e)),
  });

  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");

  if (paid)
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-md rounded-3xl border border-[#d9a7b5] bg-[#fff7f8] p-6 text-center shadow-xl">
          <Check className="mx-auto size-10 text-[#7d354d]" />
          <h2 className="font-display text-xl font-bold text-[#4b2330]">Agendamento confirmado!</h2>
          <p className="text-sm text-[#4b2330]/80">Sinal recebido. Seu horário está reservado.</p>
          <Button onClick={onClose} className="rounded-full bg-[#7d354d] text-white hover:bg-[#6a2d41]">
            Fechar
          </Button>
        </DialogContent>
      </Dialog>
    );

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto rounded-3xl border border-[#d9a7b5] bg-[#fff7f8] p-6 text-center shadow-xl">
        <h2 className="font-display text-xl font-bold text-[#4b2330]">Agendamento Aguardando Pagamento</h2>
        <p className="text-sm text-[#4b2330]/80">
          Para confirmar seu agendamento é necessário efetuar o pagamento via pix.
        </p>
        <p className="text-sm text-[#4b2330]/80">Selecione a forma de pagamento desejada</p>
        <p className="text-sm text-[#4b2330]/80">
          Clique no valor e após isso clique em "GERAR CÓDIGO PIX" para continuar com seu pagamento.
        </p>
        <p className="mx-auto w-fit rounded-full bg-[#7d354d]/10 px-4 py-1 text-sm font-semibold text-[#7d354d]">
          {amountCents === null ? "Carregando valor do sinal..." : formatPrice(amountCents)}
        </p>
        <Button
          className="mx-auto w-fit rounded-xl bg-[#7d354d] text-white hover:opacity-90"
          disabled={generate.isPending || !!pix}
          onClick={requestPix}
          aria-busy={generate.isPending}
        >
          {generate.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          {generate.isPending
            ? "Gerando Código Pix..."
            : pixError
              ? "Tentar novamente"
              : "Gerar Código Pix"}
        </Button>
        {pixError && (
          <p role="alert" className="text-sm text-destructive">
            {pixError}
          </p>
        )}

        {pix && (
          <div className="min-w-0 space-y-2">
            {pix.qrImageUrl && (
              <img
                src={pix.qrImageUrl}
                alt="QR Code do Pix para pagar o sinal"
                decoding="async"
                className="mx-auto size-56 rounded-lg bg-white p-2"
                onError={() =>
                  setPix((current) => (current ? { ...current, qrImageUrl: null } : current))
                }
              />
            )}
            {amountCents !== null && (
              <p className="text-sm font-medium text-[#4b2330]">Valor do Pix: {formatPrice(amountCents)}</p>
            )}
            <p className="text-xs text-[#4b2330]/80">
              Utilize a função copia e cola de seu banco para efetuar o pagamento via pix
            </p>
            <p className="min-w-0 truncate rounded-md bg-[#f7d9e4] px-3 py-2 text-left text-xs text-[#4b2330]">
              {pix.qrCode}
            </p>
            <button
              onClick={handleCopyPix}
              className="w-full mt-4 py-3 px-4 rounded-2xl bg-[#7d354d] text-white font-medium flex items-center justify-center gap-2 transition-all hover:opacity-90"
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? "Código copiado!" : "Copiar código pix"}
            </button>
          </div>
        )}

        <p className="text-xs text-[#4b2330]/80">
          Você tem 5 minutos para efetuar seu pagamento antes que seu agendamento seja cancelado
          automaticamente
        </p>
        <p className="font-display text-lg font-bold text-[#4b2330]">
          Tempo restante: {mm}:{ss}
        </p>
        <Button
          variant="outline"
          className="mx-auto w-fit rounded-xl bg-[#7d354d] text-white hover:opacity-90"
          onClick={() => setConfirmCancel(true)}
        >
          Cancelar pagamento
        </Button>

        <Dialog open={confirmCancel} onOpenChange={setConfirmCancel}>
          <DialogContent className="max-w-sm rounded-3xl border border-[#d9a7b5] bg-[#fff7f8] p-6 text-center shadow-xl">
            <h3 className="text-base font-semibold text-[#4b2330]">Pagamento Obrigatório</h3>
            <p className="text-sm text-[#4b2330]/80">Você confirma o cancelamento desse agendamento?</p>
            <div className="flex justify-center gap-3">
              <Button variant="secondary" onClick={() => setConfirmCancel(false)}>
                Não quero cancelar
              </Button>
              <Button
                variant="destructive"
                disabled={cancel.isPending}
                onClick={() => cancel.mutate()}
              >
                Sim, quero cancelar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}