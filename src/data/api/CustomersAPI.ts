import { supabase } from "./config";

export interface Costumer {
  id?: string;
  nome: string;
  telefone: string;
  email?: string;
  endereco?: string;
  numero_documento?: string;
  tipo_documento?: "cpf" | "cnpj" | "rg";
  createdAt?: string;
  updatedAt?: string;
}

export const getCostomersAPI = async (searchValue = '', page = 1) => {
  try {
    const pageSize = 10;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase.from('clientes').select('*', { count: 'exact' });

    if (searchValue.trim()) {
      query = query.or(`nome.ilike.%${searchValue}%,email.ilike.%${searchValue}%,telefone.ilike.%${searchValue}% cpf.ilike.%${searchValue}%,endereco.ilike.%${searchValue}%`);
    }

    const { data, count, error } = await query
      .range(from, to)
      .order('nome', { ascending: true });

    if (error) throw error;

    const totalPages = Math.ceil((count || 0) / pageSize);

    return {
      data: data || [],
      meta: {
        page,
        totalPages,
        total: count || 0
      }
    };
  } catch (error) {
    console.error('Erro ao buscar clientes:', error);
    throw error;
  }
}

// POST - Criar novo funcionário
export async function createEmployee(costumer: Costumer) {
  try {
    const { data, error } = await supabase
      .from('clientes')
      .insert([costumer])
      .select()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Erro ao criar cliente:', error)
    throw error
  }
}

// PUT - Atualizar funcionário
export async function updateEmployee(id: string, costumer: Partial<Costumer>) {
  try {
    const { data, error } = await supabase
      .from('clientes')
      .update(costumer)
      .eq('id', id)
      .select()

    if (error) throw error
    return data
  } catch (error) {
    console.error(`Erro ao atualizar cliente ${id}:`, error)
    throw error
  }
}

// DELETE - Deletar funcionário
export async function deleteCostumer(id: string) {
  try {
    const { error } = await supabase
      .from('clientes')
      .delete()
      .eq('id', id)

    if (error) throw error
  } catch (error) {
    console.error(`Erro ao deletar cliente ${id}:`, error)
    throw error
  }
}