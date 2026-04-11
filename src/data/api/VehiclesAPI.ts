import { supabase } from "./config";

export interface Vehicle {
  id?: string;
  placa?: string;
  cor?: string;
  marca?: string;
  modelo?: string;
  ano?: number;
  combustivel?: string;
  updatedAt: string;
}

export const getVehiclesAPI = async (searchValue = '', page = 1) => {
  try {
    const pageSize = 10;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase.from('carros').select('*', { count: 'exact' });

    if (searchValue.trim()) {
      query = query.or(`placa.ilike.%${searchValue}%,cor.ilike.%${searchValue}%,marca.ilike.%${searchValue}%,modelo.ilike.%${searchValue}%`);
    }

    const { data, count, error } = await query
      .range(from, to)
      .order('placa', { ascending: true });

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
    console.error('Erro ao buscar veículos:', error);
    throw error;
  }
}

// POST - Criar novo funcionário
export async function createEmployee(vehicles: Vehicle) {
  try {
    const { data, error } = await supabase
      .from('carros')
      .insert([vehicles])
      .select()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Erro ao criar funcionário:', error)
    throw error
  }
}

// PUT - Atualizar funcionário
export async function updateVehicle(id: string, vehicle: Partial<Vehicle>) {
  try {
    const { data, error } = await supabase
      .from('carros')
      .update(vehicle)
      .eq('id', id)
      .select()

    if (error) throw error
    return data
  } catch (error) {
    console.error(`Erro ao atualizar veículo ${id}:`, error)
    throw error
  }
}

// DELETE - Deletar veículo
export async function deleteEmployee(id: string) {
  try {
    const { error } = await supabase
      .from('carros')
      .delete()
      .eq('id', id)

    if (error) throw error
  } catch (error) {
    console.error(`Erro ao deletar veículo ${id}:`, error)
    throw error
  }
}