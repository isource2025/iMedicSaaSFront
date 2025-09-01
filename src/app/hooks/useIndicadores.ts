import { useState, useEffect } from 'react';
import { indicadoresService } from '../services/indicadoresService';
import { IndicadorData, ResumenIndicadores, IndicadorPorFecha } from '../types/indicadores';

export const useIndicadores = (
  tipoIndicador: string = 'Ingresos',
  fechaInicio: string,
  fechaFin: string
) => {
  const [indicadores, setIndicadores] = useState<IndicadorData[]>([]);
  const [resumen, setResumen] = useState<ResumenIndicadores | null>(null);
  const [indicadoresPorFecha, setIndicadoresPorFecha] = useState<IndicadorPorFecha[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIndicadores = async () => {
    if (!fechaInicio || !fechaFin) return;

    setLoading(true);
    setError(null);

    try {
      const [
        indicadoresData,
        resumenData,
        porFechaData
      ] = await Promise.all([
        indicadoresService.obtenerIndicadores(tipoIndicador, fechaInicio, fechaFin),
        indicadoresService.obtenerResumenIndicadores(tipoIndicador, fechaInicio, fechaFin),
        indicadoresService.obtenerIndicadoresPorFecha(tipoIndicador, fechaInicio, fechaFin)
      ]);

      setIndicadores(indicadoresData);
      setResumen(resumenData);
      setIndicadoresPorFecha(porFechaData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      console.error('Error al cargar indicadores:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIndicadores();
  }, [tipoIndicador, fechaInicio, fechaFin]);

  const refetch = () => {
    fetchIndicadores();
  };

  return {
    indicadores,
    resumen,
    indicadoresPorFecha,
    loading,
    error,
    refetch
  };
};
