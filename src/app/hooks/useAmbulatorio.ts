import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDebounce } from './useDebounce';
import { useAppContext } from '../contexts/AppContext';
import { getIdEmpresaFromToken } from '../utils/jwtSession';
import {
  obtenerAnaliticaAmbulatoria,
  limpiarCacheAmbulatorio,
} from '../services/ambulatorioService';
import type { AnaliticaAmbulatorio, FiltrosAmbulatorio } from '../types/ambulatorio';
import { GRACIA_MIN_DEFAULT } from '../types/ambulatorio';

/**
 * Analítica ambulatoria del período. A diferencia de useIndicadores, resuelve
 * todo en un único request: el backend ya devuelve resumen, series y rankings
 * agregados, así que no hay cascada de pasos ni agregación en el cliente.
 */
export function useAmbulatorio(filtros: FiltrosAmbulatorio) {
  const { empresaInfo } = useAppContext();
  const tenantId = empresaInfo?.id ?? getIdEmpresaFromToken() ?? 0;

  const {
    fechaInicio,
    fechaFin,
    graciaMin = GRACIA_MIN_DEFAULT,
    sector = null,
    profesional = null,
    especialidad = null,
  } = filtros;

  const [data, setData] = useState<AnaliticaAmbulatorio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const debFechaInicio = useDebounce(fechaInicio, 500);
  const debFechaFin = useDebounce(fechaFin, 500);

  // Descarta la respuesta de un request que quedó obsoleto por un cambio de
  // filtros mientras estaba en vuelo.
  const requestId = useRef(0);

  const fetchData = useCallback(async () => {
    if (!debFechaInicio || !debFechaFin) return;

    const id = ++requestId.current;
    setLoading(true);
    setError(null);

    try {
      const resultado = await obtenerAnaliticaAmbulatoria({
        fechaInicio: debFechaInicio,
        fechaFin: debFechaFin,
        graciaMin,
        sector,
        profesional,
        especialidad,
      });
      if (id !== requestId.current) return;
      setData(resultado);
    } catch (err) {
      if (id !== requestId.current) return;
      const mensaje =
        err instanceof Error ? err.message : 'Error desconocido al cargar la analítica ambulatoria';
      setError(mensaje);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [debFechaInicio, debFechaFin, graciaMin, sector, profesional, especialidad, tenantId]);

  useEffect(() => {
    setData(null);
    setError(null);
  }, [tenantId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = useCallback(() => fetchData(), [fetchData]);

  const clearCache = useCallback(() => {
    limpiarCacheAmbulatorio();
    return fetchData();
  }, [fetchData]);

  const computedData = useMemo(() => {
    if (!data) return null;

    const { resumen, serie, porOrigen } = data;
    const dias = serie.length;

    const diaMayorAusentismo = serie.reduce<(typeof serie)[number] | null>(
      (peor, actual) => (peor === null || actual.ausentes > peor.ausentes ? actual : peor),
      null,
    );

    const diaMayorVolumen = serie.reduce<(typeof serie)[number] | null>(
      (top, actual) => (top === null || actual.programados > top.programados ? actual : top),
      null,
    );

    // Con menos del 30% de turnos marcados los tiempos no representan nada:
    // la UI los degrada en lugar de publicarlos como KPI.
    const tiemposConfiables = resumen.calidadDatos.coberturaPct >= 30;

    return {
      hasData: resumen.programados > 0 || porOrigen.total > 0,
      dias,
      promedioDiario: dias > 0 ? Math.round(resumen.programados / dias) : 0,
      diaMayorAusentismo,
      diaMayorVolumen,
      tiemposConfiables,
    };
  }, [data]);

  return {
    data,
    resumen: data?.resumen ?? null,
    serie: data?.serie ?? [],
    porOrigen: data?.porOrigen ?? null,
    porEspecialidad: data?.porEspecialidad ?? [],
    porSector: data?.porSector ?? [],
    porProfesional: data?.porProfesional ?? [],
    heatmap: data?.heatmap ?? [],
    loading,
    error,
    computedData,
    refetch,
    clearCache,
  };
}

export default useAmbulatorio;
