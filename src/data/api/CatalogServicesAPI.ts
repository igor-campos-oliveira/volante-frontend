import { supabase, supabaseSchema } from "./config";

const PAGE_SIZE = 10;
const TABLE_NAME = "catalogo_servicos";
const ACTIVE_FIELD = "ativo" as const;
const ORDER_BY_FIELD = "descricao" as const;

const fromCatalogServices = () => supabase.schema(supabaseSchema).from(TABLE_NAME);

interface CatalogServiceRow {
  id: number;
  tipo: string | null;
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

export interface CatalogServicePayload {
  descricao: string;
  tipo: string;
  valor: number;
  custo: number;
  ativo: boolean;
  empresa_id?: string | null;
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
    type: row.tipo?.trim() || "SEM_CATEGORIA",
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

  let query = fromCatalogServices().select(
    "id, tipo, valor, ativo, descricao, custo, empresa_id, created_at",
    {
      count: "exact",
    },
  );

  if (normalizedSearch) {
    query = query.or(
      `descricao.ilike.%${normalizedSearch}%,tipo.ilike.%${normalizedSearch}%`,
    );
  }

  if (typeFilter && typeFilter !== "all") {
    query = query.ilike("tipo", typeFilter.trim());
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

  const { error } = await fromCatalogServices()
    .update({ [ACTIVE_FIELD]: nextValue })
    .eq("id", parsedServiceId);

  if (error) throw error;
};

export const deleteCatalogServiceAPI = async (serviceId: string) => {
  const parsedServiceId = parseServiceId(serviceId);
  const { error } = await fromCatalogServices().delete().eq("id", parsedServiceId);
  if (error) throw error;
};

const sanitizeCatalogServicePayload = (
  payload: CatalogServicePayload,
): CatalogServicePayload => {
  const description = payload.descricao.trim();
  const type = payload.tipo.trim();

  if (!description) {
    throw new Error("Descricao e obrigatoria.");
  }

  if (!type) {
    throw new Error("Tipo e obrigatorio.");
  }

  return {
    descricao: description,
    tipo: type,
    valor: toNumber(payload.valor, 0),
    custo: toNumber(payload.custo, 0),
    ativo: payload.ativo ?? true,
    empresa_id: payload.empresa_id?.trim() || null,
  };
};

export const createCatalogServiceAPI = async (payload: CatalogServicePayload) => {
  const sanitizedPayload = sanitizeCatalogServicePayload(payload);

  const { error } = await fromCatalogServices().insert([sanitizedPayload]);

  if (error) throw error;
};

export const updateCatalogServiceAPI = async (
  serviceId: string,
  payload: CatalogServicePayload,
) => {
  const parsedServiceId = parseServiceId(serviceId);
  const sanitizedPayload = sanitizeCatalogServicePayload(payload);

  const { error } = await fromCatalogServices()
    .update(sanitizedPayload)
    .eq("id", parsedServiceId);

  if (error) throw error;
};
