import jsPDF from 'jspdf';
import type { AdmisionReporteDetalle, LineaReporteDetalle, ReporteDetalle } from '@/app/types/rendiciones';
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

type OpcionesPdfDetalle = {
	saltarHojaPorAdmision?: boolean;
	incluirValorizacion?: boolean;
};

type Col = RendCol;

const TITLE = 'RENDICIÓN INDIVIDUAL';
const { FONT, PAD_X, HEAD_H, LINE_H, ROW_PAD_Y, FILL_ZEBRA } = REND_TABLE;

const COLS_BASE: Col[] = [
	{ key: 'desc', label: 'Descripción', w: 78 },
	{ key: 'fecha', label: 'Fecha', w: 18 },
	{ key: 'cant', label: 'Cantidad', w: 14, align: 'right' },
	{ key: 'porc', label: '%', w: 16, align: 'right' },
	{ key: 'unit', label: 'Imp. Unit.', w: 28, align: 'right' },
	{ key: 'total', label: 'Imp. Final', w: 28, align: 'right' },
];

function clean(v: unknown): string {
	const s = String(v ?? '').trim();
	return s || '';
}

function fmtDoc(n: number | null | undefined): string {
	if (n == null || !Number.isFinite(n) || n <= 0) return '';
	return new Intl.NumberFormat('es-AR').format(n);
}

function fechaHora(fecha: string | null | undefined, hora: string | null | undefined): string {
	const f = fmtFecha(fecha);
	const h = clean(hora).slice(0, 5);
	if (f && h) return `${f} ${h}`;
	return f || h || '';
}

const textX = textXRend;

function celdaLinea(l: LineaReporteDetalle, key: string, valorizar: boolean): string {
	switch (key) {
		case 'desc':
			return clean(l.descripcion) || '—';
		case 'fecha':
			return fmtFecha(l.fecha) || '';
		case 'cant':
			return l.cantidad ? fmtImporte(l.cantidad) : '';
		case 'porc':
			return l.porcentaje ? fmtImporte(l.porcentaje) : '';
		case 'unit':
			return valorizar && l.importeUnitario ? fmtImporte(l.importeUnitario) : '';
		case 'total':
			return valorizar && l.importeFinal ? fmtImporte(l.importeFinal) : '';
		default:
			return '';
	}
}

/** PDF del reporte Detalle (RENDICIÓN INDIVIDUAL). Cabecera institucional completa. */
export async function generarPdfRendicionDetalle(
	data: ReporteDetalle,
	opts: OpcionesPdfDetalle = {},
): Promise<{ blob: Blob; fileName: string }> {
	const saltarHoja = Boolean(opts.saltarHojaPorAdmision);
	const valorizar = opts.incluirValorizacion !== false;

	const [empresaInfo, logo] = await Promise.all([
		obtenerInfoEmpresa().catch(() => null),
		obtenerLogoEmpresa().catch(() => null),
	]);
	const empresaConLogo = empresaInfo ? { ...empresaInfo, logo: logo || empresaInfo.logo } : null;

	const tipos = new Set(data.filtros.tipos);
	const colsActivas = COLS_BASE.filter((c) => {
		if (c.key === 'unit' || c.key === 'total') return valorizar;
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

	const fileName = `rendicion_${data.rendicion.id}_detalle.pdf`;
	let y = await drawDocumentHeader(doc, headerOpts);
	const rMeta = data.rendicion;
	y = drawMetaRendicion(doc, y, x0, x1, {
		fechaGraba: rMeta.fechaGraba,
		convenio: rMeta.convenio,
		observaciones: rMeta.observaciones,
		extra: metaExtraRendicion(rMeta.id, rMeta.cliente),
	});

	/** Tras un salto de página, reimprimir encabezado de tabla si estamos en un bloque. */
	let reimprimirCabezal = false;

	const asegurarEspacio = async (necesario: number, forzarNueva = false) => {
		if (!forzarNueva && y + necesario <= limite()) return;
		doc.addPage();
		// Hojas 2+: solo membrete compacto (`drawRunningHeaders`), sin repetir cabecera institucional.
		y = PDF_CONTENT_TOP;
		reimprimirCabezal = true;
	};

	const drawPanelAdmision = (adm: AdmisionReporteDetalle) => {
		const p = adm.paciente;
		/** Grilla fija de 4 columnas: cada celda declara cuántas columnas ocupa (`span`). */
		type Celda = { label: string; value: string; span: 1 | 2 };
		const filas: Celda[][] = [
			[
				{ label: 'Nº Admisión', value: String(adm.numeroVisita || ''), span: 1 },
				{ label: 'Ingreso', value: fechaHora(adm.ingreso.fecha, adm.ingreso.hora), span: 1 },
				{ label: 'Egreso', value: fechaHora(adm.egreso.fecha, adm.egreso.hora), span: 1 },
				{ label: 'Nº de Afiliado', value: clean(p.nroAfiliado), span: 1 },
			],
			[
				{ label: 'Paciente', value: clean(p.nombre), span: 2 },
				{ label: 'Documento', value: fmtDoc(p.documento?.numero), span: 1 },
				{ label: 'Nro Legajo', value: clean(p.nroLegajo), span: 1 },
			],
			[
				{ label: 'Domicilio', value: clean(p.domicilio), span: 2 },
				{ label: 'C.U.I.T.', value: clean(p.cuit), span: 1 },
				{ label: 'Nº de Siniestro', value: clean(p.nroSiniestro), span: 1 },
			],
			[
				{ label: 'Cobertura', value: clean(adm.cobertura), span: 1 },
				{ label: 'Nro Póliza', value: clean(p.nroPoliza), span: 1 },
			],
			[
				{ label: 'CUIT OS/ART', value: clean(p.cuitOsArt), span: 1 },
				{ label: 'Dominio del Transporte', value: clean(p.dominioTransporte), span: 1 },
			],
			[
				{ label: 'Diagnóstico', value: clean(adm.diagnostico), span: 2 },
				{ label: 'Clase Paciente', value: clean(adm.clase?.descripcion || adm.clase?.valor), span: 1 },
			],
		];

		const COLS = 4;
		const unit = usable / COLS;
		const rowH = 5.2;
		const panelH = filas.length * rowH + 2;
		doc.setDrawColor(...PDF_COLORS.line);
		doc.setFillColor(...PDF_COLORS.panel);
		doc.setLineWidth(0.25);
		doc.roundedRect(x0, y, usable, panelH, 1.2, 1.2, 'FD');

		let cy = y + 3.8;
		for (const fila of filas) {
			let col = 0;
			for (const celda of fila) {
				const span = Math.min(celda.span, COLS - col);
				const celW = unit * span;
				const cx = x0 + col * unit + 2;
				doc.setFont('helvetica', 'bold');
				doc.setFontSize(5.8);
				doc.setTextColor(...PDF_COLORS.muted);
				const etiqueta = `${celda.label}:`;
				doc.text(etiqueta, cx, cy);
				const labelW = doc.getTextWidth(`${etiqueta} `);
				doc.setFont('helvetica', 'normal');
				doc.setFontSize(7);
				doc.setTextColor(...PDF_COLORS.ink);
				const valor = wrapFitText(doc, celda.value || '—', Math.max(10, celW - labelW - 4), 1)[0];
				doc.text(valor, cx + labelW, cy);
				col += span;
			}
			cy += rowH;
		}
		y += panelH + 4;
	};

	const drawSectionTitle = (titulo: string) => {
		doc.setFont('helvetica', 'bold');
		doc.setFontSize(8);
		doc.setTextColor(...PDF_COLORS.ink);
		doc.text(titulo, x0, y + 2);
		y += 6;
	};

	const drawTableHead = () => {
		y = drawRendicionTableHead(doc, y, x0, cols);
		reimprimirCabezal = false;
	};

	const rowHeight = (l: LineaReporteDetalle): number => {
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(FONT);
		const descCol = cols.find((c) => c.key === 'desc');
		const lines = descCol
			? wrapFitText(doc, celdaLinea(l, 'desc', valorizar), Math.max(4, descCol.w - PAD_X * 2), 3)
			: [''];
		return Math.max(1, lines.length) * LINE_H + ROW_PAD_Y * 2;
	};

	const drawRow = async (l: LineaReporteDetalle, zebra: boolean) => {
		const h = rowHeight(l);
		await asegurarEspacio(h + (reimprimirCabezal ? HEAD_H + 4 : 1));
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
			const raw = celdaLinea(l, c.key, valorizar);
			const lines =
				c.key === 'desc'
					? wrapFitText(doc, raw, Math.max(4, c.w - PAD_X * 2), 3)
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

	const drawBloque = async (titulo: string, lineas: LineaReporteDetalle[]) => {
		if (!lineas.length) return;
		await asegurarEspacio(HEAD_H + 14);
		drawSectionTitle(titulo);
		drawTableHead();
		for (let i = 0; i < lineas.length; i++) {
			await drawRow(lineas[i], i % 2 === 1);
		}
		y += 2;
	};

	if (!data.admisiones.length) {
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(9);
		doc.setTextColor(...PDF_COLORS.muted);
		doc.text('Sin admisiones para los filtros seleccionados.', x0, y + 4);
	} else {
		for (let i = 0; i < data.admisiones.length; i++) {
			const adm = data.admisiones[i];
			const nuevaAdmision = i > 0;
			if (saltarHoja && nuevaAdmision) {
				await asegurarEspacio(40, true);
			} else if (nuevaAdmision) {
				await asegurarEspacio(36);
				y += 2;
			}

			await asegurarEspacio(42);
			drawPanelAdmision(adm);

			if (tipos.has('G')) await drawBloque('Detalle de Gastos', adm.gastos);
			if (tipos.has('H')) await drawBloque('Detalle de Honorarios', adm.honorarios);
			if (tipos.has('M')) await drawBloque('Detalle de Medicamentos', adm.medicamentos);

			await asegurarEspacio(12);
			doc.setDrawColor(...PDF_COLORS.line);
			doc.setLineWidth(0.3);
			doc.line(x0, y, x1, y);
			y += 5;
			doc.setFont('helvetica', 'bold');
			doc.setFontSize(8.5);
			doc.setTextColor(...PDF_COLORS.ink);
			const totalTxt = valorizar
				? `Total de la Admisión: $ ${fmtImporte(adm.total)}`
				: `Total de la Admisión`;
			doc.text(totalTxt, x1, y, { align: 'right' });
			y += 8;
		}
	}

	drawRunningHeaders(doc, headerOpts);
	drawDocumentFooters(doc, headerOpts);

	return { blob: doc.output('blob'), fileName };
}
