/**
 * Planilla de turnos estilo Clarion (grilla del día para imprimir / previsualizar).
 * Usa el header institucional común a todos los PDFs clínicos.
 */
import jsPDF from 'jspdf';
import { obtenerInfoEmpresa } from '@/app/services/empresaService';
import type { AgendaSlot } from '@/app/services/agendaService';
import {
	drawDocumentFooters,
	drawDocumentHeader,
	drawRunningHeaders,
	entregarPDF,
	PDF_COLORS,
	PDF_CONTENT_TOP,
	PDF_FOOTER_SPACE,
	PDF_MARGIN_X,
	type PDFHeaderOptions,
} from '@/app/utils/pdfHeader';

export type PlanillaTurnosOpts = {
	fechaIso: string;
	profesional?: string | null;
	servicio?: string | null;
	especialidad?: string | null;
	sector?: string | null;
	/** Código → descripción de sector (ej. ECO → ECOGRAFIA). */
	sectorDescripciones?: Record<string, string>;
	slots: AgendaSlot[];
	fileName?: string;
};

function pad2(n: number): string {
	return String(n).padStart(2, '0');
}

function fechaAr(iso: string): string {
	const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
	if (!m) return iso || '';
	return `${m[3]}/${m[2]}/${m[1]}`;
}

function fechaNacAr(value: string | null | undefined): string {
	const s = String(value || '').trim();
	if (!s) return '';
	const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
	if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
	const ar = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
	if (ar) return `${pad2(Number(ar[1]))}/${pad2(Number(ar[2]))}/${ar[3]}`;
	return s;
}

function formatearDocumento(doc: number | string | null | undefined): string {
	if (doc == null || doc === '') return '';
	const digits = String(doc).replace(/\D/g, '');
	if (!digits) return String(doc);
	return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function texto(v: string | null | undefined): string {
	return String(v || '').trim();
}

function estadoClarion(slot: AgendaSlot): string {
	if (slot.estado === 'CANCELADO' || slot.status === 1) return 'Cancelado!';
	if (slot.estado === 'ATENDIDO' || slot.horaSalida) return 'Cerrado!';
	if (slot.estado === 'LIBRE' && !slot.idPaciente) return '';
	if (slot.idPaciente || slot.estado === 'OCUPADO' || slot.horaLlegada || slot.horaIngreso) {
		return 'Ocupado';
	}
	return '';
}

function textoDiagnostico(slot: AgendaSlot): string {
	const codigo = texto(slot.diagnosticoCodigo);
	const desc = texto(slot.diagnosticoDescripcion);
	if (codigo && desc) return `${codigo} ${desc}`;
	return codigo || desc;
}

function codigoSector(sector: string): string {
	const base = texto(sector).toUpperCase();
	if (!base) return '';
	const letters = base.replace(/[^A-ZÁÉÍÓÚÑ0-9]/g, '');
	return letters.slice(0, 3);
}

function lookupSectorDesc(
	codigo: string,
	map: Record<string, string>,
	fallback: string,
): string {
	const key = texto(codigo).toUpperCase();
	if (!key) return fallback;
	return map[key] || map[key.slice(0, 3)] || fallback;
}

type Col = { key: string; label: string; w: number };

/** Anchos relativos (landscape A4). */
const COLS: Col[] = [
	{ key: 'estado', label: 'Estado', w: 18 },
	{ key: 'hora', label: 'Hora', w: 12 },
	{ key: 'paciente', label: 'Paciente', w: 48 },
	{ key: 'edad', label: 'Edad', w: 16 },
	{ key: 'cobertura', label: 'Cobertura', w: 28 },
	{ key: 'sexo', label: 'Sexo', w: 12 },
	{ key: 'nac', label: 'Fecha Nac.', w: 20 },
	{ key: 'obs', label: 'Diagnostico / Observaciones', w: 55 },
	{ key: 'sector', label: 'Sector', w: 32 },
	{ key: 'cod', label: 'Cod.', w: 10 },
];

/** 1 mm ≈ 2.8346 pt. */
const MM_TO_PT = 72 / 25.4;
const ptFromMmBump = (basePt: number, bumpMm: number) =>
	Math.round((basePt + bumpMm * MM_TO_PT) * 10) / 10;

/** Tipografía de planilla (ajustes en mm sobre la base de listados). */
const FONT = {
	profesional: ptFromMmBump(9, 1.4), // ~13.0 pt (~4.6 mm)
	fecha: ptFromMmBump(8, 1.2 - 0.3), // ~10.5 pt
	servicio: ptFromMmBump(8, 1.2 + 0.1), // ~11.7 pt (~4.1 mm)
	/** Más grande para llenar el alto fijo del encabezado (HEADER_H sin cambiar). */
	head: ptFromMmBump(7, 0.8 + 0.7), // ~11.3 pt
	/** Más grande para llenar mejor las filas sin cambiar ROW_H_MIN. */
	body: ptFromMmBump(7.2, 1.2 - 0.6 - 0.4 + 0.55), // ~9.3 pt (~3.3 mm)
	vacio: 9,
};

const ROW_H_MIN = 11;
const LINE_H = 4;
const HEADER_H = 8.2;
/** Espacio entre el borde inferior del encabezado y el inicio de la 1ª fila. */
const HEAD_TO_ROW_GAP = 2.2;
/** Padding superior dentro de cada fila hasta la 1ª línea de texto. */
const ROW_PAD_TOP = 3.6;
/** Espacio bajo Profesional/SERVICIO/Fecha antes de la grilla. */
const META_TO_GRID_GAP = 4;
const TITLE = 'PLANILLA DE TURNOS';

export async function generarPdfPlanillaTurnos(opts: PlanillaTurnosOpts): Promise<void> {
	const empresaInfo = await obtenerInfoEmpresa().catch(() => null);
	const profesional = texto(opts.profesional).toUpperCase();
	const servicioLabel = texto(opts.servicio || opts.especialidad).toUpperCase();
	const especialidadLabel = texto(opts.especialidad || opts.servicio).toUpperCase();
	const sectorDefault = texto(opts.sector);
	const sectorMap = opts.sectorDescripciones || {};
	const sectorDescDefault = lookupSectorDesc(
		sectorDefault,
		sectorMap,
		texto(opts.servicio) || especialidadLabel,
	).toUpperCase();
	const fecha = fechaAr(opts.fechaIso);
	const fileName =
		opts.fileName || `planilla-turnos-${opts.fechaIso || 'dia'}.pdf`;

	const doc = new jsPDF({
		orientation: 'landscape',
		unit: 'mm',
		format: 'a4',
	});

	const pageW = doc.internal.pageSize.getWidth();
	const pageH = doc.internal.pageSize.getHeight();
	const marginX = PDF_MARGIN_X;
	const usable = pageW - marginX * 2;
	const colScale = usable / COLS.reduce((s, c) => s + c.w, 0);
	const cols = COLS.map((c) => ({ ...c, w: c.w * colScale }));
	const limite = () => pageH - PDF_FOOTER_SPACE - 2;

	const headerOpts: PDFHeaderOptions = {
		title: TITLE,
		empresaInfo,
		emittedAt: new Date(),
	};

	const drawMetaRow = (y: number): number => {
		const centro = especialidadLabel || servicioLabel || '—';

		// Misma altura: Profesional (izq) · SERVICIO (centro) · Fecha (der)
		doc.setFont('helvetica', 'bold');
		doc.setFontSize(FONT.profesional);
		doc.setTextColor(...PDF_COLORS.ink);
		doc.text(profesional || '—', marginX, y);

		doc.setFont('helvetica', 'bold');
		doc.setFontSize(FONT.servicio);
		doc.setTextColor(...PDF_COLORS.brand);
		doc.text(`SERVICIO: ${centro}`, pageW / 2, y, { align: 'center' });

		doc.setFont('helvetica', 'normal');
		doc.setFontSize(FONT.fecha);
		doc.setTextColor(...PDF_COLORS.muted);
		doc.text(`Fecha de agenda: ${fecha}`, pageW - marginX, y, { align: 'right' });
		return y + META_TO_GRID_GAP;
	};

	const drawTableHead = (y: number): number => {
		const x0 = marginX;
		const top = y;
		doc.setFillColor(...PDF_COLORS.brandSoft);
		doc.rect(x0, top, usable, HEADER_H, 'F');
		doc.setFont('helvetica', 'bold');
		doc.setFontSize(FONT.head);
		doc.setTextColor(...PDF_COLORS.brand);

		let x = x0;
		// Centrado vertical en el alto fijo del encabezado.
		const textY = top + HEADER_H / 2 + FONT.head * 0.12;
		for (const c of cols) {
			const label = (doc.splitTextToSize(c.label, c.w - 2) as string[])[0] || c.label;
			doc.text(label, x + 1, textY);
			x += c.w;
		}
		doc.setDrawColor(...PDF_COLORS.line);
		doc.setLineWidth(0.2);
		doc.line(x0, top + HEADER_H, x0 + usable, top + HEADER_H);
		// Devuelve el Y superior de la 1ª fila (sin solaparse con el encabezado).
		return top + HEADER_H + HEAD_TO_ROW_GAP;
	};

	const cellValue = (slot: AgendaSlot, key: string): string => {
		const libre = slot.estado === 'LIBRE' && !slot.idPaciente;
		const cancelado = slot.estado === 'CANCELADO' || slot.status === 1;
		const conPaciente = !libre || cancelado;
		const codSlot = codigoSector(texto(slot.sector) || sectorDefault);
		const descSlot = lookupSectorDesc(
			texto(slot.sector) || sectorDefault,
			sectorMap,
			sectorDescDefault,
		).toUpperCase();

		switch (key) {
			case 'estado':
				return estadoClarion(slot);
			case 'hora':
				return texto(slot.hora).slice(0, 5);
			case 'paciente': {
				if (!conPaciente) return '';
				const dni = formatearDocumento(slot.numeroDocumento);
				const nombre = texto(slot.pacienteNombre).toUpperCase();
				if (dni && nombre) return `${dni}\n${nombre}`;
				return dni || nombre;
			}
			case 'edad':
				return conPaciente && slot.edad != null ? `${slot.edad} años` : '';
			case 'cobertura':
				return conPaciente ? texto(slot.cobertura).toUpperCase() : '';
			case 'sexo':
				return conPaciente ? texto(slot.sexo).toUpperCase().slice(0, 1) : '';
			case 'nac':
				return conPaciente ? fechaNacAr(slot.fechaNacimiento) : '';
			case 'obs':
				return '';
			case 'sector':
				return descSlot;
			case 'cod':
				return codSlot;
			default:
				return '';
		}
	};

	const obsColW = cols.find((c) => c.key === 'obs')?.w || 55;

	const diagObsLines = (
		slot: AgendaSlot,
	): { diagLines: string[]; obsLines: string[] } => {
		const libre = slot.estado === 'LIBRE' && !slot.idPaciente;
		const cancelado = slot.estado === 'CANCELADO' || slot.status === 1;
		const conPaciente = !libre || cancelado;
		const diag = conPaciente ? textoDiagnostico(slot) : '';
		const obs = conPaciente ? texto(slot.observaciones) : '';
		const maxW = obsColW - 1.4;

		doc.setFont('helvetica', 'normal');
		doc.setFontSize(FONT.body);

		const diagLines = diag ? (doc.splitTextToSize(diag, maxW) as string[]) : [];
		const obsLines =
			obs && obs.toUpperCase() !== diag.toUpperCase()
				? (doc.splitTextToSize(obs, maxW) as string[])
				: [];
		return { diagLines, obsLines };
	};

	const rowHeightFor = (slot: AgendaSlot): number => {
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(FONT.body);
		let contentH = LINE_H;
		for (const c of cols) {
			if (c.key === 'obs') {
				const { diagLines, obsLines } = diagObsLines(slot);
				const n = Math.max(1, diagLines.length + obsLines.length);
				contentH = Math.max(contentH, n * LINE_H);
			} else {
				const raw = cellValue(slot, c.key);
				if (!raw) continue;
				const lines = doc.splitTextToSize(raw, c.w - 2) as string[];
				contentH = Math.max(contentH, Math.min(lines.length, 3) * LINE_H);
			}
		}
		return Math.max(ROW_H_MIN, ROW_PAD_TOP + contentH + 1.8);
	};

	const drawObsCell = (
		x: number,
		textY: number,
		_w: number,
		_h: number,
		slot: AgendaSlot,
	) => {
		const { diagLines, obsLines } = diagObsLines(slot);
		if (!diagLines.length && !obsLines.length) return;

		doc.setFont('helvetica', 'normal');
		doc.setFontSize(FONT.body);
		doc.setTextColor(...PDF_COLORS.ink);

		let ty = textY;
		for (const line of diagLines) {
			doc.text(line, x + 1, ty);
			ty += LINE_H;
		}
		for (const line of obsLines) {
			doc.text(line, x + 1, ty);
			ty += LINE_H;
		}
	};

	/** `y` = borde superior de la fila (no baseline), así no choca con el encabezado. */
	const drawRow = (y: number, slot: AgendaSlot, zebra: boolean): number => {
		const rowH = rowHeightFor(slot);
		const x0 = marginX;
		const textY = y + ROW_PAD_TOP;

		if (zebra) {
			doc.setFillColor(248, 250, 252);
			doc.rect(x0, y, usable, rowH, 'F');
		}

		doc.setFont('helvetica', 'normal');
		doc.setFontSize(FONT.body);
		doc.setTextColor(...PDF_COLORS.ink);

		let x = x0;
		for (const c of cols) {
			if (c.key === 'obs') {
				drawObsCell(x, textY, c.w, rowH, slot);
			} else {
				const raw = cellValue(slot, c.key);
				if (raw) {
					const lines = (doc.splitTextToSize(raw, c.w - 2) as string[]).slice(0, 3);
					doc.text(lines, x + 1, textY);
				}
			}
			x += c.w;
		}
		return y + rowH;
	};

	const startPageContent = async (firstPage: boolean): Promise<number> => {
		let y = firstPage
			? (await drawDocumentHeader(doc, headerOpts)) - 2
			: PDF_CONTENT_TOP;
		y = drawMetaRow(y);
		return drawTableHead(y);
	};

	let y = await startPageContent(true);

	const slots = [...opts.slots].sort(
		(a, b) => (a.horaClarion ?? 0) - (b.horaClarion ?? 0),
	);

	if (!slots.length) {
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(FONT.vacio);
		doc.setTextColor(...PDF_COLORS.muted);
		doc.text('Sin turnos para la fecha seleccionada.', marginX, y + 4);
	} else {
		for (let i = 0; i < slots.length; i++) {
			const slot = slots[i];
			const rowH = rowHeightFor(slot);
			if (y + rowH > limite()) {
				doc.addPage();
				y = await startPageContent(false);
			}
			y = drawRow(y, slot, i % 2 === 1);
		}
	}

	drawRunningHeaders(doc, headerOpts);
	drawDocumentFooters(doc, headerOpts);
	entregarPDF(doc, fileName);
}
