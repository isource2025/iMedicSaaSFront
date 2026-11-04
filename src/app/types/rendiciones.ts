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
	tipoAdmision: { valor: string; descripcion: string } | null;
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
	/** Misma regla que el filtro/contadores: IMPORTE_FINAL = 0. */
	sinValor: boolean;
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

/** Filtros del reporte PDF «Resumen» (RENDICION RESUMIDA). */
export interface FiltrosReporteResumen {
	/** Valor de imTipoAdmision; vacío = todos. */
	tipoAdmision?: string;
	/** Si true (o visitas vacío), incluye todas las admisiones de la rendición. */
	todasLasAdmisiones?: boolean;
	/** Números de visita cuando no es «todas». */
	visitas?: number[];
	/** Rubros: G gastos, H honorarios, M medicamentos. */
	tipos: Array<'G' | 'H' | 'M'>;
	/** Letras de prácticas (imNomencladorTipoLetra); vacío o ['*'] = todas. */
	letras?: string[];
}

export interface FilaReporteResumen {
	numeroVisita: number;
	paciente: string | null;
	nroAfiliado: string | null;
	nroAutorizacion: string | null;
	ingreso: string | null;
	tipoAdmision: string | null;
	gastos: number;
	honorarios: number;
	medicamentos: number;
	total: number;
}

export interface ReporteResumen {
	rendicion: {
		id: number;
		cliente: { valor: number; razonSocial: string | null };
		convenio: { codigo: number; descripcion: string | null; obraSocial: number | null };
		periodo: string | null;
		fechaGraba: string | null;
		observaciones: string | null;
	};
	filtros: {
		tipoAdmision: string | null;
		todasLasAdmisiones: boolean;
		visitas: number[];
		tipos: Array<'G' | 'H' | 'M'>;
		letras: string[];
	};
	filas: FilaReporteResumen[];
	totales: { gastos: number; honorarios: number; medicamentos: number; total: number };
	totalPacientes: number;
}

/** Filtros del reporte PDF «Detalle» (RENDICION INDIVIDUAL). Sin agrupar por rubro. */
export interface FiltrosReporteDetalle {
	tipoAdmision?: string;
	todasLasAdmisiones?: boolean;
	visitas?: number[];
	tipos: Array<'G' | 'H' | 'M'>;
	letras?: string[];
	/** Salto de página al empezar cada admisión. */
	saltarHojaPorAdmision?: boolean;
	/** Mostrar importes unitarios y totales de cada línea. */
	incluirValorizacion?: boolean;
}

export interface LineaReporteDetalle {
	tipo: string;
	descripcion: string;
	fecha: string | null;
	cantidad: number;
	porcentaje: number;
	importeUnitario: number;
	importeFinal: number;
}

export interface AdmisionReporteDetalle {
	numeroVisita: number;
	paciente: {
		id: number | null;
		nombre: string | null;
		documento: { tipo: string | null; numero: number } | null;
		nroAfiliado: string | null;
		domicilio: string | null;
		nroLegajo: string | null;
		cuit: string | null;
		nroSiniestro: string | null;
		nroPoliza: string | null;
		cuitOsArt: string | null;
		dominioTransporte: string | null;
	};
	ingreso: { fecha: string | null; hora: string | null };
	egreso: { fecha: string | null; hora: string | null };
	cobertura: string | null;
	diagnostico: string | null;
	clase: { valor: string; descripcion: string } | null;
	tipoAdmision: string | null;
	gastos: LineaReporteDetalle[];
	honorarios: LineaReporteDetalle[];
	medicamentos: LineaReporteDetalle[];
	total: number;
}

export interface ReporteDetalle {
	rendicion: {
		id: number;
		cliente: { valor: number; razonSocial: string | null };
		convenio: { codigo: number; descripcion: string | null; obraSocial: number | null };
		periodo: string | null;
		fechaGraba: string | null;
		observaciones: string | null;
	};
	filtros: {
		tipoAdmision: string | null;
		todasLasAdmisiones: boolean;
		visitas: number[];
		tipos: Array<'G' | 'H' | 'M'>;
		letras: string[];
	};
	admisiones: AdmisionReporteDetalle[];
	totalAdmisiones: number;
}

/** Filtros del reporte PDF «Por profesional» (honorarios agrupados por matrícula). */
export interface FiltrosReporteProfesional {
	tipoAdmision?: string;
	todasLasAdmisiones?: boolean;
	visitas?: number[];
	letras?: string[];
	saltarHojaPorProfesional?: boolean;
}

export interface LineaReporteProfesional {
	numeroVisita: number;
	paciente: string | null;
	nroAfiliado: string | null;
	fecha: string | null;
	codigo: number;
	funcion: number;
	funcionDescripcion: string | null;
	cantidad: number;
	porcentaje: number;
	importe: number;
}

export interface GrupoReporteProfesional {
	matricula: number;
	nombre: string | null;
	lineas: LineaReporteProfesional[];
	total: number;
}

export interface ReporteProfesional {
	rendicion: {
		id: number;
		cliente: { valor: number; razonSocial: string | null };
		convenio: { codigo: number; descripcion: string | null; obraSocial: number | null };
		periodo: string | null;
		fechaGraba: string | null;
		observaciones: string | null;
	};
	filtros: {
		tipoAdmision: string | null;
		todasLasAdmisiones: boolean;
		visitas: number[];
		letras: string[];
	};
	grupos: GrupoReporteProfesional[];
	totalGeneral: number;
	totalLineas: number;
	totalProfesionales: number;
}

export interface ProfesionalRendicion {
	matricula: number;
	nombre: string | null;
	lineas: number;
}

export interface FiltrosReporteProfesionalSumario {
	/** Si true (o matrículas vacío), incluye todos los médicos de la rendición. */
	todosLosMedicos?: boolean;
	matriculas?: number[];
}

export interface PracticaSumarioProfesional {
	codigo: number;
	descripcion: string;
	cantidad: number;
	importe: number;
}

export interface GrupoReporteProfesionalSumario {
	matricula: number;
	nombre: string | null;
	practicas: PracticaSumarioProfesional[];
	total: number;
}

export interface ReporteProfesionalSumario {
	rendicion: {
		id: number;
		cliente: { valor: number; razonSocial: string | null };
		convenio: { codigo: number; descripcion: string | null; obraSocial: number | null };
		periodo: string | null;
		fechaGraba: string | null;
		observaciones: string | null;
	};
	filtros: {
		todosLosMedicos: boolean;
		matriculas: number[];
	};
	grupos: GrupoReporteProfesionalSumario[];
	totalPracticas: number;
	totalGeneral: number;
	totalProfesionales: number;
}

export interface OpcionesPracticaDetalle {
	practicas: Array<{ codigo: number; descripcion: string | null; lineas: number }>;
	funciones: Array<{ valor: number; descripcion: string; lineas: number }>;
	profesionales: ProfesionalRendicion[];
}

export interface FiltrosReportePracticaDetalle {
	tipos: Array<'G' | 'H' | 'M'>;
	/** Vacío = todas. */
	practicas?: number[];
	funciones?: number[];
	matriculas?: number[];
	orden?: 'admision' | 'practica';
	desglosarModulos?: boolean;
}

export interface LineaReportePracticaDetalle {
	numeroVisita: number;
	paciente: string | null;
	nroAfiliado: string | null;
	ingreso: string | null;
	egreso: string | null;
	diagnostico: string | null;
	codigoDiagnostico: string | null;
	tipo: string;
	modulo: string;
	codigo: number;
	descripcion: string | null;
	fecha: string | null;
	cantidad: number;
	porcentaje: number;
	importe: number;
	matricula: number;
	profesional: string | null;
	funcion: number;
	funcionDescripcion: string | null;
}

export interface ReportePracticaDetalle {
	rendicion: {
		id: number;
		cliente: { valor: number; razonSocial: string | null };
		convenio: { codigo: number; descripcion: string | null; obraSocial: number | null };
		periodo: string | null;
		fechaGraba: string | null;
		observaciones: string | null;
	};
	filtros: {
		tipos: Array<'G' | 'H' | 'M'>;
		practicas: number[];
		funciones: number[];
		matriculas: number[];
		orden: 'admision' | 'practica';
		desglosarModulos: boolean;
	};
	lineas: LineaReportePracticaDetalle[];
	totales: { visitas: number; practicas: number; cantidad: number; importe: number };
}

export interface FiltrosReportePracticaResumen {
	tipos: Array<'G' | 'H' | 'M'>;
	/** Vacío = todas. */
	practicas?: number[];
	desglosarModulos?: boolean;
}

export interface LineaReportePracticaResumen {
	codigo: number;
	descripcion: string | null;
	cantidad: number;
	visitas: number;
	honorarios: number;
	gastos: number;
	total: number;
}

export interface ReportePracticaResumen {
	rendicion: {
		id: number;
		cliente: { valor: number; razonSocial: string | null };
		convenio: { codigo: number; descripcion: string | null; obraSocial: number | null };
		periodo: string | null;
		fechaGraba: string | null;
		observaciones: string | null;
	};
	filtros: {
		tipos: Array<'G' | 'H' | 'M'>;
		practicas: number[];
		desglosarModulos: boolean;
	};
	lineas: LineaReportePracticaResumen[];
	totales: {
		practicas: number;
		cantidad: number;
		visitas: number;
		honorarios: number;
		gastos: number;
		total: number;
	};
}
