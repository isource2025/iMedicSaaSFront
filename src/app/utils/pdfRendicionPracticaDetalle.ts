import jsPDF from 'jspdf';
import type { LineaReportePracticaDetalle, ReportePracticaDetalle } from '@/app/types/rendiciones';
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
	scaleCols,
	textXRend,
} from './pdfRendicionTabla';

export { abrirPdfBlob, reservarVentanaPreview };

type GrupoFecha = {
	fechaKey: string;
	fechaLabel: string;
	lineas: LineaReportePracticaDetalle[];
};

type GrupoPaciente = {
	clave: string;
	paciente: string;
	nroAfiliado: string;
	visitas: number[];
	diagnosticos: string[];
	fechas: GrupoFecha[];
};

const MAX_WRAP = 14;

function clean(v: unknown): string {
	const s = String(v ?? '').trim();
	return s || '';
}

function wrapFull(doc: jsPDF, text: string, maxWidth: number): string[] {
	const raw = clean(text) || ' ';
	return (doc.splitTextToSize(raw, Math.max(4, maxWidth)) as string[]).slice(0, MAX_WRAP);
}

function clavePaciente(l: LineaReportePracticaDetalle): string {
	const nom = clean(l.paciente).toUpperCase();
	const afil = clean(l.nroAfiliado);
	if (nom || afil) return `${nom}||${afil}`;
	return `visita:${l.numeroVisita || 0}`;
}

function claveFecha(fecha: string | null | undefined): string {
	const f = clean(fecha).slice(0, 10);
	return f || 'sin-fecha';
}

function textoDiagnostico(l: LineaReportePracticaDetalle): string {
	const cod = clean(l.codigoDiagnostico);
	const desc = clean(l.diagnostico);
	if (cod && desc) return `${cod}  ${desc}`;
	return cod || desc;
}

/**
 * Paciente → fechas de práctica (orden cronológico) → líneas.
 * Unifica varias admisiones del mismo paciente en un solo bloque.
 */
function agruparPacienteFecha(lineas: LineaReportePracticaDetalle[]): GrupoPaciente[] {
	const map = new Map<string, GrupoPaciente & { fechasMap: Map<string, GrupoFecha> }>();
	const ordenPac: string[] = [];

	for (const l of lineas) {
		const ck = clavePaciente(l);
		if (!map.has(ck)) {
			ordenPac.push(ck);
			map.set(ck, {
				clave: ck,
				paciente: clean(l.paciente) || '—',
				nroAfiliado: clean(l.nroAfiliado),
				visitas: [],
				diagnosticos: [],
				fechas: [],
				fechasMap: new Map(),
			});
		}
		const g = map.get(ck)!;
		const nv = l.numeroVisita || 0;
		if (nv && !g.visitas.includes(nv)) g.visitas.push(nv);
		const diag = textoDiagnostico(l);
		if (diag && !g.diagnosticos.includes(diag)) g.diagnosticos.push(diag);
		if (!g.nroAfiliado && clean(l.nroAfiliado)) g.nroAfiliado = clean(l.nroAfiliado);
		if (g.paciente === '—' && clean(l.paciente)) g.paciente = clean(l.paciente);

		const fk = claveFecha(l.fecha);
		if (!g.fechasMap.has(fk)) {
			g.fechasMap.set(fk, {
				fechaKey: fk,
				fechaLabel: fk === 'sin-fecha' ? 'Sin fecha' : fmtFecha(fk) || fk,
				lineas: [],
			});
		}
		g.fechasMap.get(fk)!.lineas.push(l);
	}

	return ordenPac.map((k) => {
		const g = map.get(k)!;
		const fechas = Array.from(g.fechasMap.values()).sort((a, b) => {
			if (a.fechaKey === 'sin-fecha') return 1;
			if (b.fechaKey === 'sin-fecha') return -1;
			return a.fechaKey.localeCompare(b.fechaKey);
		});
		g.visitas.sort((a, b) => a - b);
		return {
			clave: g.clave,
			paciente: g.paciente,
			nroAfiliado: g.nroAfiliado,
			visitas: g.visitas,
			diagnosticos: g.diagnosticos,
			fechas,
		};
	});
}

export async function generarPdfRendicionPracticaDetalle(
	data: ReportePracticaDetalle,
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
	const limite = () => pageH - PDF_FOOTER_SPACE - 2;
	const { FONT, PAD_X, LINE_H, ROW_PAD_Y, HEAD_H, FILL_ZEBRA, FILL_GROUP } = REND_TABLE;

	const headerOpts: PDFHeaderOptions = {
		title: 'DETALLE DE PRÁCTICAS',
		empresaInfo: empresaConLogo,
		emittedAt: new Date(),
		institucionCompleta: true,
	};

	const fileName = `rendicion_${data.rendicion.id}_practica_detalle.pdf`;
	let y = await drawDocumentHeader(doc, headerOpts);
	/** Tras salto: reimprimir cabezal de tabla (y contexto paciente/fecha si aplica). */
	let reimprimirCabezal = false;
	let ctxPaciente: GrupoPaciente | null = null;
	let ctxFecha: GrupoFecha | null = null;

	const r = data.rendicion;
	y = drawMetaRendicion(doc, y, x0, x1, {
		fechaGraba: r.fechaGraba,
		convenio: r.convenio,
		observaciones: r.observaciones,
		extra: metaExtraRendicion(r.id, r.cliente),
	});

	/**
	 * Fecha ya agrupa el bloque: la columna se reemplaza por Nº Visita
	 * (un paciente puede tener varias admisiones el mismo día).
	 */
	const PRA_DEF = [
		{ key: 'practica', label: 'Código / Descripción', w: 78, wrap: true as const },
		{ key: 'visita', label: 'Nº Visita', w: 16 },
		{ key: 'cant', label: 'Cantidad', w: 16, align: 'right' as const },
		{ key: 'prof', label: 'Matr. / Profesional', w: 44, wrap: true as const },
		{ key: 'porc', label: '%', w: 12, align: 'right' as const },
		{ key: 'importe', label: 'Imp. Final', w: 22, align: 'right' as const },
	];
	const praCols = scaleCols(PRA_DEF, usable);

	const nuevaPagina = () => {
		doc.addPage();
		y = PDF_CONTENT_TOP;
		reimprimirCabezal = true;
	};

	const asegurar = (necesario: number) => {
		if (y + necesario <= limite()) return false;
		nuevaPagina();
		return true;
	};

	const drawPanelPaciente = (g: GrupoPaciente) => {
		type Celda = { label: string; value: string; span: 1 | 2 | 3 | 4 };
		const visitasTxt = g.visitas.length ? g.visitas.join(', ') : '—';
		const diagTxt = g.diagnosticos.length ? g.diagnosticos.join(' · ') : '—';

		const filas: Celda[][] = [
			[
				{ label: 'Paciente', value: g.paciente || '—', span: 2 },
				{ label: 'Nro. Afiliado', value: g.nroAfiliado || '—', span: 1 },
				{ label: 'Visitas', value: visitasTxt, span: 1 },
			],
			[{ label: 'Diagnóstico', value: diagTxt, span: 4 }],
		];

		const GRID = 4;
		const unit = usable / GRID;
		const rowH = 5.4;
		const panelH = filas.length * rowH + 2.4;

		asegurar(panelH + HEAD_H + 14);
		doc.setDrawColor(...PDF_COLORS.line);
		doc.setFillColor(...PDF_COLORS.panel);
		doc.setLineWidth(0.25);
		doc.roundedRect(x0, y, usable, panelH, 1.2, 1.2, 'FD');

		let cy = y + 4.0;
		for (const fila of filas) {
			let col = 0;
			for (const celda of fila) {
				const span = Math.min(celda.span, GRID - col);
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
		y += panelH + 2.5;
	};

	const drawBandaFecha = (f: GrupoFecha) => {
		const h = 6.2;
		asegurar(h + HEAD_H + 8);
		doc.setFillColor(...FILL_GROUP);
		doc.rect(x0, y, usable, h, 'F');
		doc.setFont('helvetica', 'bold');
		doc.setFontSize(7.2);
		doc.setTextColor(...PDF_COLORS.ink);
		doc.text(`Fecha: ${f.fechaLabel}`, x0 + PAD_X, y + h / 2 + 1.15);
		const n = f.lineas.length;
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(6.4);
		doc.setTextColor(...PDF_COLORS.muted);
		doc.text(
			`${n} práctica${n === 1 ? '' : 's'}`,
			x1 - PAD_X,
			y + h / 2 + 1.15,
			{ align: 'right' },
		);
		y += h + 1.2;
	};

	const drawTableHead = () => {
		y = drawRendicionTableHead(doc, y, x0, praCols);
		reimprimirCabezal = false;
	};

	/** Continuación tras salto de página: paciente · fecha + cabezal. */
	const reanudarContexto = () => {
		if (!reimprimirCabezal) return;
		if (ctxPaciente) {
			doc.setFont('helvetica', 'bold');
			doc.setFontSize(6.5);
			doc.setTextColor(...PDF_COLORS.muted);
			const cont = wrapFitText(
				doc,
				`${ctxPaciente.paciente}${ctxFecha ? `  ·  ${ctxFecha.fechaLabel}` : ''}  (cont.)`,
				usable,
				1,
			)[0];
			doc.text(cont, x0, y + 2.5);
			y += 5;
		}
		if (ctxFecha) drawBandaFecha(ctxFecha);
		drawTableHead();
	};

	const valorPractica = (l: LineaReportePracticaDetalle, key: string): string => {
		switch (key) {
			case 'practica': {
				const cod = l.codigo > 0 ? String(l.codigo) : '';
				const desc = clean(l.descripcion);
				if (cod && desc) return `${cod}  ${desc}`;
				return cod || desc || '—';
			}
			case 'visita':
				return l.numeroVisita ? String(l.numeroVisita) : '';
			case 'cant':
				return l.cantidad ? fmtImporte(l.cantidad) : '';
			case 'prof': {
				const mat = l.matricula > 0 ? String(l.matricula) : '';
				const nom = clean(l.profesional);
				if (mat && nom) return `${mat}  ${nom}`;
				if (mat) return mat;
				return nom;
			}
			case 'porc':
				return l.porcentaje ? fmtImporte(l.porcentaje) : '';
			case 'importe':
				return l.importe ? fmtImporte(l.importe) : '';
			default:
				return '';
		}
	};

	const alturaFila = (l: LineaReportePracticaDetalle) => {
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(FONT);
		let lines = 1;
		for (const c of praCols) {
			if (!c.wrap) continue;
			const n = wrapFull(doc, valorPractica(l, c.key), Math.max(4, c.w - PAD_X * 2)).length;
			lines = Math.max(lines, n);
		}
		return lines * LINE_H + ROW_PAD_Y * 2;
	};

	const drawRow = (l: LineaReportePracticaDetalle, zebra: boolean) => {
		const h = alturaFila(l);
		if (asegurar(h + (reimprimirCabezal ? HEAD_H + 16 : 1))) reanudarContexto();
		else if (reimprimirCabezal) reanudarContexto();
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
		for (const c of praCols) {
			const raw = valorPractica(l, c.key);
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

	const grupos = agruparPacienteFecha(data.lineas);

	if (!grupos.length) {
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(9);
		doc.setTextColor(...PDF_COLORS.muted);
		doc.text('Sin prácticas para los filtros seleccionados.', x0, y + 4);
	} else {
		grupos.forEach((g, gi) => {
			if (gi > 0) {
				asegurar(8);
				y += 2;
				doc.setDrawColor(...PDF_COLORS.line);
				doc.setLineWidth(0.35);
				doc.line(x0, y, x1, y);
				y += 4;
			}

			ctxPaciente = g;
			ctxFecha = null;
			drawPanelPaciente(g);

			g.fechas.forEach((f, fi) => {
				ctxFecha = f;
				if (fi > 0) asegurar(HEAD_H + 14);
				drawBandaFecha(f);
				drawTableHead();
				f.lineas.forEach((l, i) => drawRow(l, i % 2 === 1));
			});
		});
	}

	asegurar(16);
	y += 2;
	doc.setDrawColor(...PDF_COLORS.ink);
	doc.setLineWidth(0.35);
	doc.line(x0, y, x1, y);
	y += 0.7;
	doc.line(x0, y, x1, y);
	y += 5;
	doc.setFont('helvetica', 'bold');
	doc.setFontSize(8);
	doc.setTextColor(...PDF_COLORS.ink);
	const t = data.totales;
	doc.text(
		`Pacientes: ${grupos.length}    ·    Visitas: ${t.visitas}    ·    Prácticas: ${t.practicas}    ·    Cantidad: ${fmtImporte(t.cantidad)}`,
		x0,
		y,
	);
	doc.text(`Total Importe: $${fmtImporte(t.importe)}`, x1, y, { align: 'right' });

	drawRunningHeaders(doc, headerOpts);
	drawDocumentFooters(doc, headerOpts);

	return { blob: doc.output('blob'), fileName };
}
