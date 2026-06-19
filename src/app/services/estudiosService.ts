import { apiFetch } from '@/app/utils/authFetch';
import { PedidoEstudio } from '@/app/types/estudios';

const estudiosService = {
  async listarPorVisita(numeroVisita: number): Promise<PedidoEstudio[]> {
    try {
      const res = await apiFetch(`/estudios/visita/${numeroVisita}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) return [];

      const json = await res.json();
      if (!json?.success) return [];
      return Array.isArray(json.data) ? json.data : [];
    } catch (e) {
      console.error('Error obteniendo pedidos de estudios:', e);
      return [];
    }
  },

  async obtenerPorId(idPedido: number): Promise<PedidoEstudio | null> {
    try {
      const res = await apiFetch(`/estudios/${idPedido}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json?.success ? json.data : null;
    } catch (e) {
      console.error('Error obteniendo detalle de estudio:', e);
      return null;
    }
  },
};

export default estudiosService;
