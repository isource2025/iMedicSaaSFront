import { apiFetch } from '@/app/utils/authFetch';
import type { PedidoEstudio, TipoPedidoEstudio } from '@/app/types/estudios';
import type {
  ActualizarSolicitudEstudiosPayload,
  CrearSolicitudEstudiosPayload,
  CumplirSolicitudPayload,
  SolicitudEstudio,
} from '@/app/types/solicitudesEstudios';
import estudiosService, { type BandejaConteo } from '@/app/services/estudiosService';
import { setCachedBandejaCount } from '@/app/utils/serviciosReceptorCache';

const BASE = '/solicitudes-estudios';
const JSON_HEADERS = { 'Content-Type': 'application/json' };

type Envelope<T> = { success?: boolean; data?: T; mensaje?: string };

async function parseJson<T>(res: Response): Promise<Envelope<T> | null> {
  try {
    return (await res.json()) as Envelope<T>;
  } catch {
    return null;
  }
}

async function request<T>(path: string, init: RequestInit, errorPorDefecto: string): Promise<T> {
  const res = await apiFetch(`${BASE}${path}`, { headers: JSON_HEADERS, ...init });
  const json = await parseJson<T>(res);
  if (!res.ok || !json?.success || json.data === undefined || json.data === null) {
    throw new Error(json?.mensaje || errorPorDefecto);
  }
  return json.data;
}

function body(payload: unknown): string {
  return JSON.stringify(payload ?? {});
}

/** Pedido suelto (sin cabecera) visto como una solicitud de una sola práctica. */
export function solicitudDesdePedido(p: PedidoEstudio): SolicitudEstudio {
  const cumplido = !!(p.Cumplido || Number(p.IdProtocolo) > 0);
  return {
    ...p,
    Clave: -p.IdPedido,
    IdSolicitud: null,
    Legacy: true,
    Estado: cumplido ? 'CUMPLIDA' : p.Tomado ? 'TOMADA' : 'PENDIENTE',
    TotalItems: 1,
    ItemsCumplidos: cumplido ? 1 : 0,
    ItemsTomados: p.Tomado ? 1 : 0,
    TomadoPor: p.NombreToma ?? null,
    MatriculaToma: p.MatriculaToma ?? null,
    FechaToma: p.FechaToma ?? null,
    Items: [p],
  };
}

/**
 * Pedido de varios estudios juntos al mismo servicio: una cabecera y una fila de pedido por
 * práctica, en una sola transacción y con una sola notificación al servicio destino.
 */
const solicitudesEstudiosService = {
  async listarPorVisita(numeroVisita: number): Promise<SolicitudEstudio[]> {
    return request<SolicitudEstudio[]>(
      `/visita/${numeroVisita}`,
      { method: 'GET' },
      'No se pudieron cargar los estudios',
    );
  },

  /** Igual que listarPorVisita, pero si el circuito agrupado falla muestra los pedidos sueltos. */
  async listarPorVisitaConRespaldo(numeroVisita: number): Promise<SolicitudEstudio[]> {
    try {
      return await solicitudesEstudiosService.listarPorVisita(numeroVisita);
    } catch (e) {
      console.warn('Solicitudes agrupadas no disponibles, se listan pedidos sueltos:', e);
      const pedidos = await estudiosService.listarPorVisita(numeroVisita);
      return pedidos.map(solicitudDesdePedido);
    }
  },

  async listarPendientes(
    sector: string,
    opts?: { limit?: number; paciente?: string; fechaDesde?: string; fechaHasta?: string },
  ): Promise<SolicitudEstudio[]> {
    const q = new URLSearchParams({ limit: String(opts?.limit ?? 100) });
    if (sector.trim()) q.set('sector', sector.trim());
    if (opts?.paciente?.trim()) q.set('paciente', opts.paciente.trim());
    if (opts?.fechaDesde?.trim()) q.set('fechaDesde', opts.fechaDesde.trim());
    if (opts?.fechaHasta?.trim()) q.set('fechaHasta', opts.fechaHasta.trim());
    return request<SolicitudEstudio[]>(
      `/pendientes?${q}`,
      { method: 'GET' },
      'No se pudieron cargar los pendientes',
    );
  },

  async obtener(clave: number): Promise<SolicitudEstudio | null> {
    try {
      return await request<SolicitudEstudio>(`/${clave}`, { method: 'GET' }, '');
    } catch {
      return null;
    }
  },

  async crear(payload: CrearSolicitudEstudiosPayload): Promise<{ idSolicitud: number }> {
    return request<{ idSolicitud: number }>(
      '',
      { method: 'POST', body: body(payload) },
      'No se pudo crear la solicitud',
    );
  },

  async actualizar(
    clave: number,
    payload: ActualizarSolicitudEstudiosPayload,
  ): Promise<SolicitudEstudio> {
    return request<SolicitudEstudio>(
      `/${clave}`,
      { method: 'PUT', body: body(payload) },
      'No se pudo actualizar la solicitud',
    );
  },

  async eliminar(clave: number): Promise<void> {
    await request<unknown>(`/${clave}`, { method: 'DELETE' }, 'No se pudo eliminar la solicitud');
  },

  async tomar(clave: number): Promise<SolicitudEstudio> {
    return request<SolicitudEstudio>(
      `/${clave}/tomar`,
      { method: 'POST', body: body({}) },
      'No se pudo tomar la solicitud',
    );
  },

  async liberar(clave: number): Promise<SolicitudEstudio> {
    return request<SolicitudEstudio>(
      `/${clave}/liberar`,
      { method: 'POST', body: body({}) },
      'No se pudo liberar la solicitud',
    );
  },

  async cumplir(clave: number, payload: CumplirSolicitudPayload): Promise<SolicitudEstudio> {
    return request<SolicitudEstudio>(
      `/${clave}/cumplir`,
      { method: 'POST', body: body(payload) },
      'No se pudo cumplir la solicitud',
    );
  },

  /** Catálogo limitado a los prefijos de práctica del servicio. */
  async buscarTipos(q: string, limit: number, servicio: string): Promise<TipoPedidoEstudio[]> {
    const params = new URLSearchParams({ q, limit: String(limit), servicio: servicio.trim() });
    try {
      return await request<TipoPedidoEstudio[]>(`/tipos/buscar?${params}`, { method: 'GET' }, '');
    } catch {
      return [];
    }
  },

  /**
   * Conteo de la bandeja con los estudios contados por SOLICITUD (no por práctica).
   * Interconsultas siguen saliendo del circuito de siempre.
   */
  async contarLibresBandeja(opts?: { soloMios?: boolean; lanzarError?: boolean }): Promise<BandejaConteo> {
    const qs = opts?.soloMios ? '?soloMios=1' : '';
    const solicitudesReq = apiFetch(`${BASE}/pendientes/conteo${qs}`, {
      method: 'GET',
      headers: JSON_HEADERS,
    });
    solicitudesReq.catch(() => undefined);
    const base = await estudiosService.contarLibres(opts);
    if (!base.porServicio.length) return base;
    try {
      const res = await solicitudesReq;
      const json = await parseJson<{
        solicitudes?: number;
        porServicio?: { valor: string; solicitudes?: number; urgentes?: number }[];
      }>(res);
      if (!res.ok || !json?.success || !json.data) {
        if (opts?.lanzarError) throw new Error('conteo solicitudes');
        return base;
      }
      const porValor = new Map(
        (json.data.porServicio || []).map((s) => [
          String(s.valor || '').trim(),
          { solicitudes: Number(s.solicitudes) || 0, urgentes: Number(s.urgentes) || 0 },
        ]),
      );
      const porServicio = base.porServicio.map((s) => {
        const hit = porValor.get(s.valor);
        const estudios = hit?.solicitudes ?? 0;
        const urgentes = (hit?.urgentes ?? 0) + (s.urgentesInterconsultas ?? 0);
        return { ...s, estudios, urgentes, total: estudios + s.interconsultas };
      });
      const merged: BandejaConteo = {
        ...base,
        estudios: porServicio.reduce((n, s) => n + s.estudios, 0),
        urgentes: porServicio.reduce((n, s) => n + s.urgentes, 0),
        porServicio,
      };
      setCachedBandejaCount(merged);
      return merged;
    } catch (err) {
      if (opts?.lanzarError) throw err;
      return base;
    }
  },
};

export default solicitudesEstudiosService;
