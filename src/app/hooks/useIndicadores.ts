import { useState, useEffect, useCallback, useMemo } from 'react';
import { indicadoresService } from '../services/indicadoresService';
import { IndicadorData, ResumenIndicadores, IndicadorPorFecha } from '../types/indicadores';

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

export const useIndicadores = (
  tipoIndicador: string = 'Ingresos',
  fechaInicio: string,
  fechaFin: string
) => {
  const [indicadores, setIndicadores] = useState<IndicadorData[]>([]);
  const [resumen, setResumen] = useState<ResumenIndicadores | null>(null);
  const [indicadoresPorFecha, setIndicadoresPorFecha] = useState<IndicadorPorFecha[]>([]);
  const [estadoActual, setEstadoActual] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
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
  const fetchIndicadores = useCallback(async () => {
    if (!debouncedFechaInicio || !debouncedFechaFin) return;
    
    setLoading(true);
    setError(null);
    setLoadingSteps({ indicadores: true, resumen: false, porFecha: false, estadoActual: false });
    
    console.log('🚀 Iniciando carga optimizada de indicadores de pacientes:', { 
      tipoIndicador,
      fechaInicio: debouncedFechaInicio, 
      fechaFin: debouncedFechaFin 
    });
    
    try {
      // 1. Cargar indicadores básicos
      console.log('📊 Cargando indicadores básicos...');
      const indicadoresData = await indicadoresService.obtenerIndicadores(tipoIndicador, debouncedFechaInicio, debouncedFechaFin);
      setIndicadores(indicadoresData);
      setLoadingSteps(prev => ({ ...prev, indicadores: false, resumen: true }));
      
      // 2. Cargar resumen
      console.log('📈 Procesando resumen...');
      const resumenData = await indicadoresService.obtenerResumenIndicadores(tipoIndicador, debouncedFechaInicio, debouncedFechaFin);
      setResumen(resumenData);
      setLoadingSteps(prev => ({ ...prev, resumen: false, porFecha: true }));
      
      // 3. Cargar datos por fecha
      console.log('📅 Procesando datos por fecha...');
      const porFechaData = await indicadoresService.obtenerIndicadoresPorFecha(tipoIndicador, debouncedFechaInicio, debouncedFechaFin);
      setIndicadoresPorFecha(porFechaData);
      setLoadingSteps(prev => ({ ...prev, porFecha: false, estadoActual: true }));
      
      // 4. Estado actual (simulado para compatibilidad)
      setEstadoActual({
        total: resumenData?.totalGeneral || 0,
        promedio: porFechaData.length > 0 ? Math.round((resumenData?.totalGeneral || 0) / porFechaData.length) : 0,
        clases: resumenData ? Object.keys(resumenData.resumenPorClase).length : 0,
        dias: porFechaData.length
      });
      setLoadingSteps(prev => ({ ...prev, estadoActual: false }));
      
      console.log('✅ Todos los indicadores cargados exitosamente');
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al cargar indicadores';
      setError(errorMessage);
      console.error('❌ Error al cargar indicadores:', err);
    } finally {
      setLoading(false);
      setLoadingSteps({ indicadores: false, resumen: false, porFecha: false, estadoActual: false });
    }
  }, [tipoIndicador, debouncedFechaInicio, debouncedFechaFin]);

  // Efecto optimizado que solo se ejecuta cuando las fechas debounced cambian
  useEffect(() => {
    fetchIndicadores();
  }, [fetchIndicadores]);

  // Función para limpiar cache manualmente
  const clearCache = useCallback(() => {
    // Simular limpieza de cache
    console.log('🧹 Limpiando cache de indicadores...');
    fetchIndicadores(); // Recargar datos
  }, [fetchIndicadores]);

  // Memoizar datos computados para evitar recálculos innecesarios
  const computedData = useMemo(() => {
    if (!resumen || !indicadoresPorFecha.length) return null;
    
    return {
      hasData: indicadoresPorFecha.length > 0,
      totalPeriods: indicadoresPorFecha.length,
      totalGeneral: resumen.totalGeneral,
      averageDaily: indicadoresPorFecha.length > 0 ? Math.round(resumen.totalGeneral / indicadoresPorFecha.length) : 0,
      sectorsCount: Object.keys(resumen.resumenPorClase).length
    };
  }, [resumen, indicadoresPorFecha]);

  return {
    indicadores,
    resumen,
    indicadoresPorFecha,
    estadoActual,
    loading,
    loadingSteps,
    error,
    computedData,
    refetch: fetchIndicadores,
    clearCache
  };
};
