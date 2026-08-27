/**
 * Tipos de la analítica ambulatoria.
 * Espejo de la respuesta de GET /api/indicadores/ambulatorio y
 * GET /api/indicadores/ambulatorio/resumen-hoy.
 */

/** Estado derivado de un turno. No existe como columna: lo calcula el backend. */
export type EstadoTurno =
  | 'ATENDIDO'
  | 'EN_CONSULTORIO'
  | 'EN_SALA'
  | 'PENDIENTE'
  | 'AUSENTE'
  | 'CANCELADO';

/** Estadísticos de un intervalo temporal, en minutos. */
export interface EstadisticaTiempo {
  /** Turnos con ambos sellos cargados y dentro del rango sano. */
  muestras: number;
  promedio: number | null;
  p50?: number | null;
  p90?: number | null;
  maximo?: number | null;
}

export interface TiemposAmbulatorio {
  /** Horallegada → HoraIngreso. El KPI central: cuánto espera el paciente en sala. */
  espera: EstadisticaTiempo;
  /** HoraAsignada → Horallegada. Negativo = el paciente llegó antes de su hora. */
  puntualidad: EstadisticaTiempo;
  /** HoraAsignada → HoraIngreso. Cuánto se corre la atención respecto de lo pactado. */
  retraso: EstadisticaTiempo;
  /** HoraIngreso → HoraSalida. */
  consulta: EstadisticaTiempo;
}

/**
 * Sin cobertura de marcado suficiente los tiempos son ruido, así que viajan
 * siempre junto a este bloque y la UI los muestra en conjunto.
 */
export interface CalidadDatos {
  atendidos: number;
  conLlegada: number;
  conIngreso: number;
  conAmbos: number;
  coberturaPct: number;
}

export interface ResumenAmbulatorio {
  graciaMin: number;
  programados: number;
  atendidos: number;
  cancelados: number;
  ausentes: number;
  pendientes: number;
  enSala: number;
  enConsultorio: number;
  enCurso: number;
  sobreturnos: number;
  /** ausentes / (programados - cancelados) */
  tasaAusentismo: number;
  tasaCancelacion: number;
  tasaAtencion: number;
  tiempos: TiemposAmbulatorio;
  calidadDatos: CalidadDatos;
}

/** Consultas ambulatorias reales (imVisita) según hayan nacido o no de un turno. */
export interface OrigenAmbulatorio {
  total: number;
  agenda: number;
  espontaneo: number;
  agendaPct: number;
  espontaneoPct: number;
}

export interface PuntoSerieAmbulatorio {
  fecha: string;
  programados: number;
  atendidos: number;
  cancelados: number;
  ausentes: number;
  pendientes: number;
  esperaProm: number | null;
  ambulatoriasAgenda: number;
  ambulatoriasEspontaneas: number;
  ambulatoriasTotal: number;
}

export interface DimensionAmbulatorio {
  codigo: string;
  descripcion: string | null;
  programados: number;
  atendidos: number;
  ausentes: number;
  tasaAusentismo: number;
  esperaProm: number | null;
  /** Sólo en porSector: 'A' ambulatorio, 'I' internación. */
  ambInt?: string | null;
  /** Sólo en porProfesional. */
  cancelados?: number;
  consultaProm?: number | null;
}

export interface CeldaHeatmap {
  /** 0 = Lunes … 6 = Domingo. */
  diaSemana: number;
  hora: number;
  programados: number;
  ausentes: number;
  esperaProm: number | null;
}

export interface AnaliticaAmbulatorio {
  periodo: {
    fechaInicio: string;
    fechaFin: string;
    graciaMin: number;
  };
  filtros: {
    sector: string | null;
    profesional: number | null;
    especialidad: number | null;
  };
  resumen: ResumenAmbulatorio;
  porOrigen: OrigenAmbulatorio;
  serie: PuntoSerieAmbulatorio[];
  porEspecialidad: DimensionAmbulatorio[];
  porSector: DimensionAmbulatorio[];
  porProfesional: DimensionAmbulatorio[];
  heatmap: CeldaHeatmap[];
}

/** Payload liviano de la card del panel de control. */
export interface ResumenAmbulatorioHoy {
  fecha: string;
  graciaMin: number;
  programados: number;
  atendidos: number;
  pendientes: number;
  ausentes: number;
  cancelados: number;
  enCurso: number;
  tasaAusentismo: number;
  esperaPromedioMin: number | null;
  coberturaPct: number;
  ambulatoriasTotal: number;
  ambulatoriasEspontaneas: number;
  porcentajeCambioAtendidos: number;
}

export interface FiltrosAmbulatorio {
  fechaInicio: string;
  fechaFin: string;
  graciaMin?: number;
  sector?: string | null;
  profesional?: number | null;
  especialidad?: number | null;
}

/** Ventanas de gracia ofrecidas en la UI antes de contar un turno como ausente. */
export const OPCIONES_GRACIA_MIN = [30, 60, 120] as const;

export const GRACIA_MIN_DEFAULT = 60;

export const DIAS_SEMANA_CORTO = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] as const;
