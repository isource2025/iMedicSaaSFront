import { EstudioProgramado, EstudiosProgramadosResponse } from "../types/estudios";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const estudiosService = {
  getEstudiosProgramadosPorVisita: async (numeroVisita: number): Promise<EstudioProgramado[]> => {
    try {
      const res = await fetch(`${BASE_URL}/estudios/visita/${numeroVisita}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        return [];
      }

      const json: EstudiosProgramadosResponse = await res.json();
      if (!json?.success) return [];
      return Array.isArray(json.data) ? json.data : [];
    } catch (e) {
      console.error('Error obteniendo estudios programados:', e);
      return [];
    }
  }
};

export default estudiosService;
