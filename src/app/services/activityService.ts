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
import { formatSqlDate, clarionDateToDate } from '../utils/dateUtils';

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
      const isIngreso = movimiento.TipoMovimiento === 'Ingreso';
      
      // Crear fecha y hora completa combinando fecha Clarion y hora formateada
      let fechaHoraCompleta = '--/--/---- --:--';
      
      if (movimiento.TipoMovimiento === 'Movimiento de cama') {
        // Para movimientos de cama, siempre usar FechaAdmision y HoraAdmisionFormateada
        const fechaDate = clarionDateToDate(movimiento.FechaAdmision);
        const hora = movimiento.HoraAdmisionFormateada || '--:--';
        
        if (fechaDate) {
          const fechaStr = fechaDate.toLocaleDateString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
          // Quitar segundos de la hora (formato HH:MM en lugar de HH:MM:SS)
          const horaSinSegundos = hora && hora.includes(':') ? hora.substring(0, 5) : hora;
          fechaHoraCompleta = `${fechaStr} ${horaSinSegundos}`;
        }
      } else if (isIngreso) {
        // Para ingresos, usar FechaAdmision y HoraAdmisionFormateada
        const fechaDate = clarionDateToDate(movimiento.FechaAdmision);
        const hora = movimiento.HoraAdmisionFormateada || '--:--';
        
        if (fechaDate) {
          const fechaStr = fechaDate.toLocaleDateString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
          // Quitar segundos de la hora (formato HH:MM en lugar de HH:MM:SS)
          const horaSinSegundos = hora && hora.includes(':') ? hora.substring(0, 5) : hora;
          fechaHoraCompleta = `${fechaStr} ${horaSinSegundos}`;
        }
      } else {
        // Para egresos, usar FechaEgreso y HoraEgresoFormateada
        const fechaDate = movimiento.FechaEgresoFormateada ? new Date(movimiento.FechaEgresoFormateada) : null;
        const hora = movimiento.HoraEgresoFormateada || '--:--';
        
        if (fechaDate) {
          const fechaStr = fechaDate.toLocaleDateString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
          // Quitar segundos de la hora (formato HH:MM en lugar de HH:MM:SS)
          const horaSinSegundos = hora && hora.includes(':') ? hora.substring(0, 5) : hora;
          fechaHoraCompleta = `${fechaStr} ${horaSinSegundos}`;
        } else if (movimiento.FechaEgresoFormateada) {
          // Fallback: usar fecha ISO formateada (sin segundos)
          const fechaFormateada = formatSqlDate(movimiento.FechaEgresoFormateada, {
            showDate: true,
            showTime: true,
            showSeconds: false,
            adjustTimezone: false
          });
          fechaHoraCompleta = fechaFormateada;
        }
      }
      
      // Determinar acción e icono según el tipo de movimiento
      let action: string;
      let iconType: string;
      
      if (movimiento.TipoMovimiento === 'Movimiento de cama') {
        action = 'Movimiento de cama';
        iconType = 'traslado';
      } else if (isIngreso) {
        action = 'Ingreso de paciente';
        iconType = 'ingreso';
      } else {
        action = 'Alta médica';
        iconType = 'egreso';
      }
      
      return {
        time: fechaHoraCompleta,
        action,
        details: `${movimiento.ApellidoyNombre} - CAMA ${movimiento.ValorHabitacionCama} (${movimiento.SectorDescripcion})`,
        icon: this.obtenerIcono('internacion', iconType),
        tipo: 'internacion' as const,
        prioridad: 'alta' as const,
        sector: movimiento.SectorDescripcion
      };
    });
  }

  /**
   * Obtiene actividades de internación
   */
  async obtenerActividades(limite: number = 10): Promise<ActividadReciente[]> {
    try {
      const movimientos = await this.obtenerMovimientos(limite);
      const actividades = this.convertirAActividades(movimientos);
      
      // Ordenar por fecha y hora más reciente primero (como backup del ordenamiento del backend)
      return actividades.sort((a, b) => {
        // Extraer fecha y hora para comparación
        const fechaA = this.extraerFechaParaOrdenamiento(a.time);
        const fechaB = this.extraerFechaParaOrdenamiento(b.time);
        
        return fechaB.getTime() - fechaA.getTime(); // Más reciente primero
      });
    } catch (error) {
      console.error('Error al obtener actividades de internación:', error);
      return this.convertirAActividades(FALLBACK_MOVIMIENTOS.slice(0, limite));
    }
  }

  /**
   * Extrae fecha para ordenamiento desde el string de tiempo
   */
  private extraerFechaParaOrdenamiento(timeString: string): Date {
    try {
      // Formato esperado: "DD/MM/YYYY HH:MM:SS" o similar
      if (timeString.includes('/') && timeString.includes(' ')) {
        const [fechaPart, horaPart] = timeString.split(' ');
        const [dia, mes, año] = fechaPart.split('/');
        const [hora, minuto] = horaPart.split(':');
        
        return new Date(
          parseInt(año, 10),
          parseInt(mes, 10) - 1, // Los meses en JS van de 0-11
          parseInt(dia, 10),
          parseInt(hora, 10),
          parseInt(minuto, 10)
        );
      }
    } catch (error) {
      console.error('Error al extraer fecha para ordenamiento:', error);
    }
    
    // Fallback: fecha muy antigua para que aparezca al final
    return new Date(1900, 0, 1);
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
