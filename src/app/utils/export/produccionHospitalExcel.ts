import type {
  AnaliticaProduccion,
  ItemDimension,
  ItemPractica,
  Metricas,
  PuntoSerieProduccion,
} from '@/app/types/produccionHospital';
import { analizarValorizacion, notasCalidad } from '@/app/dashboard/reports/facturacion/produccionFormat';
import type { ColumnaExcel, HojaExcel, LibroExcel, TipoColumna } from './libroExcel';

interface FilaIndicador {
  nombre: string;
  valor: number | null;
  anterior?: number | null;
  variacion?: number | null;
  tipo: TipoColumna;
  detalle?: string;
}

/** Columnas de medidas, iguales en todas las hojas de desglose. */
function columnasMedidas<T extends Metricas>(liquidadoDisponible: boolean): ColumnaExcel<T>[] {
  return [
    { etiqueta: 'Prácticas', valor: (f) => f.practicas, tipo: 'entero' },
    { etiqueta: 'Prestaciones', valor: (f) => f.prestaciones, tipo: 'entero' },
    { etiqueta: 'Pacientes', valor: (f) => f.pacientes, tipo: 'entero' },
    { etiqueta: 'Facturado', valor: (f) => f.facturado, tipo: 'moneda' },
    ...(liquidadoDisponible
      ? [{ etiqueta: 'Liquidado', valor: (f: T) => f.liquidado, tipo: 'moneda' as const }]
      : []),
  ];
}

function hojaDimension(
  nombre: string,
  etiquetaDimension: string,
  items: ItemDimension[],
  totalFacturado: number,
  liquidadoDisponible: boolean,
): HojaExcel<ItemDimension> {
  const ordenados = [...items].sort((a, b) => b.facturado - a.facturado || b.practicas - a.practicas);
  return {
    nombre,
    filas: ordenados,
    columnas: [
      { etiqueta: 'Código', valor: (f) => f.id },
      { etiqueta: etiquetaDimension, valor: (f) => f.label },
      ...columnasMedidas<ItemDimension>(liquidadoDisponible),
      {
        etiqueta: '% del facturado',
        valor: (f) => (totalFacturado > 0 ? (f.facturado / totalFacturado) * 100 : null),
        tipo: 'porcentaje',
      },
    ],
  };
}

/**
 * Libro con lo que la pantalla muestra para el período y filtros vigentes.
 * `filtros` llega ya con nombres legibles (no ids) desde la página.
 */
export function armarLibroProduccion(
  data: AnaliticaProduccion,
  filtros: [string, string][],
  soloValorizadas: boolean,
): LibroExcel {
  const { resumen, comparacion, liquidadoDisponible } = data;
  const periodo = { inicio: data.periodo.inicio, fin: data.periodo.fin };

  const indicadores: FilaIndicador[] = [
    {
      nombre: 'Facturado',
      valor: resumen.facturado,
      anterior: comparacion.facturado,
      variacion: comparacion.variacion.facturado,
      tipo: 'moneda',
      detalle: 'Honorarios valorizados',
    },
    ...(liquidadoDisponible
      ? [
          {
            nombre: 'Liquidado',
            valor: resumen.liquidado,
            anterior: comparacion.liquidado,
            variacion: comparacion.variacion.liquidado,
            tipo: 'moneda' as const,
            detalle:
              resumen.liquidadoPct == null
                ? undefined
                : `${resumen.liquidadoPct.toFixed(1)}% de lo valorizado tiene liquidación cargada`,
          },
        ]
      : []),
    {
      nombre: 'Prácticas',
      valor: resumen.practicas,
      anterior: comparacion.practicas,
      variacion: comparacion.variacion.practicas,
      tipo: 'entero',
      detalle: 'Prácticas distintas: una práctica con ayudante cuenta una vez',
    },
    { nombre: 'Prestaciones', valor: resumen.prestaciones, tipo: 'entero', detalle: 'Filas práctica × profesional' },
    {
      nombre: 'Pacientes',
      valor: resumen.pacientes,
      anterior: comparacion.pacientes,
      variacion: comparacion.variacion.pacientes,
      tipo: 'entero',
    },
    { nombre: 'Visitas', valor: resumen.visitas, tipo: 'entero' },
    { nombre: 'Profesionales', valor: resumen.profesionales, tipo: 'entero' },
    { nombre: 'Ticket promedio', valor: resumen.ticketPromedio, tipo: 'moneda', detalle: 'Facturado por práctica' },
    {
      nombre: 'Prácticas valorizadas',
      valor: resumen.porEstado.valorizada.practicas,
      tipo: 'entero',
      detalle: `Importe: ${resumen.porEstado.valorizada.importe.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    },
    { nombre: 'Prácticas sin valorizar', valor: resumen.porEstado.sinValorizar.practicas, tipo: 'entero' },
    {
      nombre: 'Prácticas de coberturas no facturables',
      valor: resumen.porEstado.noFacturable.practicas,
      tipo: 'entero',
    },
  ];

  const hojaIndicadores: HojaExcel<FilaIndicador> = {
    nombre: 'Indicadores',
    filas: indicadores,
    columnas: [
      { etiqueta: 'Indicador', valor: (f) => f.nombre },
      { etiqueta: 'Valor', valor: (f) => f.valor, tipo: (f) => f.tipo },
      {
        etiqueta: `Período anterior (${comparacion.periodo.inicio} a ${comparacion.periodo.fin})`,
        valor: (f) => f.anterior,
        tipo: (f) => f.tipo,
      },
      { etiqueta: 'Variación', valor: (f) => f.variacion, tipo: 'porcentaje' },
      { etiqueta: 'Detalle', valor: (f) => f.detalle },
    ],
  };

  const porDia = data.granularidad !== 'mes';
  const hojaEvolucion: HojaExcel<PuntoSerieProduccion> = {
    nombre: 'Evolución',
    nota:
      data.granularidad === 'semana'
        ? 'Cada fila es una semana; la fecha es el lunes de esa semana.'
        : data.granularidad === 'mes'
          ? 'Cada fila es un mes.'
          : undefined,
    filas: data.serie,
    columnas: [
      { etiqueta: porDia ? 'Fecha' : 'Mes', valor: (f) => f.clave, tipo: porDia ? 'fecha' : 'texto' },
      ...columnasMedidas<PuntoSerieProduccion>(liquidadoDisponible),
    ],
  };

  const analisis = analizarValorizacion(data.serie);
  const estadoPeriodo = new Map(analisis.periodos.map((p) => [p.clave, p]));
  const hojaValorizacion: HojaExcel<PuntoSerieProduccion> = {
    nombre: 'Valorización',
    nota:
      'Prácticas de cada período según su estado de valorización, sin importar el filtro "Solo valorizadas". ' +
      '"Incompleto" marca los períodos con mucha menos valorización que lo habitual: su importe todavía puede crecer.',
    filas: data.serie,
    columnas: [
      { etiqueta: porDia ? 'Fecha' : 'Mes', valor: (f) => f.clave, tipo: porDia ? 'fecha' : 'texto' },
      { etiqueta: 'Valorizadas', valor: (f) => f.valorizacion.valorizadas, tipo: 'entero' },
      { etiqueta: 'Sin valorizar', valor: (f) => f.valorizacion.sinValorizar, tipo: 'entero' },
      { etiqueta: 'Coberturas no facturables', valor: (f) => f.valorizacion.noFacturable, tipo: 'entero' },
      { etiqueta: '% valorizado de lo facturable', valor: (f) => estadoPeriodo.get(f.clave)?.pct, tipo: 'porcentaje' },
      {
        etiqueta: 'Estado',
        valor: (f) => (estadoPeriodo.get(f.clave)?.incompleto ? 'Incompleto' : 'Completo'),
      },
    ],
  };

  const hojaPracticas: HojaExcel<ItemPractica> = {
    nombre: 'Prácticas principales',
    nota: 'Reúne las prácticas con más cantidad y las de mayor importe del período; no es el listado completo.',
    filas: [...data.topPracticas].sort((a, b) => b.facturado - a.facturado || b.practicas - a.practicas),
    columnas: [
      { etiqueta: 'Código', valor: (f) => f.codigo, tipo: 'entero' },
      { etiqueta: 'Tipo', valor: (f) => f.tipo },
      { etiqueta: 'Descripción', valor: (f) => f.label },
      ...columnasMedidas<ItemPractica>(liquidadoDisponible),
    ],
  };

  const total = resumen.facturado;

  return {
    titulo: 'Producción del Hospital',
    archivo: 'Produccion_Hospital',
    periodo,
    detalles: [
      ['Solo valorizadas', soloValorizadas ? 'Sí' : 'No (incluye sin valorizar y no facturables)'],
      ...filtros,
    ],
    notas: [
      ...(analisis.incompletos.length
        ? [
            `Períodos con valorización en demora: ${analisis.incompletos
              .map((p) => `${p.clave} (${p.pct?.toFixed(0)}%)`)
              .join(', ')}${analisis.habitual != null ? `; lo habitual es ~${analisis.habitual.toFixed(0)}%` : ''}. Sus importes todavía pueden crecer.`,
          ]
        : []),
      ...notasCalidad(data, soloValorizadas),
      'Cobertura: obra social a la que se facturó la práctica; si aún no se facturó, la de la visita.',
      'Los desgloses incluyen hasta 1.000 filas por dimensión.',
    ],
    hojas: [
      hojaIndicadores,
      hojaEvolucion,
      hojaValorizacion,
      hojaDimension('Por cobertura', 'Cobertura', data.porCobertura, total, liquidadoDisponible),
      hojaDimension('Por sector', 'Sector', data.porSector, total, liquidadoDisponible),
      hojaDimension('Por servicio', 'Servicio', data.porServicio, total, liquidadoDisponible),
      hojaDimension('Por especialidad', 'Especialidad', data.porEspecialidad, total, liquidadoDisponible),
      hojaDimension('Por profesional', 'Profesional', data.porProfesional, total, liquidadoDisponible),
      hojaDimension('Por clase de paciente', 'Clase', data.porClase, total, liquidadoDisponible),
      hojaDimension('Por función', 'Función', data.porFuncion, total, liquidadoDisponible),
      hojaPracticas,
    ],
  };
}
