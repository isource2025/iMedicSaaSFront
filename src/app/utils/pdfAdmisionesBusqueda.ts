import jsPDF from 'jspdf';
import type { AdmissionSearchRow } from '@/app/services/admissionSearchService';
import { obtenerInfoEmpresa } from '@/app/services/empresaService';
import {
	drawDocumentFooters,
	drawDocumentHeader,
	drawRunningHeaders,
	PDF_COLORS,
	PDF_CONTENT_TOP,
	PDF_FOOTER_SPACE,
	PDF_MARGIN_X,
	type PDFHeaderOptions,
} from './pdfHeader';

export type PdfAdmisionesBusquedaOpts = {
	rows: AdmissionSearchRow[];
	total: number;
	fileName?: string;
};

type Col = { key: string; label: string; w: number };

const COLS: Col[] = [
	{ key: 'ia', label: 'I/A', w: 10 },
	{ key: 'visita', label: 'Nº Adm.', w: 18 },
	{ key: 'paciente', label: 'Paciente', w: 42 },
	{ key: 'dni', label: 'DNI', w: 22 },
	{ key: 'cobertura', label: 'Cobertura', w: 36 },
	{ key: 'ingreso', label: 'Ingreso', w: 24 },
	{ key: 'egreso', label: 'Egreso', w: 24 },
	{ key: 'ubicacion', label: 'Ubicación', w: 30 },
	{ key: 'diag', label: 'Diagnóstico', w: 42 },
];

const TITLE = 'Consulta general de admisiones';

function clean(v: unknown): string {
	const s = String(v ?? '').trim();
	return s || '—';
}

function fmtDoc(raw: unknown): string {
	const digits = String(raw ?? '').replace(/\D+/g, '');
	if (!digits) return '—';
	return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function iaOf(row: AdmissionSearchRow): string {
	const c = String(row.ClasePaciente || '').trim().toUpperCase();
	if (c === 'I' || c === 'A') return c;
	const t = String(row.TipoAtencion || '').toLowerCase();
	if (t.includes('intern')) return 'I';
	if (t.includes('ambul')) return 'A';
	return c || '—';
}

function ingresoOf(row: AdmissionSearchRow): string {
	const f = clean(row.FechaAdmisionDMY || row.FechaAdmision);
	const h = String(row.HoraAdmision || '').slice(0, 5);
	return h ? `${f} ${h}` : f;
}

function egresoOf(row: AdmissionSearchRow): string {
	const f = String(row.FechaEgresoDMY || row.FechaEgreso || '').trim();
	if (!f) return '—';
	const h = String(row.HoraEgreso || '').slice(0, 5);
	return h ? `${f} ${h}` : f;
}

function cell(row: AdmissionSearchRow, key: string): string {
	switch (key) {
		case 'ia':
			return iaOf(row);
		case 'visita': {
			const nv = String(row.NumeroVisita || '—');
			const internacion = String(row.NumeroInternacion || '').trim() || '—';
			return `${nv}\nInt. ${internacion}`;
		}
		case 'paciente':
			return clean(row.ApellidoYNombre);
		case 'dni':
			return fmtDoc(row.NumeroDocumento);
		case 'cobertura': {
			const cob = clean(row.CoberturaOS);
			const ssn = String(row.NumeroSSN || '').trim() || '—';
			return `${cob}\nSSN ${ssn}`;
		}
		case 'ingreso':
			return `Ing. ${ingresoOf(row)}`;
		case 'egreso': {
			const e = egresoOf(row);
			return e === '—' ? 'Egr. —' : `Egr. ${e}`;
		}
		case 'ubicacion': {
			const sec = String(row.Sector || '').trim();
			const hab = String(row.Habitacion || '').trim();
			if (sec && hab) return `${sec} · ${hab}`;
			return clean(sec || hab);
		}
		case 'diag':
			return clean(row.DiagnosticoDescripcion || row.Diagnostico);
		default:
			return '—';
	}
}

/** PDF landscape del listado de búsqueda de admisiones (blob para previsualizar / descargar). */
export async function buildAdmisionesBusquedaPdf(
	opts: PdfAdmisionesBusquedaOpts,
): Promise<{ blob: Blob; fileName: string }> {
	let empresaInfo = null;
	try {
		empresaInfo = await obtenerInfoEmpresa();
	} catch {
		empresaInfo = null;
	}

	const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
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
		empresaInfo,
		emittedAt: new Date(),
	};

	const fileName =
		opts.fileName ||
		`admisiones_busqueda_${new Date().toISOString().slice(0, 10)}.pdf`;

	let y = await drawDocumentHeader(doc, headerOpts);

	doc.setFont('helvetica', 'normal');
	doc.setFontSize(8);
	doc.setTextColor(...PDF_COLORS.muted);
	const cap =
		opts.total > opts.rows.length
			? `Mostrando ${opts.rows.length} de ${opts.total} resultados`
			: `${opts.rows.length} resultado${opts.rows.length === 1 ? '' : 's'}`;
	doc.text(cap, x0, y);
	y += 5;

	const drawTableHead = () => {
		doc.setFillColor(224, 247, 250);
		doc.rect(x0, y - 3.2, usable, 6.2, 'F');
		doc.setFont('helvetica', 'bold');
		doc.setFontSize(7);
		doc.setTextColor(...PDF_COLORS.brand);
		let x = x0;
		for (const c of cols) {
			doc.text(c.label, x + 1, y);
			x += c.w;
		}
		y += 5;
		doc.setDrawColor(...PDF_COLORS.line);
		doc.setLineWidth(0.2);
		doc.line(x0, y - 1.5, x1, y - 1.5);
	};

	const rowHeight = (row: AdmissionSearchRow): number => {
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(7.2);
		let h = 4;
		for (const c of cols) {
			const lines = doc.splitTextToSize(cell(row, c.key), c.w - 2) as string[];
			h = Math.max(h, lines.length * 3.2);
		}
		return Math.min(h + 1.5, 14);
	};

	const drawRow = (row: AdmissionSearchRow, zebra: boolean) => {
		const h = rowHeight(row);
		if (zebra) {
			doc.setFillColor(248, 250, 252);
			doc.rect(x0, y - 3, usable, h, 'F');
		}
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(7.2);
		doc.setTextColor(...PDF_COLORS.ink);
		let x = x0;
		for (const c of cols) {
			const lines = (doc.splitTextToSize(cell(row, c.key), c.w - 2) as string[]).slice(0, 3);
			doc.text(lines, x + 1, y);
			x += c.w;
		}
		y += h;
	};

	const nuevaPagina = () => {
		doc.addPage();
		y = PDF_CONTENT_TOP;
		drawTableHead();
	};

	drawTableHead();

	if (!opts.rows.length) {
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(9);
		doc.setTextColor(...PDF_COLORS.muted);
		doc.text('Sin resultados para exportar.', x0, y + 4);
	} else {
		opts.rows.forEach((row, i) => {
			const h = rowHeight(row);
			if (y + h > limite()) nuevaPagina();
			drawRow(row, i % 2 === 1);
		});
	}

	drawRunningHeaders(doc, headerOpts);
	drawDocumentFooters(doc, headerOpts);

	const blob = doc.output('blob');
	return { blob, fileName };
}
