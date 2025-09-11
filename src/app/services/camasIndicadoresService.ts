import axiosInstance from './axios';

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
    return `${prefix}:${sortedParams}`;
  }
}

const cache = new DataCache();

// Datos crudos de la función SQL
export interface CamasRawData {
  Periodo: string; // 'yyyy-MM'
  ValorSector: string;
  PacientesDia: number;
  TotalCamas: number;
  DiasDelMes: number;
  OcupacionPromedioPct: number;
}

// Datos procesados por fecha (similar a indicadoresPorFecha)
export interface CamasPorFecha {
  fecha: string; // ISO string del primer día del mes
  totalCamas: number;
  ocupadas: number;
  disponibles: number;
  porcentajeOcupacion: number;
}

// Resumen similar a patients analytics
export interface ResumenCamas {
  totalGeneral: number; // Total de camas-día ocupadas
  totalCamasPromedio: number;
  ocupadasPromedio: number;
  disponiblesPromedio: number;
  porcentajeOcupacionPromedio: number;
  resumenPorSector: Record<string, number>; // Similar a resumenPorClase
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

// Datos de fallback para desarrollo y casos de error
// PacientesDia representa el promedio diario de camas ocupadas (no el total del período)
const FALLBACK_CAMAS_DATA: CamasRawData[] = [
  {
    Periodo: '2024-01',
    ValorSector: 'MEDICINA INTERNA',
    PacientesDia: 27, // 27 camas ocupadas en promedio por día
    TotalCamas: 30,
    DiasDelMes: 31,
    OcupacionPromedioPct: 90.0
  },
  {
    Periodo: '2024-01',
    ValorSector: 'CIRUGIA',
    PacientesDia: 23, // 23 camas ocupadas en promedio por día
    TotalCamas: 25,
    DiasDelMes: 31,
    OcupacionPromedioPct: 92.0
  },
  {
    Periodo: '2024-01',
    ValorSector: 'PEDIATRIA',
    PacientesDia: 15, // 15 camas ocupadas en promedio por día
    TotalCamas: 20,
    DiasDelMes: 31,
    OcupacionPromedioPct: 75.0
  },
  {
    Periodo: '2024-02',
    ValorSector: 'MEDICINA INTERNA',
    PacientesDia: 28, // 28 camas ocupadas en promedio por día
    TotalCamas: 30,
    DiasDelMes: 29,
    OcupacionPromedioPct: 93.3
  },
  {
    Periodo: '2024-02',
    ValorSector: 'CIRUGIA',
    PacientesDia: 24, // 24 camas ocupadas en promedio por día
    TotalCamas: 25,
    DiasDelMes: 29,
    OcupacionPromedioPct: 96.0
  },
  {
    Periodo: '2024-02',
    ValorSector: 'PEDIATRIA',
    PacientesDia: 15, // 15 camas ocupadas en promedio por día
    TotalCamas: 20,
    DiasDelMes: 29,
    OcupacionPromedioPct: 75.0
  }
];

const FALLBACK_ESTADO_ACTUAL: EstadoActualCamas = {
  fecha: new Date().toISOString(),
  totalCamas: 75,
  ocupadas: 68,
  disponibles: 7,
  porcentajeOcupacion: 90.7
};

export const camasIndicadoresService = {
  // Obtener datos crudos de la función SQL con cache
  obtenerDatosCrudos: async (fechaInicio: string, fechaFin: string): Promise<CamasRawData[]> => {
    const cacheKey = cache.generateKey('camas-raw', { fechaInicio, fechaFin });
    
    // Verificar cache primero
    const cachedData = cache.get<CamasRawData[]>(cacheKey);
    if (cachedData) {
      console.log('💾 Datos obtenidos del cache:', { fechaInicio, fechaFin });
      return cachedData;
    }

    try {
      console.log('🔍 Solicitando datos de camas:', { fechaInicio, fechaFin });
      const res = await axiosInstance.get<ApiResponse<CamasRawData[]>>('/indicadores/camas', {
        params: { fechaInicio, fechaFin },
        timeout: 30000 // Aumentado a 30 segundos
      });
      console.log('✅ Respuesta recibida:', res.data);
      
      if (res.data.success) {
        const data = res.data.data as CamasRawData[];
        // Guardar en cache por 5 minutos
        cache.set(cacheKey, data);
        return data;
      }
      throw new Error('Error en la respuesta del servidor al obtener datos de camas');
    } catch (error: any) {
      console.error('❌ Error en obtenerDatosCrudos:', error);
      console.warn('🔄 Usando datos de fallback para camas');
      
      if (error.code === 'ECONNABORTED') {
        console.warn('⏰ Timeout - Usando datos de ejemplo');
      }
      
      // Guardar fallback en cache por menos tiempo (1 minuto)
      cache.set(cacheKey, FALLBACK_CAMAS_DATA, 60000);
      return FALLBACK_CAMAS_DATA;
    }
  },

  // Procesar datos por fecha (similar a indicadoresPorFecha) con memoización
  obtenerCamasPorFecha: async (fechaInicio: string, fechaFin: string): Promise<CamasPorFecha[]> => {
    const cacheKey = cache.generateKey('camas-por-fecha', { fechaInicio, fechaFin });
    
    // Verificar cache primero
    const cachedData = cache.get<CamasPorFecha[]>(cacheKey);
    if (cachedData) {
      console.log('💾 Datos por fecha obtenidos del cache');
      return cachedData;
    }

    const datosCrudos = await camasIndicadoresService.obtenerDatosCrudos(fechaInicio, fechaFin);
    
    // Agrupar por período y sumar todos los sectores
    const porPeriodo = datosCrudos.reduce((acc, item) => {
      const periodo = item.Periodo;
      if (!acc[periodo]) {
        acc[periodo] = {
          totalCamas: 0,
          pacientesDiaTotal: 0,
          sectores: 0
        };
      }
      
      acc[periodo].totalCamas += item.TotalCamas;
      acc[periodo].pacientesDiaTotal += item.PacientesDia;
      acc[periodo].sectores += 1;
      
      return acc;
    }, {} as Record<string, { totalCamas: number; pacientesDiaTotal: number; sectores: number }>);

    // Convertir a array con formato similar a indicadoresPorFecha
    const result = Object.entries(porPeriodo).map(([periodo, data]) => {
      // PacientesDia en los datos de fallback ya representa el promedio diario
      // Para datos reales, sería el total del período dividido por días del mes
      const promedioDiario = data.pacientesDiaTotal / data.sectores; // Promedio entre sectores
      const porcentajeOcupacion = data.totalCamas > 0 ? (promedioDiario / data.totalCamas) * 100 : 0;
      const ocupadas = Math.round(promedioDiario);
      const disponibles = data.totalCamas - ocupadas;
      
      return {
        fecha: new Date(periodo + '-01').toISOString(),
        totalCamas: data.totalCamas,
        ocupadas: Math.max(0, ocupadas),
        disponibles: Math.max(0, disponibles),
        porcentajeOcupacion: Math.min(100, Math.max(0, Number(porcentajeOcupacion.toFixed(1))))
      };
    }).sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
    
    // Guardar resultado en cache
    cache.set(cacheKey, result);
    return result;
  },

  // Generar resumen con métricas hospitalarias específicas con memoización
  obtenerResumenCamas: async (fechaInicio: string, fechaFin: string): Promise<ResumenCamas> => {
    const cacheKey = cache.generateKey('resumen-camas', { fechaInicio, fechaFin });
    
    // Verificar cache primero
    const cachedData = cache.get<ResumenCamas>(cacheKey);
    if (cachedData) {
      console.log('💾 Resumen obtenido del cache');
      return cachedData;
    }

    const datosCrudos = await camasIndicadoresService.obtenerDatosCrudos(fechaInicio, fechaFin);
    
    if (datosCrudos.length === 0) {
      return {
        totalGeneral: 0,
        totalCamasPromedio: 0,
        ocupadasPromedio: 0,
        disponiblesPromedio: 0,
        porcentajeOcupacionPromedio: 0,
        resumenPorSector: {},
        periodo: { fechaInicio, fechaFin }
      };
    }

    // Métricas hospitalarias específicas
    const sectoresUnicos = Array.from(new Set(datosCrudos.map(item => item.ValorSector)));
    const totalCapacidadInstalada = sectoresUnicos.reduce((sum, sector) => {
      const sectorData = datosCrudos.find(item => item.ValorSector === sector);
      return sum + (sectorData?.TotalCamas || 0);
    }, 0);

    // Calcular días-cama disponibles vs ocupados
    const totalDiasCamaDisponibles = datosCrudos.reduce((sum, item) => {
      return sum + (item.TotalCamas * item.DiasDelMes);
    }, 0);

    const totalDiasCamaOcupados = datosCrudos.reduce((sum, item) => sum + item.PacientesDia, 0);
    
    // Tasa de ocupación global
    const tasaOcupacionGlobal = totalDiasCamaDisponibles > 0 
      ? (totalDiasCamaOcupados / totalDiasCamaDisponibles) * 100 
      : 0;

    // Resumen por sector con métricas de eficiencia
    const resumenPorSector = datosCrudos.reduce((acc, item) => {
      const sectorKey = item.ValorSector.trim();
      if (!acc[sectorKey]) {
        acc[sectorKey] = 0;
      }
      // Usar tasa de ocupación como métrica principal por sector
      acc[sectorKey] += item.OcupacionPromedioPct;
      return acc;
    }, {} as Record<string, number>);

    // Promediar las tasas de ocupación por sector
    Object.keys(resumenPorSector).forEach(sector => {
      const sectorItems = datosCrudos.filter(item => item.ValorSector.trim() === sector);
      resumenPorSector[sector] = sectorItems.length > 0 
        ? Number((resumenPorSector[sector] / sectorItems.length).toFixed(1))
        : 0;
    });

    const result = {
      totalGeneral: totalDiasCamaOcupados, // Total días-cama ocupados
      totalCamasPromedio: totalCapacidadInstalada, // Capacidad instalada total
      ocupadasPromedio: Math.round((tasaOcupacionGlobal / 100) * totalCapacidadInstalada),
      disponiblesPromedio: totalCapacidadInstalada - Math.round((tasaOcupacionGlobal / 100) * totalCapacidadInstalada),
      porcentajeOcupacionPromedio: Number(tasaOcupacionGlobal.toFixed(2)),
      resumenPorSector,
      periodo: { fechaInicio, fechaFin }
    };
    
    // Guardar resultado en cache
    cache.set(cacheKey, result);
    return result;
  },

  obtenerEstadoActual: async (): Promise<EstadoActualCamas> => {
    const cacheKey = 'estado-actual-camas';
    
    // Cache más corto para estado actual (30 segundos)
    const cachedData = cache.get<EstadoActualCamas>(cacheKey);
    if (cachedData) {
      console.log('💾 Estado actual obtenido del cache');
      return cachedData;
    }

    try {
      console.log('🔍 Solicitando estado actual de camas');
      const res = await axiosInstance.get<ApiResponse<EstadoActualCamas>>('/indicadores/camas/estado-actual', {
        timeout: 15000 // Aumentado a 15 segundos
      });
      console.log('✅ Estado actual recibido:', res.data);
      
      if (res.data.success) {
        const data = res.data.data as EstadoActualCamas;
        // Cache por 30 segundos para datos en tiempo real
        cache.set(cacheKey, data, 30000);
        return data;
      }
      throw new Error('Error en la respuesta del servidor al obtener estado actual');
    } catch (error: any) {
      console.error('❌ Error en obtenerEstadoActual:', error);
      console.warn('🔄 Usando datos de fallback para estado actual');
      
      if (error.code === 'ECONNABORTED') {
        console.warn('⏰ Timeout en estado actual - Usando datos de ejemplo');
      }
      
      // Guardar fallback en cache por menos tiempo
      cache.set(cacheKey, FALLBACK_ESTADO_ACTUAL, 30000);
      return FALLBACK_ESTADO_ACTUAL;
    }
  },

  // Método para limpiar cache manualmente
  clearCache: (): void => {
    cache.clear();
    console.log('🧹 Cache de camas limpiado');
  }
};
