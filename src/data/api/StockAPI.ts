import { supabase, supabaseSchema } from "./config";

const PAGE_SIZE = 10;
const TABLE_NAME = "catalogo_pecas";
const ACTIVE_FIELD = "ativo" as const;
const ORDER_BY_FIELD = "nome" as const;

const fromStock = () => supabase.schema(supabaseSchema).from(TABLE_NAME);

interface StockItemRow {
  id: string;
  empresa_id: string | null;
  nome: string;
  codigo_barras: string | null;
  descricao: string | null;
  categoria: string | null;
  marca: string | null;
  unidade_medida: string | null;
  preco_custo: number | string | null;
  preco_venda: number | string | null;
  quantidade_estoque: number | null;
  estoque_minimo: number | null;
  ativo: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface StockItem {
  id: string;
  companyId: string | null;
  name: string;
  barcode: string | null;
  description: string | null;
  category: string | null;
  brand: string | null;
  unitMeasure: string;
  costPrice: number | null;
  salePrice: number | null;
  stockQuantity: number;
  minimumStock: number;
  isActive: boolean;
  activeField: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockItemPayload {
  nome: string;
  codigo_barras?: string | null;
  descricao?: string | null;
  categoria?: string | null;
  marca?: string | null;
  unidade_medida?: string | null;
  preco_custo?: number | null;
  preco_venda?: number | null;
  quantidade_estoque?: number | null;
  estoque_minimo?: number | null;
  ativo?: boolean;
  empresa_id?: string | null;
}

interface SanitizedStockItemPayload {
  nome: string;
  codigo_barras: string | null;
  descricao: string | null;
  categoria: string | null;
  marca: string | null;
  unidade_medida: string;
  preco_custo: number | null;
  preco_venda: number | null;
  quantidade_estoque: number;
  estoque_minimo: number;
  ativo: boolean;
  empresa_id?: string | null;
}

const toInteger = (value: unknown, fallback = 0) => {
  const parsed = Number.parseInt(String(value ?? fallback), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toNumberOrNull = (value: unknown) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeOptionalText = (value: unknown) => {
  const normalized = String(value ?? "").trim();
  return normalized || null;
};

const mapStockItemRow = (row: StockItemRow): StockItem => ({
  id: row.id,
  companyId: row.empresa_id,
  name: row.nome?.trim() || "Sem nome",
  barcode: normalizeOptionalText(row.codigo_barras),
  description: normalizeOptionalText(row.descricao),
  category: normalizeOptionalText(row.categoria),
  brand: normalizeOptionalText(row.marca),
  unitMeasure: normalizeOptionalText(row.unidade_medida) ?? "un",
  costPrice: toNumberOrNull(row.preco_custo),
  salePrice: toNumberOrNull(row.preco_venda),
  stockQuantity: toInteger(row.quantidade_estoque, 0),
  minimumStock: toInteger(row.estoque_minimo, 0),
  isActive: row.ativo ?? true,
  activeField: ACTIVE_FIELD,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const sanitizeStockItemPayload = (
  payload: StockItemPayload,
): SanitizedStockItemPayload => {
  const name = payload.nome.trim();
  if (!name) {
    throw new Error("Nome da peca e obrigatorio.");
  }

  const sanitizedPayload: SanitizedStockItemPayload = {
    nome: name,
    codigo_barras: normalizeOptionalText(payload.codigo_barras),
    descricao: normalizeOptionalText(payload.descricao),
    categoria: normalizeOptionalText(payload.categoria),
    marca: normalizeOptionalText(payload.marca),
    unidade_medida: normalizeOptionalText(payload.unidade_medida) ?? "un",
    preco_custo: toNumberOrNull(payload.preco_custo),
    preco_venda: toNumberOrNull(payload.preco_venda),
    quantidade_estoque: toInteger(payload.quantidade_estoque, 0),
    estoque_minimo: toInteger(payload.estoque_minimo, 0),
    ativo: payload.ativo ?? true,
  };

  if ("empresa_id" in payload) {
    sanitizedPayload.empresa_id = payload.empresa_id?.trim() || null;
  }

  return sanitizedPayload;
};

const resolveCompanyIdFromSession = async () => {
  const { data } = await supabase.auth.getSession();
  const sessionUser = data.session?.user;

  const fromUserMetadata = sessionUser?.user_metadata?.empresa_id;
  const fromAppMetadata = sessionUser?.app_metadata?.empresa_id;
  const fallbackUserId = sessionUser?.id;

  const resolvedCompanyId =
    typeof fromUserMetadata === "string"
      ? fromUserMetadata
      : typeof fromAppMetadata === "string"
        ? fromAppMetadata
        : fallbackUserId;

  return resolvedCompanyId?.trim() || null;
};

const parseStockItemId = (stockItemId: string) => {
  const normalizedId = stockItemId.trim();
  if (!normalizedId) {
    throw new Error("ID da peca invalido.");
  }
  return normalizedId;
};

export const getStockItemsAPI = async (searchValue = "", page = 1) => {
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const normalizedSearch = searchValue.trim();

  let query = fromStock().select(
    "id, empresa_id, nome, codigo_barras, descricao, categoria, marca, unidade_medida, preco_custo, preco_venda, quantidade_estoque, estoque_minimo, ativo, created_at, updated_at",
    {
      count: "exact",
    },
  );

  if (normalizedSearch) {
    query = query.or(
      `nome.ilike.%${normalizedSearch}%,codigo_barras.ilike.%${normalizedSearch}%,descricao.ilike.%${normalizedSearch}%,categoria.ilike.%${normalizedSearch}%,marca.ilike.%${normalizedSearch}%`,
    );
  }

  const { data, count, error } = await query
    .range(from, to)
    .order(ORDER_BY_FIELD, { ascending: true });

  if (error) throw error;

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return {
    data: (data ?? []).map((row) => mapStockItemRow(row as StockItemRow)),
    meta: {
      page,
      total: count ?? 0,
      totalPages,
    },
  };
};

export const toggleStockItemStatusAPI = async (
  stockItemId: string,
  field: string,
  nextValue: boolean,
) => {
  if (field !== ACTIVE_FIELD) {
    throw new Error(`Campo de status invalido: ${field}`);
  }

  const parsedStockItemId = parseStockItemId(stockItemId);

  const { error } = await fromStock()
    .update({ [ACTIVE_FIELD]: nextValue, updated_at: new Date().toISOString() })
    .eq("id", parsedStockItemId);

  if (error) throw error;
};

export const deleteStockItemAPI = async (stockItemId: string) => {
  const parsedStockItemId = parseStockItemId(stockItemId);

  const { error } = await fromStock().delete().eq("id", parsedStockItemId);

  if (error) throw error;
};

export const createStockItemAPI = async (payload: StockItemPayload) => {
  const sanitizedPayload = sanitizeStockItemPayload(payload);
  const resolvedCompanyId =
    sanitizedPayload.empresa_id?.trim() || (await resolveCompanyIdFromSession());

  const payloadToInsert = resolvedCompanyId
    ? { ...sanitizedPayload, empresa_id: resolvedCompanyId }
    : sanitizedPayload;

  const { error } = await fromStock().insert([payloadToInsert]);

  if (error) throw error;
};

export const updateStockItemAPI = async (
  stockItemId: string,
  payload: StockItemPayload,
) => {
  const parsedStockItemId = parseStockItemId(stockItemId);
  const sanitizedPayload = sanitizeStockItemPayload(payload);

  const { error } = await fromStock()
    .update({ ...sanitizedPayload, updated_at: new Date().toISOString() })
    .eq("id", parsedStockItemId);

  if (error) throw error;
};
