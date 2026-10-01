import type {
  AnaliticaProduccion,
  Granularidad,
  ItemDimension,
  MedidaProduccion,
  Metricas,
  PuntoSerieProduccion,
} from '@/app/types/produccionHospital';

const ARS = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

const ENTERO = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });

const COMPACTO = new Intl.NumberFormat('es-AR', { notation: 'compact', maximumFractionDigits: 1 });

export const moneda = (v: number | null | undefined): string => (v == null ? '—' : ARS.format(v));

export const entero = (v: number | null | undefined): string => (v == null ? '—' : ENTERO.format(v));

/** "$ 1,2 M" para ejes y etiquetas chicas. */
export const monedaCompacta = (v: number): string => `$ ${COMPACTO.format(v)}`;

export const porcentaje = (v: number | null | undefined): string =>
  v == null ? '—' : `${v.toFixed(1).replace('.', ',')}%`;

export const MEDIDAS: { id: MedidaProduccion; label: string }[] = [
  { id: 'facturado', label: 'Facturado' },
  { id: 'liquidado', label: 'Liquidado' },
  { id: 'practicas', label: 'Cantidad de prácticas' },
];

export function valorDe(item: Metricas, medida: MedidaProduccion): number {
  return item[medida];
}

export function formatearMedida(v: number, medida: MedidaProduccion): string {
  return medida === 'practicas' ? entero(v) : moneda(v);
}

export function formatearMedidaCompacta(v: number, medida: MedidaProduccion): string {
  return medida === 'practicas' ? COMPACTO.format(v) : monedaCompacta(v);
}

export interface ItemRanking {
  id: string | null;
  label: string;
  value: number;
  /** Agrupa lo que quedó fuera del top. No se puede filtrar por él. */
  esOtros?: boolean;
  item?: ItemDimension;
}

export const COLOR_OTROS = '#b0bec5';

export const PALETA = [
  '#00B5E2',
  '#0083A9',
  '#7e57c2',
  '#f57c00',
  '#2e7d32',
  '#61D6EB',
  '#d32f2f',
  '#8d6e63',
  '#41C8DC',
  '#5c6bc0',
  '#ab47bc',
  '#26a69a',
];

/**
 * Ordena por la medida elegida, descarta lo que vale 0 y deja el top N; lo demás
 * se agrupa en "Otros". Suma grupo a grupo, que es correcto para cobertura,
 * sector, servicio y clase (cada práctica cae en uno solo); en profesional una
 * práctica con ayudante cuenta para cada uno, por eso ahí "Otros" es aproximado.
 */
export function rankear(
  items: ItemDimension[],
  medida: MedidaProduccion,
  top: number,
  conOtros = true,
): ItemRanking[] {
  const ordenados = items
    .map((it) => ({ id: it.id, label: it.label, value: valorDe(it, medida), item: it }))
    .filter((it) => it.value > 0)
    .sort((a, b) => b.value - a.value);

  const cabeza = ordenados.slice(0, top);
  if (!conOtros || ordenados.length <= top) return cabeza;

  const resto = ordenados.slice(top);
  return [
    ...cabeza,
    {
      id: null,
      label: `Otros (${resto.length})`,
      value: resto.reduce((acc, it) => acc + it.value, 0),
      esOtros: true,
    },
  ];
}

// ── Demora de valorización ──────────────────────────────────────────────────

export interface PeriodoValorizacion {
  clave: string;
  /** % valorizado de lo facturable (valorizado + pendiente); null si el período no tiene nada facturable. */
  pct: number | null;
  /** Mucho menos valorizado que lo habitual: sus importes todavía van a crecer. */
  incompleto: boolean;
}

export interface AnalisisValorizacion {
  periodos: PeriodoValorizacion[];
  /** % valorizado habitual (mediana de los períodos más antiguos); null si no hay con qué comparar. */
  habitual: number | null;
  incompletos: PeriodoValorizacion[];
}

/** Sin otros períodos con qué comparar, por debajo de esto se considera sin valorizar. */
const UMBRAL_ABSOLUTO_PCT = 40;
/** Un período es incompleto si está por debajo de esta fracción de lo habitual. */
const FRACCION_HABITUAL = 0.75;
/** Los últimos períodos son los que pueden estar en demora: no entran en el cálculo de lo habitual. */
const PERIODOS_RECIENTES = 3;

const mediana = (valores: number[]): number | null => {
  if (!valores.length) return null;
  const orden = [...valores].sort((a, b) => a - b);
  const medio = Math.floor(orden.length / 2);
  return orden.length % 2 ? orden[medio] : (orden[medio - 1] + orden[medio]) / 2;
};

/**
 * Detecta qué períodos de la serie todavía están en demora de valorización.
 * Lo habitual sale de la propia serie (los períodos más viejos), porque cada hospital valoriza
 * a su ritmo: no hay un porcentaje "correcto" universal.
 */
export function analizarValorizacion(serie: PuntoSerieProduccion[]): AnalisisValorizacion {
  const pct = (p: PuntoSerieProduccion): number | null => {
    const { valorizadas, sinValorizar } = p.valorizacion;
    const base = valorizadas + sinValorizar;
    return base > 0 ? (valorizadas / base) * 100 : null;
  };

  const porcentajes = serie.map(pct);
  const antiguos = porcentajes.slice(0, Math.max(0, porcentajes.length - PERIODOS_RECIENTES));
  const referencia = antiguos.length >= 3 ? antiguos : porcentajes;
  const habitual = referencia.length >= 3 ? mediana(referencia.filter((v): v is number => v != null)) : null;

  const periodos = serie.map((p, i) => {
    const v = porcentajes[i];
    const incompleto =
      v != null && (habitual != null ? v < habitual * FRACCION_HABITUAL : v < UMBRAL_ABSOLUTO_PCT);
    return { clave: p.clave, pct: v, incompleto };
  });

  return { periodos, habitual, incompletos: periodos.filter((p) => p.incompleto) };
}

/**
 * Limitaciones del dato para el período mostrado: lo que queda fuera de una
 * dimensión o todavía no está cargado. Se muestran en letra chica al pie de la
 * página y se repiten en la hoja "Resumen" del Excel.
 */
export function notasCalidad(data: AnaliticaProduccion, soloValorizadas: boolean): string[] {
  const { calidad, liquidadoPct } = data.resumen;
  const notas: string[] = [];

  if (calidad.sinEspecialidad > 0) {
    notas.push(
      `${entero(calidad.sinEspecialidad)} prestaciones corresponden a profesionales sin especialidad cargada en el origen: figuran como “Sin especialidad” y no se pueden usar como filtro.`,
    );
  }
  if (calidad.sinSector > 0) {
    notas.push(
      `${entero(calidad.sinSector)} prestaciones no tienen sector informado: figuran como “Sin sector” y no se pueden usar como filtro.`,
    );
  }
  if (calidad.sinProfesional > 0) {
    notas.push(
      `${entero(calidad.sinProfesional)} prácticas no tienen profesional asignado: cuentan en las prácticas, pero no generan honorarios.`,
    );
  }
  if (data.liquidadoDisponible && liquidadoPct != null && liquidadoPct < 30) {
    notas.push(
      `Solo el ${porcentaje(liquidadoPct)} de lo valorizado tiene liquidación cargada: el “Liquidado” refleja lo importado hasta ahora, no lo que falta cobrar.`,
    );
  }
  if (!soloValorizadas) {
    notas.push(
      'Con “Solo valorizadas” destildado, el importe sigue sumando únicamente lo valorizado; las prácticas sin valorizar y las de coberturas no facturables suman cantidad, no importe.',
    );
  }
  return notas;
}

export function toYYYYMMDD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** Etiqueta del eje X según la granularidad que eligió el backend. */
export function etiquetaSerie(clave: string, granularidad: Granularidad): string {
  if (granularidad === 'mes') {
    const [anio, mes] = clave.split('-');
    return `${MESES[Number(mes) - 1] ?? mes} ${anio.slice(2)}`;
  }
  const [, mes, dia] = clave.split('-');
  return granularidad === 'semana' ? `Sem ${dia}/${mes}` : `${dia}/${mes}`;
}

export interface RangoRapido {
  id: string;
  label: string;
  rango: () => { desde: string; hasta: string };
}

export const RANGOS_RAPIDOS: RangoRapido[] = [
  {
    id: 'mes-actual',
    label: 'Mes actual',
    rango: () => {
      const hoy = new Date();
      return { desde: toYYYYMMDD(new Date(hoy.getFullYear(), hoy.getMonth(), 1)), hasta: toYYYYMMDD(hoy) };
    },
  },
  {
    id: 'mes-anterior',
    label: 'Mes anterior',
    rango: () => {
      const hoy = new Date();
      return {
        desde: toYYYYMMDD(new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)),
        hasta: toYYYYMMDD(new Date(hoy.getFullYear(), hoy.getMonth(), 0)),
      };
    },
  },
  {
    id: 'trimestre',
    label: 'Últimos 3 meses',
    rango: () => {
      const hoy = new Date();
      return { desde: toYYYYMMDD(new Date(hoy.getFullYear(), hoy.getMonth() - 2, 1)), hasta: toYYYYMMDD(hoy) };
    },
  },
  {
    id: 'anio-actual',
    label: 'Año actual',
    rango: () => {
      const hoy = new Date();
      return { desde: toYYYYMMDD(new Date(hoy.getFullYear(), 0, 1)), hasta: toYYYYMMDD(hoy) };
    },
  },
  {
    id: '12-meses',
    label: 'Últimos 12 meses',
    rango: () => {
      const hoy = new Date();
      return { desde: toYYYYMMDD(new Date(hoy.getFullYear(), hoy.getMonth() - 11, 1)), hasta: toYYYYMMDD(hoy) };
    },
  },
];
