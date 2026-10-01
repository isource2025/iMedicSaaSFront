/**
 * Tipos de la producción hospitalaria.
 * Espejo de GET /api/indicadores/produccion, /produccion/opciones y
 * /produccion/resumen-mes (ver produccionHospital.service.js en el back).
 */

export type LiquidacionFiltro = 'todas' | 'liquidadas' | 'pendientes';

export type Granularidad = 'dia' | 'semana' | 'mes';

/** Filtros que viajan al backend. Las listas son ids (enteros o códigos de catálogo). */
export interface FiltrosProduccion {
  fechaInicio: string;
  fechaFin: string;
  /**
   * true (por defecto): sólo prestaciones valorizadas.
   * false: incluye también las sin valorizar y las de coberturas no facturables.
   */
  soloValorizadas: boolean;
  liquidacion: LiquidacionFiltro;
  coberturas: string[];
  profesionales: string[];
  especialidades: string[];
  servicios: string[];
  sectores: string[];
  clases: string[];
  funciones: string[];
  rendiciones: string[];
}

export interface Metricas {
  /** Prácticas distintas (una práctica con ayudante cuenta una sola vez). */
  practicas: number;
  /** Filas práctica × profesional. */
  prestaciones: number;
  pacientes: number;
  /** Suma de honorarios valorizados. */
  facturado: number;
  /** Suma de ImporteLiquidado de las valorizadas. */
  liquidado: number;
}

export interface EstadoValorizacion {
  practicas: number;
  prestaciones: number;
  importe: number;
}

export interface ResumenProduccion extends Metricas {
  visitas: number;
  profesionales: number;
  ticketPromedio: number | null;
  /** % de las prestaciones valorizadas que ya tienen importe liquidado. */
  liquidadoPct: number | null;
  porEstado: {
    valorizada: EstadoValorizacion;
    sinValorizar: EstadoValorizacion;
    noFacturable: EstadoValorizacion;
  };
  calidad: {
    sinSector: number;
    sinEspecialidad: number;
    sinProfesional: number;
    prestaciones: number;
  };
}

export interface VariacionProduccion {
  practicas: number | null;
  facturado: number | null;
  liquidado: number | null;
  pacientes: number | null;
}

export interface ComparacionProduccion {
  periodo: { inicio: string; fin: string };
  practicas: number;
  facturado: number;
  liquidado: number;
  pacientes: number;
  variacion: VariacionProduccion;
}

export interface PuntoSerieProduccion extends Metricas {
  /** yyyy-mm-dd (día o inicio de semana) o yyyy-mm (mes). */
  clave: string;
  /**
   * Prácticas del período por estado de valorización, siempre sobre todos los estados
   * (no dependen del filtro "solo valorizadas"): muestran cuánto falta valorizar.
   */
  valorizacion: {
    valorizadas: number;
    sinValorizar: number;
    noFacturable: number;
  };
}

export interface ItemDimension extends Metricas {
  /** null = sin dato (se agrupa bajo "(Sin …)"). */
  id: string | null;
  label: string;
}

export interface ItemPractica extends Metricas {
  id: string;
  label: string;
  codigo: number;
  tipo: string;
}

export interface PeriodoProduccion {
  inicio: string;
  fin: string;
  dias: number;
  /** El fin pedido estaba en el futuro y se acotó a hoy. */
  finAjustado: boolean;
}

export interface AnaliticaProduccion {
  periodo: PeriodoProduccion;
  filtros: Omit<FiltrosProduccion, 'fechaInicio' | 'fechaFin'>;
  /** false si el tenant todavía no tiene la columna imFacDetalle.ImporteLiquidado. */
  liquidadoDisponible: boolean;
  resumen: ResumenProduccion;
  comparacion: ComparacionProduccion;
  granularidad: Granularidad;
  serie: PuntoSerieProduccion[];
  porCobertura: ItemDimension[];
  porProfesional: ItemDimension[];
  porEspecialidad: ItemDimension[];
  porServicio: ItemDimension[];
  porSector: ItemDimension[];
  porClase: ItemDimension[];
  porFuncion: ItemDimension[];
  topPracticas: ItemPractica[];
  meta: { generadoEnMs: number };
}

export interface OpcionFiltro {
  id: string;
  label: string;
}

export interface OpcionConVolumen extends OpcionFiltro {
  practicas: number;
}

export interface OpcionSector extends OpcionFiltro {
  servicioId: string | null;
  /** 'A' ambulatorio, 'I' internación. */
  ambInt: string | null;
}

export interface OpcionesProduccion {
  periodo: PeriodoProduccion;
  coberturas: OpcionConVolumen[];
  profesionales: OpcionConVolumen[];
  especialidades: OpcionFiltro[];
  servicios: OpcionFiltro[];
  sectores: OpcionSector[];
  clases: OpcionFiltro[];
  funciones: OpcionFiltro[];
}

/** Card del panel de control: mes en curso contra el mismo tramo del mes anterior. */
export interface ResumenProduccionMes {
  mes: string;
  periodo: { inicio: string; fin: string };
  /** Prácticas del mes en todos los estados (comparables: no dependen de la demora de valorización). */
  practicas: number;
  practicasValorizadas: number;
  /** % de lo facturable del mes (valorizado + pendiente) que ya tiene honorarios valorizados. */
  valorizadoPct: number | null;
  /** Mes completo de hace tres meses: cuánto se valoriza "normalmente". */
  referencia: { mes: string; valorizadoPct: number | null };
  facturado: number;
  liquidado: number;
  liquidadoDisponible: boolean;
  /** Contra el mismo tramo del mes anterior. */
  variacionPracticas: number | null;
}

/** Medida que muestran los gráficos de ranking. */
export type MedidaProduccion = 'facturado' | 'liquidado' | 'practicas';

export const FILTROS_VACIOS: Pick<
  FiltrosProduccion,
  'coberturas' | 'profesionales' | 'especialidades' | 'servicios' | 'sectores' | 'clases' | 'funciones' | 'rendiciones'
> = {
  coberturas: [],
  profesionales: [],
  especialidades: [],
  servicios: [],
  sectores: [],
  clases: [],
  funciones: [],
  rendiciones: [],
};
