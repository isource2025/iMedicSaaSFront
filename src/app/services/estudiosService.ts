import { PedidoEstudio, PedidosEstudiosResponse } from '../types/estudios';
import { apiFetch } from '@/app/utils/authFetch';

const estudiosService = {
  async listarPorVisita(numeroVisita: number): Promise<PedidoEstudio[]> {
    try {
      const res = await apiFetch(`/estudios/visita/${numeroVisita}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) return [];

      const json: PedidosEstudiosResponse = await res.json();
      if (!json?.success) return [];
      return Array.isArray(json.data) ? json.data : [];
    } catch (e) {
      console.error('Error obteniendo pedidos de estudios:', e);
      return [];
    }
  },
};

export default estudiosService;
