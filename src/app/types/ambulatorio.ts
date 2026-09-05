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
  /**
   * HoraAsignada → HoraIngreso. Demora desde el horario del turno hasta el
   * ingreso al consultorio. Sólo turnos de agenda: la demanda espontánea no
   * tiene horario pactado contra el cual medir.
   */
  espera: EstadisticaTiempo;
  /** HoraAsignada → Horallegada, sólo agenda. Negativo = llegó antes de su hora. */
  puntualidad: EstadisticaTiempo;
  /** Horallegada → HoraSalida. Tiempo total en la institución, agenda y demanda. */
  permanencia: EstadisticaTiempo;
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
  conSalida: number;
  conAmbos: number;
  coberturaPct: number;
}

export interface ResumenAmbulatorio {
  graciaMin: number;
  /** Turnos reservados con antelación (TipoTurno = 0). */
  programados: number;
  /** Atendidos de agenda (TipoTurno = 0). */
  atendidos: number;
  cancelados: number;
  ausentes: number;
  pendientes: number;
  enSala: number;
  enConsultorio: number;
  enCurso: number;
  /** Registros a demanda no cancelados (TipoTurno = 1). */
  turnosDemanda: number;
  /** A demanda efectivamente atendidos. */
  atendidosDemanda: number;
  /** atendidos + atendidosDemanda — coincide con Admin Turnos (Estado=Atendido). */
  atendidosTotal: number;
  canceladosDemanda?: number;
  /** ausentes / (programados - cancelados), sólo agenda */
  tasaAusentismo: number;
  tasaCancelacion: number;
  tasaAtencion: number;
  tiempos: TiemposAmbulatorio;
  calidadDatos: CalidadDatos;
}

/**
 * Consultas ambulatorias reales (imVisita) según hayan nacido de un turno
 * reservado con antelación o de una atención sin cita previa.
 */
export interface OrigenAmbulatorio {
  total: number;
  agenda: number;
  aDemanda: number;
  agendaPct: number;
  aDemandaPct: number;
}

export interface PuntoSerieAmbulatorio {
  fecha: string;
  programados: number;
  atendidos: number;
  cancelados: number;
  ausentes: number;
  pendientes: number;
  turnosDemanda: number;
  esperaProm: number | null;
  ambulatoriasAgenda: number;
  ambulatoriasADemanda: number;
  ambulatoriasTotal: number;
}

export interface DimensionAmbulatorio {
  codigo: string;
  descripcion: string | null;
  /** Turnos reservados con antelación (imTurnos, TipoTurno = 0). */
  programados: number;
  /** Atenciones nacidas de un turno de agenda (imVisita). */
  conTurno?: number;
  /** Atenciones sin cita previa: sobreturno del día o visita sin turno. */
  aDemanda?: number;
  /** Turnos TipoTurno = 1, respaldo cuando la visita no registra la dimensión. */
  turnosDemanda?: number;
  atendidos: number;
  ausentes: number;
  /** null cuando la dimensión no tiene agenda y el ausentismo no aplica. */
  tasaAusentismo: number | null;
  esperaProm: number | null;
  /** Horallegada → HoraSalida. Disponible aunque no se marque el ingreso. */
  permanenciaProm?: number | null;
  /** Sólo en porSector: 'A' ambulatorio, 'I' internación. */
  ambInt?: string | null;
  cancelados?: number;
  /** Sólo en porProfesional. */
  consultaProm?: number | null;
}

export interface CeldaHeatmap {
  /** 0 = Lunes … 6 = Domingo. */
  diaSemana: number;
  hora: number;
  programados: number;
  ausentes: number;
  esperaProm: number | null;
  permanenciaProm: number | null;
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
  /** Consultas atendidas del día (agenda + demanda). */
  atendidos: number;
  atendidosAgenda?: number;
  atendidosDemanda?: number;
  pendientes: number;
  ausentes: number;
  cancelados: number;
  enCurso: number;
  tasaAusentismo: number;
  esperaPromedioMin: number | null;
  coberturaPct: number;
  ambulatoriasTotal: number;
  ambulatoriasADemanda: number;
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
