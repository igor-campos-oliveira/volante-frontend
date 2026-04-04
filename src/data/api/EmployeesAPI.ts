import { api } from "./config";
import { supabase } from "./config";

export interface Employee {
  id?: string;
  nome: string;
  cargo: string;
  telefone: string;
  cpf?: string;
}

export const getEmployeesAPI = async (searchValue = '', page = 1) => {
  try {
    const pageSize = 10;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase.from('funcionarios').select('*', { count: 'exact' });

    if (searchValue.trim()) {
      query = query.or(`nome.ilike.%${searchValue}%,cargo.ilike.%${searchValue}%,telefone.ilike.%${searchValue}% cpf.ilike.%${searchValue}%`);
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
    console.error('Erro ao buscar funcionários:', error);
    throw error;
  }
}

// POST - Criar novo funcionário
export async function createEmployee(employee: Employee) {
  try {
    const { data, error } = await supabase
      .from('funcionarios')
      .insert([employee])
      .select()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Erro ao criar funcionário:', error)
    throw error
  }
}

// PUT - Atualizar funcionário
export async function updateEmployee(id: string, employee: Partial<Employee>) {
  try {
    const { data, error } = await supabase
      .from('funcionarios')
      .update(employee)
      .eq('id', id)
      .select()

    if (error) throw error
    return data
  } catch (error) {
    console.error(`Erro ao atualizar funcionário ${id}:`, error)
    throw error
  }
}

// DELETE - Deletar funcionário
export async function deleteEmployee(id: string) {
  try {
    const { error } = await supabase
      .from('funcionarios')
      .delete()
      .eq('id', id)

    if (error) throw error
  } catch (error) {
    console.error(`Erro ao deletar funcionário ${id}:`, error)
    throw error
  }
}
