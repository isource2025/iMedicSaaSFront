import type {
  CamasPorFecha,
  EstadoActualCamas,
  ResumenCamas,
} from '@/app/services/camasIndicadoresService';
import type { HojaExcel, LibroExcel, TipoColumna } from './libroExcel';

interface FilaIndicador {
  nombre: string;
  valor: number | null;
  tipo: TipoColumna;
  detalle?: string;
}

interface FilaSector {
  sector: string;
  diasCama: number;
  ocupacion: number | null;
  pctDiasCama: number;
}

/** Mismos indicadores y mismas fórmulas que muestra la pantalla de Análisis de Ocupación de Camas. */
export function armarLibroCamas(
  resumen: ResumenCamas,
  porFecha: CamasPorFecha[],
  estadoActual: EstadoActualCamas | null,
): LibroExcel {
  const tasas = porFecha.map((d) => d.porcentajeOcupacion);
  const pico = tasas.length ? Math.max(...tasas) : null;
  const variabilidad = tasas.length ? Math.max(...tasas) - Math.min(...tasas) : null;

  const rotacion =
    porFecha.length && estadoActual?.totalCamas
      ? porFecha.reduce((s, d) => s + d.ocupadas, 0) / porFecha.length / estadoActual.totalCamas
      : null;

  const indicadores: FilaIndicador[] = [
    { nombre: 'Días-cama ocupados', valor: resumen.totalGeneral, tipo: 'entero', detalle: 'Suma de camas ocupadas día por día' },
    { nombre: 'Tasa de ocupación promedio', valor: resumen.porcentajeOcupacionPromedio, tipo: 'porcentaje' },
    { nombre: 'Camas totales (promedio)', valor: resumen.totalCamasPromedio, tipo: 'decimal' },
    { nombre: 'Camas ocupadas (promedio)', valor: resumen.ocupadasPromedio, tipo: 'decimal' },
    { nombre: 'Camas disponibles (promedio)', valor: resumen.disponiblesPromedio, tipo: 'decimal' },
    {
      nombre: 'Índice de rotación',
      valor: rotacion,
      tipo: 'decimal',
      detalle: 'Ocupadas promedio por día / camas totales actuales',
    },
    { nombre: 'Pico de ocupación', valor: pico, tipo: 'porcentaje', detalle: 'Mayor ocupación diaria del período' },
    {
      nombre: 'Variabilidad de ocupación',
      valor: variabilidad,
      tipo: 'porcentaje',
      detalle: 'Diferencia entre la mayor y la menor ocupación diaria',
    },
    { nombre: 'Sectores activos', valor: Object.keys(resumen.resumenPorSector).length, tipo: 'entero' },
  ];
  if (estadoActual) {
    indicadores.push(
      {
        nombre: 'Camas totales hoy',
        valor: estadoActual.totalCamas,
        tipo: 'entero',
        detalle: 'Estado al momento de exportar; no depende del período',
      },
      { nombre: 'Camas ocupadas hoy', valor: estadoActual.ocupadas, tipo: 'entero' },
      { nombre: 'Camas disponibles hoy', valor: estadoActual.disponibles, tipo: 'entero' },
      { nombre: 'Ocupación hoy', valor: estadoActual.porcentajeOcupacion, tipo: 'porcentaje' },
    );
  }

  const totalDiasCama = Object.values(resumen.resumenPorSector).reduce((s, v) => s + v, 0);
  const sectores: FilaSector[] = Object.entries(resumen.resumenPorSector)
    .map(([sector, diasCama]) => ({
      sector,
      diasCama,
      ocupacion: resumen.ocupacionPorSector?.[sector] ?? null,
      pctDiasCama: totalDiasCama > 0 ? (diasCama / totalDiasCama) * 100 : 0,
    }))
    .sort((a, b) => b.diasCama - a.diasCama);

  const hojaIndicadores: HojaExcel<FilaIndicador> = {
    nombre: 'Indicadores',
    filas: indicadores,
    columnas: [
      { etiqueta: 'Indicador', valor: (f) => f.nombre },
      { etiqueta: 'Valor', valor: (f) => f.valor, tipo: (f) => f.tipo },
      { etiqueta: 'Detalle', valor: (f) => f.detalle },
    ],
  };

  const hojaSectores: HojaExcel<FilaSector> = {
    nombre: 'Por sector',
    filas: sectores,
    columnas: [
      { etiqueta: 'Sector', valor: (f) => f.sector },
      { etiqueta: 'Días-cama ocupados', valor: (f) => f.diasCama, tipo: 'entero' },
      { etiqueta: '% de los días-cama', valor: (f) => f.pctDiasCama, tipo: 'porcentaje' },
      { etiqueta: 'Ocupación del sector', valor: (f) => f.ocupacion, tipo: 'porcentaje' },
    ],
  };

  const hojaDias: HojaExcel<CamasPorFecha> = {
    nombre: 'Por día',
    filas: porFecha,
    columnas: [
      { etiqueta: 'Fecha', valor: (f) => f.fecha, tipo: 'fecha' },
      { etiqueta: 'Camas totales', valor: (f) => f.totalCamas, tipo: 'entero' },
      { etiqueta: 'Ocupadas', valor: (f) => f.ocupadas, tipo: 'entero' },
      { etiqueta: 'Disponibles', valor: (f) => f.disponibles, tipo: 'entero' },
      { etiqueta: 'Ocupación', valor: (f) => f.porcentajeOcupacion, tipo: 'porcentaje' },
    ],
  };

  return {
    titulo: 'Análisis de Ocupación de Camas',
    archivo: 'Ocupacion_Camas',
    periodo: { inicio: resumen.periodo.fechaInicio, fin: resumen.periodo.fechaFin },
    hojas: [hojaIndicadores, hojaSectores, hojaDias],
  };
}
