import axiosInstance from './axios';
import { resolveTenantCacheId } from '../utils/tenantCache';

// Cache para optimizar las consultas
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

class DataCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutos

  set<T>(key: string, data: T, ttl = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + ttl
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  clear(): void {
    this.cache.clear();
  }

  generateKey(prefix: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    return `${prefix}:emp:${resolveTenantCacheId()}:${sortedParams}`;
  }
}

const cache = new DataCache();

// Datos crudos de ocupación por sector/período
export interface CamasRawData {
  Periodo: string; // 'yyyy-MM'
  ValorSector: string;
  PacientesDia: number;
  TotalCamas: number;
  DiasDelMes: number;
  OcupacionPromedioPct: number;
}

export interface CamasPorFecha {
  fecha: string;
  totalCamas: number;
  ocupadas: number;
  disponibles: number;
  porcentajeOcupacion: number;
}

export interface ResumenCamas {
  totalGeneral: number; // Total de días-cama ocupados
  totalCamasPromedio: number;
  ocupadasPromedio: number;
  disponiblesPromedio: number;
  porcentajeOcupacionPromedio: number;
  /** Días-cama ocupados por sector (distribución del donut) */
  resumenPorSector: Record<string, number>;
  /** Tasa de ocupación % por sector (insights / variabilidad) */
  ocupacionPorSector?: Record<string, number>;
  periodo: {
    fechaInicio: string;
    fechaFin: string;
  };
}

export interface EstadoActualCamas {
  fecha: string;
  totalCamas: number;
  ocupadas: number;
  disponibles: number;
  porcentajeOcupacion: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export const camasIndicadoresService = {
  obtenerDatosCrudos: async (fechaInicio: string, fechaFin: string): Promise<CamasRawData[]> => {
    const cacheKey = cache.generateKey('camas-raw', { fechaInicio, fechaFin });
    const cachedData = cache.get<CamasRawData[]>(cacheKey);
    if (cachedData) return cachedData;

    try {
      const res = await axiosInstance.get<ApiResponse<CamasRawData[]>>('/indicadores/camas', {
        params: { fechaInicio, fechaFin },
        timeout: 30000
      });

      if (res.data.success) {
        const data = res.data.data as CamasRawData[];
        cache.set(cacheKey, data);
        return data;
      }
      throw new Error('Error en la respuesta del servidor al obtener datos de camas');
    } catch (error: any) {
      console.error('❌ Error en obtenerDatosCrudos:', error);
      throw new Error(`Error al obtener datos de camas: ${error.message || 'Error desconocido'}`);
    }
  },

  obtenerResumenCamas: async (fechaInicio: string, fechaFin: string): Promise<ResumenCamas> => {
    const cacheKey = cache.generateKey('resumen-camas', { fechaInicio, fechaFin });
    const cachedData = cache.get<ResumenCamas>(cacheKey);
    if (cachedData) return cachedData;

    try {
      const res = await axiosInstance.get<ApiResponse<ResumenCamas>>('/indicadores/camas/resumen', {
        params: { fechaInicio, fechaFin },
        timeout: 30000
      });

      if (res.data.success) {
        const data = res.data.data as ResumenCamas;
        cache.set(cacheKey, data);
        return data;
      }
      throw new Error('Error en la respuesta del servidor al obtener resumen de camas');
    } catch (error: any) {
      console.error('❌ Error en obtenerResumenCamas:', error);
      throw new Error(`Error al obtener resumen de camas: ${error.message || 'Error desconocido'}`);
    }
  },

  obtenerEstadoActual: async (): Promise<EstadoActualCamas> => {
    const cacheKey = cache.generateKey('estado-actual-camas', {});
    const cachedData = cache.get<EstadoActualCamas>(cacheKey);
    if (cachedData) return cachedData;

    try {
      const res = await axiosInstance.get<ApiResponse<EstadoActualCamas>>('/indicadores/camas/estado-actual', {
        timeout: 15000
      });

      if (res.data.success) {
        const data = res.data.data as EstadoActualCamas;
        cache.set(cacheKey, data, 30000);
        return data;
      }
      throw new Error('Error en la respuesta del servidor al obtener estado actual');
    } catch (error: any) {
      console.error('❌ Error en obtenerEstadoActual:', error);
      throw new Error(`Error al obtener estado actual de camas: ${error.message || 'Error desconocido'}`);
    }
  },

  obtenerIndicadoresPorFecha: async (fechaInicio: string, fechaFin: string): Promise<CamasPorFecha[]> => {
    const cacheKey = cache.generateKey('camas-por-fecha', { fechaInicio, fechaFin });
    const cachedData = cache.get<CamasPorFecha[]>(cacheKey);
    if (cachedData) return cachedData;

    try {
      const res = await axiosInstance.get<ApiResponse<CamasPorFecha[]>>('/indicadores/camas/por-fecha', {
        params: { fechaInicio, fechaFin },
        timeout: 60000
      });

      if (res.data.success) {
        const data = (res.data.data || []) as CamasPorFecha[];
        cache.set(cacheKey, data);
        return data;
      }
      throw new Error('Error en la respuesta del servidor al obtener ocupación por fecha');
    } catch (error: any) {
      console.error('❌ Error al obtener indicadores por fecha:', error);
      throw new Error(`Error al procesar indicadores por fecha: ${error.message || 'Error desconocido'}`);
    }
  },

  clearCache: (): void => {
    cache.clear();
    console.log('🧹 Cache de camas limpiado');
  }
};
