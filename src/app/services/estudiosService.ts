import { apiFetch } from '@/app/utils/authFetch';
import type {
  CrearPedidoEstudioPayload,
  CumplirPedidoPayload,
  PedidoEstudio,
  SectorReceptorEstudio,
  TipoPedidoEstudio,
} from '@/app/types/estudios';

async function parseJson<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

const estudiosService = {
  async listarPorVisita(numeroVisita: number): Promise<PedidoEstudio[]> {
    try {
      const res = await apiFetch(`/estudios/visita/${numeroVisita}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) return [];
      const json = await parseJson<{ success?: boolean; data?: PedidoEstudio[] }>(res);
      if (!json?.success) return [];
      return Array.isArray(json.data) ? json.data : [];
    } catch (e) {
      console.error('Error obteniendo pedidos de estudios:', e);
      return [];
    }
  },

  async listarPendientes(sector: string, limit = 100): Promise<PedidoEstudio[]> {
    const q = new URLSearchParams({
      sector: sector.trim(),
      limit: String(limit),
    });
    const res = await apiFetch(`/estudios/pendientes?${q}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    const json = await parseJson<{ success?: boolean; data?: PedidoEstudio[]; mensaje?: string }>(
      res,
    );
    if (!res.ok || !json?.success) {
      throw new Error(json?.mensaje || 'No se pudieron cargar los pendientes');
    }
    return Array.isArray(json.data) ? json.data : [];
  },

  async obtenerPorId(idPedido: number): Promise<PedidoEstudio | null> {
    try {
      const res = await apiFetch(`/estudios/${idPedido}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) return null;
      const json = await parseJson<{ success?: boolean; data?: PedidoEstudio }>(res);
      return json?.success ? json.data || null : null;
    } catch (e) {
      console.error('Error obteniendo detalle de estudio:', e);
      return null;
    }
  },

  async crear(payload: CrearPedidoEstudioPayload): Promise<{ idPedido: number }> {
    const res = await apiFetch('/estudios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await parseJson<{
      success?: boolean;
      data?: { idPedido: number };
      mensaje?: string;
    }>(res);
    if (!res.ok || !json?.success || !json.data?.idPedido) {
      throw new Error(json?.mensaje || 'No se pudo crear el pedido');
    }
    return json.data;
  },

  async cumplir(
    idPedido: number,
    payload: CumplirPedidoPayload,
  ): Promise<PedidoEstudio> {
    const res = await apiFetch(`/estudios/${idPedido}/cumplir`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await parseJson<{
      success?: boolean;
      data?: PedidoEstudio;
      mensaje?: string;
    }>(res);
    if (!res.ok || !json?.success || !json.data) {
      throw new Error(json?.mensaje || 'No se pudo cumplir el pedido');
    }
    return json.data;
  },

  async tomar(idPedido: number): Promise<PedidoEstudio> {
    const res = await apiFetch(`/estudios/${idPedido}/tomar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const json = await parseJson<{
      success?: boolean;
      data?: PedidoEstudio;
      mensaje?: string;
    }>(res);
    if (!res.ok || !json?.success || !json.data) {
      throw new Error(json?.mensaje || 'No se pudo tomar el pedido');
    }
    return json.data;
  },

  async liberar(idPedido: number): Promise<PedidoEstudio> {
    const res = await apiFetch(`/estudios/${idPedido}/liberar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const json = await parseJson<{
      success?: boolean;
      data?: PedidoEstudio;
      mensaje?: string;
    }>(res);
    if (!res.ok || !json?.success || !json.data) {
      throw new Error(json?.mensaje || 'No se pudo liberar el pedido');
    }
    return json.data;
  },

  async buscarTipos(q: string, limit = 25): Promise<TipoPedidoEstudio[]> {
    const params = new URLSearchParams({ q, limit: String(limit) });
    const res = await apiFetch(`/estudios/tipos/buscar?${params}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) return [];
    const json = await parseJson<{ success?: boolean; data?: TipoPedidoEstudio[] }>(res);
    return Array.isArray(json?.data) ? json.data : [];
  },

  async listarSectoresReceptor(opts?: { soloMios?: boolean }): Promise<SectorReceptorEstudio[]> {
    const qs = opts?.soloMios ? '?soloMios=1' : '';
    const res = await apiFetch(`/estudios/sectores-receptor${qs}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) return [];
    const json = await parseJson<{ success?: boolean; data?: SectorReceptorEstudio[] }>(res);
    return Array.isArray(json?.data) ? json.data : [];
  },
};

export default estudiosService;
