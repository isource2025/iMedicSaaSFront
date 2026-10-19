/** Facturación > Convenios (imClientesConvenios y sus tablas de detalle). */

export type EstadoVigencia = 'vigente' | 'futuro' | 'vencido' | 'sin_vigencia';

export type PestanaId = 'valores' | 'nomenclador' | 'moduladas' | 'vademecum' | 'genericos' | 'complejidad';

export type TipoColumna =
	| 'texto'
	| 'numero'
	| 'importe'
	| 'flag'
	| 'letra'
	| 'practica'
	| 'funcion'
	| 'tipoValor'
	| 'troquel'
	| 'complejidad'
	| 'fecha'
	| 'categoria';

export interface ColumnaDef {
	name: string;
	label: string;
	kind: TipoColumna;
	sqlType: string;
	length?: number;
	required: boolean;
	defecto?: string | number;
	min?: number;
	max?: number;
	scale?: number;
	/** Valor fijo que no se muestra (Troquel = 0 en Genéricos). */
	oculta?: boolean;
}

export interface PestanaDef {
	id: PestanaId;
	titulo: string;
	paginada: boolean;
	filtroFuncion: boolean;
	/** Tabla de catálogo de la que salen las prácticas o troqueles (o null). */
	catalogo: string | null;
	ajustables: string[];
	/** El ajuste por porcentaje solo toca filas con TipoValor '$'. */
	ajusteSoloFijos: boolean;
	columnas: ColumnaDef[];
}

export interface CatalogosConvenio {
	obrasSociales: { valor: number; razonSocial: string }[];
	letras: { valor: string; descripcion: string }[];
	funciones: { valor: number; descripcion: string; enCatalogo: boolean }[];
	categorias: { valor: number; descripcion: string; porcentaje: number | null }[];
	complejidades: number[];
	pestanas: PestanaDef[];
}

export type ConteosPestanas = Record<PestanaId, number>;

export interface ConvenioListado {
	codigo: number;
	descripcion: string;
	obraSocial: { valor: number; razonSocial: string | null };
	vigenciaDesde: string | null;
	vigenciaHasta: string | null;
	estado: EstadoVigencia;
	multiConvenio: boolean;
	conteos: ConteosPestanas;
}

export interface ResumenEstados {
	total: number;
	vigente: number;
	futuro: number;
	vencido: number;
	sin_vigencia: number;
}

export interface ListadoConvenios {
	filas: ConvenioListado[];
	total: number;
	pagina: number;
	tamPagina: number;
	resumen: ResumenEstados;
}

/** Campos editables de la cabecera; fechas como 'yyyy-mm-dd' o null. */
export interface CabeceraConvenio {
	Codigo?: number;
	Valor: number;
	Descripcion: string;
	VigenciaDesde: string | null;
	VigenciaHasta: string | null;
	TipoValor: number | null;
	CatProfesional: number | null;
	CoberturaHonorarios: number | null;
	CoberturaGastos: number | null;
	CoberturaMedicamentos: number | null;
	CoberturaDescartables: number | null;
	PrecioMedicamentos: number | null;
	AplicaPrecioMed: string | null;
	MedicamTotal: number | null;
	MedicamSobre: string | null;
	DescartTotal: number | null;
	DescartSobre: string | null;
	MultiConvenio: number;
}

export interface ConvenioDetalle extends ConvenioListado {
	cabecera: CabeceraConvenio;
}

export type ValorCelda = string | number | null;

export interface FilaDetalle {
	_id: string;
	_catalogo?: { existe: boolean; descripcion: string | null };
	[columna: string]: ValorCelda | FilaDetalle['_catalogo'] | undefined;
}

export interface PaginaPestana {
	pestana: PestanaId;
	filas: FilaDetalle[];
	total: number;
	pagina: number;
	tamPagina: number;
	porFuncion?: { funcion: number | null; cantidad: number }[];
}

export interface LoteCambios {
	altas: Record<string, ValorCelda>[];
	cambios: (Record<string, ValorCelda> & { _id: string })[];
	bajas: string[];
}

export interface ResultadoLote {
	altas: number;
	cambios: number;
	bajas: number;
}

export interface UsoConvenio {
	id: string;
	etiqueta: string;
	tabla: string;
	columna: string;
	cantidad: number;
}

export interface ResultadoCatalogo {
	codigo: number;
	descripcion: string;
	detalle: string;
}

export interface ParametrosAjuste {
	porcentaje: number | string;
	pestanas?: PestanaId[];
	funcion?: number | null;
	desde?: number | null;
	hasta?: number | null;
}

export interface PreviaAjuste {
	porcentaje: number;
	pestanas: {
		pestana: PestanaId;
		titulo: string;
		aplica: boolean;
		columnas?: string[];
		filas: number;
		desbordan: number;
		muestra: { referencia: string; antes: number; despues: number }[];
	}[];
}

export interface ExportacionConvenio {
	convenio: ConvenioDetalle;
	pestanas: Record<PestanaId, FilaDetalle[]>;
}

export interface ReporteMantenimiento {
	huerfanas: { pestana: PestanaId; titulo: string; filas: number; convenios: { codigo: number; filas: number }[] }[];
	practicasXConvenioHuerfanas: number;
	duplicadosNomenclador: { codigo: number; descripcion: string; grupos: number; sobrantes: number }[];
	rangosInvertidos: { pestana: PestanaId; codigo: number; descripcion: string; desde: number; hasta: number }[];
	conveniosVacios: { codigo: number; descripcion: string }[];
}
