import { apiFetch } from '@/app/utils/authFetch';
import type { TipoPedidoEstudio } from '@/app/types/estudios';
import type { CrearSolicitudEstudiosPayload } from '@/app/types/solicitudesEstudios';

const BASE = '/solicitudes-estudios';
const JSON_HEADERS = { 'Content-Type': 'application/json' };

type Envelope<T> = { success?: boolean; data?: T; mensaje?: string };

async function request<T>(path: string, init: RequestInit, errorPorDefecto: string): Promise<T> {
  const res = await apiFetch(`${BASE}${path}`, { headers: JSON_HEADERS, ...init });
  let json: Envelope<T> | null = null;
  try {
    json = (await res.json()) as Envelope<T>;
  } catch {
    json = null;
  }
  if (!res.ok || !json?.success || json.data === undefined || json.data === null) {
    throw new Error(json?.mensaje || errorPorDefecto);
  }
  return json.data;
}

/**
 * Pedido de varios estudios juntos al mismo servicio: una cabecera y una fila de pedido por
 * práctica, en una sola transacción y con una sola notificación al servicio destino.
 */
const solicitudesEstudiosService = {
  async crear(payload: CrearSolicitudEstudiosPayload): Promise<{ idSolicitud: number }> {
    return request<{ idSolicitud: number }>(
      '',
      { method: 'POST', body: JSON.stringify(payload) },
      'No se pudo crear la solicitud',
    );
  },

  /** Catálogo de estudios limitado a los prefijos de práctica del servicio. */
  async buscarTipos(q: string, limit: number, servicio: string): Promise<TipoPedidoEstudio[]> {
    const params = new URLSearchParams({ q, limit: String(limit), servicio: servicio.trim() });
    try {
      return await request<TipoPedidoEstudio[]>(`/tipos/buscar?${params}`, { method: 'GET' }, '');
    } catch {
      return [];
    }
  },
};

export default solicitudesEstudiosService;
