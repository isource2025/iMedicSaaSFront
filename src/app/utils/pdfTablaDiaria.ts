import jsPDF from 'jspdf';
import type { EmpresaInfo } from '../services/empresaService';
import { drawProfesionalFirmaBlock, formatMatricula, withPersonalFirmas, type ProfesionalFirmaInfo } from './pdfExport';
import {
	cleanPdfValue,
	drawDocumentFooters,
	drawDocumentHeader,
	drawRunningHeaders,
	entregarPDF,
	PDF_COLORS,
	PDF_CONTENT_TOP,
	PDF_FOOTER_SPACE,
	PDF_MARGIN_X,
	type PDFHeaderOptions,
	type PDFHeaderPatient,
} from './pdfHeader';

/**
 * Tabla clínica por día con firmas al final: el formato común de las hojas de enfermería
 * y procedimientos. Cada módulo solo define sus columnas; el resto (bandas por día,
 * encabezado repetido en cada hoja, notas bajo la fila y firmas) es igual para todos.
 */

export type Tono = 'ink' | 'text' | 'muted';

export type Linea = {
	texto: string;
	fuente?: 'normal' | 'bold' | 'italic';
	tono?: Tono;
	tamano?: number;
};

export type ColumnaTabla<T> = {
	key: string;
	label: string;
	/** Ancho en mm; 0 = ocupa el espacio restante (una sola columna por tabla). */
	w: number;
	/** Rótulo superior compartido por columnas consecutivas (ej. PRESIÓN ARTERIAL). */
	grupo?: string;
	/** Rótulo alternativo del grupo cuando el completo no entra. */
	grupoCorto?: string;
	align?: 'left' | 'center';
	fuente?: Linea['fuente'];
	tono?: Tono;
	tamano?: number;
	/** Solo se muestra si alguna fila tiene dato. */
	opcional?: boolean;
	celda: (item: T) => string | Linea[];
};

export type NotaFila = { etiqueta?: string; texto: string };

export type PDFTablaDiariaOptions<T> = {
	titulo: string;
	items: T[];
	columnas: ColumnaTabla<T>[];
	fecha: (item: T) => string | null | undefined;
	hora: (item: T) => string | null | undefined;
	/** Singular y plural para los contadores ("3 controles"). */
	unidad: [string, string];
	vacio: string;
	/** Profesionales que firman al final, sin repetir. */
	profesionales: (item: T) => Array<ProfesionalFirmaInfo | null | undefined>;
	/** Texto bajo la fila (observaciones, profesionales de la práctica…). */
	nota?: (item: T) => NotaFila | null;
	/** Columnas que ocupa la nota: desde `desde` hasta antes de `hasta` (por defecto, hasta el final). */
	notaDesde?: string;
	notaHasta?: string;
	/** Fila de totales al cierre de cada día y, si hay más de uno, del período: valor por key de columna. */
	totales?: (items: T[]) => Record<string, string>;
	orientacion?: 'portrait' | 'landscape';
	/** Páginas extra al final (ej. imágenes adjuntas), antes de encabezados y pies. */
	despues?: (doc: jsPDF) => Promise<void>;
	empresaInfo?: EmpresaInfo | null;
	patient?: PDFHeaderPatient | null;
	fileName: string;
};

export const PDF_TABLA_FONT = 8.4;
const FONT_PROF = 7.8;
const LINE_H = 3.7;
const PAD_Y = 2.5;
const FIRMA_CELDA_H = 50;
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export function fechaCorta(v?: string | null): string {
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

export function horaCorta(v?: string | null): string {
	const m = cleanPdfValue(v).match(/(\d{1,2}):(\d{2})/);
	return m ? `${m[1].padStart(2, '0')}:${m[2]}` : '';
}

/** Celda estándar de profesional: nombre y, debajo, la matrícula. */
export function lineasProfesional(p: ProfesionalFirmaInfo | null | undefined): Linea[] {
	if (!p || !cleanPdfValue(p.nombre)) return [{ texto: '-', tono: 'muted' }];
	const mat = formatMatricula(p.matricula);
	return [
		{ texto: cleanPdfValue(p.nombre), tamano: FONT_PROF },
		...(mat ? [{ texto: `Mat. ${mat}`, tamano: FONT_PROF - 0.8, tono: 'muted' as Tono }] : []),
	];
}

/** Columna HORA, igual en todas las tablas; con `fin` agrega "a HH:MM" debajo. */
export function columnaHora<T>(
	hora: (item: T) => string | null | undefined,
	fin?: (item: T) => string | null | undefined,
): ColumnaTabla<T> {
	return {
		key: 'hora',
		label: 'HORA',
		w: 13,
		fuente: 'bold',
		tono: 'ink',
		celda: (i) => {
			const desde = horaCorta(hora(i));
			const hasta = fin ? horaCorta(fin(i)) : '';
			return [
				{ texto: desde || '-' },
				...(hasta && hasta !== desde ? [{ texto: `a ${hasta}`, fuente: 'normal' as const, tono: 'muted' as Tono }] : []),
			];
		},
	};
}

export async function generarPDFTablaDiaria<T>(o: PDFTablaDiariaOptions<T>) {
	const doc = new jsPDF({ orientation: o.orientacion ?? 'portrait', unit: 'mm', format: 'a4' });
	const headerOpts: PDFHeaderOptions = { title: o.titulo, empresaInfo: o.empresaInfo, patient: o.patient, emittedAt: new Date() };
	const x0 = PDF_MARGIN_X;
	const x1 = doc.internal.pageSize.getWidth() - PDF_MARGIN_X;
	const limite = () => doc.internal.pageSize.getHeight() - PDF_FOOTER_SPACE - 2;
	const contar = (n: number) => `${n} ${n === 1 ? o.unidad[0] : o.unidad[1]}`;

	const vacia = (v: string | Linea[]) =>
		typeof v === 'string' ? !cleanPdfValue(v) || v === '-' : v.every((l) => !cleanPdfValue(l.texto) || l.texto === '-');
	const conDato = (c: ColumnaTabla<T>) => o.items.some((i) => !vacia(c.celda(i)));
	// Un grupo con todas sus columnas opcionales se muestra o se oculta entero.
	const delGrupo = (c: ColumnaTabla<T>) => (c.grupo ? o.columnas.filter((g) => g.grupo === c.grupo) : []);
	const cols = o.columnas.filter((c) => {
		if (!c.opcional) return true;
		const grupo = delGrupo(c);
		return grupo.length && grupo.every((g) => g.opcional) ? grupo.some(conDato) : conDato(c);
	});
	const fijo = cols.reduce((s, c) => s + c.w, 0);
	const ancho = (c: ColumnaTabla<T>) => c.w || x1 - x0 - fijo;
	const xs = new Map<string, number>();
	cols.reduce((x, c) => (xs.set(c.key, x), x + ancho(c)), x0);
	const xDe = (key: string | undefined, def: number) => (key != null ? (xs.get(key) ?? def) : def);
	const notaX0 = xDe(o.notaDesde, x0);
	const notaX1 = xDe(o.notaHasta, x1);
	const enNota = (c: ColumnaTabla<T>) => {
		const x = xs.get(c.key) ?? x0;
		return x >= notaX0 && x < notaX1;
	};

	const filas = o.items
		.map((item, i) => ({ item, i }))
		.sort(
			(a, b) =>
				`${cleanPdfValue(o.fecha(a.item))} ${horaCorta(o.hora(a.item))}`.localeCompare(
					`${cleanPdfValue(o.fecha(b.item))} ${horaCorta(o.hora(b.item))}`,
				) || a.i - b.i,
		)
		.map(({ item }) => item);

	let y = await drawDocumentHeader(doc, headerOpts);

	const fechas = filas.map((f) => fechaCorta(o.fecha(f))).filter(Boolean);
	const rango =
		fechas.length && fechas[0] !== fechas[fechas.length - 1]
			? `del ${fechas[0]} al ${fechas[fechas.length - 1]}`
			: fechas[0] || '';
	doc.setFont('helvetica', 'normal');
	doc.setFontSize(8);
	doc.setTextColor(...PDF_COLORS.muted);
	doc.text([contar(filas.length), rango].filter(Boolean).join('  ·  '), x0, y);
	y += 4;

	const conGrupos = cols.some((c) => c.grupo);
	const encabezadoColumnas = () => {
		const alto = conGrupos ? 11 : 7;
		doc.setFillColor(...PDF_COLORS.panel);
		doc.setDrawColor(...PDF_COLORS.line);
		doc.setLineWidth(0.2);
		doc.rect(x0, y, x1 - x0, alto, 'FD');
		doc.setFont('helvetica', 'bold');
		doc.setFontSize(6.4);
		doc.setTextColor(...PDF_COLORS.muted);
		const grupos = new Map<string, ColumnaTabla<T>[]>();
		cols.forEach((c) => {
			if (c.grupo) grupos.set(c.grupo, (grupos.get(c.grupo) ?? []).concat(c));
		});
		grupos.forEach((gs, grupo) => {
			const gx0 = xs.get(gs[0].key) ?? x0;
			const gx1 = gx0 + gs.reduce((s: number, c: ColumnaTabla<T>) => s + ancho(c), 0);
			const entra = doc.getTextWidth(grupo) + grupo.length * 0.3 <= gx1 - gx0 - 1;
			doc.text(entra ? grupo : gs[0].grupoCorto || grupo, (gx0 + gx1) / 2, y + 4, { align: 'center', charSpace: 0.3 });
			doc.line(gx0 + 1.5, y + 5.3, gx1 - 1.5, y + 5.3);
		});
		for (const c of cols) {
			const yl = conGrupos ? (c.grupo ? y + 8.8 : y + 6.6) : y + 4.6;
			const x = xs.get(c.key) ?? x0;
			if (c.align === 'center') doc.text(c.label, x + ancho(c) / 2, yl, { align: 'center', charSpace: 0.3 });
			else doc.text(c.label, x + 1.5, yl, { charSpace: 0.3 });
		}
		y += alto;
	};

	const bandaDia = (fecha: string | null | undefined, n: number, continuacion: boolean) => {
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
		doc.text(continuacion ? '(continúa)' : contar(n), x1 - 2.5, y + 4.4, { align: 'right' });
		y += 6.5 + 1;
	};

	const nuevaPagina = () => {
		doc.addPage();
		y = PDF_CONTENT_TOP;
		encabezadoColumnas();
	};

	encabezadoColumnas();

	if (!filas.length) {
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(9.5);
		doc.setTextColor(...PDF_COLORS.muted);
		doc.text(o.vacio, x0 + 2.5, y + 7);
	}

	const porDia = new Map<string, T[]>();
	filas.forEach((f) => {
		const d = cleanPdfValue(o.fecha(f));
		porDia.set(d, (porDia.get(d) ?? []).concat(f));
	});

	const filaTotales = (etiqueta: string, items: T[], fondo: 'panel' | 'brandSoft') => {
		const valores = o.totales?.(items);
		if (!valores) return;
		const alto = 7;
		if (y + alto > limite()) nuevaPagina();
		doc.setFillColor(...PDF_COLORS[fondo]);
		doc.rect(x0, y, x1 - x0, alto, 'F');
		doc.setFont('helvetica', 'bold');
		doc.setFontSize(6.4);
		doc.setTextColor(...PDF_COLORS.muted);
		doc.text(etiqueta, x0 + 1.5, y + 4.6, { charSpace: 0.3 });
		doc.setFontSize(PDF_TABLA_FONT);
		doc.setTextColor(...PDF_COLORS.ink);
		for (const c of cols) {
			const v = valores[c.key];
			if (!v) continue;
			const x = xs.get(c.key) ?? x0;
			if (c.align === 'center') doc.text(v, x + ancho(c) / 2, y + 4.6, { align: 'center' });
			else doc.text(v, x + 1.5, y + 4.6);
		}
		y += alto;
		doc.setDrawColor(...PDF_COLORS.line);
		doc.setLineWidth(0.15);
		doc.line(x0, y, x1, y);
	};

	type LineaFinal = Required<Linea>;
	const partir = (c: ColumnaTabla<T>, item: T): LineaFinal[] => {
		const v = c.celda(item);
		const base: Linea[] = typeof v === 'string' ? [{ texto: v || '-', tono: v && v !== '-' ? undefined : 'muted' }] : v;
		const salida: LineaFinal[] = [];
		for (const l of base) {
			const final: LineaFinal = {
				texto: l.texto,
				fuente: l.fuente ?? c.fuente ?? 'normal',
				tono: l.tono ?? c.tono ?? 'text',
				tamano: l.tamano ?? c.tamano ?? PDF_TABLA_FONT,
			};
			doc.setFont('helvetica', final.fuente);
			doc.setFontSize(final.tamano);
			const partes = doc.splitTextToSize(final.texto, ancho(c) - 3) as string[];
			partes.forEach((texto) => salida.push({ ...final, texto }));
		}
		return salida;
	};

	const NOTA_FONT = PDF_TABLA_FONT - 0.6;
	const NOTA_LINE_H = LINE_H - 0.2;

	let diaActual: string | null = null;
	for (let n = 0; n < filas.length; n++) {
		const item = filas[n];
		const dia = cleanPdfValue(o.fecha(item));
		const celdas = cols.map((c) => ({ c, lineas: partir(c, item) }));

		const nota = o.nota?.(item);
		const notaTexto = cleanPdfValue(nota?.texto);
		const sangria = nota?.etiqueta ? 11.5 : 0;
		doc.setFont('helvetica', 'italic');
		doc.setFontSize(NOTA_FONT);
		const notaLineas = notaTexto ? (doc.splitTextToSize(notaTexto, notaX1 - notaX0 - 3 - sangria) as string[]) : [];

		const filasNota = Math.max(1, ...celdas.filter(({ c }) => enNota(c)).map(({ lineas }) => lineas.length));
		const altoNota = notaLineas.length ? filasNota * LINE_H + notaLineas.length * NOTA_LINE_H + 0.6 : 0;
		const altoCeldas = Math.max(...celdas.map(({ lineas }) => lineas.length)) * LINE_H;
		const alto = PAD_Y * 2 + Math.max(altoCeldas, altoNota);

		if (dia !== diaActual) {
			if (y + 10 + alto > limite()) nuevaPagina();
			bandaDia(o.fecha(item), porDia.get(dia)?.length ?? 0, false);
			diaActual = dia;
		} else if (y + alto > limite()) {
			nuevaPagina();
			bandaDia(o.fecha(item), 0, true);
		}

		const ty = y + PAD_Y + 2.8;
		for (const { c, lineas } of celdas) {
			const x = xs.get(c.key) ?? x0;
			lineas.forEach((l, i) => {
				doc.setFont('helvetica', l.fuente);
				doc.setFontSize(l.tamano);
				doc.setTextColor(...PDF_COLORS[l.tono]);
				if (c.align === 'center') doc.text(l.texto, x + ancho(c) / 2, ty + i * LINE_H, { align: 'center' });
				else doc.text(l.texto, x + 1.5, ty + i * LINE_H);
			});
		}

		if (notaLineas.length) {
			const ny = ty + filasNota * LINE_H + 0.6;
			if (nota?.etiqueta) {
				doc.setFont('helvetica', 'bold');
				doc.setFontSize(6.3);
				doc.setTextColor(...PDF_COLORS.muted);
				doc.text(nota.etiqueta, notaX0 + 1.5, ny, { charSpace: 0.3 });
			}
			doc.setFont('helvetica', 'italic');
			doc.setFontSize(NOTA_FONT);
			doc.setTextColor(...PDF_COLORS[nota?.etiqueta ? 'text' : 'muted']);
			notaLineas.forEach((l, i) => doc.text(l, notaX0 + 1.5 + sangria, ny + i * NOTA_LINE_H));
		}

		y += alto;
		doc.setDrawColor(...PDF_COLORS.line);
		doc.setLineWidth(0.15);
		doc.line(x0, y, x1, y);

		const siguiente = filas[n + 1];
		if (!siguiente || cleanPdfValue(o.fecha(siguiente)) !== dia) filaTotales('TOTAL DEL DÍA', porDia.get(dia) ?? [], 'panel');
	}
	if (porDia.size > 1) {
		y += 2;
		filaTotales('TOTAL DEL PERÍODO', filas, 'brandSoft');
	}

	const vistos = new Set<string>();
	const unicos: ProfesionalFirmaInfo[] = [];
	filas.forEach((f) =>
		o.profesionales(f).forEach((p) => {
			if (!p || !cleanPdfValue(p.nombre)) return;
			const clave = formatMatricula(p.idPersonal) || formatMatricula(p.matricula) || cleanPdfValue(p.nombre);
			if (vistos.has(clave)) return;
			vistos.add(clave);
			unicos.push(p);
		}),
	);
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
		const finEtiqueta = x0 + doc.getTextWidth(etiqueta) + etiqueta.length * 0.6 + 3;
		doc.setDrawColor(...PDF_COLORS.line);
		doc.setLineWidth(0.2);
		doc.line(finEtiqueta, y - 1, x1, y - 1);
		y += 4;

		const porFila = Math.max(3, Math.floor((x1 - x0) / 62));
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
				const finFirma = await drawProfesionalFirmaBlock(doc, p, p.firmaDigital ? y : y + 19, {
					align: 'left',
					left: x0 + j * celdaW + (celdaW - 52) / 2,
					lineW: 52,
				});
				siguiente = Math.max(siguiente, finFirma);
			}
			y = siguiente + 2;
		}
	}

	if (o.despues) await o.despues(doc);

	drawRunningHeaders(doc, headerOpts);
	drawDocumentFooters(doc, headerOpts);
	entregarPDF(doc, o.fileName);
}
