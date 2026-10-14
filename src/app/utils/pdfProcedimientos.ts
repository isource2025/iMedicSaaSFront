import jsPDF from 'jspdf';
import type { EmpresaInfo } from '../services/empresaService';
import type { FacPracticaVisita } from '../types/procedimientos';
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

export type PDFProcedimientosOptions = {
	items: FacPracticaVisita[];
	empresaInfo?: EmpresaInfo | null;
	patient?: PDFHeaderPatient | null;
	fileName?: string;
};

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const COLS = [
	{ key: 'hora', label: 'HORA', w: 15 },
	{ key: 'codigo', label: 'CÓDIGO', w: 17 },
	{ key: 'practica', label: 'PRÁCTICA', w: 0 },
	{ key: 'cantidad', label: 'CANT.', w: 12 },
	{ key: 'sector', label: 'SECTOR', w: 36 },
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
	return m ? `${m[1].padStart(2, '0')}:${m[2]}` : '';
}

const plural = (n: number) => `${n} ${n === 1 ? 'práctica' : 'prácticas'}`;

/**
 * PDF de procedimientos (imFacPracticas): agrupados por día, una fila por práctica
 * (hora · código · práctica · cantidad · sector), los profesionales bajo cada fila y,
 * al final, las firmas de los profesionales intervinientes.
 */
export async function generarPDFProcedimientos({ items, empresaInfo, patient, fileName }: PDFProcedimientosOptions) {
	const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
	const headerOpts: PDFHeaderOptions = { title: 'Procedimientos', empresaInfo, patient, emittedAt: new Date() };
	const x0 = PDF_MARGIN_X;
	const x1 = doc.internal.pageSize.getWidth() - PDF_MARGIN_X;
	const limite = () => doc.internal.pageSize.getHeight() - PDF_FOOTER_SPACE - 2;

	const conHora = items.some((e) => horaCorta(e.HoraPracticaInicio));
	const cols = COLS.filter((c) => conHora || c.key !== 'hora');
	const fijo = cols.reduce((s, c) => s + c.w, 0);
	const anchos = Object.fromEntries(cols.map((c) => [c.key, c.w || x1 - x0 - fijo])) as Record<ColKey, number>;
	const xs = {} as Record<ColKey, number>;
	cols.reduce((x, c) => ((xs[c.key] = x), x + anchos[c.key]), x0);

	const practicas = items
		.map((e, i) => ({ e, i }))
		.sort(
			(a, b) =>
				`${cleanPdfValue(a.e.FechaPractica)} ${horaCorta(a.e.HoraPracticaInicio)}`.localeCompare(
					`${cleanPdfValue(b.e.FechaPractica)} ${horaCorta(b.e.HoraPracticaInicio)}`,
				) || b.i - a.i,
		)
		.map(({ e }) => e);

	let y = await drawDocumentHeader(doc, headerOpts);

	const fechas = practicas.map((e) => fechaCorta(e.FechaPractica)).filter(Boolean);
	const rango =
		fechas.length && fechas[0] !== fechas[fechas.length - 1]
			? `del ${fechas[0]} al ${fechas[fechas.length - 1]}`
			: fechas[0] || '';
	doc.setFont('helvetica', 'normal');
	doc.setFontSize(8);
	doc.setTextColor(...PDF_COLORS.muted);
	doc.text([plural(practicas.length), rango].filter(Boolean).join('  ·  '), x0, y);
	y += 4;

	const encabezadoColumnas = () => {
		doc.setFillColor(...PDF_COLORS.panel);
		doc.setDrawColor(...PDF_COLORS.line);
		doc.setLineWidth(0.2);
		doc.rect(x0, y, x1 - x0, 7, 'FD');
		doc.setFont('helvetica', 'bold');
		doc.setFontSize(6.5);
		doc.setTextColor(...PDF_COLORS.muted);
		for (const c of cols) doc.text(c.label, xs[c.key] + 1.5, y + 4.6, { charSpace: 0.4 });
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
		doc.text(continuacion ? '(continúa)' : plural(cantidad), x1 - 2.5, y + 4.4, { align: 'right' });
		y += 6.5 + 1;
	};

	const nuevaPagina = () => {
		doc.addPage();
		y = PDF_CONTENT_TOP;
		encabezadoColumnas();
	};

	encabezadoColumnas();

	if (!practicas.length) {
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(9.5);
		doc.setTextColor(...PDF_COLORS.muted);
		doc.text('No hay procedimientos registrados en el período seleccionado.', x0 + 2.5, y + 7);
	}

	const porDia = new Map<string, number>();
	for (const e of practicas) {
		const d = cleanPdfValue(e.FechaPractica);
		porDia.set(d, (porDia.get(d) ?? 0) + 1);
	}

	const lineasDe = (texto: string, key: ColKey) =>
		texto ? (doc.splitTextToSize(texto, anchos[key] - 3) as string[]) : [];

	let diaActual: string | null = null;
	for (const e of practicas) {
		const dia = cleanPdfValue(e.FechaPractica);
		const inicio = horaCorta(e.HoraPracticaInicio);
		const fin = horaCorta(e.HoraPracticaFin);

		doc.setFontSize(FONT);
		doc.setFont('helvetica', 'bold');
		const practica = lineasDe(cleanPdfValue(e.PracticaDescripcion) || cleanPdfValue(e.Practica) || '-', 'practica');
		doc.setFont('helvetica', 'normal');
		const cant = Number(e.CantidadPractica);
		const celdas: Record<ColKey, string[]> = {
			hora: [inicio || '-', ...(fin && fin !== inicio ? [`a ${fin}`] : [])],
			codigo: lineasDe(cleanPdfValue(e.Practica) || '-', 'codigo'),
			practica,
			cantidad: [Number.isFinite(cant) && cant > 0 ? String(cant) : '-'],
			sector: lineasDe(cleanPdfValue(e.SectorDescripcion) || cleanPdfValue(e.ValorSector) || '-', 'sector'),
		};
		doc.setFontSize(FONT - 0.6);
		const profAncho = xs.sector - xs.codigo - 3;
		const prof = cleanPdfValue(e.Profesionales)
			? (doc.splitTextToSize(cleanPdfValue(e.Profesionales), profAncho) as string[])
			: [];

		// Los profesionales van bajo código/práctica/cantidad; el sector ocupa su propia columna.
		const filas = Math.max(...cols.filter((c) => c.key !== 'sector').map((c) => celdas[c.key].length));
		const altoPrincipal = filas * LINE_H + (prof.length ? prof.length * (LINE_H - 0.3) + 1 : 0);
		const alto = PAD_Y * 2 + Math.max(altoPrincipal, celdas.sector.length * LINE_H);

		if (dia !== diaActual) {
			if (y + 10 + alto > limite()) nuevaPagina();
			bandaDia(e.FechaPractica, porDia.get(dia) ?? 0, false);
			diaActual = dia;
		} else if (y + alto > limite()) {
			nuevaPagina();
			bandaDia(e.FechaPractica, 0, true);
		}

		let ty = y + PAD_Y + 2.8;
		for (const c of cols) {
			const esPractica = c.key === 'practica';
			doc.setFont('helvetica', esPractica ? 'bold' : 'normal');
			doc.setFontSize(c.key === 'codigo' ? FONT - 0.8 : FONT);
			doc.setTextColor(
				...(esPractica ? PDF_COLORS.ink : c.key === 'codigo' || c.key === 'hora' ? PDF_COLORS.muted : PDF_COLORS.text),
			);
			celdas[c.key].forEach((l, i) => doc.text(l, xs[c.key] + 1.5, ty + i * LINE_H));
		}
		ty += filas * LINE_H;
		if (prof.length) {
			doc.setFont('helvetica', 'italic');
			doc.setFontSize(FONT - 0.6);
			doc.setTextColor(...PDF_COLORS.muted);
			prof.forEach((l, i) => doc.text(l, xs.codigo + 1.5, ty + 0.4 + i * (LINE_H - 0.3)));
		}

		y += alto;
		doc.setDrawColor(...PDF_COLORS.line);
		doc.setLineWidth(0.15);
		doc.line(x0, y, x1, y);
	}

	const vistos = new Set<string>();
	const unicos: ProfesionalFirmaInfo[] = [];
	for (const e of practicas) {
		for (const f of e.Firmantes ?? []) {
			const p: ProfesionalFirmaInfo = { nombre: f.nombre, matricula: f.matricula, idPersonal: f.valor };
			const clave = formatMatricula(p.idPersonal) || formatMatricula(p.matricula) || cleanPdfValue(p.nombre);
			if (!clave || vistos.has(clave)) continue;
			vistos.add(clave);
			unicos.push(p);
		}
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
		const finEtiqueta = x0 + doc.getTextWidth(etiqueta) + etiqueta.length * 0.6 + 3;
		doc.setDrawColor(...PDF_COLORS.line);
		doc.setLineWidth(0.2);
		doc.line(finEtiqueta, y - 1, x1, y - 1);
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

	drawRunningHeaders(doc, headerOpts);
	drawDocumentFooters(doc, headerOpts);
	doc.save(fileName || `Procedimientos_${cleanPdfValue(patient?.numeroVisita) || 'paciente'}_${Date.now()}.pdf`);
}
