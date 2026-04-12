import { supabase, supabaseSchema } from './config';

export const getSupplierAPI = async (searchValue = '', page = 1) => {
  const pageSize = 10;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase.schema(supabaseSchema).from('suppliers').select('*', { count: 'exact' });

  if (searchValue.trim()) {
    query = query.or(
      `name.ilike.%${searchValue}%,cnpj.ilike.%${searchValue}%,phone.ilike.%${searchValue}%,email.ilike.%${searchValue}%`,
    );
  }

  const { data, count, error } = await query.range(from, to).order('name', { ascending: true });

  if (error) throw error;

  return {
    data: data ?? [],
    meta: {
      page,
      totalItems: count ?? 0,
      totalPages: Math.max(1, Math.ceil((count ?? 0) / pageSize)),
    },
  };
};
