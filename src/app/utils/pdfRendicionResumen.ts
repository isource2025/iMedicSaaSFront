import jsPDF from 'jspdf';
import type { ReporteResumen } from '@/app/types/rendiciones';
import { fmtFecha, fmtImporte } from '@/app/components/Facturacion/formato';
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
	wrapFitText,
	type PDFHeaderOptions,
} from './pdfHeader';
import { drawMetaRendicion } from './pdfRendicionMeta';
import {
	drawRendicionTableHead,
	metaExtraRendicion,
	REND_TABLE,
	textXRend,
	type RendCol,
} from './pdfRendicionTabla';

type Col = RendCol;

/** Anchos para A4 vertical (~186 mm útiles). */
const COLS: Col[] = [
	{ key: 'adm', label: 'Nº Visita', w: 14 },
	{ key: 'paciente', label: 'Paciente', w: 40 },
	{ key: 'afiliado', label: 'Nro. Afiliado', w: 24 },
	{ key: 'autorizacion', label: 'Autoriz.', w: 18 },
	{ key: 'ingreso', label: 'Ingreso', w: 18 },
	{ key: 'gas', label: 'GAS', w: 16, align: 'right' },
	{ key: 'hon', label: 'HON', w: 16, align: 'right' },
	{ key: 'med', label: 'MED', w: 16, align: 'right' },
	{ key: 'total', label: 'TOTAL', w: 18, align: 'right' },
];

const TITLE = 'RENDICIÓN RESUMIDA';
const { FONT, PAD_X, HEAD_H, LINE_H, ROW_PAD_Y, FILL_ZEBRA } = REND_TABLE;

function clean(v: unknown): string {
	const s = String(v ?? '').trim();
	return s || '';
}

function celda(
	fila: ReporteResumen['filas'][number],
	key: string,
	mostrar: { gas: boolean; hon: boolean; med: boolean },
): string {
	switch (key) {
		case 'adm':
			return String(fila.numeroVisita || '');
		case 'paciente':
			return clean(fila.paciente) || '—';
		case 'afiliado':
			return clean(fila.nroAfiliado) || '—';
		case 'autorizacion':
			return clean(fila.nroAutorizacion);
		case 'ingreso':
			return fmtFecha(fila.ingreso) || '—';
		case 'gas':
			return mostrar.gas && fila.gastos ? fmtImporte(fila.gastos) : '';
		case 'hon':
			return mostrar.hon && fila.honorarios ? fmtImporte(fila.honorarios) : '';
		case 'med':
			return mostrar.med && fila.medicamentos ? fmtImporte(fila.medicamentos) : '';
		case 'total':
			return fila.total ? fmtImporte(fila.total) : '';
		default:
			return '';
	}
}

function lineasCelda(
	doc: jsPDF,
	fila: ReporteResumen['filas'][number],
	col: Col,
	mostrar: { gas: boolean; hon: boolean; med: boolean },
): string[] {
	const texto = celda(fila, col.key, mostrar);
	if (!texto) return [''];
	doc.setFont('helvetica', 'normal');
	doc.setFontSize(FONT);
	return wrapFitText(doc, texto, Math.max(4, col.w - PAD_X * 2), col.key === 'paciente' ? 2 : 1);
}

const textX = textXRend;

/** PDF del reporte Resumen. Cabecera institucional única (`pdfHeader`). */
export async function generarPdfRendicionResumen(data: ReporteResumen): Promise<{ blob: Blob; fileName: string }> {
	const [empresaInfo, logo] = await Promise.all([
		obtenerInfoEmpresa().catch(() => null),
		obtenerLogoEmpresa().catch(() => null),
	]);
	const empresaConLogo = empresaInfo ? { ...empresaInfo, logo: logo || empresaInfo.logo } : null;

	const tipos = new Set(data.filtros.tipos);
	const mostrar = { gas: tipos.has('G'), hon: tipos.has('H'), med: tipos.has('M') };
	const colsActivas = COLS.filter((c) => {
		if (c.key === 'gas') return mostrar.gas;
		if (c.key === 'hon') return mostrar.hon;
		if (c.key === 'med') return mostrar.med;
		return true;
	});

	const doc = new jsPDF(PDF_PAGE);
	const pageW = doc.internal.pageSize.getWidth();
	const pageH = doc.internal.pageSize.getHeight();
	const x0 = PDF_MARGIN_X;
	const x1 = pageW - PDF_MARGIN_X;
	const usable = x1 - x0;
	const colScale = usable / colsActivas.reduce((s, c) => s + c.w, 0);
	const cols = colsActivas.map((c) => ({ ...c, w: c.w * colScale }));
	const limite = () => pageH - PDF_FOOTER_SPACE - 2;

	const headerOpts: PDFHeaderOptions = {
		title: TITLE,
		empresaInfo: empresaConLogo,
		emittedAt: new Date(),
		institucionCompleta: true,
	};

	const fileName = `rendicion_${data.rendicion.id}_resumen.pdf`;
	let y = await drawDocumentHeader(doc, headerOpts);
	const r = data.rendicion;
	const letras = data.filtros.letras?.length ? data.filtros.letras.join('') : '*';
	y = drawMetaRendicion(doc, y, x0, x1, {
		fechaGraba: r.fechaGraba,
		convenio: r.convenio,
		observaciones: r.observaciones,
		extra: metaExtraRendicion(
			r.id,
			r.cliente,
			`Letra: ${letras.includes('*') || !letras ? '*' : letras}`,
		),
	});

	const drawTableHead = () => {
		y = drawRendicionTableHead(doc, y, x0, cols);
	};

	const rowHeight = (fila: ReporteResumen['filas'][number]): number => {
		let lines = 1;
		for (const c of cols) {
			lines = Math.max(lines, lineasCelda(doc, fila, c, mostrar).filter(Boolean).length || 1);
		}
		return lines * LINE_H + ROW_PAD_Y * 2;
	};

	const drawRow = (fila: ReporteResumen['filas'][number], zebra: boolean) => {
		const top = y;
		const h = rowHeight(fila);
		if (zebra) {
			doc.setFillColor(...FILL_ZEBRA);
			doc.rect(x0, top, usable, h, 'F');
		}
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(FONT);
		doc.setTextColor(...PDF_COLORS.ink);
		const textY = top + ROW_PAD_Y + 2.2;
		let x = x0;
		for (const c of cols) {
			const lines = lineasCelda(doc, fila, c, mostrar);
			doc.text(lines, textX(c, x), textY, {
				align: c.align === 'right' ? 'right' : 'left',
				lineHeightFactor: 1.15,
			});
			x += c.w;
		}
		doc.setDrawColor(241, 245, 249);
		doc.setLineWidth(0.15);
		doc.line(x0, top + h, x1, top + h);
		y = top + h;
	};

	const nuevaPagina = () => {
		doc.addPage();
		y = PDF_CONTENT_TOP;
		drawTableHead();
	};

	drawTableHead();

	if (!data.filas.length) {
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(9);
		doc.setTextColor(...PDF_COLORS.muted);
		doc.text('Sin admisiones para los filtros seleccionados.', x0, y + 4);
		y += 10;
	} else {
		data.filas.forEach((fila, i) => {
			const h = rowHeight(fila);
			if (y + h > limite()) nuevaPagina();
			drawRow(fila, i % 2 === 1);
		});
	}

	if (y + 10 > limite()) nuevaPagina();
	y += 2;
	doc.setDrawColor(...PDF_COLORS.line);
	doc.setLineWidth(0.3);
	doc.line(x0, y, x1, y);
	y += 5;
	doc.setFont('helvetica', 'bold');
	doc.setFontSize(8);
	doc.setTextColor(...PDF_COLORS.ink);
	doc.text(`Total pacientes: ${data.totalPacientes}`, x0, y);

	let x = x0;
	for (const c of cols) {
		let valor = '';
		if (c.key === 'gas' && mostrar.gas) valor = fmtImporte(data.totales.gastos);
		else if (c.key === 'hon' && mostrar.hon) valor = fmtImporte(data.totales.honorarios);
		else if (c.key === 'med' && mostrar.med) valor = fmtImporte(data.totales.medicamentos);
		else if (c.key === 'total') valor = fmtImporte(data.totales.total);
		if (valor) doc.text(valor, textX(c, x), y, { align: 'right' });
		x += c.w;
	}

	drawRunningHeaders(doc, headerOpts);
	drawDocumentFooters(doc, headerOpts);

	return { blob: doc.output('blob'), fileName };
}

export type ModoPdfBlob = 'descargar' | 'previsualizar';

/**
 * Abre una pestaña en blanco de forma síncrona (antes del await del PDF)
 * para que el navegador no bloquee el preview ni dispare una descarga.
 */
export function reservarVentanaPreview(): Window | null {
	try {
		return window.open('about:blank', '_blank');
	} catch {
		return null;
	}
}

/** Descarga el PDF o lo muestra en una pestaña (sin forzar descarga). */
export function abrirPdfBlob(
	blob: Blob,
	fileName: string,
	modo: ModoPdfBlob = 'descargar',
	ventanaPreview?: Window | null,
) {
	const pdfBlob =
		blob.type === 'application/pdf' ? blob : new Blob([blob], { type: 'application/pdf' });
	const url = URL.createObjectURL(pdfBlob);

	if (modo === 'previsualizar') {
		const win = ventanaPreview && !ventanaPreview.closed ? ventanaPreview : null;
		if (win) {
			win.location.href = url;
			win.focus();
		} else {
			// Sin ventana reservada: abrir por link (sin atributo download).
			const a = document.createElement('a');
			a.href = url;
			a.target = '_blank';
			a.rel = 'noopener noreferrer';
			document.body.appendChild(a);
			a.click();
			a.remove();
		}
		setTimeout(() => URL.revokeObjectURL(url), 120_000);
		return;
	}

	const a = document.createElement('a');
	a.href = url;
	a.download = fileName;
	a.rel = 'noopener';
	document.body.appendChild(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
