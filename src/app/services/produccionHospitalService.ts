import axiosInstance from './axios';
import type {
  AnaliticaProduccion,
  FiltrosProduccion,
  OpcionesProduccion,
  ResumenProduccionMes,
} from '../types/produccionHospital';
import { resolveTenantCacheId } from '../utils/tenantCache';

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

/**
 * Cache en memoria con TTL. Alternar el tilde "sólo valorizadas" o volver a un
 * rango ya visto no debería repetir una consulta que recorre un año de prácticas.
 */
class DataCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private readonly DEFAULT_TTL = 3 * 60 * 1000;

  set<T>(key: string, data: T, ttl = this.DEFAULT_TTL): void {
    this.cache.set(key, { data, expiry: Date.now() + ttl });
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

  generateKey(prefix: string, params: Record<string, unknown>): string {
    const sorted = Object.keys(params)
      .sort()
      .map((k) => `${k}:${params[k] ?? ''}`)
      .join('|');
    return `${prefix}:emp:${resolveTenantCacheId()}:${sorted}`;
  }
}

const cache = new DataCache();

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

/** Sólo viajan los filtros con valor; las listas van como `a,b,c`. */
function paramsDeFiltros(filtros: FiltrosProduccion): Record<string, string | boolean> {
  const params: Record<string, string | boolean> = {
    fechaInicio: filtros.fechaInicio,
    fechaFin: filtros.fechaFin,
    soloValorizadas: filtros.soloValorizadas,
  };
  if (filtros.liquidacion !== 'todas') params.liquidacion = filtros.liquidacion;

  const listas = [
    'coberturas',
    'profesionales',
    'especialidades',
    'servicios',
    'sectores',
    'clases',
    'funciones',
    'rendiciones',
  ] as const;
  for (const nombre of listas) {
    const valores = filtros[nombre];
    if (valores.length) params[nombre] = [...valores].sort().join(',');
  }
  return params;
}

/** Analítica completa del período. Un único request con KPIs, serie y rankings. */
export const obtenerProduccionHospital = async (
  filtros: FiltrosProduccion,
  opts: { signal?: AbortSignal } = {},
): Promise<AnaliticaProduccion> => {
  const params = paramsDeFiltros(filtros);
  const cacheKey = cache.generateKey('produccion', params);

  const cached = cache.get<AnaliticaProduccion>(cacheKey);
  if (cached) return cached;

  const res = await axiosInstance.get<ApiResponse<AnaliticaProduccion>>('/indicadores/produccion', {
    params,
    timeout: 120000,
    signal: opts.signal,
  });

  if (!res.data?.success || !res.data.data) {
    throw new Error(res.data?.message || 'Respuesta inválida al obtener la producción del hospital');
  }

  cache.set(cacheKey, res.data.data);
  return res.data.data;
};

/** Catálogos de los selectores. Coberturas y profesionales dependen del rango. */
export const obtenerOpcionesProduccion = async (
  fechaInicio: string,
  fechaFin: string,
): Promise<OpcionesProduccion> => {
  const params = { fechaInicio, fechaFin };
  const cacheKey = cache.generateKey('produccion-opciones', params);

  const cached = cache.get<OpcionesProduccion>(cacheKey);
  if (cached) return cached;

  const res = await axiosInstance.get<ApiResponse<OpcionesProduccion>>('/indicadores/produccion/opciones', {
    params,
    timeout: 60000,
  });

  if (!res.data?.success || !res.data.data) {
    throw new Error(res.data?.message || 'Respuesta inválida al obtener las opciones de filtro');
  }

  cache.set(cacheKey, res.data.data, 10 * 60 * 1000);
  return res.data.data;
};

/** Resumen del mes para la card del panel. Los errores no se tragan: la card decide. */
export const obtenerResumenProduccionMes = async (): Promise<ResumenProduccionMes> => {
  const res = await axiosInstance.get<ApiResponse<ResumenProduccionMes>>(
    '/indicadores/produccion/resumen-mes',
    { timeout: 60000 },
  );

  if (!res.data?.success || !res.data.data) {
    throw new Error(res.data?.message || 'Respuesta inválida al obtener el resumen de producción');
  }

  return res.data.data;
};

export const limpiarCacheProduccion = (): void => cache.clear();

export const produccionHospitalService = {
  obtenerProduccionHospital,
  obtenerOpcionesProduccion,
  obtenerResumenProduccionMes,
  limpiarCacheProduccion,
};

export default produccionHospitalService;
