import { EstadoAmbulatorio } from '../types/estadoAmbulatorio.types';
import { apiFetch } from '@/app/utils/authFetch';

function normalizeEstados(payload: unknown): EstadoAmbulatorio[] {
  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { data?: unknown })?.data)
      ? ((payload as { data: unknown[] }).data)
      : [];

  return rows
    .map((item) => {
      const row = item as Record<string, unknown>;
      const valor = String(row.Valor ?? row.valor ?? '').trim();
      const descripcion = String(row.Descripcion ?? row.descripcion ?? '').trim();
      if (!valor && !descripcion) return null;
      return { Valor: valor, Descripcion: descripcion };
    })
    .filter((item): item is EstadoAmbulatorio => item != null);
}

class EstadoAmbulatorioService {
  private apiUrl: string;

  constructor() {
    this.apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
  }

  /**
   * Obtiene todos los estados ambulatorios desde imEstadoAmbulatorio
   */
  async getEstadosAmbulatorios(): Promise<EstadoAmbulatorio[]> {
    try {
      // Preferir catálogo (mismo patrón que disposiciones-egreso)
      let response = await apiFetch(`${this.apiUrl}/catalogs/estados-ambulatorios`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      });

      if (!response.ok) {
        response = await apiFetch(`${this.apiUrl}/estados-ambulatorios`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
        });
      }

      if (!response.ok) {
        throw new Error('Error al obtener los estados ambulatorios');
      }

      const data = await response.json();
      return normalizeEstados(data);
    } catch (error) {
      console.error('Error en el servicio de estados ambulatorios:', error);
      return [];
    }
  }

  /**
   * Obtiene un estado ambulatorio por su valor
   */
  async getEstadoAmbulatorio(valor: string): Promise<EstadoAmbulatorio | null> {
    try {
      const response = await apiFetch(`${this.apiUrl}/estados-ambulatorios/${valor}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`Error al obtener el estado ambulatorio con valor ${valor}`);
      }

      const data = await response.json();
      const list = normalizeEstados([data]);
      return list[0] || null;
    } catch (error) {
      console.error('Error en el servicio de estados ambulatorios:', error);
      return null;
    }
  }

  async createEstadoAmbulatorio(estadoAmbulatorio: EstadoAmbulatorio): Promise<EstadoAmbulatorio | null> {
    try {
      const response = await apiFetch(`${this.apiUrl}/estados-ambulatorios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          valor: estadoAmbulatorio.Valor,
          descripcion: estadoAmbulatorio.Descripcion,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error((errorData as { error?: string }).error || 'Error al crear el estado ambulatorio');
      }

      const data = await response.json();
      return normalizeEstados([data])[0] || null;
    } catch (error: unknown) {
      console.error('Error en el servicio de estados ambulatorios:', error);
      throw new Error(error instanceof Error ? error.message : 'Error al crear el estado ambulatorio');
    }
  }

  async updateEstadoAmbulatorio(valor: string, descripcion: string): Promise<EstadoAmbulatorio | null> {
    try {
      const response = await apiFetch(`${this.apiUrl}/estados-ambulatorios/${valor}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descripcion }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          (errorData as { error?: string }).error ||
            `Error al actualizar el estado ambulatorio con valor ${valor}`,
        );
      }

      const data = await response.json();
      return normalizeEstados([data])[0] || null;
    } catch (error: unknown) {
      console.error('Error en el servicio de estados ambulatorios:', error);
      throw new Error(
        error instanceof Error
          ? error.message
          : `Error al actualizar el estado ambulatorio con valor ${valor}`,
      );
    }
  }

  async deleteEstadoAmbulatorio(valor: string): Promise<boolean> {
    try {
      const response = await apiFetch(`${this.apiUrl}/estados-ambulatorios/${valor}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          (errorData as { error?: string }).error ||
            `Error al eliminar el estado ambulatorio con valor ${valor}`,
        );
      }

      return true;
    } catch (error: unknown) {
      console.error('Error en el servicio de estados ambulatorios:', error);
      throw new Error(
        error instanceof Error
          ? error.message
          : `Error al eliminar el estado ambulatorio con valor ${valor}`,
      );
    }
  }
}

class EstadoAmbulatorioServiceExport {
  private service: EstadoAmbulatorioService;

  constructor() {
    this.service = new EstadoAmbulatorioService();
  }

  getEstadosAmbulatorios = () => this.service.getEstadosAmbulatorios();
  getEstadoAmbulatorio = (valor: string) => this.service.getEstadoAmbulatorio(valor);
  createEstadoAmbulatorio = (estadoAmbulatorio: EstadoAmbulatorio) =>
    this.service.createEstadoAmbulatorio(estadoAmbulatorio);
  updateEstadoAmbulatorio = (valor: string, descripcion: string) =>
    this.service.updateEstadoAmbulatorio(valor, descripcion);
  deleteEstadoAmbulatorio = (valor: string) => this.service.deleteEstadoAmbulatorio(valor);
}

const estadoAmbulatorioService = new EstadoAmbulatorioServiceExport();
export const {
  getEstadosAmbulatorios,
  getEstadoAmbulatorio,
  createEstadoAmbulatorio,
  updateEstadoAmbulatorio,
  deleteEstadoAmbulatorio,
} = estadoAmbulatorioService;

export default estadoAmbulatorioService;
