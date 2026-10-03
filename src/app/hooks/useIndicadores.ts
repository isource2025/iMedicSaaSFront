import { useState, useEffect, useCallback, useMemo } from 'react';
import { indicadoresService } from '../services/indicadoresService';
import { IndicadorData, ResumenIndicadores, IndicadorPorFecha } from '../types/indicadores';
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

export const useIndicadores = (
  tipoIndicador: string = 'Ingresos',
  fechaInicio: string,
  fechaFin: string
) => {
  const { empresaInfo } = useAppContext();
  const tenantId = empresaInfo?.id ?? getIdEmpresaFromToken() ?? 0;

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
      // Una sola request: resumen y serie se derivan en memoria de las mismas filas.
      const { indicadores: indicadoresData, resumen: resumenData, porFecha: porFechaData } =
        await indicadoresService.obtenerIndicadoresCompletos(tipoIndicador, debouncedFechaInicio, debouncedFechaFin);
      setIndicadores(indicadoresData);
      setResumen(resumenData);
      setIndicadoresPorFecha(porFechaData);
      setLoadingSteps(prev => ({ ...prev, indicadores: false, estadoActual: true }));
      
      // Estado actual (derivado, para compatibilidad)
      setEstadoActual({
        total: resumenData?.totalGeneral || 0,
        promedio: porFechaData.length > 0 ? Math.round((resumenData?.totalGeneral || 0) / porFechaData.length) : 0,
        clases: resumenData?.resumenPorClase ? Object.keys(resumenData.resumenPorClase).length : 0,
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
  }, [tipoIndicador, debouncedFechaInicio, debouncedFechaFin, tenantId]);

  useEffect(() => {
    setIndicadores([]);
    setResumen(null);
    setIndicadoresPorFecha([]);
    setEstadoActual(null);
    setError(null);
  }, [tenantId]);

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
      sectorsCount: resumen.resumenPorClase ? Object.keys(resumen.resumenPorClase).length : 0
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
