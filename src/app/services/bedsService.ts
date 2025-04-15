import { Bed } from "../types/beds";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export const bedsService = {
  getAllBeds: async (): Promise<Bed[]> => {
    const res = await fetch(`${BASE_URL}/beds`);
    const json = await res.json();
    
    if (!json.success) throw new Error('Error en la API de camas');

    return json.data.map((item: any): Bed => ({
      id: `${item.ValorSector}-${item.ValorHabitacionCama}`,
      sector: item.ValorSector,
      numeroCama: item.ValorHabitacionCama,
      estado: parseEstado(item.ValorEstadoCama),
      valorEstadoOriginal: item.ValorEstadoCama, 
      fechaIngreso: item.FechaIngreso,
      fechaEgreso: item.FechaEgreso,
      numeroVisita: item.NumeroVisita,
      observaciones: item.Observaciones
    }));
  },
  
  getBedStates: async (): Promise<{id: string, valor: string, descripcion: string}[]> => {
    try {
      const res = await fetch(`${BASE_URL}/beds/estados`);
      const json = await res.json();
      
      if (!json.success) throw new Error('Error al obtener estados de cama');
      
      return json.data.map((item: any) => ({
        id: item.valor,
        valor: item.valor,
        descripcion: item.descripcion
      }));
    } catch (error) {
      console.error("Error fetching bed states:", error);
      return [];
    }
  }
};

const parseEstado = (valor: string): 'acompañante' | 'aislada' | 'cerrada' | 'desocupada' | 'ocupada' | 'Que haceres domésticos' | 'reparacion' | "disponible" => {
  switch (valor) {
    case 'A': return 'acompañante';
    case 'I': return 'aislada';
    case 'C': return 'cerrada';
    case 'U': return 'desocupada';
    case 'O': return 'ocupada';
    case 'H': return 'Que haceres domésticos';
    case 'R': return 'reparacion';
    default: return 'disponible';
  }
};
