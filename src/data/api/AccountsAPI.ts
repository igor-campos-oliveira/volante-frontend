import { supabase, supabaseSchema } from "./config";

const TABLE_NAME = "contas";
const DASHBOARD_LIMIT = 30;
const ORCAMENTOS_TABLE = "orcamentos";
const ORCAMENTOS_ITEMS_TABLE = "itens_orcamento";
const ORCAMENTOS_PAYMENTS_TABLE = "pagamentos_orcamento";
const USUARIOS_TABLE = "usuarios";

const fromAccounts = () => supabase.schema(supabaseSchema).from(TABLE_NAME);
const fromSchema = (tableName: string) => supabase.schema(supabaseSchema).from(tableName);

interface ContaRow {
  id: number;
  descricao: string | null;
  valor: number | string | null;
  tipo: string | null;
  movimentacao: string | null;
  empresa_id: string;
  data_pagamento: string | null;
  parcelas: number | string | null;
  forma_pagamento: string | null;
  categoria: string | null;
  status: string | null;
  parcelado: boolean | null;
  parcela_atual: number | string | null;
}

interface OrcamentoRow {
  id: number;
  status?: string | null;
}

interface OrcamentoItemRow {
  tipo: string | null;
  valor: number | string | null;
  quantidade: number | string | null;
  desconto: number | string | null;
  orcamento_id: number | null;
}

interface OrcamentoPaymentRow {
  id: number;
  valor_pago: number | string | null;
  orcamento_id: number | null;
}

export interface ContaDashboardItem {
  id: number;
  descricao: string | null;
  valor: number | null;
  tipo: string | null;
  movimentacao: string | null;
  empresaId: string;
  dataPagamento: string | null;
  parcelas: number;
  formaPagamento: string | null;
  categoria: string | null;
  status: string | null;
  parcelado: boolean;
  parcelaAtual: number | null;
}

export interface AccountCreatePayload {
  descricao?: string | null;
  valor?: number | string | null;
  tipo?: string | null;
  movimentacao?: string | null;
  data_pagamento?: string | null;
  parcelas?: number | string | null;
  forma_pagamento?: string | null;
  categoria?: string | null;
  status?: string | null;
  parcelado?: boolean | null;
  parcela_atual?: number | string | null;
  empresa_id?: string | null;
}

export interface MonthlyFinancialData {
  monthKey: string;
  accounts: ContaDashboardItem[];
  serviceOrdersCount: number;
  deliveredOrdersCount: number;
  deliveredOrdersRevenue: number;
  serviceItemsCost: number;
  serviceRevenue: number;
  executedPaymentsCount: number;
  accountsPaidCount: number;
  accountsPendingCount: number;
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

const toBoolean = (value: unknown, fallback = false) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }

  return fallback;
};

const normalizeOptionalText = (value: unknown) => {
  const normalized = String(value ?? "").trim();
  return normalized || null;
};

const normalizeDateToIso = (value: unknown) => {
  const normalized = String(value ?? "").trim();
  if (!normalized) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return `${normalized}T00:00:00.000Z`;
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
};

const parseNumericId = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

const getMonthRange = (monthKey: string) => {
  const [yearRaw, monthRaw] = monthKey.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);

  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    throw new Error("Mes invalido para carregar o dashboard financeiro.");
  }

  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 1));

  return {
    startIso: startDate.toISOString(),
    endIso: endDate.toISOString(),
  };
};

const mapContaRow = (row: ContaRow): ContaDashboardItem => ({
  id: row.id,
  descricao: normalizeOptionalText(row.descricao),
  valor: toNumberOrNull(row.valor),
  tipo: normalizeOptionalText(row.tipo),
  movimentacao: normalizeOptionalText(row.movimentacao),
  empresaId: row.empresa_id,
  dataPagamento: row.data_pagamento,
  parcelas: toNumber(row.parcelas, 1),
  formaPagamento: normalizeOptionalText(row.forma_pagamento),
  categoria: normalizeOptionalText(row.categoria),
  status: normalizeOptionalText(row.status),
  parcelado: toBoolean(row.parcelado, false),
  parcelaAtual: toNumberOrNull(row.parcela_atual),
});

const mapOrderItemCost = (row: OrcamentoItemRow) => {
  const quantity = toNumber(row.quantidade, 1);
  const value = toNumber(row.valor, 0);
  const discount = toNumber(row.desconto, 0);
  const total = quantity * value - discount;

  return total > 0 ? total : 0;
};

const isDeliveredServiceOrder = (status: string | null | undefined) =>
  String(status || "").trim().toLowerCase() === "entregue";

const resolveCompanyIdFromSession = async () => {
  const { data } = await supabase.auth.getSession();
  const sessionUser = data.session?.user;

  const fromUserMetadata = sessionUser?.user_metadata?.empresa_id;
  const fromAppMetadata = sessionUser?.app_metadata?.empresa_id;
  if (typeof fromUserMetadata === "string" && fromUserMetadata.trim()) {
    return fromUserMetadata.trim();
  }

  if (typeof fromAppMetadata === "string" && fromAppMetadata.trim()) {
    return fromAppMetadata.trim();
  }

  const userId = sessionUser?.id?.trim();
  if (!userId) {
    return null;
  }

  try {
    const { data: membership, error } = await fromSchema(USUARIOS_TABLE)
      .select("empresa_id, data_criacao")
      .eq("user_id", userId)
      .order("data_criacao", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return null;
    }

    const membershipCompanyId = membership?.empresa_id;
    if (typeof membershipCompanyId === "string" && membershipCompanyId.trim()) {
      return membershipCompanyId.trim();
    }
  } catch {
    return null;
  }

  return null;
};

const sanitizeCreatePayload = (payload: AccountCreatePayload) => {
  const parcelas = toNumber(payload.parcelas, 1);
  const parcelaAtual = toNumberOrNull(payload.parcela_atual);
  const isPaidByInstallment =
    parcelaAtual !== null &&
    parcelas > 0 &&
    parcelaAtual >= parcelas;

  const normalizedPayload = {
    descricao: normalizeOptionalText(payload.descricao),
    valor: toNumberOrNull(payload.valor),
    tipo: normalizeOptionalText(payload.tipo),
    movimentacao: normalizeOptionalText(payload.movimentacao),
    data_pagamento: normalizeDateToIso(payload.data_pagamento),
    parcelas,
    forma_pagamento: normalizeOptionalText(payload.forma_pagamento),
    categoria: normalizeOptionalText(payload.categoria),
    status: isPaidByInstallment ? "pago" : normalizeOptionalText(payload.status),
    parcelado:
      payload.parcelado === null || payload.parcelado === undefined
        ? null
        : toBoolean(payload.parcelado, false),
    parcela_atual: parcelaAtual,
  };

  if (isPaidByInstallment && !normalizedPayload.data_pagamento) {
    normalizedPayload.data_pagamento = new Date().toISOString();
  }

  if (normalizedPayload.valor !== null && normalizedPayload.valor < 0) {
    throw new Error("O valor da conta nao pode ser negativo.");
  }

  return normalizedPayload;
};

const isPaidStatus = (status: string | null) => {
  const normalized = (status || "").toLowerCase();
  return ["pago", "paga", "quitado", "concluido", "executado", "recebido"].some((value) =>
    normalized.includes(value),
  );
};

const isPendingStatus = (status: string | null) => {
  const normalized = (status || "").toLowerCase();
  return ["pendente", "aberto", "em_aberto", "atrasado"].some((value) =>
    normalized.includes(value),
  );
};

export const isAccountPaid = (account: ContaDashboardItem) =>
  Boolean(account.dataPagamento) || isPaidStatus(account.status);

export const isAccountPending = (account: ContaDashboardItem) =>
  isPendingStatus(account.status) || !isAccountPaid(account);

export const isIncomeAccount = (account: ContaDashboardItem) => {
  const movement = (account.movimentacao || "").toLowerCase();
  if (movement === "ganho") return true;
  if (movement === "despesa") return false;

  const hints = [account.tipo, account.categoria].join(" ").toLowerCase();
  if (["entrada", "receita", "ganho", "credito", "recebimento"].some((value) => hints.includes(value))) {
    return true;
  }
  if (["saida", "despesa", "gasto", "custo", "debito"].some((value) => hints.includes(value))) {
    return false;
  }
  return (account.valor ?? 0) >= 0;
};

export const getAccountAmount = (account: ContaDashboardItem) =>
  Math.abs(toNumber(account.valor, 0));

export const getMonthKeyFromDate = (value: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  const year = parsed.getUTCFullYear();
  const month = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

export const getDashboardMonthOptions = (months = 12, baseDate = new Date()) => {
  const list: { value: string; label: string }[] = [];
  for (let index = 0; index < months; index += 1) {
    const date = new Date(Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth() - index, 1));
    const value = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    const label = date.toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
    list.push({
      value,
      label: label.charAt(0).toUpperCase() + label.slice(1),
    });
  }
  return list;
};

export const getCurrentMonthKey = () => {
  const date = new Date();
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
};

export const createAccountAPI = async (payload: AccountCreatePayload) => {
  const sanitizedPayload = sanitizeCreatePayload(payload);
  const companyId =
    normalizeOptionalText(payload.empresa_id) || (await resolveCompanyIdFromSession());

  if (!companyId) {
    throw new Error(
      "Nao foi possivel identificar a empresa vinculada ao usuario. Faça login novamente ou conclua o onboarding.",
    );
  }

  const payloadToInsert = { ...sanitizedPayload, empresa_id: companyId };

  const { error } = await fromAccounts().insert([payloadToInsert]);

  if (error) {
    const errorMessage = String(error.message || "").toLowerCase();
    const isRlsViolation =
      errorMessage.includes("row-level security") ||
      errorMessage.includes("violates row-level security") ||
      error.code === "42501";

    if (isRlsViolation) {
      throw new Error(
        "Permissao negada para inserir conta nesta empresa. Verifique o vinculo do usuario com a empresa.",
      );
    }

    throw error;
  }
};

const parseAccountId = (accountId: string | number) => {
  const parsedId = Number(accountId);
  if (!Number.isFinite(parsedId) || parsedId <= 0) {
    throw new Error("ID da conta invalido.");
  }
  return parsedId;
};

const handleAccountMutationError = (error: { code?: string; message?: string }) => {
  const errorMessage = String(error.message || "").toLowerCase();
  const isRlsViolation =
    errorMessage.includes("row-level security") ||
    errorMessage.includes("violates row-level security") ||
    error.code === "42501";

  if (isRlsViolation) {
    throw new Error(
      "Permissao negada para alterar conta nesta empresa. Verifique o vinculo do usuario com a empresa.",
    );
  }

  throw error;
};

export const updateAccountAPI = async (
  accountId: string | number,
  payload: AccountCreatePayload,
) => {
  const parsedAccountId = parseAccountId(accountId);
  const sanitizedPayload = sanitizeCreatePayload(payload);

  const { error } = await fromAccounts()
    .update(sanitizedPayload)
    .eq("id", parsedAccountId);

  if (error) {
    handleAccountMutationError(error);
  }
};

export const deleteAccountAPI = async (accountId: string | number) => {
  const parsedAccountId = parseAccountId(accountId);

  const { error } = await fromAccounts()
    .delete()
    .eq("id", parsedAccountId);

  if (error) {
    handleAccountMutationError(error);
  }
};

export const getMonthlyFinancialDataAPI = async (monthKey: string): Promise<MonthlyFinancialData> => {
  const { startIso, endIso } = getMonthRange(monthKey);

  const { data: accountsData, error: accountsError } = await fromAccounts()
    .select(
      "id, descricao, valor, tipo, movimentacao, empresa_id, data_pagamento, parcelas, forma_pagamento, categoria, status, parcelado, parcela_atual",
    )
    .gte("data_pagamento", startIso)
    .lt("data_pagamento", endIso)
    .order("data_pagamento", { ascending: false })
    .order("id", { ascending: false });

  if (accountsError) throw accountsError;

  const mappedAccounts = (accountsData ?? []).map((row) => mapContaRow(row as ContaRow));

  const { data: ordersData, error: ordersError } = await fromSchema(ORCAMENTOS_TABLE)
    .select("id, status")
    .gte("data_criacao", startIso)
    .lt("data_criacao", endIso);

  if (ordersError) throw ordersError;

  const orderRows = (ordersData ?? []) as OrcamentoRow[];
  const orderIds = orderRows
    .map((row) => parseNumericId(row.id))
    .filter((id): id is number => id !== undefined);
  const deliveredOrderIds = new Set(
    orderRows
      .filter((row) => isDeliveredServiceOrder(row.status))
      .map((row) => parseNumericId(row.id))
      .filter((id): id is number => id !== undefined),
  );

  if (!orderIds.length) {
    return {
      monthKey,
      accounts: mappedAccounts,
      serviceOrdersCount: 0,
      deliveredOrdersCount: 0,
      deliveredOrdersRevenue: 0,
      serviceItemsCost: 0,
      serviceRevenue: 0,
      executedPaymentsCount: mappedAccounts.filter(isAccountPaid).length,
      accountsPaidCount: mappedAccounts.filter(isAccountPaid).length,
      accountsPendingCount: mappedAccounts.filter(isAccountPending).length,
    };
  }

  const [itemsResponse, paymentsResponse] = await Promise.all([
    fromSchema(ORCAMENTOS_ITEMS_TABLE)
      .select("tipo, valor, quantidade, desconto, orcamento_id")
      .in("orcamento_id", orderIds),
    fromSchema(ORCAMENTOS_PAYMENTS_TABLE)
      .select("id, valor_pago, orcamento_id")
      .in("orcamento_id", orderIds),
  ]);

  if (itemsResponse.error) throw itemsResponse.error;
  if (paymentsResponse.error) throw paymentsResponse.error;

  const itemsRows = (itemsResponse.data ?? []) as OrcamentoItemRow[];
  const serviceItemsCost = itemsRows.reduce((acc, row) => acc + mapOrderItemCost(row), 0);
  const deliveredOrdersRevenue = itemsRows.reduce((acc, row) => {
    const orderId = parseNumericId(row.orcamento_id);
    if (!orderId || !deliveredOrderIds.has(orderId)) {
      return acc;
    }
    return acc + mapOrderItemCost(row);
  }, 0);

  const paymentRows = (paymentsResponse.data ?? []) as OrcamentoPaymentRow[];
  const serviceRevenue = paymentRows.reduce((acc, row) => acc + toNumber(row.valor_pago, 0), 0);

  const accountsPaidCount = mappedAccounts.filter(isAccountPaid).length;

  return {
    monthKey,
    accounts: mappedAccounts,
    serviceOrdersCount: orderIds.length,
    deliveredOrdersCount: deliveredOrderIds.size,
    deliveredOrdersRevenue,
    serviceItemsCost,
    serviceRevenue,
    executedPaymentsCount: paymentRows.length + accountsPaidCount,
    accountsPaidCount,
    accountsPendingCount: mappedAccounts.filter(isAccountPending).length,
  };
};

export const getDashboardAccountsAPI = async (limit = DASHBOARD_LIMIT) => {
  const normalizedLimit = Number.isFinite(limit) ? Math.max(1, Math.floor(limit)) : DASHBOARD_LIMIT;

  const { data, error } = await fromAccounts()
    .select(
      "id, descricao, valor, tipo, movimentacao, empresa_id, data_pagamento, parcelas, forma_pagamento, categoria, status, parcelado, parcela_atual",
    )
    .order("data_pagamento", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .limit(normalizedLimit);

  if (error) throw error;

  return (data ?? []).map((row) => mapContaRow(row as ContaRow));
};
