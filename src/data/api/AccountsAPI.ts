import { supabase, supabaseSchema } from "./config";

const TABLE_NAME = "contas";
const DASHBOARD_LIMIT = 30;

const fromAccounts = () => supabase.schema(supabaseSchema).from(TABLE_NAME);

interface ContaRow {
  id: number;
  descricao: string | null;
  valor: number | string | null;
  tipo: string | null;
  empresa_id: string;
  data_pagamento: string | null;
  parcelas: number | string | null;
  forma_pagamento: string | null;
}

export interface ContaDashboardItem {
  id: number;
  descricao: string | null;
  valor: number | null;
  tipo: string | null;
  empresaId: string;
  dataPagamento: string | null;
  parcelas: number;
  formaPagamento: string | null;
}

const toNumberOrNull = (value: unknown) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const mapContaRow = (row: ContaRow): ContaDashboardItem => ({
  id: row.id,
  descricao: row.descricao?.trim() || null,
  valor: toNumberOrNull(row.valor),
  tipo: row.tipo,
  empresaId: row.empresa_id,
  dataPagamento: row.data_pagamento,
  parcelas: toNumber(row.parcelas, 1),
  formaPagamento: row.forma_pagamento,
});

export const getDashboardAccountsAPI = async (limit = DASHBOARD_LIMIT) => {
  const normalizedLimit = Number.isFinite(limit) ? Math.max(1, Math.floor(limit)) : DASHBOARD_LIMIT;

  const { data, error } = await fromAccounts()
    .select("id, descricao, valor, tipo, empresa_id, data_pagamento, parcelas, forma_pagamento")
    .order("data_pagamento", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .limit(normalizedLimit);

  if (error) throw error;

  return (data ?? []).map((row) => mapContaRow(row as ContaRow));
};
