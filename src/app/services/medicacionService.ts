import { MedicacionActiva, MedicacionActivaResponse } from "../types/medicacion";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const medicacionService = {
  getMedicacionActivaPorVisita: async (numeroVisita: number): Promise<MedicacionActiva[]> => {
    try {
      const res = await fetch(`${BASE_URL}/medicaciones/visita/${numeroVisita}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        // Si el endpoint no existe o falla, devolver vacío para no romper UI
        return [];
      }

      const json: MedicacionActivaResponse = await res.json();
      if (!json?.success) return [];
      return Array.isArray(json.data) ? json.data : [];
    } catch (e) {
      console.error('Error obteniendo medicación activa:', e);
      return [];
    }
  }
};

export default medicacionService;
