import type jsPDF from 'jspdf';

/**
 * Diseño institucional de los PDFs (Configuración → Institución → Diseño de PDF).
 * Se guarda como JSON por empresa y lo aplican el header/footer comunes de `pdfHeader`.
 */

export type PdfPlantilla = 'moderna' | 'clasica' | 'sobria';
export type PdfFuente = 'helvetica' | 'times' | 'courier';
export type PdfBarra = 'gruesa' | 'fina' | 'ninguna';
export type PdfEstiloPanel = 'relleno' | 'borde';
export type PdfModoDatos = 'todos' | 'cargados' | 'ninguno';

export type CampoInstitucion =
	| 'razonSocial'
	| 'direccion'
	| 'localidad'
	| 'provincia'
	| 'telefono'
	| 'cuit'
	| 'condicionIva'
	| 'ingresosBrutos'
	| 'email'
	| 'fax';

export type CampoPaciente = 'visita' | 'ingreso' | 'ubicacion' | 'cobertura' | 'afiliado' | 'numeroHC';

export interface PdfDiseno {
	plantilla: PdfPlantilla;
	colorMarca: string;
	fuente: PdfFuente;
	encabezado: {
		mostrarLogo: boolean;
		barra: PdfBarra;
		datosInstitucion: PdfModoDatos;
		campos: Record<CampoInstitucion, boolean>;
	};
	paciente: {
		mostrar: boolean;
		estilo: PdfEstiloPanel;
		mostrarEdad: boolean;
		campos: Record<CampoPaciente, boolean>;
	};
	pie: {
		institucion: boolean;
		generado: boolean;
		paginas: boolean;
		texto: string;
	};
}

/** Orden de lectura: primero la columna izquierda, después la derecha. */
export const CAMPOS_INSTITUCION: Array<{ id: CampoInstitucion; label: string; columna: 0 | 1 }> = [
	{ id: 'razonSocial', label: 'Razón social', columna: 0 },
	{ id: 'direccion', label: 'Dirección', columna: 0 },
	{ id: 'localidad', label: 'Localidad', columna: 0 },
	{ id: 'provincia', label: 'Provincia', columna: 0 },
	{ id: 'telefono', label: 'Teléfono', columna: 0 },
	{ id: 'cuit', label: 'CUIT', columna: 1 },
	{ id: 'condicionIva', label: 'Cond. IVA', columna: 1 },
	{ id: 'ingresosBrutos', label: 'IIBB', columna: 1 },
	{ id: 'email', label: 'Email', columna: 1 },
	{ id: 'fax', label: 'Fax', columna: 1 },
];

export const CAMPOS_PACIENTE: Array<{ id: CampoPaciente; label: string }> = [
	{ id: 'visita', label: 'N° Visita' },
	{ id: 'ingreso', label: 'Ingreso' },
	{ id: 'ubicacion', label: 'Ubicación' },
	{ id: 'cobertura', label: 'Cobertura' },
	{ id: 'afiliado', label: 'N° Afiliado' },
	{ id: 'numeroHC', label: 'N° H. Clínica' },
];

const todos = <K extends string>(ids: Array<{ id: K }>): Record<K, boolean> =>
	Object.fromEntries(ids.map((c) => [c.id, true])) as Record<K, boolean>;

export const PDF_DISENO_DEFAULT: PdfDiseno = {
	plantilla: 'moderna',
	colorMarca: '#0083A9',
	fuente: 'helvetica',
	encabezado: {
		mostrarLogo: true,
		barra: 'gruesa',
		datosInstitucion: 'todos',
		campos: todos(CAMPOS_INSTITUCION),
	},
	paciente: {
		mostrar: true,
		estilo: 'relleno',
		mostrarEdad: true,
		campos: todos(CAMPOS_PACIENTE),
	},
	pie: { institucion: true, generado: true, paginas: true, texto: '' },
};

/** Una plantilla es un punto de partida: fija estética, no qué datos se muestran. */
export const PLANTILLAS_PDF: Array<{
	id: PdfPlantilla;
	nombre: string;
	descripcion: string;
	valores: Pick<PdfDiseno, 'colorMarca' | 'fuente'> & { barra: PdfBarra; estilo: PdfEstiloPanel };
}> = [
	{
		id: 'moderna',
		nombre: 'Moderna',
		descripcion: 'Color de marca, barra gruesa y panel del paciente sombreado.',
		valores: { colorMarca: '#0083A9', fuente: 'helvetica', barra: 'gruesa', estilo: 'relleno' },
	},
	{
		id: 'clasica',
		nombre: 'Clásica',
		descripcion: 'Tipografía con serifa, línea fina y recuadros. Aire de documento tradicional.',
		valores: { colorMarca: '#1F2937', fuente: 'times', barra: 'fina', estilo: 'borde' },
	},
	{
		id: 'sobria',
		nombre: 'Sobria',
		descripcion: 'Grises neutros, sin barra: rinde bien impresa en blanco y negro.',
		valores: { colorMarca: '#334155', fuente: 'helvetica', barra: 'ninguna', estilo: 'borde' },
	},
];

export const COLORES_SUGERIDOS = ['#0083A9', '#0F766E', '#1D4ED8', '#7C3AED', '#BE123C', '#B45309', '#334155', '#1F2937'];

export function aplicarPlantilla(d: PdfDiseno, id: PdfPlantilla): PdfDiseno {
	const p = PLANTILLAS_PDF.find((x) => x.id === id);
	if (!p) return d;
	return {
		...d,
		plantilla: id,
		colorMarca: p.valores.colorMarca,
		fuente: p.valores.fuente,
		encabezado: { ...d.encabezado, barra: p.valores.barra },
		paciente: { ...d.paciente, estilo: p.valores.estilo },
	};
}

const esHex = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
const uno = <T extends string>(v: unknown, opciones: readonly T[], def: T): T =>
	opciones.includes(v as T) ? (v as T) : def;
const bool = (v: unknown, def: boolean) => (typeof v === 'boolean' ? v : def);

function flags<K extends string>(raw: unknown, def: Record<K, boolean>): Record<K, boolean> {
	const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
	return Object.fromEntries(Object.entries(def).map(([k, v]) => [k, bool(r[k], v as boolean)])) as Record<K, boolean>;
}

/** Completa con defaults y descarta valores desconocidos (diseños viejos o editados a mano). */
export function normalizarDiseno(raw?: unknown): PdfDiseno {
	const d = PDF_DISENO_DEFAULT;
	const obj = (v: unknown) => (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
	const r = obj(raw);
	const e = obj(r.encabezado);
	const p = obj(r.paciente);
	const f = obj(r.pie);
	return {
		plantilla: uno(r.plantilla, ['moderna', 'clasica', 'sobria'] as const, d.plantilla),
		colorMarca: esHex(r.colorMarca) ? (r.colorMarca as string).toUpperCase() : d.colorMarca,
		fuente: uno(r.fuente, ['helvetica', 'times', 'courier'] as const, d.fuente),
		encabezado: {
			mostrarLogo: bool(e.mostrarLogo, d.encabezado.mostrarLogo),
			barra: uno(e.barra, ['gruesa', 'fina', 'ninguna'] as const, d.encabezado.barra),
			datosInstitucion: uno(e.datosInstitucion, ['todos', 'cargados', 'ninguno'] as const, d.encabezado.datosInstitucion),
			campos: flags(e.campos, d.encabezado.campos),
		},
		paciente: {
			mostrar: bool(p.mostrar, d.paciente.mostrar),
			estilo: uno(p.estilo, ['relleno', 'borde'] as const, d.paciente.estilo),
			mostrarEdad: bool(p.mostrarEdad, d.paciente.mostrarEdad),
			campos: flags(p.campos, d.paciente.campos),
		},
		pie: {
			institucion: bool(f.institucion, d.pie.institucion),
			generado: bool(f.generado, d.pie.generado),
			paginas: bool(f.paginas, d.pie.paginas),
			texto: typeof f.texto === 'string' ? f.texto.slice(0, 140) : '',
		},
	};
}

export type RGB = [number, number, number];

export function hexARgb(hex: string): RGB {
	const n = Number.parseInt(hex.slice(1), 16);
	return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Mezcla con blanco: 0 = color puro, 1 = blanco. */
export function aclarar([r, g, b]: RGB, t: number): RGB {
	return [Math.round(r + (255 - r) * t), Math.round(g + (255 - g) * t), Math.round(b + (255 - b) * t)];
}

const FUENTE_PATCH = Symbol('pdfFuente');

/**
 * Todos los módulos dibujan con 'helvetica'; en vez de tocar cada uno, el documento
 * traduce esa familia a la elegida (incluye las tablas de autoTable).
 */
export function aplicarFuente(doc: jsPDF, fuente: PdfFuente) {
	const d = doc as jsPDF & { [FUENTE_PATCH]?: PdfFuente };
	if (fuente === 'helvetica' && !d[FUENTE_PATCH]) return;
	if (!d[FUENTE_PATCH]) {
		const original = doc.setFont.bind(doc);
		doc.setFont = ((family: string, ...rest: [string?, (string | number)?]) =>
			original(family === 'helvetica' && d[FUENTE_PATCH] ? d[FUENTE_PATCH]! : family, ...rest)) as typeof doc.setFont;
	}
	d[FUENTE_PATCH] = fuente;
	doc.setFont('helvetica', 'normal');
}
