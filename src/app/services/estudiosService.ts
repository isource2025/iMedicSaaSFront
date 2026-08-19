import { apiFetch } from '@/app/utils/authFetch';
import type {
  ActualizarPedidoEstudioPayload,
  CrearPedidoEstudioPayload,
  CumplirPedidoPayload,
  PedidoEstudio,
  SectorReceptorEstudio,
  TipoPedidoEstudio,
} from '@/app/types/estudios';
import {
  peekCachedBandejaCount,
  peekCachedSectoresReceptor,
  SERVICIOS_RECEPTOR_FRESH_MS,
  setCachedBandejaCount,
  setCachedSectoresReceptor,
} from '@/app/utils/serviciosReceptorCache';

async function parseJson<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export type BandejaServicioConteo = {
  valor: string;
  descripcion: string;
  estudios: number;
  interconsultas: number;
  urgentes: number;
  total: number;
};

export type BandejaConteo = {
  estudios: number;
  interconsultas: number;
  urgentes: number;
  porServicio: BandejaServicioConteo[];
};

const sectoresInflight = new Map<string, Promise<SectorReceptorEstudio[]>>();
const conteoInflight = new Map<string, Promise<BandejaConteo>>();

async function fetchSectoresReceptor(soloMios: boolean): Promise<SectorReceptorEstudio[]> {
  const key = soloMios ? 'mios' : 'all';
  const pending = sectoresInflight.get(key);
  if (pending) return pending;
  const job = (async () => {
    const qs = soloMios ? '?soloMios=1' : '';
    const res = await apiFetch(`/estudios/sectores-receptor${qs}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      return peekCachedSectoresReceptor({ soloMios, allowStale: true }) ?? [];
    }
    const json = await parseJson<{ success?: boolean; data?: SectorReceptorEstudio[] }>(res);
    const list = Array.isArray(json?.data) ? json.data : [];
    setCachedSectoresReceptor(list, { soloMios });
    return list;
  })().finally(() => {
    sectoresInflight.delete(key);
  });
  sectoresInflight.set(key, job);
  return job;
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

  async listarPendientes(
    sector: string,
    opts?: { limit?: number; paciente?: string; fechaDesde?: string; fechaHasta?: string },
  ): Promise<PedidoEstudio[]> {
    const q = new URLSearchParams({
      sector: sector.trim(),
      limit: String(opts?.limit ?? 100),
    });
    if (opts?.paciente?.trim()) q.set('paciente', opts.paciente.trim());
    if (opts?.fechaDesde?.trim()) q.set('fechaDesde', opts.fechaDesde.trim());
    if (opts?.fechaHasta?.trim()) q.set('fechaHasta', opts.fechaHasta.trim());
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

  async actualizar(
    idPedido: number,
    payload: ActualizarPedidoEstudioPayload,
  ): Promise<PedidoEstudio> {
    const res = await apiFetch(`/estudios/${idPedido}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await parseJson<{
      success?: boolean;
      data?: PedidoEstudio;
      mensaje?: string;
    }>(res);
    if (!res.ok || !json?.success || !json.data) {
      throw new Error(json?.mensaje || 'No se pudo actualizar el pedido');
    }
    return json.data;
  },

  async eliminar(idPedido: number): Promise<void> {
    const res = await apiFetch(`/estudios/${idPedido}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });
    const json = await parseJson<{ success?: boolean; mensaje?: string }>(res);
    if (!res.ok || !json?.success) {
      throw new Error(json?.mensaje || 'No se pudo eliminar el pedido');
    }
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

  async listarSectoresReceptor(opts?: {
    soloMios?: boolean;
    force?: boolean;
  }): Promise<SectorReceptorEstudio[]> {
    const soloMios = Boolean(opts?.soloMios);
    const force = Boolean(opts?.force);
    if (!force) {
      const fresh = peekCachedSectoresReceptor({ soloMios, maxAgeMs: SERVICIOS_RECEPTOR_FRESH_MS });
      if (fresh !== null) return fresh;
      const stale = peekCachedSectoresReceptor({ soloMios, allowStale: true });
      if (stale !== null) {
        void fetchSectoresReceptor(soloMios);
        return stale;
      }
    }
    return fetchSectoresReceptor(soloMios);
  },

  async contarLibres(opts?: { soloMios?: boolean }): Promise<BandejaConteo> {
    const soloMios = Boolean(opts?.soloMios);
    const key = soloMios ? 'mios' : 'all';
    const pending = conteoInflight.get(key);
    if (pending) return pending;
    const job = (async () => {
      const qs = soloMios ? '?soloMios=1' : '';
      try {
        const res = await apiFetch(`/estudios/pendientes/conteo${qs}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) throw new Error('conteo');
        const json = await parseJson<{
          success?: boolean;
          data?: {
            estudios?: number;
            interconsultas?: number;
            urgentes?: number;
            porServicio?: BandejaServicioConteo[];
          };
        }>(res);
        const porServicio = Array.isArray(json?.data?.porServicio)
          ? json.data.porServicio.map((s) => ({
              valor: String(s.valor || '').trim(),
              descripcion: String(s.descripcion || s.valor || '').trim(),
              estudios: Number(s.estudios) || 0,
              interconsultas: Number(s.interconsultas) || 0,
              urgentes: Number(s.urgentes) || 0,
              total: Number(s.total) || Number(s.estudios) + Number(s.interconsultas) || 0,
            }))
          : [];
        const data: BandejaConteo = {
          estudios: Number(json?.data?.estudios) || 0,
          interconsultas: Number(json?.data?.interconsultas) || 0,
          urgentes: Number(json?.data?.urgentes) || 0,
          porServicio,
        };
        setCachedBandejaCount(data);
        return data;
      } catch {
        const cached = peekCachedBandejaCount();
        return {
          estudios: cached?.estudios || 0,
          interconsultas: cached?.interconsultas || 0,
          urgentes: 0,
          porServicio: [],
        };
      }
    })().finally(() => {
      conteoInflight.delete(key);
    });
    conteoInflight.set(key, job);
    return job;
  },
};

export default estudiosService;
