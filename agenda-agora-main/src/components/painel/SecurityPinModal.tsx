import React, { useEffect, useRef, useState } from "react";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

const CORRECT_PIN = "1234";

interface SecurityPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SecurityPinModal({ isOpen, onClose, onSuccess }: SecurityPinModalProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPin("");
      setError("");
      // foca o campo ao abrir
      const t = window.setTimeout(() => inputRef.current?.focus(), 50);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === CORRECT_PIN) {
      setError("");
      setPin("");
      onSuccess();
    } else {
      setError("Senha incorreta! Tente novamente");
      setPin("");
      inputRef.current?.focus();
    }
  };

  // Aceita apenas dígitos, no máximo 4
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 4);
    setPin(value);
    if (error) setError("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-[#0f111a] p-6 text-white shadow-2xl border border-slate-800">
        {/* Ícone de Cadeado */}
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#1e1b4b] text-[#818cf8]">
          <Lock className="h-7 w-7" />
        </div>

        <div className="text-center mb-6">
          <h3 className="text-xl font-bold tracking-tight text-white">
            Autenticação de Segurança
          </h3>
          <p className="mt-1 text-sm text-gray-400">
            Digite a senha de 4 dígitos para acessar Notificações e Alertas
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
              PIN de Acesso (4 dígitos)
            </label>
            <input
              ref={inputRef}
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={pin}
              onChange={handleChange}
              placeholder="••••"
              autoFocus
              className="w-full rounded-lg bg-[#090a0f] border border-slate-700 px-4 py-3 text-center text-2xl tracking-[0.5em] text-white placeholder-gray-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {error && (
            <p className="text-center text-xs text-red-500 font-medium">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-slate-700 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={cn(
                "w-1/2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 transition",
                pin.length !== 4 && "opacity-60 cursor-not-allowed",
              )}
            >
              Acessar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
