import { STATUS_SERVICE_ORDER } from "@/pages/ServiceOrder/types";

export const SO_STATUS_LIST: {
  value: STATUS_SERVICE_ORDER;
  label: string;
  color: string;
  linked?: STATUS_SERVICE_ORDER[];
}[] = [
  {
    value: STATUS_SERVICE_ORDER.EM_ABERTO,
    label: "Em aberto",
    color: "bg-zinc-400",
    linked: [STATUS_SERVICE_ORDER.REJEITADO, STATUS_SERVICE_ORDER.AGENDADO],
  },
  {
    value: STATUS_SERVICE_ORDER.REJEITADO,
    label: "Rejeitado",
    color: "bg-zinc-500",
    linked: [STATUS_SERVICE_ORDER.EM_ABERTO, STATUS_SERVICE_ORDER.AGENDADO],
  },
  {
    value: STATUS_SERVICE_ORDER.AGENDADO,
    label: "Agendado",
    color: "bg-amber-500",
    linked: [STATUS_SERVICE_ORDER.EM_ABERTO, STATUS_SERVICE_ORDER.AGUARDANDO_SERVICO, STATUS_SERVICE_ORDER.AGUARDANDO_PECA],
  },
  {
    value: STATUS_SERVICE_ORDER.AGUARDANDO_SERVICO,
    label: "Aguardando serviço",
    color: "bg-violet-500",
    linked: [
      STATUS_SERVICE_ORDER.AGENDADO,
      STATUS_SERVICE_ORDER.AGUARDANDO_PECA,
      STATUS_SERVICE_ORDER.EXECUTANDO,
      STATUS_SERVICE_ORDER.BLOQUEADO,
    ],
  },
  {
    value: STATUS_SERVICE_ORDER.AGUARDANDO_PECA,
    label: "Aguardando peça",
    color: "bg-orange-500",
    linked: [
      STATUS_SERVICE_ORDER.AGENDADO,
      STATUS_SERVICE_ORDER.AGUARDANDO_SERVICO,
      STATUS_SERVICE_ORDER.EXECUTANDO,
      STATUS_SERVICE_ORDER.BLOQUEADO,
    ],
  },
  {
    value: STATUS_SERVICE_ORDER.EXECUTANDO,
    label: "Executando",
    color: "bg-green-500",
    linked: [
      STATUS_SERVICE_ORDER.AGUARDANDO_SERVICO,
      STATUS_SERVICE_ORDER.AGUARDANDO_PECA,
      STATUS_SERVICE_ORDER.BLOQUEADO,
      STATUS_SERVICE_ORDER.ENTREGUE,
    ],
  },
  {
    value: STATUS_SERVICE_ORDER.BLOQUEADO,
    label: "Bloqueado",
    color: "bg-red-400",
    linked: [
      STATUS_SERVICE_ORDER.AGUARDANDO_PECA,
      STATUS_SERVICE_ORDER.AGUARDANDO_SERVICO,
      STATUS_SERVICE_ORDER.EXECUTANDO,
    ],
  },
  {
    value: STATUS_SERVICE_ORDER.ENTREGUE,
    label: "Entregue",
    color: "bg-zinc-900",
    linked: [STATUS_SERVICE_ORDER.EXECUTANDO, STATUS_SERVICE_ORDER.FINALIZADO, STATUS_SERVICE_ORDER.AGUARDANDO_RETIRADA],
  },
  {
    value: STATUS_SERVICE_ORDER.FINALIZADO,
    label: "Finalizado",
    color: "bg-slate-700",
  },
  {
    value: STATUS_SERVICE_ORDER.AGUARDANDO_RETIRADA,
    label: "Aguardando retirada",
    color: "bg-cyan-500",
    linked: [STATUS_SERVICE_ORDER.ENTREGUE, STATUS_SERVICE_ORDER.FINALIZADO],
  },
];

export const PAGE_LIMIT = 15;

export const DEBOUNCE_TIMEOUT = 800;

export const USE_QUERY_CONFIGS = {
  retry: 0,
  refetchOnWindowFocus: false,
  refetchOnMount: true,
  initialPageParam: 1,
  staleTime: 900000, // 15 minutos
};

export const CAR_SERVICES = [
  { value: 'BODYWORK', label: 'Funilaria', color: 'bg-blue-500' },
  { value: 'PAINTING', label: 'Pintura', color: 'bg-violet-500' },
  { value: 'PARTS', label: 'Pecas', color: 'bg-amber-500' },
  { value: 'AIR_CONDITIONING', label: 'Ar Condicionado', color: 'bg-indigo-300' },
  { value: 'TIRE_REPAIR', label: 'Borracharia', color: 'bg-gray-500' },
  { value: 'ELECTRICAL', label: 'Eletrica', color: 'bg-pink-500' },
  { value: 'AESTHETICS', label: 'Estetica', color: 'bg-pink-400' },
  { value: 'DENT_REPAIR', label: 'Martelinho', color: 'bg-blue-400' },
  { value: 'MECHANICAL', label: 'Mecanica', color: 'bg-green-500' },
  { value: 'OVERHAUL', label: 'Revisao', color: 'bg-red-400' },
  { value: 'UPHOLSTERY', label: 'Tapeçaria', color: 'bg-amber-700' },
  { value: 'GLASSWORK', label: 'Vidraçaria', color: 'bg-blue-300' },
  { value: 'OTHER', label: 'Outros', color: 'bg-pink-800' },
];

export const timestampToLocaleString = (timestamp: number, locale = 'pt-BR') =>
  new Date(timestamp).toLocaleString(locale);
