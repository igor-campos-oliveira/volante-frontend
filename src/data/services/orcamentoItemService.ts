import { supabase, supabaseSchema } from '@/data/api/config';
import { ServiceOrderItem } from '@/pages/ServiceOrderNew/types';

const ORCAMENTO_ITEMS_TABLE = 'itens_orcamento' as const;

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

const fromSchema = (tableName: string) => supabase.schema(supabaseSchema).from(tableName);

const parseNumericId = (value?: string | number | null) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const mapRowToServiceOrderItem = (row: OrcamentoItemRow): ServiceOrderItem => {
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

export async function loadOrcamentoItems(orcamentoId: number): Promise<ServiceOrderItem[]> {
  const { data, error } = await fromSchema(ORCAMENTO_ITEMS_TABLE)
    .select('*')
    .eq('orcamento_id', orcamentoId)
    .order('id', { ascending: false });

  if (error) throw error;

  return ((data ?? []) as OrcamentoItemRow[]).map(mapRowToServiceOrderItem);
}

export async function deleteOrcamentoItem(itemId: string | number) {
  const parsedId = parseNumericId(itemId);
  if (!parsedId) return;

  const { error } = await fromSchema(ORCAMENTO_ITEMS_TABLE).delete().eq('id', parsedId);
  if (error) throw error;
}

export async function syncOrcamentoItems(
  orcamentoId: number,
  incomingItems: ServiceOrderItem[] = [],
): Promise<ServiceOrderItem[]> {
  const { data: existingRows, error: existingError } = await fromSchema(ORCAMENTO_ITEMS_TABLE)
    .select('id')
    .eq('orcamento_id', orcamentoId);

  if (existingError) throw existingError;

  const normalizedItems = incomingItems.map((item) => {
    const parsedId = parseNumericId(item.uuid);
    const quantity = toNumber(item.quantity, 1);
    const value = toNumber(item.value, 0);
    const discount = toNumber(item.discount, 0);

    return {
      ...(parsedId ? { id: parsedId } : {}),
      descricao: item.description?.trim() || null,
      tipo: item.type || null,
      valor: value,
      quantidade: quantity,
      observacao: null,
      desconto: discount,
      orcamento_id: orcamentoId,
    };
  });

  if (normalizedItems.length > 0) {
    const { error: upsertError } = await fromSchema(ORCAMENTO_ITEMS_TABLE).upsert(normalizedItems, {
      onConflict: 'id',
    });
    if (upsertError) throw upsertError;
  }

  const currentIds = new Set(
    normalizedItems
      .map((item) => parseNumericId(item.id))
      .filter((id): id is number => id !== undefined),
  );

  const removedIds = ((existingRows ?? []) as Array<{ id: number }>).map((row) => row.id).filter((id) => !currentIds.has(id));

  if (removedIds.length > 0) {
    const { error: deleteError } = await fromSchema(ORCAMENTO_ITEMS_TABLE).delete().in('id', removedIds);
    if (deleteError) throw deleteError;
  }

  return loadOrcamentoItems(orcamentoId);
}
