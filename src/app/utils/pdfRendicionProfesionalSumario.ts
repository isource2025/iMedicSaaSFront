import jsPDF from 'jspdf';
import type { PracticaSumarioProfesional, ReporteProfesionalSumario } from '@/app/types/rendiciones';
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

type Col = RendCol;

const TITLE = 'SUMARIZADO POR PROFESIONAL';
const { FONT, PAD_X, HEAD_H, LINE_H, ROW_PAD_Y, FILL_ZEBRA } = REND_TABLE;
/** Aire a la izquierda para no chocar con la barra de acento del bloque profesional. */
const PAD_X_LEFT = 4;
const ACCENT_W = 1.4;

const COLS: Col[] = [
	{ key: 'practica', label: 'Código / Descripción', w: 130 },
	{ key: 'cant', label: 'Cantidad', w: 24, align: 'right' },
	{ key: 'importe', label: 'Imp. Final', w: 32, align: 'right' },
];

function clean(v: unknown): string {
	const s = String(v ?? '').trim();
	return s || '';
}

function celda(p: PracticaSumarioProfesional, key: string): string {
	switch (key) {
		case 'practica': {
			const cod = p.codigo ? String(p.codigo) : '';
			const raw = clean(p.descripcion);
			const desc =
				cod && raw.startsWith(`${cod} `) ? raw.slice(cod.length + 1).trim() : raw;
			if (cod && desc) return `${cod}  ${desc}`;
			return cod || desc || '—';
		}
		case 'cant':
			return p.cantidad ? fmtImporte(p.cantidad) : '';
		case 'importe':
			return p.importe ? fmtImporte(p.importe) : '';
		default:
			return '';
	}
}

function textX(col: Col, x: number): number {
	return col.align === 'right' ? textXRend(col, x, PAD_X) : x + PAD_X_LEFT;
}

type OpcionesPdfSumario = { saltarHojaPorProfesional?: boolean };

export async function generarPdfRendicionProfesionalSumario(
	data: ReporteProfesionalSumario,
	opts: OpcionesPdfSumario = {},
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

	const fileName = `rendicion_${data.rendicion.id}_profesional_sumario.pdf`;
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
		y = drawRendicionTableHead(doc, y, x0, cols, { padLeft: PAD_X_LEFT, padRight: PAD_X });
		reimprimirCabezal = false;
	};

	const rowHeight = (p: PracticaSumarioProfesional): number => {
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(FONT);
		const prac = cols.find((c) => c.key === 'practica');
		const lines = prac
			? (doc.splitTextToSize(
					celda(p, 'practica') || ' ',
					Math.max(4, prac.w - PAD_X_LEFT - PAD_X),
				) as string[]).slice(0, 10)
			: [''];
		return Math.max(1, lines.length) * LINE_H + ROW_PAD_Y * 2;
	};

	const drawRow = (p: PracticaSumarioProfesional, zebra: boolean) => {
		const h = rowHeight(p);
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
		const textY = top + ROW_PAD_Y + 2.1;
		let x = x0;
		for (const c of cols) {
			const raw = celda(p, c.key);
			const lines =
				c.key === 'practica'
					? (doc.splitTextToSize(raw || ' ', Math.max(4, c.w - PAD_X_LEFT - PAD_X)) as string[]).slice(
							0,
							10,
						)
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

	const colX = (key: string) => {
		let x = x0;
		for (const c of cols) {
			if (c.key === key) return x;
			x += c.w;
		}
		return x0;
	};

	if (!data.grupos.length) {
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(9);
		doc.setTextColor(...PDF_COLORS.muted);
		doc.text('Sin honorarios para los filtros seleccionados.', x0, y + 4);
	} else {
		for (let gi = 0; gi < data.grupos.length; gi++) {
			const g = data.grupos[gi];
			if (gi > 0 && saltarHoja) {
				nuevaPagina();
			} else {
				asegurar(gi === 0 ? 22 : 28);
			}

			if (gi > 0 && !saltarHoja) {
				y += 3;
				doc.setDrawColor(...PDF_COLORS.line);
				doc.setLineWidth(0.35);
				doc.line(x0, y, x1, y);
				y += 4;
			}

			const matLabel =
				g.matricula > 0 ? `Matrícula ${g.matricula}` : 'Sin matrícula';
			const nombre = clean(g.nombre) || (g.matricula > 0 ? 'Sin nombre' : 'Sin profesional');
			const headH = 9.5;
			const bloqueTop = y;
			doc.setFillColor(...PDF_COLORS.brandSoft);
			doc.rect(x0, y, usable, headH, 'F');
			doc.setFont('helvetica', 'bold');
			doc.setFontSize(6.4);
			doc.setTextColor(...PDF_COLORS.brand);
			doc.text('PROFESIONAL', x0 + PAD_X_LEFT, y + 3.4);
			doc.setFontSize(8.2);
			doc.setTextColor(...PDF_COLORS.ink);
			doc.text(
				wrapFitText(doc, `${matLabel}  ·  ${nombre}`, usable - PAD_X_LEFT - 4, 1)[0],
				x0 + PAD_X_LEFT,
				y + 7.4,
			);
			y += headH;

			drawTableHead();
			// Acento izquierdo continuo: profesional + encabezado de columnas.
			doc.setFillColor(...PDF_COLORS.brand);
			doc.rect(x0, bloqueTop, ACCENT_W, headH + HEAD_H, 'F');
			for (let i = 0; i < g.practicas.length; i++) {
				drawRow(g.practicas[i], i % 2 === 1);
			}

			const cantTotal = g.practicas.reduce((s, p) => s + (p.cantidad || 0), 0);
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
			doc.text('Total Profesional', x0 + PAD_X_LEFT, totY);
			doc.setFontSize(8.2);
			doc.setTextColor(...PDF_COLORS.ink);
			const cantCol = cols.find((c) => c.key === 'cant');
			if (cantCol) {
				doc.text(fmtImporte(cantTotal), textX(cantCol, colX('cant')), totY, { align: 'right' });
			}
			doc.setFontSize(9);
			doc.text(`$${fmtImporte(g.total)}`, x1 - 2.2, totY, { align: 'right' });
			y += totH + (gi < data.grupos.length - 1 ? 8 : 6);
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
		doc.text(`Total Prácticas: ${data.totalPracticas}`, x0, y);
		doc.text(`Total Rendicion: $${fmtImporte(data.totalGeneral)}`, x1, y, { align: 'right' });
	}

	drawRunningHeaders(doc, headerOpts);
	drawDocumentFooters(doc, headerOpts);

	return { blob: doc.output('blob'), fileName };
}
