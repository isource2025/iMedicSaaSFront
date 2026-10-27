import jsPDF from 'jspdf';
import type { AdmisionVigente } from '@/app/services/admisionesVigentesService';
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

export type PdfAdmisionesVigentesOpts = {
	rows: AdmisionVigente[];
	filtroDescripcion?: string;
	fileName?: string;
};

type Col = { key: string; label: string; w: number };

const COLS: Col[] = [
	{ key: 'cama', label: 'Cama', w: 16 },
	{ key: 'paciente', label: 'Paciente', w: 42 },
	{ key: 'dni', label: 'DNI', w: 22 },
	{ key: 'edad', label: 'Edad', w: 16 },
	{ key: 'ingreso', label: 'Ingreso', w: 22 },
	{ key: 'dias', label: 'Días', w: 12 },
	{ key: 'diag', label: 'Diagnóstico', w: 40 },
	{ key: 'cobertura', label: 'Cobertura', w: 32 },
	{ key: 'medico', label: 'Médico', w: 32 },
];

const TITLE = 'Admisiones vigentes';

type Grupo = { clave: string; titulo: string; filas: AdmisionVigente[] };

function clean(v: unknown): string {
	const s = String(v ?? '').trim();
	return s || '—';
}

function fmtDoc(raw: unknown): string {
	const digits = String(raw ?? '').replace(/\D+/g, '');
	if (!digits) return '—';
	return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function fechaCorta(iso: string | null): string {
	if (!iso) return '—';
	const [y, m, d] = iso.split('-');
	return y && m && d ? `${d}/${m}/${y}` : iso;
}

function edadSexo(a: AdmisionVigente): string {
	const partes = [a.edad != null ? `${a.edad} a` : '', a.sexo ? a.sexo.charAt(0) : ''];
	return partes.filter(Boolean).join(' · ') || '—';
}

function cell(row: AdmisionVigente, key: string): string {
	switch (key) {
		case 'cama':
			return clean(row.cama);
		case 'paciente':
			return clean(row.paciente);
		case 'dni':
			return fmtDoc(row.documento);
		case 'edad':
			return edadSexo(row);
		case 'ingreso': {
			const f = fechaCorta(row.fechaIngreso);
			const h = String(row.horaIngreso || '').slice(0, 5);
			return h ? `${f} ${h}` : f;
		}
		case 'dias':
			return row.diasInternacion != null ? String(row.diasInternacion) : '—';
		case 'diag':
			return clean(row.diagnostico);
		case 'cobertura':
			return clean(row.cobertura);
		case 'medico':
			return clean(row.medico);
		default:
			return '—';
	}
}

function agrupar(filas: AdmisionVigente[]): Grupo[] {
	const mapa = new Map<string, Grupo>();
	for (const f of filas) {
		const clave = f.sector || '—';
		if (!mapa.has(clave)) {
			mapa.set(clave, { clave, titulo: f.sectorDescripcion || clave, filas: [] });
		}
		mapa.get(clave)!.filas.push(f);
	}
	return Array.from(mapa.values());
}

/** PDF landscape de admisiones vigentes (blob para previsualizar / descargar). */
export async function buildAdmisionesVigentesPdf(
	opts: PdfAdmisionesVigentesOpts,
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
		`admisiones_vigentes_${new Date().toISOString().slice(0, 10)}.pdf`;

	let y = await drawDocumentHeader(doc, headerOpts);

	doc.setFont('helvetica', 'normal');
	doc.setFontSize(8);
	doc.setTextColor(...PDF_COLORS.muted);
	const capParts = [
		`${opts.rows.length} paciente${opts.rows.length === 1 ? '' : 's'}`,
		opts.filtroDescripcion?.trim() || '',
	].filter(Boolean);
	doc.text(capParts.join('  ·  '), x0, y);
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

	const rowHeight = (row: AdmisionVigente): number => {
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(7.2);
		let h = 4;
		for (const c of cols) {
			const lines = doc.splitTextToSize(cell(row, c.key), c.w - 2) as string[];
			h = Math.max(h, lines.length * 3.2);
		}
		return Math.min(h + 1.5, 14);
	};

	const drawRow = (row: AdmisionVigente, zebra: boolean) => {
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

	const bandaSector = (titulo: string, n: number) => {
		const alto = 6.5;
		if (y + alto + 8 > limite()) {
			doc.addPage();
			y = PDF_CONTENT_TOP;
		}
		y += 2;
		doc.setFillColor(...PDF_COLORS.brandSoft);
		doc.rect(x0, y, usable, alto, 'F');
		doc.setFillColor(...PDF_COLORS.brand);
		doc.rect(x0, y, 1, alto, 'F');
		doc.setFont('helvetica', 'bold');
		doc.setFontSize(8.4);
		doc.setTextColor(...PDF_COLORS.ink);
		doc.text(titulo, x0 + 3.5, y + 4.3);
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(7.2);
		doc.setTextColor(...PDF_COLORS.muted);
		doc.text(`${n}`, x1 - 2.5, y + 4.3, { align: 'right' });
		y += alto + 3.5;
		drawTableHead();
	};

	const nuevaPaginaConHead = () => {
		doc.addPage();
		y = PDF_CONTENT_TOP;
		drawTableHead();
	};

	const grupos = agrupar(opts.rows);

	if (!grupos.length) {
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(9);
		doc.setTextColor(...PDF_COLORS.muted);
		doc.text('Sin admisiones vigentes para exportar.', x0, y + 4);
	} else {
		let zebra = 0;
		for (const g of grupos) {
			bandaSector(g.titulo, g.filas.length);
			for (const row of g.filas) {
				const h = rowHeight(row);
				if (y + h > limite()) nuevaPaginaConHead();
				drawRow(row, zebra % 2 === 1);
				zebra += 1;
			}
		}
	}

	drawRunningHeaders(doc, headerOpts);
	drawDocumentFooters(doc, headerOpts);

	return { blob: doc.output('blob'), fileName };
}
