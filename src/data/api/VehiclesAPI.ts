import { supabase } from "./config";

export interface Vehicle {
  id?: string | number;
  placa?: string;
  cor?: string;
  marca?: string;
  modelo?: string;
  ano?: number;
  combustivel?: string;
  km?: string;
  chassi?: string;
  data_criacao?: string;
  updatedAt?: string;
}

interface VehicleRow {
  id?: string | number;
  placa?: string;
  cor?: string;
  marca?: string;
  modelo?: string;
  ano?: number;
  combustivel?: string;
  km?: string;
  chassi?: string;
  data_criacao?: string;
}

export const getVehiclesAPI = async (searchValue = "", page = 1) => {
  try {
    const pageSize = 10;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase.from("carros").select("*", { count: "exact" });

    if (searchValue.trim()) {
      query = query.or(
        `placa.ilike.%${searchValue}%,cor.ilike.%${searchValue}%,marca.ilike.%${searchValue}%,modelo.ilike.%${searchValue}%`
      );
    }

    const { data, count, error } = await query
      .range(from, to)
      .order("placa", { ascending: true });

    if (error) throw error;

    const totalPages = Math.ceil((count || 0) / pageSize);

    const normalizedData: Vehicle[] =
      (data as VehicleRow[] | null)?.map((vehicle) => ({
        ...vehicle,
        updatedAt: vehicle?.data_criacao,
      })) || [];

    return {
      data: normalizedData,
      meta: {
        page,
        totalPages,
        total: count || 0,
      },
    };
  } catch (error) {
    console.error("Erro ao buscar veiculos:", error);
    throw error;
  }
};

// POST - Criar novo veiculo
export async function createVehicle(vehicle: Partial<Vehicle>) {
  try {
    const { data, error } = await supabase
      .from("carros")
      .insert([vehicle])
      .select();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Erro ao criar veiculo:", error);
    throw error;
  }
}

// PUT - Atualizar veiculo
export async function updateVehicle(id: string | number, vehicle: Partial<Vehicle>) {
  try {
    const { data, error } = await supabase
      .from("carros")
      .update(vehicle)
      .eq("id", id)
      .select();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error(`Erro ao atualizar veiculo ${id}:`, error);
    throw error;
  }
}

// DELETE - Deletar veiculo
export async function deleteVehicle(id: string | number) {
  try {
    const { error } = await supabase.from("carros").delete().eq("id", id);

    if (error) throw error;
  } catch (error) {
    console.error(`Erro ao deletar veiculo ${id}:`, error);
    throw error;
  }
}

// Aliases legados para evitar quebra em imports antigos.
export const createEmployee = createVehicle;
export const deleteEmployee = deleteVehicle;
