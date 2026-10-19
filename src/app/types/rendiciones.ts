export type EstadoRendicion = 'abierta' | 'cerrada';

export type TipoPrestacion = 'H' | 'G' | 'M' | 'Y';

export interface ImportesRendicion {
	honorarios: number;
	gastos: number;
	medicamentos: number;
	otros: number;
	total: number;
}

export interface CatalogosRendicion {
	clientes: { valor: number; razonSocial: string; tipo: string }[];
	convenios: {
		codigo: number;
		obraSocial: number;
		descripcion: string;
		vigenciaDesde: string | null;
		vigenciaHasta: string | null;
	}[];
	tiposCliente: { valor: string; descripcion: string }[];
	tiposPrestacion: { valor: TipoPrestacion; descripcion: string }[];
}

export interface Rendicion {
	id: number;
	fechaGraba: string | null;
	operador: { valor: number; nombre: string | null };
	tipoCliente: { valor: string; descripcion: string };
	cliente: { valor: number; razonSocial: string | null };
	convenio: { codigo: number; descripcion: string | null; obraSocial: number | null };
	/** YYYY-MM-DD; casi siempre el día 1 del mes. */
	periodo: string | null;
	importes: ImportesRendicion;
	visitas: number;
	observaciones: string;
	empresa: number;
	sucursal: number;
	estado: EstadoRendicion;
	cierre: { fecha: string | null; hora: string | null; operador: number } | null;
}

export interface ListadoRendiciones {
	filas: Rendicion[];
	total: number;
	pagina: number;
	tamPagina: number;
	resumen: {
		total: number;
		abierta: number;
		cerrada: number;
		importes: ImportesRendicion & { visitas: number };
	};
}

export interface RendicionDetalle extends Rendicion {
	/** Totales recalculados desde las líneas valorizadas. */
	detalle: {
		importes: ImportesRendicion;
		lineas: number;
		lineasSinValor: number;
		visitas: number;
		facturas: number;
		lineasLiquidacion: number;
	};
	/** Importes (o visitas) de la cabecera que no coinciden con la suma de las líneas. */
	diferencias: (keyof ImportesRendicion | 'visitas')[];
	/** Sin líneas, facturas ni liquidación: es la única que se puede borrar. */
	vacia: boolean;
}

export interface VisitaRendida {
	numeroVisita: number;
	paciente: { id: number; nombre: string | null; documento: { tipo: string | null; numero: number } | null };
	clase: { valor: string; descripcion: string } | null;
	/** Fechas de la admisión (imVisita), YYYY-MM-DD. */
	ingreso: string | null;
	egreso: string | null;
	/** Primera y última fecha de las prestaciones rendidas. */
	desde: string | null;
	hasta: string | null;
	lineas: number;
	sinValor: number;
	importes: ImportesRendicion;
}

export type EstadoValorizacion = 'coincide' | 'difiere' | 'sin_regla' | 'no_cubre' | 'calculada' | 'vademecum';

export interface LineaRendida {
	id: number;
	numeroVisita: number;
	paciente: string | null;
	tipo: { valor: string; descripcion: string };
	modulo: { valor: string; descripcion: string };
	/** `tipo`: tipo de la práctica en el nomenclador o moduladas (columna "L" del escritorio). */
	practica: { codigo: number; descripcion: string | null; tipo: string | null };
	profesional: { matricula: number; nombre: string | null } | null;
	funcion: { valor: number; descripcion: string | null } | null;
	fecha: string | null;
	cantidad: number;
	porcentaje: number;
	importeUnitario: number;
	importeFinal: number;
	bonificacion: { importe: number; porcentaje: number };
	convenio: number;
	regla: { desde: number; hasta: number; tipoValor: string; valor: number } | null;
	valorizacion: { estado: EstadoValorizacion; manual?: boolean };
}

export interface Pagina<T> {
	filas: T[];
	total: number;
	pagina: number;
	tamPagina: number;
}

export interface FacturaRendicion {
	id: number;
	comprobante: string;
	letra: string;
	sucursal: number;
	numero: number;
	fechaGraba: string | null;
	fechaEmision: string | null;
	periodo: string | null;
	razonSocial: string | null;
	neto: number;
	iva: number;
	porcentajeIva: number;
	total: number;
	saldo: number;
}

export interface DatosCabeceraRendicion {
	idCliente: number;
	idConvenio: number;
	/** YYYY-MM */
	periodo: string;
	observaciones: string;
}
