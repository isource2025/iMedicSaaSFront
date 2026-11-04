import jsPDF from 'jspdf';
import type { LineaReportePracticaResumen, ReportePracticaResumen } from '@/app/types/rendiciones';
import { fmtImporte } from '@/app/components/Facturacion/formato';
import { obtenerInfoEmpresa, obtenerLogoEmpresa } from '@/app/services/empresaService';
import {
	drawDocumentFooters,
	drawDocumentHeader,
	drawRunningHeaders,
	PDF_COLORS,
	PDF_CONTENT_TOP,
	PDF_FOOTER_SPACE,
	PDF_MARGIN_X,
	PDF_PAGE,
	type PDFHeaderOptions,
} from './pdfHeader';
import { drawMetaRendicion } from './pdfRendicionMeta';
import { abrirPdfBlob, reservarVentanaPreview } from './pdfRendicionResumen';
import {
	drawRendicionTableHead,
	metaExtraRendicion,
	REND_TABLE,
	scaleCols,
	textXRend,
	type RendCol,
} from './pdfRendicionTabla';

export { abrirPdfBlob, reservarVentanaPreview };

const MAX_WRAP = 8;

function clean(v: unknown): string {
	const s = String(v ?? '').trim();
	return s || '';
}

function wrapFull(doc: jsPDF, text: string, maxWidth: number): string[] {
	const raw = clean(text) || ' ';
	return (doc.splitTextToSize(raw, Math.max(4, maxWidth)) as string[]).slice(0, MAX_WRAP);
}

const COLS: RendCol[] = [
	{ key: 'practica', label: 'Práctica', w: 88, wrap: true },
	{ key: 'cant', label: 'Cantidad', w: 18, align: 'right' },
	{ key: 'visitas', label: 'Visitas', w: 16, align: 'right' },
	{ key: 'hon', label: 'Honorarios', w: 24, align: 'right' },
	{ key: 'gas', label: 'Gastos', w: 24, align: 'right' },
	{ key: 'total', label: 'Total', w: 24, align: 'right' },
];

function celda(l: LineaReportePracticaResumen, key: string): string {
	switch (key) {
		case 'practica': {
			const cod = l.codigo > 0 ? String(l.codigo).padStart(6, '0') : '';
			const desc = clean(l.descripcion);
			if (cod && desc) return `${cod}  ${desc}`;
			return cod || desc || '—';
		}
		case 'cant':
			return l.cantidad ? fmtImporte(l.cantidad) : '';
		case 'visitas':
			return l.visitas ? String(l.visitas) : '';
		case 'hon':
			return l.honorarios ? `$${fmtImporte(l.honorarios)}` : '';
		case 'gas':
			return l.gastos ? `$${fmtImporte(l.gastos)}` : '';
		case 'total':
			return l.total ? `$${fmtImporte(l.total)}` : '';
		default:
			return '';
	}
}

/** PDF «RESUMEN POR PRÁCTICAS»: agrega por código. */
export async function generarPdfRendicionPracticaResumen(
	data: ReportePracticaResumen,
): Promise<{ blob: Blob; fileName: string }> {
	const [empresaInfo, logo] = await Promise.all([
		obtenerInfoEmpresa().catch(() => null),
		obtenerLogoEmpresa().catch(() => null),
	]);
	const empresaConLogo = empresaInfo ? { ...empresaInfo, logo: logo || empresaInfo.logo } : null;

	const doc = new jsPDF(PDF_PAGE);
	const pageW = doc.internal.pageSize.getWidth();
	const pageH = doc.internal.pageSize.getHeight();
	const x0 = PDF_MARGIN_X;
	const x1 = pageW - PDF_MARGIN_X;
	const usable = x1 - x0;
	const cols = scaleCols(COLS, usable);
	const limite = () => pageH - PDF_FOOTER_SPACE - 2;
	const { FONT, PAD_X, HEAD_H, LINE_H, ROW_PAD_Y, FILL_ZEBRA } = REND_TABLE;

	const headerOpts: PDFHeaderOptions = {
		title: 'RESUMEN POR PRÁCTICAS',
		empresaInfo: empresaConLogo,
		emittedAt: new Date(),
		institucionCompleta: true,
	};

	const fileName = `rendicion_${data.rendicion.id}_practica_resumen.pdf`;
	let y = await drawDocumentHeader(doc, headerOpts);
	let reimprimirCabezal = false;

	const r = data.rendicion;
	y = drawMetaRendicion(doc, y, x0, x1, {
		fechaGraba: r.fechaGraba,
		convenio: r.convenio,
		observaciones: r.observaciones,
		extra: metaExtraRendicion(r.id, r.cliente),
	});

	const nuevaPagina = () => {
		doc.addPage();
		y = PDF_CONTENT_TOP;
		reimprimirCabezal = true;
	};

	const asegurar = (necesario: number) => {
		if (y + necesario <= limite()) return;
		nuevaPagina();
	};

	const drawTableHead = () => {
		y = drawRendicionTableHead(doc, y, x0, cols);
		reimprimirCabezal = false;
	};

	const rowHeight = (l: LineaReportePracticaResumen) => {
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(FONT);
		const prac = cols.find((c) => c.key === 'practica');
		const lines = prac
			? wrapFull(doc, celda(l, 'practica'), Math.max(4, prac.w - PAD_X * 2))
			: [''];
		return Math.max(1, lines.length) * LINE_H + ROW_PAD_Y * 2;
	};

	const drawRow = (l: LineaReportePracticaResumen, zebra: boolean) => {
		const h = rowHeight(l);
		asegurar(h + (reimprimirCabezal ? HEAD_H + 4 : 1));
		if (reimprimirCabezal) drawTableHead();
		const top = y;
		if (zebra) {
			doc.setFillColor(...FILL_ZEBRA);
			doc.rect(x0, top, usable, h, 'F');
		}
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(FONT);
		doc.setTextColor(...PDF_COLORS.ink);
		const textY = top + ROW_PAD_Y + 2.0;
		let x = x0;
		for (const c of cols) {
			const raw = celda(l, c.key);
			const lines = c.wrap ? wrapFull(doc, raw, Math.max(4, c.w - PAD_X * 2)) : [raw];
			doc.text(lines.filter(Boolean).length ? lines : [''], textXRend(c, x), textY, {
				align: c.align === 'right' ? 'right' : 'left',
				lineHeightFactor: 1.12,
			});
			x += c.w;
		}
		doc.setDrawColor(241, 245, 249);
		doc.setLineWidth(0.15);
		doc.line(x0, top + h, x1, top + h);
		y = top + h;
	};

	drawTableHead();

	if (!data.lineas.length) {
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(9);
		doc.setTextColor(...PDF_COLORS.muted);
		doc.text('Sin prácticas para los filtros seleccionados.', x0, y + 4);
	} else {
		data.lineas.forEach((l, i) => drawRow(l, i % 2 === 1));
	}

	const t = data.totales;
	asegurar(22);
	y += 3;

	const ACCENT = 1.4;
	const totH = 14;
	doc.setDrawColor(...PDF_COLORS.line);
	doc.setFillColor(...PDF_COLORS.brandSoft);
	doc.setLineWidth(0.25);
	doc.roundedRect(x0, y, usable, totH, 1.2, 1.2, 'FD');
	doc.setFillColor(...PDF_COLORS.brand);
	doc.rect(x0, y, ACCENT, totH, 'F');

	const metrica = (
		label: string,
		valor: string,
		cx: number,
		align: 'left' | 'right' = 'left',
	) => {
		const labelY = y + 4.2;
		const valorY = y + 9.6;
		doc.setFont('helvetica', 'bold');
		doc.setFontSize(5.6);
		doc.setTextColor(...PDF_COLORS.muted);
		doc.text(label.toUpperCase(), cx, labelY, { align });
		doc.setFont('helvetica', 'bold');
		doc.setFontSize(8);
		doc.setTextColor(...PDF_COLORS.ink);
		doc.text(valor, cx, valorY, { align });
	};

	const pad = 4;
	const totalW = Math.min(42, usable * 0.28);
	const metricsW = usable - totalW - pad * 2 - ACCENT;
	const slot = metricsW / 4;
	const baseX = x0 + ACCENT + pad;

	metrica('Prácticas', String(t.practicas), baseX + slot * 0);
	metrica('Cantidad', fmtImporte(t.cantidad), baseX + slot * 1);
	metrica('Honorarios', `$${fmtImporte(t.honorarios)}`, baseX + slot * 2);
	metrica('Gastos', `$${fmtImporte(t.gastos)}`, baseX + slot * 3);

	const totalX = x1 - pad;
	doc.setDrawColor(...PDF_COLORS.line);
	doc.setLineWidth(0.3);
	doc.line(x1 - totalW, y + 2.2, x1 - totalW, y + totH - 2.2);
	metrica('Total', `$${fmtImporte(t.total)}`, totalX, 'right');

	y += totH + 2;

	drawRunningHeaders(doc, headerOpts);
	drawDocumentFooters(doc, headerOpts);

	return { blob: doc.output('blob'), fileName };
}
