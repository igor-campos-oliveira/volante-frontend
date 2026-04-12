import { supabase, supabaseSchema } from './config';

export const getCatalogAPI = async (searchValue = '', page = 1) => {
  const pageSize = 10;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase.schema(supabaseSchema).from('catalog').select('*', { count: 'exact' });

  if (searchValue.trim()) {
    query = query.or(`description.ilike.%${searchValue}%,sku.ilike.%${searchValue}%`);
  }

  const { data, count, error } = await query.range(from, to).order('description', { ascending: true });

  if (error) throw error;

  return {
    data: data ?? [],
    page,
    totalItems: count ?? 0,
    totalPages: Math.max(1, Math.ceil((count ?? 0) / pageSize)),
  };
};
