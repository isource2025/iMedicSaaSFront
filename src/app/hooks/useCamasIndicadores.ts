import { useState, useEffect, useCallback, useMemo } from 'react';
import { camasIndicadoresService, CamasRawData, ResumenCamas, EstadoActualCamas, CamasPorFecha } from '../services/camasIndicadoresService';

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

  // Función optimizada con carga progresiva y manejo de errores mejorado
  const fetchAll = useCallback(async () => {
    if (!debouncedFechaInicio || !debouncedFechaFin) return;
    
    setLoading(true);
    setError(null);
    setLoadingSteps({ indicadores: true, resumen: false, porFecha: false, estadoActual: false });
    
    console.log('🚀 Iniciando carga optimizada de datos de camas:', { 
      fechaInicio: debouncedFechaInicio, 
      fechaFin: debouncedFechaFin 
    });
    
    try {
      // 1. Cargar datos crudos primero (base para todo)
      console.log('📊 Cargando datos crudos...');
      const indicadoresData = await camasIndicadoresService.obtenerDatosCrudos(debouncedFechaInicio, debouncedFechaFin);
      setIndicadores(indicadoresData);
      setLoadingSteps(prev => ({ ...prev, indicadores: false, resumen: true }));
      
      // 2. Cargar resumen
      console.log('📈 Procesando resumen...');
      const resumenData = await camasIndicadoresService.obtenerResumenCamas(debouncedFechaInicio, debouncedFechaFin);
      setResumen(resumenData);
      setLoadingSteps(prev => ({ ...prev, resumen: false, porFecha: true }));
      
      // 3. Cargar indicadores por fecha
      console.log('📊 Procesando indicadores por fecha...');
      const indicadoresPorFechaData = await camasIndicadoresService.obtenerIndicadoresPorFecha(debouncedFechaInicio, debouncedFechaFin);
      setIndicadoresPorFecha(indicadoresPorFechaData);
      setLoadingSteps(prev => ({ ...prev, porFecha: false, estadoActual: true }));
      
      // 4. Cargar estado actual
      console.log('⏰ Obteniendo estado actual...');
      const estadoActualData = await camasIndicadoresService.obtenerEstadoActual();
      setEstadoActual(estadoActualData);
      setLoadingSteps(prev => ({ ...prev, estadoActual: false }));
      
      console.log('✅ Todos los datos cargados exitosamente');
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al cargar datos';
      setError(errorMessage);
      console.error('❌ Error al cargar indicadores de camas:', err);
      
      // Información detallada para debugging
      if (err.code === 'ECONNABORTED') {
        console.error('⏰ Timeout detectado - Consulta SQL tardando demasiado');
      } else if (err.response?.status === 500) {
        console.error('🔥 Error del servidor - Problema con fn_OcupacionPromedioCamas');
      } else if (err.name === 'NetworkError') {
        console.error('🌐 Error de red - Verificar conexión');
      }
    } finally {
      setLoading(false);
      setLoadingSteps({ indicadores: false, resumen: false, porFecha: false, estadoActual: false });
    }
  }, [debouncedFechaInicio, debouncedFechaFin]);

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
