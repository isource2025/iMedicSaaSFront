import jsPDF from 'jspdf';
import type { LineaReporteProfesional, ReporteProfesional } from '@/app/types/rendiciones';
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
import { abrirPdfBlob, reservarVentanaPreview } from './pdfRendicionResumen';
import {
	drawRendicionTableHead,
	metaExtraRendicion,
	REND_TABLE,
	textXRend,
	type RendCol,
} from './pdfRendicionTabla';

export { abrirPdfBlob, reservarVentanaPreview };

type OpcionesPdf = { saltarHojaPorProfesional?: boolean };
type Col = RendCol;

const TITLE = 'POR PROFESIONAL';
const { FONT, PAD_X, HEAD_H, LINE_H, ROW_PAD_Y, FILL_ZEBRA } = REND_TABLE;

const COLS: Col[] = [
	{ key: 'visita', label: 'Nº Visita', w: 16 },
	{ key: 'paciente', label: 'Paciente', w: 42 },
	{ key: 'afiliado', label: 'Nro. Afiliado', w: 22 },
	{ key: 'fecha', label: 'Fecha', w: 18 },
	{ key: 'codigo', label: 'Código', w: 14 },
	{ key: 'funcion', label: 'Función', w: 12, align: 'right' },
	{ key: 'cant', label: 'Cantidad', w: 14, align: 'right' },
	{ key: 'porc', label: '%', w: 16, align: 'right' },
	{ key: 'importe', label: 'Imp. Final', w: 22, align: 'right' },
];

function clean(v: unknown): string {
	const s = String(v ?? '').trim();
	return s || '';
}

function celda(l: LineaReporteProfesional, key: string): string {
	switch (key) {
		case 'visita':
			return String(l.numeroVisita || '');
		case 'paciente':
			return clean(l.paciente) || '—';
		case 'afiliado':
			return clean(l.nroAfiliado);
		case 'fecha':
			return fmtFecha(l.fecha) || '';
		case 'codigo':
			return l.codigo ? String(l.codigo) : '';
		case 'funcion':
			return l.funcion ? String(l.funcion) : '';
		case 'cant':
			return l.cantidad ? fmtImporte(l.cantidad) : '';
		case 'porc':
			return l.porcentaje ? fmtImporte(l.porcentaje) : '';
		case 'importe':
			return l.importe ? fmtImporte(l.importe) : '';
		default:
			return '';
	}
}

const textX = textXRend;

export async function generarPdfRendicionProfesional(
	data: ReporteProfesional,
	opts: OpcionesPdf = {},
): Promise<{ blob: Blob; fileName: string }> {
	const saltarHoja = Boolean(opts.saltarHojaPorProfesional);

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
	const colScale = usable / COLS.reduce((s, c) => s + c.w, 0);
	const cols = COLS.map((c) => ({ ...c, w: c.w * colScale }));
	const limite = () => pageH - PDF_FOOTER_SPACE - 2;

	const headerOpts: PDFHeaderOptions = {
		title: TITLE,
		empresaInfo: empresaConLogo,
		emittedAt: new Date(),
		institucionCompleta: true,
	};

	const fileName = `rendicion_${data.rendicion.id}_profesional.pdf`;
	let y = await drawDocumentHeader(doc, headerOpts);
	/** Tras un salto de página hay que reimprimir el encabezado de tabla. */
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
		// Solo membrete compacto en hojas 2+ (`drawRunningHeaders`); no repetir cabecera institucional.
		y = PDF_CONTENT_TOP;
		reimprimirCabezal = true;
	};

	const asegurar = (necesario: number, forzar = false) => {
		if (!forzar && y + necesario <= limite()) return;
		nuevaPagina();
	};

	const drawTableHead = () => {
		y = drawRendicionTableHead(doc, y, x0, cols);
		reimprimirCabezal = false;
	};

	const rowHeight = (l: LineaReporteProfesional): number => {
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(FONT);
		const pac = cols.find((c) => c.key === 'paciente');
		const lines = pac
			? (doc.splitTextToSize(celda(l, 'paciente') || ' ', Math.max(4, pac.w - PAD_X * 2)) as string[]).slice(
					0,
					10,
				)
			: [''];
		return Math.max(1, lines.length) * LINE_H + ROW_PAD_Y * 2;
	};

	const drawRow = (l: LineaReporteProfesional, zebra: boolean) => {
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
			const lines =
				c.key === 'paciente'
					? (doc.splitTextToSize(raw || ' ', Math.max(4, c.w - PAD_X * 2)) as string[]).slice(0, 10)
					: [raw];
			doc.text(lines.filter(Boolean).length ? lines : [''], textX(c, x), textY, {
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

	const totalPacientes = new Set(
		data.grupos.flatMap((g) => g.lineas.map((l) => l.numeroVisita).filter(Boolean)),
	).size;

	if (!data.grupos.length) {
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(9);
		doc.setTextColor(...PDF_COLORS.muted);
		doc.text('Sin honorarios para los filtros seleccionados.', x0, y + 4);
	} else {
		for (let gi = 0; gi < data.grupos.length; gi++) {
			const g = data.grupos[gi];
			if (gi > 0 && saltarHoja) asegurar(40, true);
			else asegurar(18);

			const titulo =
				g.matricula > 0
					? `Profesional. Matrícula: ${g.matricula}${g.nombre ? ` - ${g.nombre}` : ''}`
					: `Profesional. ${g.nombre || 'Sin matrícula'}`;

			doc.setFont('helvetica', 'bold');
			doc.setFontSize(8);
			doc.setTextColor(...PDF_COLORS.ink);
			const tituloLines = wrapFitText(doc, titulo, usable, 2);
			doc.text(tituloLines, x0, y + 2);
			y += tituloLines.length * 3.6 + 3;

			drawTableHead();
			for (let i = 0; i < g.lineas.length; i++) {
				drawRow(g.lineas[i], i % 2 === 1);
			}

			asegurar(14);
			const totH = 7.2;
			doc.setDrawColor(...PDF_COLORS.line);
			doc.setLineWidth(0.3);
			doc.line(x0, y, x1, y);
			y += 0.4;
			doc.setFillColor(...PDF_COLORS.brandSoft);
			doc.rect(x0, y, usable, totH, 'F');
			const totY = y + totH / 2 + 1.2;
			doc.setFont('helvetica', 'bold');
			doc.setFontSize(7.2);
			doc.setTextColor(...PDF_COLORS.muted);
			doc.text('Total Profesional', x0 + 2.2, totY);
			doc.setFont('helvetica', 'bold');
			doc.setFontSize(9);
			doc.setTextColor(...PDF_COLORS.ink);
			doc.text(`$${fmtImporte(g.total)}`, x1 - 2.2, totY, { align: 'right' });
			y += totH + 6;
		}

		asegurar(16);
		doc.setDrawColor(...PDF_COLORS.ink);
		doc.setLineWidth(0.35);
		doc.line(x0, y, x1, y);
		y += 0.7;
		doc.line(x0, y, x1, y);
		y += 5;
		doc.setFont('helvetica', 'bold');
		doc.setFontSize(9);
		doc.setTextColor(...PDF_COLORS.ink);
		doc.text(`Total Pacientes: ${totalPacientes}`, x0, y);
		y += 4.5;
		doc.text(`Total Rendicion: $${fmtImporte(data.totalGeneral)}`, x0, y);
	}

	drawRunningHeaders(doc, headerOpts);
	drawDocumentFooters(doc, headerOpts);

	return { blob: doc.output('blob'), fileName };
}
