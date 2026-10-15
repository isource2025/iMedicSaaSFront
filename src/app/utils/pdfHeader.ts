import type jsPDF from 'jspdf';
import { obtenerLogoEmpresa, obtenerPdfDiseno, type EmpresaInfo } from '../services/empresaService';
import {
	aclarar,
	aplicarFuente,
	CAMPOS_INSTITUCION,
	CAMPOS_PACIENTE,
	hexARgb,
	normalizarDiseno,
	PDF_DISENO_DEFAULT,
	type CampoInstitucion,
	type CampoPaciente,
	type PdfDiseno,
	type RGB,
} from './pdfDiseno';

/**
 * Header / footer institucional común a todos los PDFs clínicos.
 * Cada módulo (HC, evoluciones, epicrisis, etc.) arranca con `drawDocumentHeader`
 * y cierra con `drawRunningHeaders` + `drawDocumentFooters` sobre el documento completo.
 */

export type PDFHeaderPatient = {
	nombre?: string | null;
	documento?: string | number | null;
	numeroDocumento?: string | number | null;
	tipoDocumento?: string | null;
	sexo?: string | null;
	edad?: string | number | null;
	fechaNacimiento?: string | null;
	numeroVisita?: string | number | null;
	fechaIngreso?: string | null;
	horaIngreso?: string | null;
	ubicacion?: string | null;
	cobertura?: string | null;
	afiliado?: string | number | null;
	numeroHC?: string | number | null;
};

export type PDFHeaderOptions = {
	title: string;
	empresaInfo?: EmpresaInfo | null;
	patient?: PDFHeaderPatient | null;
	emittedAt?: Date;
	/** Si no viene, se usa el diseño guardado de la empresa (queda resuelto acá tras el header). */
	diseno?: PdfDiseno;
};

export const PDF_COLORS = {
	brand: [0, 131, 169] as RGB,
	brandSoft: [224, 242, 248] as RGB,
	ink: [15, 23, 42] as RGB,
	text: [51, 65, 85] as RGB,
	muted: [100, 116, 139] as RGB,
	line: [203, 213, 225] as RGB,
	panel: [246, 249, 251] as RGB,
};

/** Los módulos leen PDF_COLORS al dibujar: el color de marca del diseño los alcanza a todos. */
function aplicarColores(diseno: PdfDiseno) {
	const brand = hexARgb(diseno.colorMarca);
	PDF_COLORS.brand = brand;
	PDF_COLORS.brandSoft = aclarar(brand, 0.86);
	PDF_COLORS.panel = diseno.paciente.estilo === 'relleno' ? aclarar(brand, 0.955) : [255, 255, 255];
}

export const PDF_MARGIN_X = 12;
/** Y donde empieza el contenido en páginas 2+ (debajo del header compacto). */
export const PDF_CONTENT_TOP = 20;
/** Espacio reservado al pie para el footer. */
export const PDF_FOOTER_SPACE = 16;

const EMPTY_VALUES = new Set(['', '-', '—', '0', 'null', 'undefined', 'n/a', 'na', 's/d']);

export function cleanPdfValue(value?: string | number | null): string {
	if (value == null) return '';
	const s = String(value).trim();
	return EMPTY_VALUES.has(s.toLowerCase()) ? '' : s;
}

function formatDocumento(value?: string | number | null): string {
	const s = cleanPdfValue(value);
	if (!s) return '';
	const digits = s.replace(/\D/g, '');
	if (!digits || digits.length !== s.replace(/[\s.]/g, '').length) return s;
	return Number(digits).toLocaleString('es-AR');
}

function parseFecha(value?: string | null): Date | null {
	const s = cleanPdfValue(value);
	if (!s) return null;
	const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
	if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
	const ar = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
	if (ar) return new Date(Number(ar[3]), Number(ar[2]) - 1, Number(ar[1]));
	return null;
}

function formatFecha(value?: string | null): string {
	const d = parseFecha(value);
	if (!d) return cleanPdfValue(value);
	return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatHora(value?: string | null): string {
	const s = cleanPdfValue(value);
	const m = s.match(/(\d{1,2}):(\d{2})/);
	return m ? `${m[1].padStart(2, '0')}:${m[2]}` : s;
}

function calcularEdad(fechaNacimiento?: string | null): number | null {
	const nac = parseFecha(fechaNacimiento);
	if (!nac) return null;
	const hoy = new Date();
	let edad = hoy.getFullYear() - nac.getFullYear();
	const m = hoy.getMonth() - nac.getMonth();
	if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
	return edad >= 0 && edad < 130 ? edad : null;
}

function formatEmision(d: Date): string {
	const fecha = d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
	const hora = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
	return `${fecha} ${hora}`;
}

function nombreInstitucion(empresa?: EmpresaInfo | null, fallback = 'Institución'): string {
	return cleanPdfValue(empresa?.razonSocial) || cleanPdfValue(empresa?.descripcion) || fallback;
}

function iniciales(nombre: string): string {
	const stop = new Set(['DE', 'DEL', 'LA', 'LAS', 'EL', 'LOS', 'Y', 'E', 'SA', 'SRL']);
	const palabras = nombre
		.toUpperCase()
		.split(/\s+/)
		.map((w) => w.replace(/[^A-Z0-9ÁÉÍÓÚÑÜ]/g, ''))
		.filter((w) => w && !stop.has(w));
	return palabras.slice(0, 3).map((w) => w[0]).join('') || 'IM';
}

/** Recorta un texto con "…" para que entre en `maxWidth` (usa la fuente activa). */
function fitText(doc: jsPDF, text: string, maxWidth: number): string {
	if (doc.getTextWidth(text) <= maxWidth) return text;
	let s = text;
	while (s.length > 1 && doc.getTextWidth(`${s}…`) > maxWidth) s = s.slice(0, -1);
	return `${s.trimEnd()}…`;
}

function setFont(doc: jsPDF, size: number, style: 'normal' | 'bold' = 'normal', color: RGB = PDF_COLORS.ink) {
	doc.setFont('helvetica', style);
	doc.setFontSize(size);
	doc.setTextColor(...color);
}

type LoadedLogo = { dataUrl: string; width: number; height: number };
const logoCache = new Map<string, Promise<LoadedLogo | null>>();

function loadLogo(src?: string | null): Promise<LoadedLogo | null> {
	const key = cleanPdfValue(src);
	if (!key || typeof window === 'undefined' || typeof Image === 'undefined') return Promise.resolve(null);
	const cached = logoCache.get(key);
	if (cached) return cached;

	const promise = new Promise<LoadedLogo | null>((resolve) => {
		const img = new Image();
		img.crossOrigin = 'anonymous';
		img.onload = () => {
			try {
				const width = img.naturalWidth || img.width;
				const height = img.naturalHeight || img.height;
				if (!width || !height) return resolve(null);
				const canvas = document.createElement('canvas');
				canvas.width = width;
				canvas.height = height;
				const ctx = canvas.getContext('2d');
				if (!ctx) return resolve(null);
				ctx.drawImage(img, 0, 0);
				resolve({ dataUrl: canvas.toDataURL('image/png'), width, height });
			} catch {
				resolve(null);
			}
		};
		img.onerror = () => resolve(null);
		img.src = key;
	});
	logoCache.set(key, promise);
	return promise;
}

function drawLogo(doc: jsPDF, logo: LoadedLogo | null, nombre: string, x: number, y: number, size: number) {
	if (logo) {
		const ratio = logo.width / logo.height;
		const w = ratio >= 1 ? size : size * ratio;
		const h = ratio >= 1 ? size / ratio : size;
		try {
			doc.addImage(logo.dataUrl, 'PNG', x + (size - w) / 2, y + (size - h) / 2, w, h);
			return;
		} catch {
			/* cae al monograma */
		}
	}
	doc.setFillColor(...PDF_COLORS.brand);
	doc.roundedRect(x, y, size, size, 2.5, 2.5, 'F');
	const ini = iniciales(nombre);
	setFont(doc, ini.length > 2 ? 11 : 13, 'bold', [255, 255, 255]);
	doc.text(ini, x + size / 2, y + size / 2, { align: 'center', baseline: 'middle' });
}

type DatoInstitucion = { label: string; value: string };

function valoresInstitucion(empresa?: EmpresaInfo | null): Record<CampoInstitucion, string> {
	const calle = [empresa?.calle, empresa?.calle_nro].map(cleanPdfValue).filter(Boolean).join(' ');
	const pisoDepto = [
		cleanPdfValue(empresa?.piso) && `Piso ${cleanPdfValue(empresa?.piso)}`,
		cleanPdfValue(empresa?.Depto) && `Dto. ${cleanPdfValue(empresa?.Depto)}`,
	]
		.filter(Boolean)
		.join(' ');
	return {
		razonSocial: nombreInstitucion(empresa, ''),
		direccion: [calle, pisoDepto].filter(Boolean).join(', '),
		localidad: cleanPdfValue(empresa?.localidad),
		provincia: cleanPdfValue(empresa?.provincia),
		telefono: cleanPdfValue(empresa?.telefono),
		cuit: cleanPdfValue(empresa?.cuit).replace(/^(\d{2})(\d{8})(\d)$/, '$1-$2-$3'),
		condicionIva: cleanPdfValue(empresa?.condicionIva),
		ingresosBrutos: cleanPdfValue(empresa?.ingresosBrutos),
		email: cleanPdfValue(empresa?.email),
		fax: cleanPdfValue(empresa?.fax),
	};
}

/** Las dos columnas de datos de la institución según el diseño (vacíos con guion en modo «todos»). */
function columnasInstitucion(empresa: EmpresaInfo | null | undefined, diseno: PdfDiseno): DatoInstitucion[][] {
	const modo = diseno.encabezado.datosInstitucion;
	if (modo === 'ninguno') return [];
	const valores = valoresInstitucion(empresa);
	const visibles = CAMPOS_INSTITUCION.filter(
		(c) => diseno.encabezado.campos[c.id] && (modo === 'todos' || valores[c.id]),
	);
	const cols: DatoInstitucion[][] = [[], []];
	for (const c of visibles) cols[c.columna].push({ label: c.label, value: valores[c.id] || '-' });
	// Si una columna queda vacía (modo «cargados»), se reparte para no dejar un hueco.
	const plano = cols.flat();
	if (!cols[0].length || !cols[1].length) {
		const mitad = Math.ceil(plano.length / 2);
		return [plano.slice(0, mitad), plano.slice(mitad)].filter((c) => c.length);
	}
	return cols;
}

/** Línea secundaria del paciente: documento · sexo · edad (nacimiento). */
function lineaIdentidad(p: PDFHeaderPatient, conEdad = true): string {
	const doc = formatDocumento(p.numeroDocumento ?? p.documento);
	const tipoDoc = cleanPdfValue(p.tipoDocumento) || 'DNI';
	const edadNum = cleanPdfValue(p.edad) ? Number.parseInt(String(p.edad), 10) : calcularEdad(p.fechaNacimiento);
	const nac = formatFecha(p.fechaNacimiento);
	const edad = Number.isFinite(edadNum as number) && edadNum != null
		? `${edadNum} años${nac ? ` (${nac})` : ''}`
		: nac
			? `Nac. ${nac}`
			: '';
	return [doc && `${tipoDoc} ${doc}`, cleanPdfValue(p.sexo), conEdad ? edad : ''].filter(Boolean).join('  ·  ');
}

function celdasPaciente(p: PDFHeaderPatient, campos: Record<CampoPaciente, boolean>): Array<{ label: string; value: string }> {
	const ingreso = [formatFecha(p.fechaIngreso), formatHora(p.horaIngreso)].filter(Boolean).join('  ');
	const valores: Record<CampoPaciente, string> = {
		visita: cleanPdfValue(p.numeroVisita),
		ingreso,
		ubicacion: cleanPdfValue(p.ubicacion),
		cobertura: cleanPdfValue(p.cobertura),
		afiliado: cleanPdfValue(p.afiliado),
		numeroHC: cleanPdfValue(p.numeroHC),
	};
	return CAMPOS_PACIENTE.filter((c) => campos[c.id] && valores[c.id]).map((c) => ({
		label: c.label,
		value: valores[c.id],
	}));
}

function drawPatientPanel(doc: jsPDF, p: PDFHeaderPatient, startY: number, diseno: PdfDiseno): number {
	const pageWidth = doc.internal.pageSize.getWidth();
	const x0 = PDF_MARGIN_X;
	const x1 = pageWidth - PDF_MARGIN_X;
	const pad = 5.5;
	const celdas = celdasPaciente(p, diseno.paciente.campos);
	const cols = celdas.length ? Math.min(3, celdas.length) : 0;
	const gridW = cols ? Math.min(x1 - x0 - 2 * pad, 0.48 * (x1 - x0)) : 0;
	const leftW = x1 - x0 - 2 * pad - 2 - (cols ? gridW + 6 : 0);

	const nombre = cleanPdfValue(p.nombre).toUpperCase() || 'PACIENTE SIN NOMBRE';
	setFont(doc, 12, 'bold');
	const nombreLines = (doc.splitTextToSize(nombre, leftW) as string[]).slice(0, 2);
	const identidad = lineaIdentidad(p, diseno.paciente.mostrarEdad);
	setFont(doc, 8);
	const identidadLines = identidad ? (doc.splitTextToSize(identidad, leftW) as string[]).slice(0, 2) : [];

	const rowH = 10.5;
	const rows = cols ? Math.ceil(celdas.length / cols) : 0;
	const leftH =
		2.4 + 6 + (nombreLines.length - 1) * 5 + (identidadLines.length ? 5.4 + (identidadLines.length - 1) * 3.8 : 0) + 1.2;
	const gridH = rows ? 2.4 + (rows - 1) * rowH + 4.6 + 1.2 : 0;
	const panelH = Math.max(leftH, gridH) + 2 * pad;

	doc.setFillColor(...PDF_COLORS.panel);
	doc.setDrawColor(...PDF_COLORS.line);
	doc.setLineWidth(0.2);
	doc.rect(x0, startY, x1 - x0, panelH, 'FD');
	doc.setFillColor(...PDF_COLORS.brand);
	doc.rect(x0, startY, 1.2, panelH, 'F');

	const lx = x0 + pad + 2;
	let ly = startY + pad + 2.4;
	setFont(doc, 6.5, 'bold', PDF_COLORS.brand);
	doc.text('PACIENTE', lx, ly, { charSpace: 0.6 });
	ly += 6;
	setFont(doc, 12, 'bold');
	doc.text(nombreLines, lx, ly);
	ly += (nombreLines.length - 1) * 5 + 5.4;
	if (identidadLines.length) {
		setFont(doc, 8, 'normal', PDF_COLORS.text);
		doc.text(identidadLines, lx, ly);
	}

	if (cols) {
		const gx = x1 - pad - gridW;
		const colW = gridW / cols;
		doc.setDrawColor(...PDF_COLORS.line);
		doc.line(gx - 3, startY + pad, gx - 3, startY + panelH - pad);
		celdas.forEach((c, i) => {
			const cx = gx + (i % cols) * colW;
			const cy = startY + pad + 2.4 + Math.floor(i / cols) * rowH;
			setFont(doc, 6.5, 'bold', PDF_COLORS.muted);
			doc.text(c.label.toUpperCase(), cx, cy, { charSpace: 0.3 });
			setFont(doc, 8.5, 'bold');
			doc.text(fitText(doc, c.value, colW - 3), cx, cy + 4.6);
		});
	}

	return startY + panelH;
}

/**
 * Dibuja el header completo de la primera página (institución + título + paciente).
 * Devuelve la Y donde puede empezar el contenido.
 */
export async function drawDocumentHeader(doc: jsPDF, opts: PDFHeaderOptions): Promise<number> {
	const { title, empresaInfo, patient } = opts;
	const diseno = opts.diseno ?? normalizarDiseno(await obtenerPdfDiseno());
	opts.diseno = diseno;
	aplicarColores(diseno);
	aplicarFuente(doc, diseno.fuente);

	const emittedAt = opts.emittedAt ?? new Date();
	const pageWidth = doc.internal.pageSize.getWidth();
	const x0 = PDF_MARGIN_X;
	const x1 = pageWidth - PDF_MARGIN_X;
	const top = 10;
	const logoSize = 22;
	// La columna del título toma lo justo (hasta 66 mm) y el resto queda para los datos de la institución.
	setFont(doc, 11.5, 'bold');
	const titleW = Math.min(66, Math.max(48, doc.getTextWidth(title.toUpperCase()) + 1));

	const institucion = nombreInstitucion(empresaInfo);
	const conLogo = diseno.encabezado.mostrarLogo;
	if (conLogo) {
		const logoSrc = cleanPdfValue(empresaInfo?.logo) || (await obtenerLogoEmpresa());
		drawLogo(doc, await loadLogo(logoSrc), institucion, x0, top, logoSize);
	}

	const tx = conLogo ? x0 + logoSize + 5 : x0;
	const textW = x1 - titleW - 7 - tx;

	// El nombre va lo más grande posible en una línea; si no entra, achica hasta 14pt y usa dos.
	let nombreSize = 14;
	for (const s of [19, 17, 15.5]) {
		setFont(doc, s, 'bold');
		if ((doc.splitTextToSize(institucion, textW) as string[]).length === 1) {
			nombreSize = s;
			break;
		}
	}
	setFont(doc, nombreSize, 'bold');
	const nombreLines = (doc.splitTextToSize(institucion, textW) as string[]).slice(0, 2);
	const nombreLineH = nombreSize * 0.42;
	let ty = top + nombreSize * 0.28;
	doc.text(nombreLines, tx, ty, { lineHeightFactor: 1.2 });
	ty += (nombreLines.length - 1) * nombreLineH + 4.6;

	// Datos de la institución: dos columnas etiqueta / valor debajo del nombre.
	const columnas = columnasInstitucion(empresaInfo, diseno);
	const filaH = 3.5;
	const colGap = 5;
	const medidas = columnas.map((col) => {
		setFont(doc, 6.4, 'bold');
		const labelW = Math.max(...col.map((d) => doc.getTextWidth(d.label.toUpperCase()))) + 2;
		setFont(doc, 7.4);
		return { labelW, total: labelW + Math.max(...col.map((d) => doc.getTextWidth(d.value))) };
	});
	// Cada columna toma el ancho que necesita; si no entran, se reparte en proporción.
	const disponible = textW - colGap * (columnas.length - 1);
	const necesario = medidas.reduce((s, m) => s + m.total, 0);
	const anchos = medidas.map((m) => (necesario <= disponible ? m.total : (disponible * m.total) / necesario));
	let cx = tx;
	columnas.forEach((col, ci) => {
		const { labelW } = medidas[ci];
		col.forEach((d, i) => {
			const cy = ty + i * filaH;
			setFont(doc, 6.4, 'bold', PDF_COLORS.muted);
			doc.text(d.label.toUpperCase(), cx, cy);
			setFont(doc, 7.4, 'normal', d.value === '-' ? PDF_COLORS.muted : PDF_COLORS.ink);
			doc.text(fitText(doc, d.value, Math.max(6, anchos[ci] - labelW)), cx + labelW, cy);
		});
		cx += anchos[ci] + colGap;
	});
	const filas = Math.max(0, ...columnas.map((c) => c.length));
	const finTexto = filas ? ty + (filas - 1) * filaH + 1.2 : ty - 4.6 + 1.5;

	const sepX = x1 - titleW - 3.5;
	doc.setDrawColor(...PDF_COLORS.line);
	doc.setLineWidth(0.2);
	doc.line(sepX, top + 1, sepX, Math.max(conLogo ? top + logoSize : 0, finTexto) - 1);

	let ry = top + 3.2;
	setFont(doc, 6.5, 'bold', PDF_COLORS.muted);
	const etiqueta = 'DOCUMENTO';
	const etiquetaW = doc.getTextWidth(etiqueta) + 0.6 * (etiqueta.length - 1);
	doc.text(etiqueta, x1 - etiquetaW, ry, { charSpace: 0.6 });
	ry += 6;
	let tituloSize = 10;
	for (const s of [11.5, 11, 10.5]) {
		setFont(doc, s, 'bold');
		if (doc.getTextWidth(title.toUpperCase()) <= titleW) {
			tituloSize = s;
			break;
		}
	}
	setFont(doc, tituloSize, 'bold', PDF_COLORS.brand);
	const tituloLines = (doc.splitTextToSize(title.toUpperCase(), titleW) as string[]).slice(0, 2);
	tituloLines.forEach((l, i) => doc.text(l, x1, ry + i * 5, { align: 'right' }));
	ry += (tituloLines.length - 1) * 5 + 5.5;
	setFont(doc, 7.5, 'normal', PDF_COLORS.muted);
	doc.text(`Emitido ${formatEmision(emittedAt)}`, x1, ry, { align: 'right' });

	let y = Math.max(conLogo ? top + logoSize : 0, finTexto, ry) + 3.5;
	const barra = diseno.encabezado.barra;
	if (barra === 'ninguna') {
		doc.setDrawColor(...PDF_COLORS.line);
		doc.setLineWidth(0.2);
		doc.line(x0, y, x1, y);
	} else {
		const grosor = barra === 'gruesa' ? 0.8 : 0.35;
		doc.setFillColor(...PDF_COLORS.brand);
		doc.rect(x0, y, x1 - x0, grosor, 'F');
		y += grosor;
	}

	if (patient && diseno.paciente.mostrar) {
		y = drawPatientPanel(doc, patient, y + 5, diseno);
	}

	return y + 8;
}

/** Header compacto para páginas 2+, así cada hoja queda identificada si se separa. */
export function drawRunningHeaders(doc: jsPDF, opts: PDFHeaderOptions) {
	const pageWidth = doc.internal.pageSize.getWidth();
	const x0 = PDF_MARGIN_X;
	const x1 = pageWidth - PDF_MARGIN_X;
	const total = doc.getNumberOfPages();
	const p = opts.patient;
	const pacienteParts = p
		? [
				cleanPdfValue(p.nombre).toUpperCase(),
				formatDocumento(p.numeroDocumento ?? p.documento) &&
					`${cleanPdfValue(p.tipoDocumento) || 'DNI'} ${formatDocumento(p.numeroDocumento ?? p.documento)}`,
			].filter(Boolean)
		: [];

	for (let i = 2; i <= total; i++) {
		doc.setPage(i);
		const y = 11;
		const half = (x1 - x0) / 2 - 2;
		setFont(doc, 7.5, 'bold', PDF_COLORS.brand);
		const tituloTxt = fitText(doc, opts.title.toUpperCase(), half);
		doc.text(tituloTxt, x0, y);
		const tituloW = doc.getTextWidth(tituloTxt);
		setFont(doc, 7.5, 'normal', PDF_COLORS.muted);
		doc.text(fitText(doc, `  ·  ${nombreInstitucion(opts.empresaInfo)}`, half - tituloW), x0 + tituloW, y);

		if (pacienteParts.length) {
			setFont(doc, 7.5, 'bold', PDF_COLORS.ink);
			doc.text(fitText(doc, pacienteParts.join('  ·  '), half), x1, y, { align: 'right' });
		}
		doc.setDrawColor(...PDF_COLORS.line);
		doc.setLineWidth(0.2);
		doc.line(x0, y + 2.5, x1, y + 2.5);
	}
}

/** Dónde va "Página N de T" (mm desde arriba / izquierda); null si el diseño no numera. */
export type PiePaginaPdf = { y: number; x1: number } | null;

export type PdfCapturado = { bytes: ArrayBuffer; pie: PiePaginaPdf };

let capturados: PdfCapturado[] | null = null;
let piePendiente: PiePaginaPdf = null;

/** Cierre común de los módulos: descarga el archivo, o lo junta si corre dentro de `capturarPDFs`. */
export function entregarPDF(doc: jsPDF, fileName: string) {
	if (capturados) capturados.push({ bytes: doc.output('arraybuffer'), pie: piePendiente });
	else doc.save(fileName);
	piePendiente = null;
}

/**
 * Corre `generar` juntando los PDF que produzcan los módulos en lugar de descargarlos.
 * El export de la historia arma así cada bloque con el mismo módulo que el export individual.
 * Los pies salen sin número de página: lo agrega quien une los documentos, con la numeración total.
 * No admite capturas concurrentes: los bloques se generan de a uno.
 */
export async function capturarPDFs(generar: () => Promise<unknown>): Promise<PdfCapturado[]> {
	const previos = capturados;
	const propios: PdfCapturado[] = [];
	capturados = propios;
	try {
		await generar();
		return propios;
	} finally {
		capturados = previos;
	}
}

export function drawDocumentFooters(doc: jsPDF, opts: PDFHeaderOptions) {
	const pageWidth = doc.internal.pageSize.getWidth();
	const pageHeight = doc.internal.pageSize.getHeight();
	const x0 = PDF_MARGIN_X;
	const x1 = pageWidth - PDF_MARGIN_X;
	const total = doc.getNumberOfPages();
	const emision = formatEmision(opts.emittedAt ?? new Date());
	const pie = (opts.diseno ?? PDF_DISENO_DEFAULT).pie;
	const texto = pie.texto.trim();
	const y = pageHeight - (texto ? 9 : 7);
	const izquierda = pie.institucion ? `${nombreInstitucion(opts.empresaInfo)}  ·  ${opts.title}` : opts.title;
	piePendiente = pie.paginas ? { y, x1 } : null;

	for (let i = 1; i <= total; i++) {
		doc.setPage(i);
		doc.setDrawColor(...PDF_COLORS.line);
		doc.setLineWidth(0.2);
		doc.line(x0, y - 4, x1, y - 4);
		setFont(doc, 7, 'normal', PDF_COLORS.muted);
		doc.text(fitText(doc, izquierda, (x1 - x0) / 2 - 20), x0, y);
		if (pie.generado) doc.text(`Generado ${emision}`, pageWidth / 2, y, { align: 'center' });
		if (pie.paginas && !capturados) {
			setFont(doc, 7, 'bold', PDF_COLORS.text);
			doc.text(`Página ${i} de ${total}`, x1, y, { align: 'right' });
		}
		if (texto) {
			setFont(doc, 6.5, 'normal', PDF_COLORS.muted);
			doc.text(fitText(doc, texto, x1 - x0), pageWidth / 2, y + 3.8, { align: 'center' });
		}
	}
}
