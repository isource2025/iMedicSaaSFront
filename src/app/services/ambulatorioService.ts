import axiosInstance from './axios';
import type {
  AnaliticaAmbulatorio,
  FiltrosAmbulatorio,
  ResumenAmbulatorioHoy,
} from '../types/ambulatorio';
import { GRACIA_MIN_DEFAULT } from '../types/ambulatorio';

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

/**
 * Cache en memoria con TTL. La analítica ambulatoria recorre imTurnos completa,
 * así que conviene no repetir la consulta cuando el usuario alterna entre tabs
 * de rango ya visitados.
 */
class DataCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000;

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
    return `${prefix}:${sorted}`;
  }
}

const cache = new DataCache();

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

function paramsDeFiltros(filtros: FiltrosAmbulatorio) {
  const params: Record<string, string | number> = {
    fechaInicio: filtros.fechaInicio,
    fechaFin: filtros.fechaFin,
    graciaMin: filtros.graciaMin ?? GRACIA_MIN_DEFAULT,
  };
  if (filtros.sector) params.sector = filtros.sector;
  if (filtros.profesional) params.profesional = filtros.profesional;
  if (filtros.especialidad) params.especialidad = filtros.especialidad;
  return params;
}

/**
 * Analítica ambulatoria completa del período. Un único request: el backend
 * devuelve resumen, series y rankings ya agregados.
 */
export const obtenerAnaliticaAmbulatoria = async (
  filtros: FiltrosAmbulatorio,
): Promise<AnaliticaAmbulatorio> => {
  const params = paramsDeFiltros(filtros);
  const cacheKey = cache.generateKey('ambulatorio', params);

  const cached = cache.get<AnaliticaAmbulatorio>(cacheKey);
  if (cached) return cached;

  const res = await axiosInstance.get<ApiResponse<AnaliticaAmbulatorio>>('/indicadores/ambulatorio', {
    params,
    timeout: 60000,
  });

  if (!res.data?.success || !res.data.data) {
    throw new Error(res.data?.message || 'Respuesta inválida al obtener la analítica ambulatoria');
  }

  cache.set(cacheKey, res.data.data);
  return res.data.data;
};

/**
 * Resumen del día para la card del panel. A diferencia del endpoint completo,
 * los errores no se tragan: la card decide si muestra un estado degradado.
 */
export const obtenerResumenAmbulatorioHoy = async (
  graciaMin: number = GRACIA_MIN_DEFAULT,
): Promise<ResumenAmbulatorioHoy> => {
  const res = await axiosInstance.get<ApiResponse<ResumenAmbulatorioHoy>>(
    '/indicadores/ambulatorio/resumen-hoy',
    { params: { graciaMin }, timeout: 30000 },
  );

  if (!res.data?.success || !res.data.data) {
    throw new Error(res.data?.message || 'Respuesta inválida al obtener el resumen ambulatorio');
  }

  return res.data.data;
};

export const limpiarCacheAmbulatorio = (): void => cache.clear();

export const ambulatorioService = {
  obtenerAnaliticaAmbulatoria,
  obtenerResumenAmbulatorioHoy,
  limpiarCacheAmbulatorio,
};

export default ambulatorioService;
