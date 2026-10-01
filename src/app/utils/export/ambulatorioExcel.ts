import {
  DIAS_SEMANA_CORTO,
  type AnaliticaAmbulatorio,
  type CeldaHeatmap,
  type DimensionAmbulatorio,
  type EstadisticaTiempo,
  type PuntoSerieAmbulatorio,
} from '@/app/types/ambulatorio';
import type { ColumnaExcel, HojaExcel, LibroExcel, TipoColumna } from './libroExcel';

interface FilaIndicador {
  grupo: string;
  nombre: string;
  valor: number | null;
  tipo: TipoColumna;
  detalle?: string;
}

function indicador(
  grupo: string,
  nombre: string,
  valor: number | null | undefined,
  tipo: TipoColumna,
  detalle?: string,
): FilaIndicador {
  return { grupo, nombre, valor: valor ?? null, tipo, detalle };
}

/** Un intervalo de tiempo en minutos: promedio, p50, p90 y máximo con la cantidad de muestras. */
function filasTiempo(nombre: string, t: EstadisticaTiempo, detalle: string): FilaIndicador[] {
  const g = 'Tiempos (minutos)';
  return [
    indicador(g, `${nombre}: promedio`, t.promedio, 'decimal', `${t.muestras} turnos medidos. ${detalle}`),
    indicador(g, `${nombre}: mediana`, t.p50, 'decimal'),
    indicador(g, `${nombre}: percentil 90`, t.p90, 'decimal'),
    indicador(g, `${nombre}: máximo`, t.maximo, 'decimal'),
  ];
}

function hojaDimension(
  nombre: string,
  etiqueta: string,
  filas: DimensionAmbulatorio[],
  opciones: { sector?: boolean; profesional?: boolean } = {},
): HojaExcel<DimensionAmbulatorio> {
  const columnas: ColumnaExcel<DimensionAmbulatorio>[] = [
    { etiqueta: 'Código', valor: (f) => f.codigo },
    { etiqueta, valor: (f) => f.descripcion },
  ];
  if (opciones.sector) {
    columnas.push({
      etiqueta: 'Tipo',
      valor: (f) => (f.ambInt === 'I' ? 'Internación' : f.ambInt === 'A' ? 'Ambulatorio' : null),
    });
  }
  columnas.push(
    { etiqueta: 'Turnos programados', valor: (f) => f.programados, tipo: 'entero' },
    { etiqueta: 'Atenciones con turno', valor: (f) => f.conTurno, tipo: 'entero' },
    { etiqueta: 'Atenciones a demanda', valor: (f) => f.aDemanda ?? f.turnosDemanda, tipo: 'entero' },
    { etiqueta: 'Atendidos', valor: (f) => f.atendidos, tipo: 'entero' },
    { etiqueta: 'Ausentes', valor: (f) => f.ausentes, tipo: 'entero' },
    { etiqueta: 'Cancelados', valor: (f) => f.cancelados, tipo: 'entero' },
    { etiqueta: 'Ausentismo', valor: (f) => f.tasaAusentismo, tipo: 'porcentaje' },
    { etiqueta: 'Espera promedio (min)', valor: (f) => f.esperaProm, tipo: 'decimal' },
    { etiqueta: 'Permanencia promedio (min)', valor: (f) => f.permanenciaProm, tipo: 'decimal' },
  );
  if (opciones.profesional) {
    columnas.push({ etiqueta: 'Consulta promedio (min)', valor: (f) => f.consultaProm, tipo: 'decimal' });
  }
  return { nombre, columnas, filas: [...filas].sort((a, b) => b.programados - a.programados) };
}

/** Mismos indicadores que la pantalla de Análisis de Actividad Ambulatoria, con la tolerancia de ausencia elegida. */
export function armarLibroAmbulatorio(data: AnaliticaAmbulatorio): LibroExcel {
  const { resumen: r, porOrigen: o } = data;
  const t = r.tiempos;

  const indicadores: FilaIndicador[] = [
    indicador('Agenda', 'Turnos programados', r.programados, 'entero', 'Reservados con antelación'),
    indicador('Agenda', 'Atendidos de agenda', r.atendidos, 'entero'),
    indicador('Agenda', 'Ausentes', r.ausentes, 'entero', `Tolerancia de ${data.periodo.graciaMin} minutos`),
    indicador('Agenda', 'Cancelados', r.cancelados, 'entero'),
    indicador('Agenda', 'Pendientes', r.pendientes, 'entero'),
    indicador('Agenda', 'En sala', r.enSala, 'entero'),
    indicador('Agenda', 'En consultorio', r.enConsultorio, 'entero'),
    indicador('Agenda', 'En curso', r.enCurso, 'entero'),
    indicador('Agenda', 'Tasa de ausentismo', r.programados > 0 ? r.tasaAusentismo : null, 'porcentaje', 'Ausentes / (programados − cancelados)'),
    indicador('Agenda', 'Tasa de cancelación', r.tasaCancelacion, 'porcentaje'),
    indicador('Agenda', 'Tasa de atención', r.tasaAtencion, 'porcentaje'),
    indicador('Demanda', 'Turnos a demanda', r.turnosDemanda, 'entero', 'Sin cita previa, no cancelados'),
    indicador('Demanda', 'Atendidos a demanda', r.atendidosDemanda, 'entero'),
    indicador('Demanda', 'Total atendidos', r.atendidosTotal, 'entero', 'Agenda + demanda'),
    indicador('Origen de las consultas', 'Consultas ambulatorias', o.total, 'entero'),
    indicador('Origen de las consultas', 'Con turno de agenda', o.agenda, 'entero'),
    indicador('Origen de las consultas', 'A demanda', o.aDemanda, 'entero'),
    indicador('Origen de las consultas', '% con turno de agenda', o.agendaPct, 'porcentaje'),
    indicador('Origen de las consultas', '% a demanda', o.aDemandaPct, 'porcentaje'),
    ...filasTiempo('Espera', t.espera, 'Desde el horario del turno hasta el ingreso al consultorio; solo agenda.'),
    ...filasTiempo('Puntualidad', t.puntualidad, 'Negativo = llegó antes de su hora; solo agenda.'),
    ...filasTiempo('Permanencia', t.permanencia, 'Desde la llegada hasta la salida.'),
    ...filasTiempo('Consulta', t.consulta, 'Desde el ingreso al consultorio hasta la salida.'),
    indicador('Calidad del dato', 'Cobertura de marcado', r.calidadDatos.coberturaPct, 'porcentaje', 'Atendidos con hora de ingreso cargada. Con poca cobertura los tiempos no son confiables.'),
    indicador('Calidad del dato', 'Atendidos con llegada', r.calidadDatos.conLlegada, 'entero'),
    indicador('Calidad del dato', 'Atendidos con ingreso', r.calidadDatos.conIngreso, 'entero'),
    indicador('Calidad del dato', 'Atendidos con salida', r.calidadDatos.conSalida, 'entero'),
  ];

  const hojaIndicadores: HojaExcel<FilaIndicador> = {
    nombre: 'Indicadores',
    filas: indicadores,
    columnas: [
      { etiqueta: 'Grupo', valor: (f) => f.grupo },
      { etiqueta: 'Indicador', valor: (f) => f.nombre },
      { etiqueta: 'Valor', valor: (f) => f.valor, tipo: (f) => f.tipo },
      { etiqueta: 'Detalle', valor: (f) => f.detalle },
    ],
  };

  const hojaDias: HojaExcel<PuntoSerieAmbulatorio> = {
    nombre: 'Por día',
    filas: data.serie,
    columnas: [
      { etiqueta: 'Fecha', valor: (f) => f.fecha, tipo: 'fecha' },
      { etiqueta: 'Turnos programados', valor: (f) => f.programados, tipo: 'entero' },
      { etiqueta: 'Atendidos', valor: (f) => f.atendidos, tipo: 'entero' },
      { etiqueta: 'Cancelados', valor: (f) => f.cancelados, tipo: 'entero' },
      { etiqueta: 'Ausentes', valor: (f) => f.ausentes, tipo: 'entero' },
      { etiqueta: 'Pendientes', valor: (f) => f.pendientes, tipo: 'entero' },
      { etiqueta: 'Turnos a demanda', valor: (f) => f.turnosDemanda, tipo: 'entero' },
      { etiqueta: 'Ambulatorias con turno', valor: (f) => f.ambulatoriasAgenda, tipo: 'entero' },
      { etiqueta: 'Ambulatorias a demanda', valor: (f) => f.ambulatoriasADemanda, tipo: 'entero' },
      { etiqueta: 'Ambulatorias total', valor: (f) => f.ambulatoriasTotal, tipo: 'entero' },
      { etiqueta: 'Espera promedio (min)', valor: (f) => f.esperaProm, tipo: 'decimal' },
    ],
  };

  const hojaHeatmap: HojaExcel<CeldaHeatmap> = {
    nombre: 'Día y hora',
    nota: 'Turnos por día de la semana y hora del turno, sumados en todo el período.',
    filas: [...data.heatmap].sort((a, b) => a.diaSemana - b.diaSemana || a.hora - b.hora),
    columnas: [
      { etiqueta: 'Día', valor: (f) => DIAS_SEMANA_CORTO[f.diaSemana] ?? String(f.diaSemana) },
      { etiqueta: 'Hora', valor: (f) => `${String(f.hora).padStart(2, '0')}:00` },
      { etiqueta: 'Turnos programados', valor: (f) => f.programados, tipo: 'entero' },
      { etiqueta: 'Ausentes', valor: (f) => f.ausentes, tipo: 'entero' },
      { etiqueta: 'Espera promedio (min)', valor: (f) => f.esperaProm, tipo: 'decimal' },
      { etiqueta: 'Permanencia promedio (min)', valor: (f) => f.permanenciaProm, tipo: 'decimal' },
    ],
  };

  const filtros: [string, string][] = [];
  if (data.filtros.sector) filtros.push(['Sector', data.filtros.sector]);
  if (data.filtros.especialidad != null) filtros.push(['Especialidad (código)', String(data.filtros.especialidad)]);
  if (data.filtros.profesional != null) filtros.push(['Profesional (código)', String(data.filtros.profesional)]);

  return {
    titulo: 'Análisis de Actividad Ambulatoria',
    archivo: 'Actividad_Ambulatoria',
    periodo: { inicio: data.periodo.fechaInicio, fin: data.periodo.fechaFin },
    detalles: [['Tolerancia de ausencia', `${data.periodo.graciaMin} minutos`], ...filtros],
    hojas: [
      hojaIndicadores,
      hojaDias,
      hojaDimension('Por especialidad', 'Especialidad', data.porEspecialidad),
      hojaDimension('Por sector', 'Sector', data.porSector, { sector: true }),
      hojaDimension('Por profesional', 'Profesional', data.porProfesional, { profesional: true }),
      hojaHeatmap,
    ],
  };
}
