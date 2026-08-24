import { apiService } from './axios';

export interface NotificacionItem {
  IdNotificacion: number;
  ValorPersonal: number;
  TipoNotificacion?: string;
  DescNotificacion?: string;
  EntidadTipo?: string;
  EntidadId?: number | null;
  Leida?: boolean | number;
  DatosJSON?: Record<string, unknown> | null;
  FechaCarga?: string;
}

function paramsUser(userId: number) {
  return { params: { userId } };
}

function apiErrorMessage(e: unknown, fallback: string): string {
  const err = e as { response?: { data?: { error?: string } }; message?: string };
  const fromApi = err?.response?.data?.error;
  if (fromApi) return fromApi;
  const msg = String(err?.message || '');
  if (/status code 5\d\d/i.test(msg) || /server error/i.test(msg)) {
    return fallback;
  }
  return msg || fallback;
}

export const notificacionesService = {
  async getUnreadCount(userId: number): Promise<number> {
    try {
      const res = await apiService.get<{ success: boolean; count: number }>(
        '/notificaciones/unread-count',
        paramsUser(userId)
      );
      return res.data?.count ?? 0;
    } catch {
      return 0;
    }
  },

  async listar(
    userId: number,
    opts?: { page?: number; limit?: number; soloNoLeidas?: boolean }
  ): Promise<{ data: NotificacionItem[]; pagination: { total: number; page: number; limit: number } }> {
    const page = opts?.page ?? 1;
    const limit = opts?.limit ?? 30;
    const soloNoLeidas = opts?.soloNoLeidas ? '1' : '0';
    let res;
    try {
      res = await apiService.get<{
        success: boolean;
        data: NotificacionItem[];
        pagination: { total: number; page: number; limit: number };
        error?: string;
      }>('/notificaciones', {
        params: { userId, page, limit, soloNoLeidas },
      });
    } catch (e) {
      throw new Error(apiErrorMessage(e, 'No se pudieron cargar las notificaciones'));
    }
    if (!res.data?.success) {
      throw new Error(res.data?.error || 'Error al listar notificaciones');
    }
    return {
      data: Array.isArray(res.data.data) ? res.data.data : [],
      pagination: res.data.pagination ?? { total: 0, page, limit },
    };
  },

  async marcarLeida(userId: number, idNotificacion: number): Promise<void> {
    await apiService.put(`/notificaciones/${idNotificacion}/read`, {}, {
      params: { userId },
    });
  },

  async marcarTodasLeidas(userId: number): Promise<void> {
    await apiService.put('/notificaciones/mark-all-read', {}, {
      params: { userId },
    });
  },
};
