/**
 * Servicio específico para gestión de actividades por categoría
 * @module services/activityService
 */

import { 
  MovimientoInternacion, 
  ActividadReciente, 
  TipoActividad, 
  ACTIVITY_ICONS,
  ApiResponse,
  DEFAULT_CONFIG 
} from '../types/dashboard';
import { FALLBACK_MOVIMIENTOS, FALLBACK_ACTIVIDADES } from '../utils/fallbackData';

/**
 * Servicio base para actividades
 */
class ActivityService {
  protected baseUrl: string;
  protected timeout: number;

  constructor() {
    this.baseUrl = DEFAULT_CONFIG.baseUrl;
    this.timeout = DEFAULT_CONFIG.timeout;
  }

  /**
   * Realiza una petición HTTP con timeout
   */
  protected async fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Convierte fecha y hora a formato legible
   */
  protected formatearTiempo(fecha?: string): string {
    if (!fecha) return '--:--';
    
    try {
      return new Date(fecha).toLocaleTimeString('es-AR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return '--:--';
    }
  }

  /**
   * Obtiene el icono apropiado para un tipo de actividad
   */
  protected obtenerIcono(tipo: TipoActividad, subtipo: string = 'default'): string {
    return ACTIVITY_ICONS[tipo]?.[subtipo] || ACTIVITY_ICONS.general.default;
  }
}

/**
 * Servicio para actividades de internación
 */
export class InternacionActivityService extends ActivityService {
  private endpoint: string;

  constructor() {
    super();
    this.endpoint = `${this.baseUrl}${DEFAULT_CONFIG.visitaMovimientos}`;
  }

  /**
   * Obtiene movimientos de internación desde la API
   */
  async obtenerMovimientos(limite: number = 10): Promise<MovimientoInternacion[]> {
    try {
      const response = await this.fetchWithTimeout(`${this.endpoint}/recientes?limite=${limite}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: ApiResponse<MovimientoInternacion[]> = await response.json();
      
      if (!result.success) {
        throw new Error(result.mensaje || 'Error al obtener movimientos recientes');
      }

      return result.data || [];
    } catch (error) {
      console.error('Error al obtener movimientos de internación:', error);
      return FALLBACK_MOVIMIENTOS.slice(0, limite);
    }
  }

  /**
   * Convierte movimientos a actividades recientes
   */
  convertirAActividades(movimientos: MovimientoInternacion[]): ActividadReciente[] {
    return movimientos.map((movimiento) => {
      const fecha = movimiento.FechaAdmisionFormateada || movimiento.FechaEgresoFormateada;
      const time = this.formatearTiempo(fecha);
      const isIngreso = movimiento.TipoMovimiento === 'Ingreso';
      
      return {
        time,
        action: isIngreso ? 'Ingreso de paciente' : 'Alta médica',
        details: `${movimiento.ApellidoyNombre} - ${movimiento.ValorHabitacionCama} (${movimiento.SectorDescripcion})`,
        icon: this.obtenerIcono('internacion', isIngreso ? 'ingreso' : 'egreso'),
        tipo: 'internacion' as const,
        prioridad: 'alta' as const,
        sector: movimiento.SectorDescripcion
      };
    });
  }

  /**
   * Obtiene actividades de internación
   */
  async obtenerActividades(limite: number = 5): Promise<ActividadReciente[]> {
    try {
      const movimientos = await this.obtenerMovimientos(limite);
      return this.convertirAActividades(movimientos);
    } catch (error) {
      console.error('Error al obtener actividades de internación:', error);
      return FALLBACK_ACTIVIDADES.internacion.slice(0, limite);
    }
  }
}

/**
 * Servicio para actividades de camas - DESHABILITADO
 */
export class CamasActivityService extends ActivityService {
  async obtenerActividades(limite: number = 5): Promise<ActividadReciente[]> {
    // Servicio deshabilitado - no hay endpoint disponible
    return [];
  }
}

/**
 * Servicio para actividades de cirugía - DESHABILITADO
 */
export class CirugiaActivityService extends ActivityService {
  async obtenerActividades(limite: number = 5): Promise<ActividadReciente[]> {
    // Servicio deshabilitado - no hay endpoint disponible
    return [];
  }
}

/**
 * Servicio para actividades de citas
 */
export class CitasActivityService extends ActivityService {
  async obtenerActividades(limite: number = 5): Promise<ActividadReciente[]> {
    // TODO: Implementar cuando esté disponible el endpoint de citas
    return FALLBACK_ACTIVIDADES.citas.slice(0, limite);
  }
}

/**
 * Servicio para actividades de laboratorio
 */
export class LaboratorioActivityService extends ActivityService {
  async obtenerActividades(limite: number = 5): Promise<ActividadReciente[]> {
    // TODO: Implementar cuando esté disponible el endpoint de laboratorio
    return FALLBACK_ACTIVIDADES.laboratorio.slice(0, limite);
  }
}

// Instancias de servicios
export const internacionService = new InternacionActivityService();
export const camasService = new CamasActivityService();
export const cirugiaService = new CirugiaActivityService();
export const citasService = new CitasActivityService();
export const laboratorioService = new LaboratorioActivityService();
