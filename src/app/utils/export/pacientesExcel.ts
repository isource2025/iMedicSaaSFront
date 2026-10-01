import type { IndicadorPorFecha, ResumenIndicadores } from '@/app/types/indicadores';
import type { ColumnaExcel, HojaExcel, LibroExcel, TipoColumna } from './libroExcel';

interface FilaIndicador {
  nombre: string;
  valor: number | string | null;
  tipo: TipoColumna;
  detalle?: string;
}

interface FilaClase {
  clase: string;
  ingresos: number;
  pct: number;
}

/** Mismos indicadores que muestra la pantalla de Análisis Estadístico de Pacientes (ingresos). */
export function armarLibroPacientes(resumen: ResumenIndicadores, porFecha: IndicadorPorFecha[]): LibroExcel {
  const porClase = Object.entries(resumen.resumenPorClase ?? {}).sort((a, b) => b[1] - a[1]);
  const total = resumen.totalGeneral;
  const dominante = porClase[0];
  const pico = porFecha.reduce<IndicadorPorFecha | null>((m, d) => (!m || d.total > m.total ? d : m), null);

  const indicadores: FilaIndicador[] = [
    { nombre: 'Total de ingresos', valor: total, tipo: 'entero' },
    {
      nombre: 'Promedio diario',
      valor: porFecha.length ? total / porFecha.length : null,
      tipo: 'decimal',
      detalle: `${porFecha.length} días con datos`,
    },
    { nombre: 'Clases de paciente activas', valor: porClase.length, tipo: 'entero' },
    {
      nombre: 'Clase dominante',
      valor: dominante ? dominante[0] : null,
      tipo: 'texto',
      detalle: dominante ? `${dominante[1]} ingresos` : undefined,
    },
    {
      nombre: 'Pico de ingresos',
      valor: pico?.total ?? null,
      tipo: 'entero',
      detalle: pico ? `Día ${pico.fecha.slice(0, 10)}` : undefined,
    },
  ];

  const clases: FilaClase[] = porClase.map(([clase, ingresos]) => ({
    clase,
    ingresos,
    pct: total > 0 ? (ingresos / total) * 100 : 0,
  }));

  // Una columna por clase de paciente: cambian de una clínica a otra.
  const nombresClases = porClase.map(([c]) => c);
  const columnasClases: ColumnaExcel<IndicadorPorFecha>[] = nombresClases.map((c) => ({
    etiqueta: c,
    valor: (f) => f.porClase?.[c] ?? 0,
    tipo: 'entero',
  }));

  const hojaIndicadores: HojaExcel<FilaIndicador> = {
    nombre: 'Indicadores',
    filas: indicadores,
    columnas: [
      { etiqueta: 'Indicador', valor: (f) => f.nombre },
      { etiqueta: 'Valor', valor: (f) => f.valor, tipo: (f) => f.tipo },
      { etiqueta: 'Detalle', valor: (f) => f.detalle },
    ],
  };

  const hojaClases: HojaExcel<FilaClase> = {
    nombre: 'Por clase de paciente',
    filas: clases,
    columnas: [
      { etiqueta: 'Clase de paciente', valor: (f) => f.clase },
      { etiqueta: 'Ingresos', valor: (f) => f.ingresos, tipo: 'entero' },
      { etiqueta: '% del total', valor: (f) => f.pct, tipo: 'porcentaje' },
    ],
  };

  const hojaDias: HojaExcel<IndicadorPorFecha> = {
    nombre: 'Por día',
    filas: porFecha,
    columnas: [
      { etiqueta: 'Fecha', valor: (f) => f.fecha, tipo: 'fecha' },
      { etiqueta: 'Total de ingresos', valor: (f) => f.total, tipo: 'entero' },
      ...columnasClases,
    ],
  };

  return {
    titulo: 'Análisis Estadístico de Pacientes (ingresos)',
    archivo: 'Ingresos_Pacientes',
    periodo: { inicio: resumen.periodo.fechaInicio, fin: resumen.periodo.fechaFin },
    hojas: [hojaIndicadores, hojaClases, hojaDias],
  };
}
