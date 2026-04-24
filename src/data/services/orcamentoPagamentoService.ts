import { supabase, supabaseSchema } from '@/data/api/config';
import {
  SERVICE_ORDER_PAYMENT_METHOD_OPTIONS,
  ServiceOrderPayment,
  ServiceOrderPaymentMethod,
} from '@/pages/ServiceOrderNew/types';

const ORCAMENTO_PAYMENTS_TABLE = 'pagamentos_orcamento' as const;

interface OrcamentoPaymentRow {
  id: number;
  forma_pagamento: string | null;
  numero_parcela: number | string | null;
  total_parcelas: number | string | null;
  orcamento_id: number | null;
  empresa_id?: string | null;
}

const fromSchema = (tableName: string) => supabase.schema(supabaseSchema).from(tableName);
const SERVICE_ORDER_PAYMENT_METHOD_SET = new Set<string>(SERVICE_ORDER_PAYMENT_METHOD_OPTIONS);

const parseNumericId = (value?: string | number | null) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

const parsePositiveNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const normalizePaymentMethod = (value: unknown): ServiceOrderPaymentMethod | '' => {
  const normalizedValue = String(value ?? '').trim();
  return SERVICE_ORDER_PAYMENT_METHOD_SET.has(normalizedValue)
    ? (normalizedValue as ServiceOrderPaymentMethod)
    : '';
};

const hasPaymentData = (payment?: ServiceOrderPayment) => Boolean(normalizePaymentMethod(payment?.payment_method));

const mapRowToServiceOrderPayment = (row: OrcamentoPaymentRow): ServiceOrderPayment => ({
  uuid: String(row.id),
  payment_method: normalizePaymentMethod(row.forma_pagamento),
  installment_number: parsePositiveNumber(row.numero_parcela) ?? 1,
  installments_total: parsePositiveNumber(row.total_parcelas) ?? 1,
});

export async function loadOrcamentoPayments(orcamentoId: number): Promise<ServiceOrderPayment[]> {
  const { data, error } = await fromSchema(ORCAMENTO_PAYMENTS_TABLE)
    .select('*')
    .eq('orcamento_id', orcamentoId)
    .order('id', { ascending: true });

  if (error) throw error;

  return ((data ?? []) as OrcamentoPaymentRow[]).map(mapRowToServiceOrderPayment);
}

export async function syncOrcamentoPayments(
  orcamentoId: number,
  incomingPayments: ServiceOrderPayment[] = [],
  empresaId?: string | null,
): Promise<ServiceOrderPayment[]> {
  const { data: existingRows, error: existingError } = await fromSchema(ORCAMENTO_PAYMENTS_TABLE)
    .select('id')
    .eq('orcamento_id', orcamentoId);

  if (existingError) throw existingError;

  const normalizedPayments = incomingPayments
    .filter(hasPaymentData)
    .map((payment) => {
      const parsedId = parseNumericId(payment.uuid);
      const paymentMethod = normalizePaymentMethod(payment.payment_method);
      const normalizedPayment = {
        ...(parsedId ? { id: parsedId } : {}),
        forma_pagamento: paymentMethod || null,
        numero_parcela: parsePositiveNumber(payment.installment_number),
        total_parcelas: parsePositiveNumber(payment.installments_total),
        orcamento_id: orcamentoId,
        ...(empresaId ? { empresa_id: empresaId } : {}),
      };

      return normalizedPayment;
    });

  if (normalizedPayments.length > 0) {
    const { error: upsertError } = await fromSchema(ORCAMENTO_PAYMENTS_TABLE).upsert(normalizedPayments, {
      onConflict: 'id',
    });
    if (upsertError) throw upsertError;
  }

  const currentIds = new Set(
    normalizedPayments
      .map((payment) => parseNumericId(payment.id))
      .filter((id): id is number => id !== undefined),
  );

  const removedIds = ((existingRows ?? []) as Array<{ id: number }>)
    .map((row) => row.id)
    .filter((id) => !currentIds.has(id));

  if (removedIds.length > 0) {
    const { error: deleteError } = await fromSchema(ORCAMENTO_PAYMENTS_TABLE).delete().in('id', removedIds);
    if (deleteError) throw deleteError;
  }

  return loadOrcamentoPayments(orcamentoId);
}
