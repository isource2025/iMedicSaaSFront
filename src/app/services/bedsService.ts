import { Bed } from "../types/beds";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

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
      fechaIngreso: item.FechaIngreso,
      fechaEgreso: item.FechaEgreso,
      numeroVisita: item.NumeroVisita,
      observaciones: item.Observaciones
    }));
  }
};

const parseEstado = (valor: string): 'ocupada' | 'disponible' | 'mantenimiento' => {
  switch (valor) {
    case 'O': return 'ocupada';
    case 'U': return 'disponible';
    case 'M': return 'mantenimiento';
    default: return 'disponible';
  }
};
