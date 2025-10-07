/**
 * Servicio principal del dashboard - Orquestador de actividades
 * @module services/dashboardService
 */

import { ActividadReciente, TipoActividad } from '../types/dashboard';
import { obtenerActividadesFallback } from '../utils/fallbackData';
import {
  internacionService,
  camasService,
  cirugiaService,
  citasService,
  laboratorioService,
  generalService
} from './activityService';

/**
 * Configuración de servicios por tipo de actividad
 */
const ACTIVITY_SERVICES = {
  internacion: internacionService,
  camas: camasService,
  cirugia: cirugiaService,
  citas: citasService,
  laboratorio: laboratorioService,
  general: generalService
} as const;

/**
 * Obtiene actividades por tipo específico
 * @param tipo - Tipo de actividad a obtener
 * @param limite - Número máximo de registros
 * @returns Promise con las actividades del tipo especificado
 */
export const obtenerActividadesPorTipo = async (
  tipo: TipoActividad, 
  limite: number = 5
): Promise<ActividadReciente[]> => {
  try {
    const service = ACTIVITY_SERVICES[tipo];
    if (!service) {
      console.warn(`Servicio no encontrado para tipo: ${tipo}`);
      return [];
    }
    
    return await service.obtenerActividades(limite);
  } catch (error) {
    console.error(`Error al obtener actividades de tipo ${tipo}:`, error);
    return [];
  }
};

/**
 * Obtiene actividades de múltiples tipos
 * @param tipos - Array de tipos de actividad
 * @param limitePorTipo - Límite de registros por tipo
 * @returns Promise con actividades combinadas
 */
export const obtenerActividadesMultiples = async (
  tipos: TipoActividad[], 
  limitePorTipo: number = 2
): Promise<ActividadReciente[]> => {
  try {
    const promesas = tipos.map(tipo => obtenerActividadesPorTipo(tipo, limitePorTipo));
    const resultados = await Promise.allSettled(promesas);
    
    const actividades: ActividadReciente[] = [];
    
    resultados.forEach((resultado, index) => {
      if (resultado.status === 'fulfilled') {
        actividades.push(...resultado.value);
      } else {
        console.error(`Error en tipo ${tipos[index]}:`, resultado.reason);
      }
    });
    
    // Ordenar por tiempo (más reciente primero)
    return actividades.sort((a, b) => b.time.localeCompare(a.time));
  } catch (error) {
    console.error('Error al obtener actividades múltiples:', error);
    return [];
  }
};

/**
 * Configuraciones predefinidas de tipos de actividad para diferentes vistas
 */
export const DASHBOARD_CONFIGS = {
  principal: ['internacion'] as TipoActividad[],
  completo: ['internacion', 'citas', 'laboratorio'] as TipoActividad[],
  internacion: ['internacion'] as TipoActividad[],
  operaciones: [] as TipoActividad[]
} as const;

/**
 * Obtiene actividades usando una configuración predefinida
 * @param config - Nombre de la configuración a usar
 * @param limitePorTipo - Límite de registros por tipo
 * @returns Promise con actividades de la configuración especificada
 */
export const obtenerActividadesPorConfig = async (
  config: keyof typeof DASHBOARD_CONFIGS,
  limitePorTipo: number = 2
): Promise<ActividadReciente[]> => {
  const tipos = DASHBOARD_CONFIGS[config];
  return obtenerActividadesMultiples(tipos, limitePorTipo);
};

/**
 * Función principal para obtener actividad reciente del dashboard
 * @param limite - Número total máximo de actividades
 * @param config - Configuración de tipos a incluir (default: 'principal')
 * @returns Promise con las actividades recientes
 */
export const obtenerActividadReciente = async (
  limite: number = 8,
  config: keyof typeof DASHBOARD_CONFIGS = 'principal'
): Promise<ActividadReciente[]> => {
  try {
    const limitePorTipo = Math.ceil(limite / DASHBOARD_CONFIGS[config].length);
    const actividades = await obtenerActividadesPorConfig(config, limitePorTipo);
    
    // Limitar el número total y ordenar por prioridad y tiempo
    return actividades
      .sort((a, b) => {
        // Primero por prioridad
        const prioridadOrder = { alta: 3, media: 2, baja: 1 };
        const prioridadA = prioridadOrder[a.prioridad || 'baja'];
        const prioridadB = prioridadOrder[b.prioridad || 'baja'];
        
        if (prioridadA !== prioridadB) {
          return prioridadB - prioridadA;
        }
        
        // Luego por tiempo (más reciente primero)
        return b.time.localeCompare(a.time);
      })
      .slice(0, limite);
      
  } catch (error) {
    console.error('Error al obtener actividad reciente:', error);
    return obtenerActividadesFallback(limite);
  }
};

// Exportaciones principales
export {
  internacionService,
  camasService,
  cirugiaService,
  citasService,
  laboratorioService
} from './activityService';

// Re-exportar tipos para facilitar importaciones
export type { ActividadReciente, MovimientoInternacion, TipoActividad } from '../types/dashboard';
export { ACTIVITY_ICONS } from '../types/dashboard';

export default {
  obtenerActividadReciente,
  obtenerActividadesPorTipo,
  obtenerActividadesMultiples,
  obtenerActividadesPorConfig,
  DASHBOARD_CONFIGS
};
