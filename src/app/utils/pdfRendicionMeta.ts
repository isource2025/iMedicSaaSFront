import type jsPDF from 'jspdf';
import { fmtFecha } from '@/app/components/Facturacion/formato';
import { PDF_COLORS, wrapFitText } from './pdfHeader';

export type MetaRendicion = {
	fechaGraba?: string | null;
	convenio: { codigo: number; descripcion: string | null };
	observaciones?: string | null;
	/** Línea extra opcional (p. ej. Cliente / Nº Rend.). */
	extra?: string | null;
};

/**
 * Bloque común bajo la cabecera institucional, alineado al escritorio:
 * Fecha de Emisión · Observaciones
 * Convenio
 */
export function drawMetaRendicion(
	doc: jsPDF,
	y: number,
	x0: number,
	x1: number,
	meta: MetaRendicion,
): number {
	const usable = x1 - x0;
	const fecha = fmtFecha(meta.fechaGraba?.slice(0, 10) || null) || '—';
	const convenio = `${meta.convenio.codigo}${meta.convenio.descripcion ? ` ${meta.convenio.descripcion}` : ''}`;
	const obs = String(meta.observaciones ?? '').trim();

	doc.setFont('helvetica', 'normal');
	doc.setFontSize(7.4);
	doc.setTextColor(...PDF_COLORS.ink);

	doc.text(`Fecha de Emisión: ${fecha}`, x0, y);
	doc.setTextColor(...PDF_COLORS.muted);
	const obsLabel = 'Observaciones:';
	const obsValor = obs || '—';
	doc.setFont('helvetica', 'normal');
	doc.setFontSize(7.4);
	const obsMax = Math.max(40, usable * 0.48);
	doc.setFont('helvetica', 'bold');
	const labelW = doc.getTextWidth(obsLabel);
	doc.setFont('helvetica', 'normal');
	doc.setTextColor(...PDF_COLORS.ink);
	const obsTxt = wrapFitText(doc, obsValor, Math.max(20, obsMax - labelW - 2), 2);
	doc.setTextColor(...PDF_COLORS.muted);
	doc.text(obsLabel, x1 - obsMax, y);
	doc.setTextColor(...PDF_COLORS.ink);
	doc.text(obsTxt, x1 - obsMax + labelW + 1.5, y);
	y += Math.max(3.8, obsTxt.length * 3.4);

	doc.text(`Convenio: ${convenio}`, x0, y);
	y += 3.8;

	if (meta.extra) {
		doc.setTextColor(...PDF_COLORS.muted);
		const extraLines = wrapFitText(doc, meta.extra, usable, 2);
		doc.setTextColor(...PDF_COLORS.ink);
		doc.text(extraLines, x0, y);
		y += extraLines.length * 3.4;
	}

	return y + 2;
}
