import { estimateService, supabase, supabaseSchema } from "./config";

import { CustomerSchema } from "@/components/FormSheet/Customer/schema";
import { VehicleSchema } from "@/components/FormSheet/Vehicle/schema";

const SUPABASE_SCHEMA = supabaseSchema;

export type ServiceOrderStatus =
  | "em_aberto"
  | "rejeitado"
  | "agendado"
  | "aguardando_servico"
  | "executando"
  | "entregue"
  | "bloqueado"
  | "finalizado"
  | "aguardando_peca"
  | "aguardando_retirada";

export interface OrcamentoRow {
  id: number;
  descricao: string | null;
  placa: string;
  status: ServiceOrderStatus | null;
  empresa_id: string;
  data_criacao: string | null;
  cliente_id: number | null;
  nps: number | null;
  data_prazo: string | null;
  data_saida: string | null;
  data_entrada: string | null;
  observacao: string | null;
  comentario_cliente: string | null;
  criado_por: string | null;
}

interface CustomerRow {
  id?: number | string;
  nome?: string;
  telefone?: string;
  email?: string;
  endereco?: string;
  numero_documento?: string;
  tipo_documento?: string;
}

interface VehicleRow {
  id?: number | string;
  placa?: string;
  marca?: string;
  modelo?: string;
  ano?: number | string;
  cor?: string;
  km?: string;
  combustivel?: string;
  chassi?: string;
}

const mapCustomerRowToSchema = (customer?: CustomerRow): CustomerSchema => ({
  id: customer?.id ? String(customer.id) : undefined,
  name: customer?.nome ?? "",
  cpf: customer?.numero_documento ?? "",
  phone: customer?.telefone ?? "",
  email: customer?.email ?? "",
  address: customer?.endereco ?? "",
});

const mapVehicleRowToSchema = (vehicle?: VehicleRow, fallbackPlate?: string): VehicleSchema => ({
  id: vehicle?.id ? String(vehicle.id) : undefined,
  plate: (vehicle?.placa ?? fallbackPlate ?? "").toUpperCase(),
  brand: vehicle?.marca ?? "",
  model: vehicle?.modelo ?? "",
  year: vehicle?.ano ? String(vehicle.ano) : "",
  color: (vehicle?.cor ?? "").toLowerCase(),
  km: vehicle?.km ?? "",
  fuel: vehicle?.combustivel ?? "",
  chassi: vehicle?.chassi ?? "",
});

type FilterOption = "vehicle" | "customer";
const TABLE_NAME = "orcamentos" as const;
const SERVICE_ORDER_ITEMS_TABLE = "service_order_items" as const;
const PAGE_SIZE = 10;

const fromSchema = (tableName: string) => supabase.schema(SUPABASE_SCHEMA).from(tableName);

const BASE_SEARCH_COLUMNS = ["descricao", "observacao", "comentario_cliente", "placa"];
const CUSTOMER_SEARCH_COLUMNS = ["nome", "telefone", "email", "numero_documento"];
const VEHICLE_SEARCH_COLUMNS = ["placa", "marca", "modelo"];

const buildSearchCondition = (columns: string[], trimmed: string) =>
  columns.map((column) => `${column}.ilike.%${trimmed}%`).join(",");

const fetchMatchingCustomerIds = async (trimmed: string) => {
  const { data, error } = await fromSchema("clientes")
    .select("id")
    .or(buildSearchCondition(CUSTOMER_SEARCH_COLUMNS, trimmed));

  if (error) throw error;

  return Array.from(
    new Set(
      (data || [])
        .map((customer) => customer?.id)
        .filter((id): id is number | string => id !== undefined && id !== null)
        .map((id) => String(id))
    )
  );
};

const fetchMatchingVehiclePlates = async (trimmed: string) => {
  const { data, error } = await fromSchema("carros")
    .select("placa")
    .or(buildSearchCondition(VEHICLE_SEARCH_COLUMNS, trimmed));

  if (error) throw error;

  return Array.from(
    new Set(
      (data || [])
        .map((vehicle) => vehicle?.placa)
        .filter((plate): plate is string => Boolean(plate && plate.trim()))
        .map((plate) => plate.trim().toUpperCase())
    )
  );
};

type ServiceOrderFormPayload = {
  id?: number | string;
  uuid?: string;
  descricao?: string | null;
  placa?: string | null;
  status?: ServiceOrderStatus | null;
  empresa_id?: string;
  data_criacao?: string | null;
  cliente_id?: number | null;
  nps?: number | null;
  data_prazo?: string | null;
  data_saida?: string | null;
  data_entrada?: string | null;
  observacao?: string | null;
  comentario_cliente?: string | null;
  criado_por?: string | null;
  customer?: { id?: number | string };
  vehicle?: { plate?: string | null };
  note?: string;
  startAt?: string;
  endAt?: string;
};

const cleanPayload = (payload: Partial<OrcamentoRow>) =>
  Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined)) as Partial<OrcamentoRow>;

const normalizeServiceOrderPayload = (data: ServiceOrderFormPayload): Partial<OrcamentoRow> => {
  const normalized: Partial<OrcamentoRow> = {};

  if (data.id !== undefined) {
    const parsedId = Number(data.id);
    if (!Number.isNaN(parsedId)) {
      normalized.id = parsedId;
    }
  } else if (data.uuid) {
    const parsedId = Number(data.uuid);
    if (!Number.isNaN(parsedId)) {
      normalized.id = parsedId;
    }
  }

  if (data.descricao !== undefined) {
    normalized.descricao = data.descricao;
  }

  if (data.vehicle?.plate || data.placa) {
    normalized.placa = (data.vehicle?.plate ?? data.placa ?? "").toUpperCase();
  }

  if (data.status !== undefined) {
    normalized.status = data.status;
  }

  if (data.empresa_id !== undefined) {
    normalized.empresa_id = data.empresa_id;
  }

  if (data.data_criacao !== undefined) {
    normalized.data_criacao = data.data_criacao;
  }

  if (data.customer?.id !== undefined) {
    const parsed = Number(data.customer.id);
    normalized.cliente_id = Number.isNaN(parsed) ? null : parsed;
  } else if (data.cliente_id !== undefined) {
    normalized.cliente_id = data.cliente_id;
  }

  if (data.nps !== undefined) {
    normalized.nps = data.nps;
  }

  if (data.data_prazo !== undefined) {
    normalized.data_prazo = data.data_prazo;
  }

  if (data.endAt !== undefined) {
    normalized.data_saida = data.endAt;
  } else if (data.data_saida !== undefined) {
    normalized.data_saida = data.data_saida;
  }

  if (data.startAt !== undefined) {
    normalized.data_entrada = data.startAt;
  } else if (data.data_entrada !== undefined) {
    normalized.data_entrada = data.data_entrada;
  }

  if (data.note !== undefined) {
    normalized.observacao = data.note;
    normalized.descricao ??= data.note;
    normalized.comentario_cliente ??= data.note;
  } else {
    if (data.observacao !== undefined) {
      normalized.observacao = data.observacao;
    }
    if (data.comentario_cliente !== undefined) {
      normalized.comentario_cliente = data.comentario_cliente;
    }
  }

  if (data.criado_por !== undefined) {
    normalized.criado_por = data.criado_por;
  }

  return normalized;
};

export const getServiceOrdersAPI = async (
  searchValue = "",
  page = 1,
  filter: FilterOption = "vehicle"
) => {
  const trimmed = searchValue.trim();
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const [matchingCustomerIds, matchingVehiclePlates] = trimmed
    ? await Promise.all([
        fetchMatchingCustomerIds(trimmed),
        fetchMatchingVehiclePlates(trimmed),
      ])
    : [[], []];

  let query = supabase
    .schema(SUPABASE_SCHEMA)
    .from(TABLE_NAME)
    .select("*", { count: "exact" });

  if (trimmed) {
    const conditions = [...BASE_SEARCH_COLUMNS.map((column) => `${column}.ilike.%${trimmed}%`)];
    if (filter === "customer" && matchingCustomerIds.length > 0) {
      conditions.push(`cliente_id.in.(${matchingCustomerIds.join(",")})`);
    }
    if (filter === "vehicle" && matchingVehiclePlates.length > 0) {
      conditions.push(`placa.in.(${matchingVehiclePlates.join(",")})`);
    }
    query = query.or(conditions.join(","));
  }

  const { data, count, error } = await query
    .range(from, to)
    .order("data_criacao", { ascending: false });

  if (error) throw error;

  const serviceOrders = data || [];
  const customerIds = Array.from(
    new Set(
      serviceOrders
        .map((order) => order.cliente_id)
        .filter((id): id is number | string => id !== undefined && id !== null)
        .map((id) => String(id)),
    ),
  );
  const plateValues = Array.from(
    new Set(
      serviceOrders
        .map((order) => order.placa)
        .filter((plate): plate is string => Boolean(plate && plate.trim()))
        .map((plate) => plate.trim().toUpperCase()),
    ),
  );

  const [customersResult, vehiclesResult] = await Promise.all([
    customerIds.length
      ? fromSchema("clientes").select("*").in("id", customerIds)
      : Promise.resolve({ data: [] as CustomerRow[], error: null }),
    plateValues.length
      ? fromSchema("carros").select("*").in("placa", plateValues)
      : Promise.resolve({ data: [] as VehicleRow[], error: null }),
  ]);

  if (customersResult.error) throw customersResult.error;
  if (vehiclesResult.error) throw vehiclesResult.error;

  const customersMap = new Map<string, CustomerRow>();
  customersResult.data?.forEach((customer) => {
    if (customer?.id !== undefined && customer?.id !== null) {
      customersMap.set(String(customer.id), customer);
    }
  });

  const vehiclesMap = new Map<string, VehicleRow>();
  vehiclesResult.data?.forEach((vehicle) => {
    if (vehicle?.placa) {
      vehiclesMap.set(vehicle.placa.trim().toUpperCase(), vehicle);
    }
  });

  const normalizedData: ServiceOrderWithRelations[] = serviceOrders.map((order) => {
    const customerRow = order.cliente_id ? customersMap.get(String(order.cliente_id)) : undefined;
    const formattedPlate = order.placa?.trim().toUpperCase();
    const vehicleRow = formattedPlate ? vehiclesMap.get(formattedPlate) : undefined;

    return {
      ...order,
      id: order.id,
      uuid: String(order.id),
      status: order.status ?? "em_aberto",
      createdAt: order.data_criacao ?? order.data_entrada ?? "",
      updatedAt: order.data_criacao ?? order.data_entrada ?? undefined,
      startAt: order.data_entrada ?? "",
      endAt: order.data_saida ?? undefined,
      note: order.observacao ?? order.comentario_cliente ?? order.descricao ?? "",
      customer: mapCustomerRowToSchema(customerRow),
      vehicle: mapVehicleRowToSchema(vehicleRow, order.placa ?? undefined),
      service_order_items: [],
    };
  });

  const totalPages = Math.max(1, Math.ceil((count || 0) / PAGE_SIZE));

  return {
    data: normalizedData,
    meta: {
      page,
      totalPages,
      total: count || 0,
    },
  };
};

export async function createServiceOrder(order: ServiceOrderFormPayload) {
  try {
    const payload = cleanPayload(normalizeServiceOrderPayload(order));
    const { data, error } = await supabase
      .schema(SUPABASE_SCHEMA)
      .from(TABLE_NAME)
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Erro ao criar orçamento:", error);
    throw error;
  }
}

export async function updateServiceOrder(id: number | string, order: ServiceOrderFormPayload) {
  try {
    const payload = cleanPayload(normalizeServiceOrderPayload(order));
    const { data, error } = await supabase
      .schema(SUPABASE_SCHEMA)
      .from(TABLE_NAME)
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error(`Erro ao atualizar orçamento ${id}:`, error);
    throw error;
  }
}

export async function deleteServiceOrder(id: number | string) {
  try {
    const { error } = await supabase
      .schema(SUPABASE_SCHEMA)
      .from(TABLE_NAME)
      .delete()
      .eq("id", id);

    if (error) throw error;
  } catch (error) {
    console.error(`Erro ao deletar orçamento ${id}:`, error);
    throw error;
  }
}

export async function deleteServiceOrderItem(uuid: string) {
  try {
    const { error } = await supabase
      .schema(SUPABASE_SCHEMA)
      .from(SERVICE_ORDER_ITEMS_TABLE)
      .delete()
      .eq("uuid", uuid);

    if (error) throw error;
  } catch (error) {
    console.error(`Erro ao deletar item ${uuid}:`, error);
    throw error;
  }
}

interface ServiceOrderMeta {
  page: number;
  totalPages: number;
  total: number;
}

export type ServiceOrderWithRelations = Omit<OrcamentoRow, "status"> & {
  id: number;
  status: ServiceOrderStatus;
  uuid: string;
  createdAt: string;
  updatedAt?: string;
  startAt: string;
  endAt?: string;
  note?: string;
  customer: CustomerSchema;
  vehicle: VehicleSchema;
  service_order_items: unknown[];
};

export type ServiceOrderResponse = {
  data: ServiceOrderWithRelations[];
  meta: ServiceOrderMeta;
};

const ServiceOrderAPI = {
  get: (
    searchValue = "",
    page = 1,
    filter: FilterOption = "vehicle"
  ): Promise<ServiceOrderResponse> => getServiceOrdersAPI(searchValue, page, filter),
  put: async (serviceOrder: ServiceOrderFormPayload) => {
    if (serviceOrder.id) {
      const updated = await updateServiceOrder(serviceOrder.id, serviceOrder);
      return { data: updated };
    }
    const created = await createServiceOrder(serviceOrder);
    return { data: created };
  },
  delete: (uuid: string) => deleteServiceOrderItem(uuid),
  uploadVehicleImage: ({ imageFile, orderId, description }: { imageFile: File; orderId?: string; description: string }) => {
    const formData = new FormData();
    formData.append("file", imageFile);
    formData.append("order_id", orderId || "");
    formData.append("service_id", orderId || "");
    formData.append("file_type", "new");
    formData.append("description", description);

    return estimateService.put("service/photo", formData);
  },
  getImages: (orderId: string) => estimateService.get(`${orderId}/service/photo`),
};

export default ServiceOrderAPI;

