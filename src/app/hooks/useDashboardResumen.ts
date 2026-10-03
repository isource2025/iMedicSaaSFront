'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  obtenerResumenDashboard,
  datoSeccion,
  type DashboardResumen,
  type SeccionDashboard,
  type TotalCamas,
} from '../services/dashboardResumenService';
import { bedsService } from '../services/bedsService';
import { indicadoresService, type ResumenPacientesHoy } from '../services/indicadoresService';
import { obtenerActividadReciente, type ActividadReciente } from '../services/dashboardService';
import { internacionService } from '../services/activityService';
import { obtenerResumenAmbulatorioHoy } from '../services/ambulatorioService';
import { camasIndicadoresService, type EstadoActualCamas } from '../services/camasIndicadoresService';
import type { ResumenAmbulatorioHoy } from '../types/ambulatorio';
import { useAppContext } from '../contexts/AppContext';
import { getIdEmpresaFromToken } from '../utils/jwtSession';

const BED_STATS_VACIO: TotalCamas = {
  totalCamas: 0,
  camasDisponibles: 0,
  camasOcupadas: 0,
  camasNoDisponibles: 0,
};

const PACIENTES_VACIO: ResumenPacientesHoy = { totalHoy: 0, porcentajeCambio: 0 };

/** Secciones que el panel de inicio realmente muestra (sin analítica de 30 días). */
const SECCIONES_PANEL: SeccionDashboard[] = [
  'camasTotal',
  'camasEstado',
  'pacientesHoy',
  'ambulatorioHoy',
  'actividad',
];

export interface UseDashboardResumenOpts {
  fechaInicio: string;
  fechaFin: string;
  limiteActividad?: number;
  /** Secciones a pedir. Default: las que muestra el panel. */
  incluir?: SeccionDashboard[];
}

/**
 * Carga el panel de inicio con UNA request (GET /dashboard/resumen).
 * Si el agregado falla (API vieja, red), cae a las llamadas individuales
 * para que la página siga funcionando igual que antes.
 */
export function useDashboardResumen({
  fechaInicio,
  fechaFin,
  limiteActividad = 10,
  incluir = SECCIONES_PANEL,
}: UseDashboardResumenOpts) {
  const { empresaInfo } = useAppContext();
  const tenantId = empresaInfo?.id ?? getIdEmpresaFromToken() ?? 0;

  const [bedStats, setBedStats] = useState<TotalCamas>(BED_STATS_VACIO);
  const [estadoActualCamas, setEstadoActualCamas] = useState<EstadoActualCamas | null>(null);
  const [patientSummary, setPatientSummary] = useState<ResumenPacientesHoy>(PACIENTES_VACIO);
  const [actividadReciente, setActividadReciente] = useState<ActividadReciente[]>([]);
  const [ambulatorioHoy, setAmbulatorioHoy] = useState<ResumenAmbulatorioHoy | null>(null);
  const [errorAmbulatorio, setErrorAmbulatorio] = useState(false);

  const [loadingCamas, setLoadingCamas] = useState(true);
  const [loadingPacientes, setLoadingPacientes] = useState(true);
  const [loadingActividad, setLoadingActividad] = useState(true);
  const [loadingAmbulatorio, setLoadingAmbulatorio] = useState(true);
  const [resumen, setResumen] = useState<DashboardResumen | null>(null);
  const [usandoFallback, setUsandoFallback] = useState(false);

  // Se compara por contenido (no por identidad) para que un array inline no dispare recargas.
  const incluirKey = incluir.join(',');
  const incluirRef = useRef<SeccionDashboard[]>(incluir);
  incluirRef.current = incluir;
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    setBedStats(BED_STATS_VACIO);
    setEstadoActualCamas(null);
    setPatientSummary(PACIENTES_VACIO);
    setActividadReciente([]);
    setAmbulatorioHoy(null);
    setErrorAmbulatorio(false);
    setLoadingCamas(true);
    setLoadingPacientes(true);
    setLoadingActividad(true);
    setLoadingAmbulatorio(true);
    setResumen(null);
    setUsandoFallback(false);
  }, []);

  const aplicarResumen = useCallback(
    (r: DashboardResumen) => {
      setResumen(r);
      const s = r.secciones;

      const total = datoSeccion(s.camasTotal);
      if (total) {
        setBedStats({
          totalCamas: total.totalCamas || 0,
          camasDisponibles: total.camasDisponibles || 0,
          camasOcupadas: total.camasOcupadas || 0,
          camasNoDisponibles: total.camasNoDisponibles || 0,
        });
      }
      const estado = datoSeccion(s.camasEstado);
      setEstadoActualCamas(estado);

      const analitica = datoSeccion(s.camasAnalitica);
      // Precarga el cache del módulo de analítica de camas para que abra sin esperar.
      camasIndicadoresService.precargar(r.periodo.fechaInicio, r.periodo.fechaFin, {
        resumen: analitica?.resumen,
        porFecha: analitica?.porFecha,
        estadoActual: estado,
      });

      const pacientes = datoSeccion(s.pacientesHoy);
      if (pacientes) {
        setPatientSummary({ totalHoy: pacientes.totalHoy || 0, porcentajeCambio: pacientes.porcentajeCambio || 0 });
      }

      const movimientos = datoSeccion(s.actividad);
      if (movimientos) {
        setActividadReciente(internacionService.actividadesDesdeMovimientos(movimientos).slice(0, limiteActividad));
      }

      const amb = s.ambulatorioHoy;
      if (amb?.ok) {
        setAmbulatorioHoy(amb.data);
        setErrorAmbulatorio(false);
      } else {
        setAmbulatorioHoy(null);
        setErrorAmbulatorio(Boolean(amb && !amb.ok));
      }

      setLoadingCamas(false);
      setLoadingPacientes(false);
      setLoadingActividad(false);
      setLoadingAmbulatorio(false);
    },
    [limiteActividad],
  );

  /** Camino viejo: una request por card. Sólo si el agregado no está disponible. */
  const cargarIndividual = useCallback(
    async (vigente: () => boolean) => {
      setUsandoFallback(true);
      const incluir = incluirRef.current;
      const tareas: Promise<unknown>[] = [];

      if (incluir.includes('camasTotal') || incluir.includes('camasEstado')) {
        tareas.push(
          (async () => {
            try {
              const [stats, estado] = await Promise.allSettled([
                bedsService.getTotalBeds(),
                camasIndicadoresService.obtenerEstadoActual(),
              ]);
              if (!vigente()) return;
              if (stats.status === 'fulfilled') setBedStats(stats.value);
              if (estado.status === 'fulfilled') setEstadoActualCamas(estado.value);
            } finally {
              if (vigente()) setLoadingCamas(false);
            }
          })(),
        );
      } else {
        setLoadingCamas(false);
      }

      if (incluir.includes('pacientesHoy')) {
        tareas.push(
          (async () => {
            try {
              const r = await indicadoresService.obtenerResumenPacientesHoy();
              if (vigente()) setPatientSummary(r);
            } catch (e) {
              console.error('Error fetching patient summary:', e);
            } finally {
              if (vigente()) setLoadingPacientes(false);
            }
          })(),
        );
      } else {
        setLoadingPacientes(false);
      }

      if (incluir.includes('actividad')) {
        tareas.push(
          (async () => {
            try {
              const a = await obtenerActividadReciente(limiteActividad);
              if (vigente()) setActividadReciente(a);
            } catch (e) {
              console.error('Error fetching recent activity:', e);
            } finally {
              if (vigente()) setLoadingActividad(false);
            }
          })(),
        );
      } else {
        setLoadingActividad(false);
      }

      if (incluir.includes('ambulatorioHoy')) {
        tareas.push(
          (async () => {
            try {
              const r = await obtenerResumenAmbulatorioHoy();
              if (vigente()) {
                setAmbulatorioHoy(r);
                setErrorAmbulatorio(false);
              }
            } catch (e) {
              console.error('Error fetching ambulatory summary:', e);
              if (vigente()) setErrorAmbulatorio(true);
            } finally {
              if (vigente()) setLoadingAmbulatorio(false);
            }
          })(),
        );
      } else {
        setLoadingAmbulatorio(false);
      }

      await Promise.allSettled(tareas);
    },
    [limiteActividad],
  );

  const cargar = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const vigente = () => abortRef.current === controller && !controller.signal.aborted;

    reset();
    try {
      const r = await obtenerResumenDashboard({
        fechaInicio,
        fechaFin,
        limiteActividad,
        incluir: incluirRef.current,
        signal: controller.signal,
      });
      if (!vigente()) return;
      aplicarResumen(r);
    } catch (e: any) {
      if (!vigente()) return;
      const cancelado = e?.name === 'CanceledError' || e?.name === 'AbortError' || e?.code === 'ERR_CANCELED';
      if (cancelado) return;
      console.warn('[dashboard] agregado no disponible, usando llamadas individuales:', e?.message || e);
      await cargarIndividual(vigente);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaInicio, fechaFin, limiteActividad, incluirKey, tenantId, reset, aplicarResumen, cargarIndividual]);

  useEffect(() => {
    cargar();
    return () => abortRef.current?.abort();
  }, [cargar]);

  return {
    bedStats,
    estadoActualCamas,
    patientSummary,
    actividadReciente,
    ambulatorioHoy,
    errorAmbulatorio,
    loadingCamas,
    loadingPacientes,
    loadingActividad,
    loadingAmbulatorio,
    resumen,
    usandoFallback,
    refetch: cargar,
  };
}

export default useDashboardResumen;
