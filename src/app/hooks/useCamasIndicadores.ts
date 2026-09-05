import { useState, useEffect, useCallback, useMemo } from 'react';
import { camasIndicadoresService, CamasRawData, ResumenCamas, EstadoActualCamas, CamasPorFecha } from '../services/camasIndicadoresService';
import { useAppContext } from '../contexts/AppContext';
import { getIdEmpresaFromToken } from '../utils/jwtSession';

// Debounce personalizado para optimizar las consultas
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export const useCamasIndicadores = (
  fechaInicio: string,
  fechaFin: string
) => {
  const { empresaInfo } = useAppContext();
  const tenantId = empresaInfo?.id ?? getIdEmpresaFromToken() ?? 0;

  const [indicadores, setIndicadores] = useState<CamasRawData[]>([]);
  const [resumen, setResumen] = useState<ResumenCamas | null>(null);
  const [indicadoresPorFecha, setIndicadoresPorFecha] = useState<CamasPorFecha[]>([]);
  const [estadoActual, setEstadoActual] = useState<EstadoActualCamas | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingSteps, setLoadingSteps] = useState<{
    indicadores: boolean;
    resumen: boolean;
    porFecha: boolean;
    estadoActual: boolean;
  }>({ indicadores: false, resumen: false, porFecha: false, estadoActual: false });

  // Debounce de las fechas para evitar consultas excesivas
  const debouncedFechaInicio = useDebounce(fechaInicio, 500);
  const debouncedFechaFin = useDebounce(fechaFin, 500);

  // Al cambiar el rango (antes del debounce) marcar carga y evitar mostrar datos viejos
  useEffect(() => {
    setLoading(true);
    setError(null);
  }, [fechaInicio, fechaFin]);

  // Función optimizada con carga progresiva y manejo de errores mejorado
  const fetchAll = useCallback(async () => {
    if (!debouncedFechaInicio || !debouncedFechaFin) return;
    
    setLoading(true);
    setError(null);
    setLoadingSteps({ indicadores: true, resumen: false, porFecha: false, estadoActual: false });
    
    try {
      // Cargar en paralelo: resumen, serie diaria y estado actual
      setLoadingSteps({ indicadores: false, resumen: true, porFecha: true, estadoActual: true });

      const [resumenData, indicadoresPorFechaData, estadoActualData] = await Promise.all([
        camasIndicadoresService.obtenerResumenCamas(debouncedFechaInicio, debouncedFechaFin),
        camasIndicadoresService.obtenerIndicadoresPorFecha(debouncedFechaInicio, debouncedFechaFin),
        camasIndicadoresService.obtenerEstadoActual(),
      ]);

      setResumen(resumenData);
      setIndicadoresPorFecha(indicadoresPorFechaData);
      setEstadoActual(estadoActualData);
      setIndicadores([]);
      setLoadingSteps({ indicadores: false, resumen: false, porFecha: false, estadoActual: false });
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al cargar datos';
      setError(errorMessage);
      console.error('❌ Error al cargar indicadores de camas:', err);
    } finally {
      setLoading(false);
      setLoadingSteps({ indicadores: false, resumen: false, porFecha: false, estadoActual: false });
    }
  }, [debouncedFechaInicio, debouncedFechaFin, tenantId]);

  useEffect(() => {
    setIndicadores([]);
    setResumen(null);
    setIndicadoresPorFecha([]);
    setEstadoActual(null);
    setError(null);
  }, [tenantId]);

  // Efecto optimizado que solo se ejecuta cuando las fechas debounced cambian
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Función para limpiar cache manualmente
  const clearCache = useCallback(() => {
    camasIndicadoresService.clearCache();
    fetchAll(); // Recargar datos después de limpiar cache
  }, [fetchAll]);

  // Memoizar datos computados para evitar recálculos innecesarios
  const computedData = useMemo(() => {
    if (!resumen || !indicadoresPorFecha.length) return null;
    
    return {
      hasData: indicadoresPorFecha.length > 0,
      totalPeriods: indicadoresPorFecha.length,
      averageOccupancy: resumen.porcentajeOcupacionPromedio,
      totalCapacity: resumen.totalCamasPromedio,
      sectorsCount: Object.keys(resumen.resumenPorSector).length
    };
  }, [resumen, indicadoresPorFecha]);

  return {
    indicadores,
    resumen,
    indicadoresPorFecha,
    estadoActual,
    loading,
    error,
    loadingSteps,
    computedData,
    clearCache
  };
};
