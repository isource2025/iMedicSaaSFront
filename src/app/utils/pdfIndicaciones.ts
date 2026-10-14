import jsPDF from 'jspdf';
import type { EmpresaInfo } from '../services/empresaService';
import { drawProfesionalFirmaBlock, formatMatricula, withPersonalFirmas, type ProfesionalFirmaInfo } from './pdfExport';
import {
	cleanPdfValue,
	drawDocumentFooters,
	drawDocumentHeader,
	drawRunningHeaders,
	PDF_COLORS,
	PDF_CONTENT_TOP,
	PDF_FOOTER_SPACE,
	PDF_MARGIN_X,
	type PDFHeaderOptions,
	type PDFHeaderPatient,
} from './pdfHeader';

export type IndicacionPdfAdicional = {
	descripcion?: string | null;
	cantidad?: number | string | null;
	unidad?: string | null;
	forma?: string | null;
};

export type IndicacionPdfItem = {
	/** yyyy-mm-dd */
	fecha?: string | null;
	hora?: string | null;
	tipo?: string | null;
	descripcion?: string | null;
	cantidad?: number | string | null;
	unidad?: string | null;
	frecuencia?: string | null;
	/** imFrecuenciasAdmin.Intervalo (TIME Clarion: centésimas de segundo + 1). */
	intervalo?: number | null;
	observaciones?: string | null;
	adicionales?: IndicacionPdfAdicional[];
	profesional?: ProfesionalFirmaInfo | null;
};

export type PDFIndicacionesOptions = {
	items: IndicacionPdfItem[];
	empresaInfo?: EmpresaInfo | null;
	patient?: PDFHeaderPatient | null;
	title?: string;
	fileName?: string;
};

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const COLS = [
	{ key: 'hora', label: 'HORA', w: 13 },
	{ key: 'tipo', label: 'TIPO', w: 33 },
	{ key: 'descripcion', label: 'INDICACIÓN', w: 0 },
	{ key: 'dosis', label: 'DOSIS', w: 19 },
	{ key: 'frecuencia', label: 'FRECUENCIA', w: 31 },
	{ key: 'dia', label: 'EN 24 HS', w: 19 },
] as const;
type ColKey = (typeof COLS)[number]['key'];

const FONT = 8.4;
const LINE_H = 3.7;
const PAD_Y = 2.6;
const FIRMA_CELDA_H = 50;

function fechaCorta(v?: string | null): string {
	const s = cleanPdfValue(v);
	const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
	return iso ? `${iso[3]}/${iso[2]}/${iso[1]}` : s;
}

function fechaLarga(v?: string | null): string {
	const iso = cleanPdfValue(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
	if (!iso) return fechaCorta(v);
	const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
	return `${DIAS[d.getDay()]} ${iso[3]}/${iso[2]}/${iso[1]}`;
}

function horaCorta(v?: string | null): string {
	const m = cleanPdfValue(v).match(/(\d{1,2}):(\d{2})/);
	return m ? `${m[1].padStart(2, '0')}:${m[2]}` : cleanPdfValue(v);
}

function numero(v?: number | string | null): number | null {
	if (v == null || v === '') return null;
	const n = Number(String(v).replace(',', '.'));
	return Number.isFinite(n) ? n : null;
}

function formatNumero(n: number): string {
	return n.toLocaleString('es-AR', { maximumFractionDigits: 2 });
}

function dosis(cantidad?: number | string | null, unidad?: string | null): string {
	const n = numero(cantidad);
	return [n != null && n > 0 ? formatNumero(n) : '', cleanPdfValue(unidad)].filter(Boolean).join(' ');
}

/** Cantidad total en 24 hs: dosis × tomas por día según el intervalo de la frecuencia. */
function cantidadEn24hs(e: IndicacionPdfItem): string {
	const cant = numero(e.cantidad);
	if (cant == null || cant <= 0) return '';
	const horas = e.intervalo && e.intervalo > 1 ? (e.intervalo - 1) / 360000 : 0;
	const tomas = horas >= 0.5 ? Math.max(1, Math.round(24 / horas)) : 1;
	return dosis(cant * tomas, e.unidad);
}

/**
 * PDF de indicaciones médicas: agrupadas por día, una fila por indicación
 * (hora · tipo · indicación · dosis · frecuencia · total en 24 hs) y, al final,
 * las firmas de los profesionales que indicaron.
 */
export async function generarPDFIndicaciones({
	items,
	empresaInfo,
	patient,
	title = 'Indicaciones médicas',
	fileName,
}: PDFIndicacionesOptions) {
	const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
	const headerOpts: PDFHeaderOptions = { title, empresaInfo, patient, emittedAt: new Date() };
	const x0 = PDF_MARGIN_X;
	const x1 = doc.internal.pageSize.getWidth() - PDF_MARGIN_X;
	const limite = () => doc.internal.pageSize.getHeight() - PDF_FOOTER_SPACE - 2;

	const fijo = COLS.reduce((s, c) => s + c.w, 0);
	const anchos = Object.fromEntries(COLS.map((c) => [c.key, c.w || x1 - x0 - fijo])) as Record<ColKey, number>;
	const xs = {} as Record<ColKey, number>;
	COLS.reduce((x, c) => ((xs[c.key] = x), x + anchos[c.key]), x0);

	const indicaciones = items
		.map((e, i) => ({ e, i }))
		.sort((a, b) => cleanPdfValue(a.e.fecha).localeCompare(cleanPdfValue(b.e.fecha)) || a.i - b.i)
		.map(({ e }) => e);

	let y = await drawDocumentHeader(doc, headerOpts);

	const fechas = indicaciones.map((e) => fechaCorta(e.fecha)).filter(Boolean);
	const rango =
		fechas.length && fechas[0] !== fechas[fechas.length - 1]
			? `del ${fechas[0]} al ${fechas[fechas.length - 1]}`
			: fechas[0] || '';
	doc.setFont('helvetica', 'normal');
	doc.setFontSize(8);
	doc.setTextColor(...PDF_COLORS.muted);
	doc.text(
		[`${indicaciones.length} ${indicaciones.length === 1 ? 'indicación' : 'indicaciones'}`, rango]
			.filter(Boolean)
			.join('  ·  '),
		x0,
		y,
	);
	y += 4;

	const encabezadoColumnas = () => {
		doc.setFillColor(...PDF_COLORS.panel);
		doc.setDrawColor(...PDF_COLORS.line);
		doc.setLineWidth(0.2);
		doc.rect(x0, y, x1 - x0, 7, 'FD');
		doc.setFont('helvetica', 'bold');
		doc.setFontSize(6.5);
		doc.setTextColor(...PDF_COLORS.muted);
		for (const c of COLS) doc.text(c.label, xs[c.key] + 1.5, y + 4.6, { charSpace: 0.4 });
		y += 7;
	};

	const bandaDia = (fecha: string | null | undefined, cantidad: number, continuacion: boolean) => {
		y += 3;
		doc.setFillColor(...PDF_COLORS.brandSoft);
		doc.rect(x0, y, x1 - x0, 6.5, 'F');
		doc.setFillColor(...PDF_COLORS.brand);
		doc.rect(x0, y, 1, 6.5, 'F');
		doc.setFont('helvetica', 'bold');
		doc.setFontSize(8.6);
		doc.setTextColor(...PDF_COLORS.ink);
		doc.text(fechaLarga(fecha) || 'Sin fecha', x0 + 3.5, y + 4.4);
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(7.4);
		doc.setTextColor(...PDF_COLORS.muted);
		doc.text(
			continuacion ? '(continúa)' : `${cantidad} ${cantidad === 1 ? 'indicación' : 'indicaciones'}`,
			x1 - 2.5,
			y + 4.4,
			{ align: 'right' },
		);
		y += 6.5 + 1;
	};

	const nuevaPagina = () => {
		doc.addPage();
		y = PDF_CONTENT_TOP;
		encabezadoColumnas();
	};

	encabezadoColumnas();

	if (!indicaciones.length) {
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(9.5);
		doc.setTextColor(...PDF_COLORS.muted);
		doc.text('No hay indicaciones registradas en el período seleccionado.', x0 + 2.5, y + 7);
	}

	const porDia = new Map<string, number>();
	for (const e of indicaciones) porDia.set(cleanPdfValue(e.fecha), (porDia.get(cleanPdfValue(e.fecha)) ?? 0) + 1);

	const lineasDe = (texto: string, key: ColKey) =>
		texto ? (doc.splitTextToSize(texto, anchos[key] - 3) as string[]) : [];

	let diaActual: string | null = null;
	for (const e of indicaciones) {
		const dia = cleanPdfValue(e.fecha);

		doc.setFontSize(FONT);
		doc.setFont('helvetica', 'bold');
		// Sin descripción (texto libre) el contenido va en observaciones.
		const desc = lineasDe(cleanPdfValue(e.descripcion) || (cleanPdfValue(e.observaciones) ? '' : '-'), 'descripcion');
		doc.setFont('helvetica', 'normal');
		const celdas: Record<ColKey, string[]> = {
			hora: [horaCorta(e.hora) || '-'],
			tipo: lineasDe(cleanPdfValue(e.tipo) || '-', 'tipo'),
			descripcion: desc,
			dosis: lineasDe(dosis(e.cantidad, e.unidad) || '-', 'dosis'),
			frecuencia: lineasDe(cleanPdfValue(e.frecuencia) || '-', 'frecuencia'),
			dia: lineasDe(cantidadEn24hs(e) || '-', 'dia'),
		};
		const adicionales = (e.adicionales ?? []).flatMap((a) =>
			lineasDe(
				`+ ${[cleanPdfValue(a.descripcion), dosis(a.cantidad, a.unidad), cleanPdfValue(a.forma).toLowerCase()].filter(Boolean).join('  ')}`,
				'descripcion',
			),
		);
		doc.setFontSize(FONT - 0.6);
		const obsAncho = x1 - xs.tipo - 3;
		const obs = cleanPdfValue(e.observaciones)
			? (doc.splitTextToSize(cleanPdfValue(e.observaciones), obsAncho) as string[])
			: [];

		const filas = Math.max(...Object.values(celdas).map((l) => l.length)) + adicionales.length;
		const alto = PAD_Y * 2 + filas * LINE_H + (obs.length ? obs.length * (LINE_H - 0.3) + 1 : 0);

		if (dia !== diaActual) {
			if (y + 10 + alto > limite()) nuevaPagina();
			bandaDia(e.fecha, porDia.get(dia) ?? 0, false);
			diaActual = dia;
		} else if (y + alto > limite()) {
			nuevaPagina();
			bandaDia(e.fecha, 0, true);
		}

		let ty = y + PAD_Y + 2.8;
		for (const c of COLS) {
			const esDesc = c.key === 'descripcion';
			doc.setFont('helvetica', esDesc ? 'bold' : 'normal');
			doc.setFontSize(c.key === 'tipo' ? FONT - 0.8 : FONT);
			doc.setTextColor(...(esDesc ? PDF_COLORS.ink : c.key === 'tipo' || c.key === 'hora' ? PDF_COLORS.muted : PDF_COLORS.text));
			celdas[c.key].forEach((l, i) => doc.text(l, xs[c.key] + 1.5, ty + i * LINE_H));
		}
		if (adicionales.length) {
			doc.setFont('helvetica', 'normal');
			doc.setFontSize(FONT - 0.4);
			doc.setTextColor(...PDF_COLORS.text);
			adicionales.forEach((l, i) => doc.text(l, xs.descripcion + 1.5, ty + (celdas.descripcion.length + i) * LINE_H));
		}
		ty += filas * LINE_H;
		if (obs.length) {
			doc.setFont('helvetica', 'italic');
			doc.setFontSize(FONT - 0.6);
			doc.setTextColor(...PDF_COLORS.muted);
			obs.forEach((l, i) => doc.text(l, xs.tipo + 1.5, ty + 0.4 + i * (LINE_H - 0.3)));
		}

		y += alto;
		doc.setDrawColor(...PDF_COLORS.line);
		doc.setLineWidth(0.15);
		doc.line(x0, y, x1, y);
	}

	const vistos = new Set<string>();
	const unicos: ProfesionalFirmaInfo[] = [];
	for (const e of indicaciones) {
		const p = e.profesional;
		const clave = formatMatricula(p?.idPersonal) || formatMatricula(p?.matricula) || cleanPdfValue(p?.nombre);
		if (!p || !clave || vistos.has(clave)) continue;
		vistos.add(clave);
		unicos.push(p);
	}
	const firmas = (await withPersonalFirmas(unicos)).filter((p): p is ProfesionalFirmaInfo => Boolean(p));

	if (firmas.length) {
		y += 10;
		if (y + 8 + FIRMA_CELDA_H > limite()) {
			doc.addPage();
			y = PDF_CONTENT_TOP;
		}
		doc.setFont('helvetica', 'bold');
		doc.setFontSize(7);
		doc.setTextColor(...PDF_COLORS.brand);
		const etiqueta = firmas.length === 1 ? 'PROFESIONAL INTERVINIENTE' : 'PROFESIONALES INTERVINIENTES';
		doc.text(etiqueta, x0, y, { charSpace: 0.6 });
		const fin = x0 + doc.getTextWidth(etiqueta) + etiqueta.length * 0.6 + 3;
		doc.setDrawColor(...PDF_COLORS.line);
		doc.setLineWidth(0.2);
		doc.line(fin, y - 1, x1, y - 1);
		y += 4;

		const porFila = 3;
		const celdaW = (x1 - x0) / porFila;
		for (let i = 0; i < firmas.length; i += porFila) {
			if (y + FIRMA_CELDA_H > limite()) {
				doc.addPage();
				y = PDF_CONTENT_TOP;
			}
			let siguiente = y;
			const fila = firmas.slice(i, i + porFila);
			for (let j = 0; j < fila.length; j++) {
				const p = fila[j];
				// Sin imagen el bloque arranca en la línea: se baja el alto de la firma para alinear la fila.
				const fin = await drawProfesionalFirmaBlock(doc, p, p.firmaDigital ? y : y + 19, {
					align: 'left',
					left: x0 + j * celdaW + (celdaW - 52) / 2,
					lineW: 52,
				});
				siguiente = Math.max(siguiente, fin);
			}
			y = siguiente + 2;
		}
	}

	drawRunningHeaders(doc, headerOpts);
	drawDocumentFooters(doc, headerOpts);
	doc.save(fileName || `Indicaciones_${cleanPdfValue(patient?.numeroVisita) || 'paciente'}_${Date.now()}.pdf`);
}
