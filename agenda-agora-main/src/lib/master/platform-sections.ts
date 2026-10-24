import { CalendarDays } from "lucide-react";

/** Seções de SaaS do Painel 3 Master (barra inferior da referência de design). */
export type PlatformSection =
  "visao" | "agendamentos" | "desempenho" | "assinatura" | "atividade" | "suporte";

export const PLATFORM_SECTIONS: Array<{
  id: PlatformSection;
  label: string;
  icon: typeof CalendarDays;
}> = [
  { id: "visao", label: "Visão geral", icon: CalendarDays },
  { id: "agendamentos", label: "Agendamentos", icon: CalendarDays },
  { id: "desempenho", label: "Desempenho", icon: CalendarDays },
  { id: "assinatura", label: "Assinatura", icon: CalendarDays },
  { id: "atividade", label: "Atividade", icon: CalendarDays },
  { id: "suporte", label: "Suporte", icon: CalendarDays },
];
