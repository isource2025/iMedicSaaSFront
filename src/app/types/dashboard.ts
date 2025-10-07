/**
 * Tipos e interfaces para el dashboard
 * @module types/dashboard
 */

// Tipos base para movimientos de internación
export interface MovimientoInternacion {
  NumeroVisita: number;
  FechaAdmision: number;
  HoraAdmision: number;
  FechaEgreso?: number;
  HoraEgreso?: number;
  ValorHabitacionCama: string;
  ValorSector: string;
  EstadoCama: string;
  IDPaciente: number;
  ApellidoyNombre: string;
  NumeroDocumento: string;
  SectorDescripcion: string;
  TipoMovimiento: 'Ingreso' | 'Egreso' | 'Movimiento de cama';
  FechaAdmisionFormateada?: string;
  FechaEgresoFormateada?: string;
  HoraAdmisionFormateada?: string;
  HoraEgresoFormateada?: string;
}

// Tipos para diferentes categorías de actividad
export type TipoActividad = 'internacion' | 'cirugia' | 'camas' | 'citas' | 'laboratorio' | 'general';

export interface ActividadReciente {
  time: string;
  action: string;
  details: string;
  icon: string;
  tipo: TipoActividad;
  prioridad?: 'alta' | 'media' | 'baja';
  sector?: string;
}

// Configuración de iconos por tipo de actividad
export interface IconConfig {
  [key: string]: string;
}

export const ACTIVITY_ICONS: Record<TipoActividad, IconConfig> = {
  internacion: {
    ingreso: '↗',
    egreso: '↙',
    traslado: '⇄'
  },
  cirugia: {
    programacion: '◐',
    inicio: '●',
    finalizacion: '◉'
  },
  camas: {
    cambio: '⇅',
    limpieza: '○',
    mantenimiento: '◆'
  },
  citas: {
    programada: '■',
    cancelada: '✕',
    reprogramada: '↻'
  },
  laboratorio: {
    muestra: '◈',
    resultado: '▣',
    urgente: '▲'
  },
  general: {
    default: '▪',
    notificacion: '●',
    alerta: '▲'
  }
};

// Respuesta estándar de la API
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  count?: number;
  mensaje?: string;
  error?: string;
  timestamp: string;
}

// Configuración de endpoints
export interface EndpointConfig {
  baseUrl: string;
  visitaMovimientos: string;
  timeout: number;
}

// Configuración por defecto
export const DEFAULT_CONFIG: EndpointConfig = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  visitaMovimientos: '/visita-movimientos',
  timeout: 10000
};
