/**
 * Agregado del panel de inicio: GET /dashboard/resumen trae en UNA request lo
 * que antes eran ~10 llamadas (total camas, estado actual, pacientes hoy,
 * actividad reciente, ambulatorio hoy, analítica 30 días).
 *
 * Cada sección llega como { ok: true, data } | { ok: false, error } y las que
 * el usuario no puede ver vienen listadas en `omitidas`.
 */
import axiosInstance from './axios';
import type { MovimientoInternacion } from '../types/dashboard';
import type { ResumenAmbulatorioHoy } from '../types/ambulatorio';
import type { ResumenPacientesHoy, IndicadorData, ResumenIndicadores, IndicadorPorFecha } from './indicadoresService';
import type { ResumenCamas, CamasPorFecha, EstadoActualCamas } from './camasIndicadoresService';

export type SeccionDashboard =
  | 'camasTotal'
  | 'camasEstado'
  | 'camasAnalitica'
  | 'pacientesHoy'
  | 'ambulatorioHoy'
  | 'actividad'
  | 'pacientes';

export type ResultadoSeccion<T> = { ok: true; data: T } | { ok: false; error: string };

export interface TotalCamas {
  totalCamas: number;
  camasDisponibles: number;
  camasOcupadas: number;
  camasNoDisponibles: number;
}

export interface DashboardResumen {
  periodo: { fechaInicio: string; fechaFin: string };
  omitidas: SeccionDashboard[];
  generadoEn: string;
  secciones: {
    camasTotal?: ResultadoSeccion<Partial<TotalCamas>>;
    camasEstado?: ResultadoSeccion<EstadoActualCamas>;
    camasAnalitica?: ResultadoSeccion<{ resumen: ResumenCamas; porFecha: CamasPorFecha[] }>;
    pacientesHoy?: ResultadoSeccion<ResumenPacientesHoy & { totalAyer?: number }>;
    ambulatorioHoy?: ResultadoSeccion<ResumenAmbulatorioHoy>;
    actividad?: ResultadoSeccion<MovimientoInternacion[]>;
    pacientes?: ResultadoSeccion<{
      indicadores: IndicadorData[];
      resumen: ResumenIndicadores;
      porFecha: IndicadorPorFecha[];
    }>;
  };
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ObtenerResumenDashboardOpts {
  fechaInicio?: string;
  fechaFin?: string;
  limiteActividad?: number;
  graciaMin?: number;
  /** Secciones a pedir; por defecto todas las que el usuario pueda ver. */
  incluir?: SeccionDashboard[];
  signal?: AbortSignal;
}

export const obtenerResumenDashboard = async (
  opts: ObtenerResumenDashboardOpts = {},
): Promise<DashboardResumen> => {
  const { signal, incluir, ...params } = opts;
  const res = await axiosInstance.get<ApiResponse<DashboardResumen>>('/dashboard/resumen', {
    params: { ...params, incluir: incluir?.length ? incluir.join(',') : undefined },
    timeout: 45000,
    signal,
  });
  if (!res.data?.success || !res.data.data) {
    throw new Error(res.data?.message || 'Respuesta inválida del resumen del panel');
  }
  return res.data.data;
};

/** Devuelve `data` si la sección vino ok, o `null` en cualquier otro caso. */
export function datoSeccion<T>(sec: ResultadoSeccion<T> | undefined): T | null {
  return sec && sec.ok ? sec.data : null;
}

export const dashboardResumenService = { obtenerResumenDashboard, datoSeccion };
export default dashboardResumenService;
