import type jsPDF from 'jspdf';
import { PDF_COLORS, wrapFitText } from './pdfHeader';

/** Columna de tabla de reportes de rendición. */
export type RendCol = {
	key: string;
	label: string;
	w: number;
	align?: 'left' | 'right';
	wrap?: boolean;
};

/**
 * Estilo único de tablas en PDFs de rendición
 * (mismo fondo, tipografía, padding y borde en todos los reportes).
 */
export const REND_TABLE = {
	HEAD_H: 6.4,
	HEAD_FONT: 6.5,
	FONT: 6.6,
	PAD_X: 1.2,
	LINE_H: 3.1,
	ROW_PAD_Y: 1.6,
	FILL_HEAD: [241, 245, 249] as [number, number, number],
	FILL_ZEBRA: [248, 250, 252] as [number, number, number],
	FILL_GROUP: [236, 244, 248] as [number, number, number],
};

/** Línea meta común: Nº Rend. · Cobertura · extras opcionales. */
export function metaExtraRendicion(
	id: number,
	cliente: { valor?: string | number | null; razonSocial?: string | null },
	extra?: string | null,
): string {
	const cobertura = String(cliente.razonSocial || cliente.valor || '—').trim() || '—';
	const base = `Nº Rend.: ${id}   ·   Cobertura: ${cobertura}`;
	const mas = String(extra ?? '').trim();
	return mas ? `${base}   ·   ${mas}` : base;
}

export function textXRend(
	col: { w: number; align?: 'left' | 'right' },
	x: number,
	pad = REND_TABLE.PAD_X,
): number {
	return col.align === 'right' ? x + col.w - pad : x + pad;
}

export function scaleCols<T extends { w: number }>(cols: T[], width: number): Array<T & { w: number }> {
	const sum = cols.reduce((s, c) => s + c.w, 0) || 1;
	return cols.map((c) => ({ ...c, w: (c.w / sum) * width }));
}

/**
 * Encabezado de tabla estándar. Recorta el label al ancho de la columna
 * para que no invada la siguiente (causa del desfasaje visual).
 */
export function drawRendicionTableHead(
	doc: jsPDF,
	y: number,
	x0: number,
	cols: Array<{ label: string; w: number; align?: 'left' | 'right' }>,
	opts?: { origenX?: number; gapAfter?: boolean; padLeft?: number; padRight?: number },
): number {
	const { HEAD_H, HEAD_FONT, PAD_X, FILL_HEAD, ROW_PAD_Y } = REND_TABLE;
	const origenX = opts?.origenX ?? x0;
	const padL = opts?.padLeft ?? PAD_X;
	const padR = opts?.padRight ?? PAD_X;
	const top = y;
	const width = cols.reduce((s, c) => s + c.w, 0);

	doc.setFillColor(...FILL_HEAD);
	doc.rect(origenX, top, width, HEAD_H, 'F');
	doc.setDrawColor(...PDF_COLORS.line);
	doc.setLineWidth(0.2);
	doc.line(origenX, top + HEAD_H, origenX + width, top + HEAD_H);

	doc.setFont('helvetica', 'bold');
	doc.setFontSize(HEAD_FONT);
	doc.setTextColor(...PDF_COLORS.ink);
	const textY = top + HEAD_H / 2 + 1.1;
	let x = origenX;
	for (const c of cols) {
		const pad = c.align === 'right' ? padR : padL;
		const maxW = Math.max(3.5, c.w - padL - padR);
		const label = wrapFitText(doc, c.label, maxW, 1)[0];
		const tx = c.align === 'right' ? x + c.w - pad : x + pad;
		doc.text(label, tx, textY, {
			align: c.align === 'right' ? 'right' : 'left',
		});
		x += c.w;
	}

	const gap = opts?.gapAfter === false ? 0 : ROW_PAD_Y;
	return top + HEAD_H + gap;
}
