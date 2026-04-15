import { supabase } from "./config";

const PAGE_SIZE = 10;
const TABLE_NAME = "catalogo_servicos";
const ACTIVE_FIELD = "ativo" as const;
const ORDER_BY_FIELD = "descricao" as const;

interface CatalogServiceRow {
  id: number;
  categoria: string | null;
  valor: number | string | null;
  ativo: boolean | null;
  descricao: string | null;
  custo: number | string | null;
  empresa_id: string | null;
  created_at: string;
}

export interface CatalogService {
  id: string;
  description: string;
  type: string;
  value: number;
  isActive: boolean;
  activeField: string | null;
  cost: number;
  companyId: string | null;
  createdAt: string;
}

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseActiveValue = (value: boolean | null) => value ?? true;

const mapServiceRow = (row: CatalogServiceRow): CatalogService => {
  return {
    id: String(row.id),
    description: row.descricao?.trim() || "Sem descricao",
    type: row.categoria?.trim() || "SEM_CATEGORIA",
    value: toNumber(row.valor, 0),
    isActive: parseActiveValue(row.ativo),
    activeField: ACTIVE_FIELD,
    cost: toNumber(row.custo, 0),
    companyId: row.empresa_id,
    createdAt: row.created_at,
  };
};

const parseServiceId = (serviceId: string) => {
  const parsed = Number(serviceId);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error("ID de servico invalido.");
  }
  return parsed;
};

export const getCatalogServicesAPI = async (
  searchValue = "",
  page = 1,
  typeFilter = "all",
  _serviceTypes: string[] = [],
) => {
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const normalizedSearch = searchValue.trim();

  let query = supabase
    .from(TABLE_NAME)
    .select("id, categoria, valor, ativo, descricao, custo, empresa_id, created_at", {
      count: "exact",
    });

  if (normalizedSearch) {
    query = query.or(
      `descricao.ilike.%${normalizedSearch}%,categoria.ilike.%${normalizedSearch}%`,
    );
  }

  if (typeFilter && typeFilter !== "all") {
    query = query.eq("categoria", typeFilter);
  }

  const { data, count, error } = await query
    .range(from, to)
    .order(ORDER_BY_FIELD, { ascending: true });

  if (error) throw error;

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return {
    data: (data ?? []).map((row) => mapServiceRow(row as CatalogServiceRow)),
    meta: {
      page,
      total: count ?? 0,
      totalPages,
    },
  };
};

export const toggleCatalogServiceStatusAPI = async (
  serviceId: string,
  field: string,
  nextValue: boolean,
) => {
  if (field !== ACTIVE_FIELD) {
    throw new Error(`Campo de status invalido: ${field}`);
  }

  const parsedServiceId = parseServiceId(serviceId);

  const { error } = await supabase
    .from(TABLE_NAME)
    .update({ [ACTIVE_FIELD]: nextValue })
    .eq("id", parsedServiceId);

  if (error) throw error;
};

export const deleteCatalogServiceAPI = async (serviceId: string) => {
  const parsedServiceId = parseServiceId(serviceId);
  const { error } = await supabase.from(TABLE_NAME).delete().eq("id", parsedServiceId);
  if (error) throw error;
};
