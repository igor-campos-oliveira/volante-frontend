import { supabase, supabaseSchema } from '@/data/api/config';
import { CustomerSchema } from '@/components/FormSheet/Customer/schema';
import { VehicleSchema } from '@/components/FormSheet/Vehicle/schema';
import { ServiceOrder, STATUS_SERVICE_ORDER } from '@/pages/ServiceOrderNew/types';
import { loadOrcamentoItems, syncOrcamentoItems } from './orcamentoItemService';
import {
  loadOrcamentoPayments,
  loadOrcamentoPaymentsByOrderIds,
  syncOrcamentoPayments,
} from './orcamentoPagamentoService';

type FilterOption = 'vehicle' | 'customer';

const ORCAMENTOS_TABLE = 'orcamentos' as const;
const PAGE_SIZE = 10;

interface OrcamentoRow {
  id: number;
  descricao: string | null;
  placa: string;
  status: STATUS_SERVICE_ORDER | null;
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

interface OrcamentoItemRow {
  id: number;
  descricao: string | null;
  tipo: string | null;
  valor: number | null;
  quantidade: number | null;
  observacao: string | null;
  desconto: number | null;
  orcamento_id: number | null;
}

interface ServiceOrderMeta {
  page: number;
  totalPages: number;
  total: number;
}

export interface ServiceOrderResponse {
  data: ServiceOrder[];
  meta: ServiceOrderMeta;
}

const fromSchema = (tableName: string) => supabase.schema(supabaseSchema).from(tableName);

const BASE_SEARCH_COLUMNS = ['descricao', 'observacao', 'comentario_cliente', 'placa'];
const CUSTOMER_SEARCH_COLUMNS = ['nome', 'telefone', 'email', 'numero_documento'];
const VEHICLE_SEARCH_COLUMNS = ['placa', 'marca', 'modelo'];

const buildSearchCondition = (columns: string[], trimmed: string) =>
  columns.map((column) => `${column}.ilike.%${trimmed}%`).join(',');

const normalizePlate = (plate?: string | null) =>
  (plate ?? '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .trim();

const parseNumericId = (value?: string | number | null) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toDateInputValue = (value?: string | null) => (value ? String(value).substring(0, 10) : '');

const mapCustomerRowToSchema = (customer?: CustomerRow): CustomerSchema => ({
  id: customer?.id ? String(customer.id) : undefined,
  name: customer?.nome ?? '',
  cpf: customer?.numero_documento ?? '',
  phone: customer?.telefone ?? '',
  email: customer?.email ?? '',
  address: customer?.endereco ?? '',
});

const mapVehicleRowToSchema = (vehicle?: VehicleRow, fallbackPlate?: string): VehicleSchema => ({
  id: vehicle?.id ? String(vehicle.id) : undefined,
  plate: normalizePlate(vehicle?.placa ?? fallbackPlate ?? ''),
  brand: vehicle?.marca ?? '',
  model: vehicle?.modelo ?? '',
  year: vehicle?.ano ? String(vehicle.ano) : '',
  color: (vehicle?.cor ?? '').toLowerCase(),
  km: vehicle?.km ?? '',
  fuel: vehicle?.combustivel ?? '',
  chassi: vehicle?.chassi ?? '',
});

const mapOrderRowToServiceOrder = ({
  order,
  customer,
  vehicle,
  serviceOrderItems,
  serviceOrderPayments,
}: {
  order: OrcamentoRow;
  customer?: CustomerRow;
  vehicle?: VehicleRow;
  serviceOrderItems?: ServiceOrder['service_order_items'];
  serviceOrderPayments?: ServiceOrder['service_order_payments'];
}): ServiceOrder => ({
  id: order.id,
  uuid: String(order.id),
  status: order.status ?? STATUS_SERVICE_ORDER.EM_ABERTO,
  createdAt: order.data_criacao ?? order.data_entrada ?? '',
  updatedAt: order.data_criacao ?? order.data_entrada ?? undefined,
  startAt: toDateInputValue(order.data_entrada),
  endAt: toDateInputValue(order.data_saida) || undefined,
  note: order.observacao ?? order.comentario_cliente ?? order.descricao ?? '',
  customer: mapCustomerRowToSchema(customer),
  vehicle: mapVehicleRowToSchema(vehicle, order.placa),
  items: serviceOrderItems ?? [],
  service_order_items: serviceOrderItems ?? [],
  service_order_payments: serviceOrderPayments ?? [],
  duration_quantity: 0,
  duration_type: 'day',
  images: [],
});

const fetchMatchingCustomerIds = async (trimmed: string) => {
  const { data, error } = await fromSchema('clientes')
    .select('id')
    .or(buildSearchCondition(CUSTOMER_SEARCH_COLUMNS, trimmed));

  if (error) throw error;

  return Array.from(
    new Set(
      (data ?? [])
        .map((customer) => customer?.id)
        .filter((id): id is number => id !== undefined && id !== null),
    ),
  );
};

const fetchMatchingVehiclePlates = async (trimmed: string) => {
  const { data, error } = await fromSchema('carros')
    .select('placa')
    .or(buildSearchCondition(VEHICLE_SEARCH_COLUMNS, trimmed));

  if (error) throw error;

  return Array.from(
    new Set(
      (data ?? [])
        .map((vehicle) => normalizePlate(vehicle?.placa))
        .filter((plate): plate is string => Boolean(plate)),
    ),
  );
};

const formatInClauseValue = (value: string) => `"${value.replace(/"/g, '\\"')}"`;

const loadCustomersMap = async (customerIds: Array<number | string>) => {
  if (!customerIds.length) return new Map<string, CustomerRow>();

  const { data, error } = await fromSchema('clientes').select('*').in('id', customerIds);
  if (error) throw error;

  const map = new Map<string, CustomerRow>();
  (data ?? []).forEach((customer) => {
    if (customer?.id !== undefined && customer?.id !== null) {
      map.set(String(customer.id), customer);
    }
  });

  return map;
};

const loadVehiclesMap = async (plates: string[]) => {
  if (!plates.length) return new Map<string, VehicleRow>();

  const { data, error } = await fromSchema('carros').select('*').in('placa', plates);
  if (error) throw error;

  const map = new Map<string, VehicleRow>();
  (data ?? []).forEach((vehicle) => {
    const plate = normalizePlate(vehicle?.placa);
    if (plate) {
      map.set(plate, vehicle);
    }
  });

  return map;
};

const mapItemRowToServiceOrderItem = (row: OrcamentoItemRow): ServiceOrder['service_order_items'][number] => {
  const quantity = toNumber(row.quantidade, 1);
  const value = toNumber(row.valor, 0);
  const discount = toNumber(row.desconto, 0);

  return {
    uuid: String(row.id),
    description: row.descricao ?? '',
    type: row.tipo ?? 'BODYWORK',
    quantity,
    value,
    discount,
    insurance_coverage: 0,
    total: quantity * value - discount,
  };
};

const loadItemsByOrderIds = async (orderIds: number[]) => {
  if (!orderIds.length) return new Map<number, ServiceOrder['service_order_items']>();

  const { data, error } = await fromSchema('itens_orcamento')
    .select('*')
    .in('orcamento_id', orderIds);

  if (error) throw error;

  const itemsMap = new Map<number, ServiceOrder['service_order_items']>();

  ((data ?? []) as OrcamentoItemRow[]).forEach((item) => {
    const orderId = parseNumericId(item.orcamento_id);
    if (!orderId) return;

    const mappedItem = mapItemRowToServiceOrderItem(item);
    const currentItems = itemsMap.get(orderId) ?? [];
    itemsMap.set(orderId, [...currentItems, mappedItem]);
  });

  return itemsMap;
};

const normalizeDateTime = (dateValue?: string) => (dateValue ? `${dateValue}T00:00:00+00:00` : null);

const hasAnyCustomerData = (customer?: CustomerSchema) =>
  Boolean(
    customer?.name?.trim() ||
      customer?.phone?.trim() ||
      customer?.email?.trim() ||
      customer?.cpf?.trim() ||
      customer?.address?.trim(),
  );

const upsertCustomer = async (customer?: CustomerSchema) => {
  if (!customer || !hasAnyCustomerData(customer)) {
    return null;
  }

  const payload = {
    nome: customer.name?.trim() || null,
    telefone: customer.phone?.trim() || null,
    email: customer.email?.trim() || null,
    endereco: customer.address?.trim() || null,
    numero_documento: customer.cpf?.trim() || null,
  };

  const customerId = parseNumericId(customer.id);

  if (customerId) {
    const { data, error } = await fromSchema('clientes').update(payload).eq('id', customerId).select('id').single();
    if (error) throw error;
    return data.id as number;
  }

  if (payload.numero_documento) {
    const { data: foundByDocument, error: findByDocumentError } = await fromSchema('clientes')
      .select('id')
      .eq('numero_documento', payload.numero_documento)
      .maybeSingle();

    if (findByDocumentError) throw findByDocumentError;

    if (foundByDocument?.id) {
      const { data, error } = await fromSchema('clientes')
        .update(payload)
        .eq('id', foundByDocument.id)
        .select('id')
        .single();
      if (error) throw error;
      return data.id as number;
    }
  }

  const { data, error } = await fromSchema('clientes').insert(payload).select('id').single();
  if (error) throw error;
  return data.id as number;
};

const upsertVehicle = async (vehicle?: VehicleSchema) => {
  const plate = normalizePlate(vehicle?.plate);
  if (!plate) {
    throw new Error('Placa do veículo é obrigatória para salvar o orçamento.');
  }

  const payload = {
    placa: plate,
    marca: vehicle?.brand?.trim() || null,
    modelo: vehicle?.model?.trim() || null,
    ano: vehicle?.year ? Number(vehicle.year) || null : null,
    cor: vehicle?.color?.trim() || null,
    combustivel: vehicle?.fuel?.trim() || null,
    km: vehicle?.km?.trim() || null,
  };

  const { data, error } = await fromSchema('carros').upsert(payload, { onConflict: 'placa' }).select('placa').single();
  if (error) throw error;

  return normalizePlate(data?.placa ?? plate);
};

export async function getServiceOrders(searchValue = '', page = 1, filter: FilterOption = 'vehicle'): Promise<ServiceOrderResponse> {
  const trimmed = searchValue.trim();
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const [matchingCustomerIds, matchingVehiclePlates] = trimmed
    ? await Promise.all([fetchMatchingCustomerIds(trimmed), fetchMatchingVehiclePlates(trimmed)])
    : [[], []];

  let query = fromSchema(ORCAMENTOS_TABLE).select('*', { count: 'exact' });

  if (trimmed) {
    const conditions = [...BASE_SEARCH_COLUMNS.map((column) => `${column}.ilike.%${trimmed}%`)];

    if (filter === 'customer' && matchingCustomerIds.length > 0) {
      conditions.push(`cliente_id.in.(${matchingCustomerIds.join(',')})`);
    }

    if (filter === 'vehicle' && matchingVehiclePlates.length > 0) {
      conditions.push(`placa.in.(${matchingVehiclePlates.map(formatInClauseValue).join(',')})`);
    }

    query = query.or(conditions.join(','));
  }

  const { data, count, error } = await query.range(from, to).order('data_criacao', { ascending: false });
  if (error) throw error;

  const orders = (data ?? []) as OrcamentoRow[];
  const customerIds = Array.from(new Set(orders.map((order) => order.cliente_id).filter((id): id is number => id !== null)));
  const orderIds = Array.from(new Set(orders.map((order) => order.id).filter((id): id is number => Number.isFinite(id))));
  const plates = Array.from(new Set(orders.map((order) => normalizePlate(order.placa)).filter(Boolean)));

  const [customersMap, vehiclesMap, itemsMap, paymentsMap] = await Promise.all([
    loadCustomersMap(customerIds),
    loadVehiclesMap(plates),
    loadItemsByOrderIds(orderIds),
    loadOrcamentoPaymentsByOrderIds(orderIds),
  ]);

  const mappedOrders = orders.map((order) => {
    const customer = order.cliente_id ? customersMap.get(String(order.cliente_id)) : undefined;
    const vehicle = vehiclesMap.get(normalizePlate(order.placa));
    const serviceOrderItems = itemsMap.get(order.id) ?? [];
    const serviceOrderPayments = paymentsMap.get(order.id) ?? [];
    return mapOrderRowToServiceOrder({ order, customer, vehicle, serviceOrderItems, serviceOrderPayments });
  });

  return {
    data: mappedOrders,
    meta: {
      page,
      totalPages: Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE)),
      total: count ?? 0,
    },
  };
}

export async function getServiceOrdersByCustomerId(customerId: string | number): Promise<ServiceOrder[]> {
  const parsedCustomerId = parseNumericId(customerId);
  if (!parsedCustomerId) {
    throw new Error('ID do cliente invalido para carregar orcamentos.');
  }

  const { data, error } = await fromSchema(ORCAMENTOS_TABLE)
    .select('*')
    .eq('cliente_id', parsedCustomerId)
    .order('data_criacao', { ascending: false });

  if (error) throw error;

  const orders = (data ?? []) as OrcamentoRow[];
  if (!orders.length) {
    return [];
  }

  const plates = Array.from(new Set(orders.map((order) => normalizePlate(order.placa)).filter(Boolean)));
  const orderIds = Array.from(new Set(orders.map((order) => order.id).filter((id): id is number => Number.isFinite(id))));
  const [customersMap, vehiclesMap, itemsMap, paymentsMap] = await Promise.all([
    loadCustomersMap([parsedCustomerId]),
    loadVehiclesMap(plates),
    loadItemsByOrderIds(orderIds),
    loadOrcamentoPaymentsByOrderIds(orderIds),
  ]);

  return orders.map((order) => {
    const customer = customersMap.get(String(order.cliente_id ?? parsedCustomerId));
    const vehicle = vehiclesMap.get(normalizePlate(order.placa));
    const serviceOrderItems = itemsMap.get(order.id) ?? [];
    const serviceOrderPayments = paymentsMap.get(order.id) ?? [];
    return mapOrderRowToServiceOrder({ order, customer, vehicle, serviceOrderItems, serviceOrderPayments });
  });
}

export async function getServiceOrderById(id: string | number): Promise<ServiceOrder> {
  const parsedId = parseNumericId(id);
  if (!parsedId) {
    throw new Error('ID do orçamento inválido.');
  }

  const { data: order, error: orderError } = await fromSchema(ORCAMENTOS_TABLE).select('*').eq('id', parsedId).single();
  if (orderError) throw orderError;

  const [customerResult, vehicleResult, items, payments] = await Promise.all([
    order.cliente_id
      ? fromSchema('clientes').select('*').eq('id', order.cliente_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    fromSchema('carros').select('*').eq('placa', order.placa).maybeSingle(),
    loadOrcamentoItems(parsedId),
    loadOrcamentoPayments(parsedId),
  ]);

  if (customerResult.error) throw customerResult.error;
  if (vehicleResult.error) throw vehicleResult.error;

  return mapOrderRowToServiceOrder({
    order: order as OrcamentoRow,
    customer: customerResult.data ?? undefined,
    vehicle: vehicleResult.data ?? undefined,
    serviceOrderItems: items,
    serviceOrderPayments: payments,
  });
}

export async function updateServiceOrderStatus(
  id: string | number,
  status: STATUS_SERVICE_ORDER,
): Promise<ServiceOrder> {
  const parsedId = parseNumericId(id);
  if (!parsedId) {
    throw new Error('ID do orçamento inválido para atualizar status.');
  }

  const isValidStatus = Object.values(STATUS_SERVICE_ORDER).includes(status);
  if (!isValidStatus) {
    throw new Error('Status de orçamento inválido.');
  }

  const { error } = await fromSchema(ORCAMENTOS_TABLE)
    .update({ status })
    .eq('id', parsedId);

  if (error) throw error;

  return getServiceOrderById(parsedId);
}

export async function saveServiceOrder(serviceOrder: ServiceOrder): Promise<ServiceOrder> {
  const customerId = await upsertCustomer(serviceOrder.customer);
  const vehiclePlate = await upsertVehicle(serviceOrder.vehicle);

  const payload: Partial<OrcamentoRow> = {
    descricao: serviceOrder.note?.trim() || null,
    placa: vehiclePlate,
    status: serviceOrder.status,
    cliente_id: customerId,
    data_entrada: normalizeDateTime(serviceOrder.startAt),
    data_saida: normalizeDateTime(serviceOrder.endAt),
    observacao: serviceOrder.note?.trim() || null,
    comentario_cliente: serviceOrder.note?.trim() || null,
  };

  const parsedId = parseNumericId(serviceOrder.id ?? serviceOrder.uuid);

  const { data: savedOrder, error } = parsedId
    ? await fromSchema(ORCAMENTOS_TABLE).update(payload).eq('id', parsedId).select('id, empresa_id').single()
    : await fromSchema(ORCAMENTOS_TABLE).insert(payload).select('id, empresa_id').single();

  if (error) throw error;

  const orderId = savedOrder.id as number;
  await syncOrcamentoItems(orderId, serviceOrder.service_order_items || []);
  await syncOrcamentoPayments(orderId, serviceOrder.service_order_payments || [], savedOrder.empresa_id);

  return getServiceOrderById(orderId);
}
