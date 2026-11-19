/**
 * Ticket de turno estilo Clarion (comprobante para el paciente).
 */
import jsPDF from 'jspdf';
import { obtenerInfoEmpresa } from '@/app/services/empresaService';
import { entregarPDF } from '@/app/utils/pdfHeader';
import type { TicketTurno } from '@/app/services/agendaService';

function pad2(n: number): string {
	return String(n).padStart(2, '0');
}

function fechaImpreso(d: Date): string {
	return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function horaImpreso(d: Date): string {
	return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function formatearDocumento(doc: number | string | null | undefined): string {
	if (doc == null || doc === '') return '—';
	const digits = String(doc).replace(/\D/g, '');
	if (!digits) return String(doc);
	return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function texto(v: string | null | undefined, fallback = '—'): string {
	const t = String(v || '').trim();
	return t || fallback;
}

/** jsPDF usa pt; +0.30 mm ≈ +0.85 pt */
const PT_BUMP = (0.3 * 72) / 25.4;
const pt = (size: number) => size + PT_BUMP;

export async function generarPdfTicketTurno(ticket: TicketTurno): Promise<void> {
	const empresa = await obtenerInfoEmpresa().catch(() => null);
	const institucion = String(
		empresa?.razonSocial || empresa?.descripcion || 'Institución',
	)
		.trim()
		.toUpperCase();

	const ahora = new Date();
	const fileName = `ticket-turno-${ticket.idTurno}.pdf`;

	// Ticket 80 × 110 mm
	const doc = new jsPDF({
		orientation: 'portrait',
		unit: 'mm',
		format: [80, 110],
	});

	const pageW = doc.internal.pageSize.getWidth();
	const pageH = doc.internal.pageSize.getHeight();
	const marginX = 4;
	const contentW = pageW - marginX * 2;
	let y = 4;

	doc.setFont('courier', 'normal');
	doc.setFontSize(pt(7.5));
	doc.setTextColor(0, 0, 0);

	doc.text(`Impreso: ${fechaImpreso(ahora)}`, marginX, y);
	doc.text(`Hora: ${horaImpreso(ahora)}`, pageW - marginX, y, { align: 'right' });
	y += 3.5;

	doc.setFont('courier', 'italic');
	doc.setFontSize(pt(10));
	doc.text('Ticket Turno', pageW / 2, y, { align: 'center' });
	y += 3.5;

	doc.setFont('courier', 'bold');
	doc.setFontSize(pt(7.5));
	const instLines = doc.splitTextToSize(institucion, contentW) as string[];
	for (const line of instLines.slice(0, 2)) {
		doc.text(line, marginX, y);
		y += 3;
	}
	y += 1;

	const boxTop = y;
	const pad = 2;
	const innerX = marginX + pad;
	const innerW = contentW - pad * 2;
	y += 3;

	const lineGap = 3;
	const sectionGap = 1.2;

	const writePair = (label: string, value: string, boldValue = true) => {
		doc.setFont('courier', 'normal');
		doc.setFontSize(pt(7));
		doc.text(label, innerX, y);
		y += 2.6;
		doc.setFont('courier', boldValue ? 'bold' : 'normal');
		doc.setFontSize(pt(7.5));
		const lines = doc.splitTextToSize(value, innerW) as string[];
		for (const line of lines) {
			doc.text(line, innerX, y);
			y += lineGap;
		}
	};

	writePair('Fecha y Hora de su turno:', texto(ticket.fechaHoraLegible));
	y += sectionGap;
	writePair('Profesional:', texto(ticket.profesional).toUpperCase());
	writePair('Servicio:', texto(ticket.servicio).toUpperCase());
	writePair('Especialidad:', texto(ticket.especialidad).toUpperCase());

	y += 0.6;
	doc.setDrawColor(0);
	doc.setLineWidth(0.25);
	doc.line(innerX, y, innerX + innerW, y);
	y += 3;

	writePair('Paciente:', texto(ticket.paciente).toUpperCase());

	const nroDoc = formatearDocumento(ticket.numeroDocumento);
	doc.setFont('courier', 'normal');
	doc.setFontSize(pt(7));
	const labelDoc = 'Nro Documento:';
	const labelDocW = doc.getTextWidth(labelDoc);
	doc.text(labelDoc, innerX, y);
	doc.setFontSize(pt(7.5));
	doc.text(` ${nroDoc}`, innerX + labelDocW, y);
	y += lineGap;

	y += 0.6;
	doc.line(innerX, y, innerX + innerW, y);
	y += 3;

	writePair('Observaciones:', texto(ticket.observaciones, ''), false);
	writePair('Este turno fue otorgado por:', texto(ticket.otorgadoPor).toUpperCase());

	y += 0.6;
	doc.line(innerX, y, innerX + innerW, y);
	y += 3;

	doc.setFont('courier', 'normal');
	doc.setFontSize(pt(6.5));
	const aviso =
		'Para una mejor atención presentarse 15 minutos antes de la hora de la cita';
	const avisoLines = doc.splitTextToSize(aviso, innerW) as string[];
	for (const line of avisoLines) {
		doc.text(line, innerX, y);
		y += 2.6;
	}
	y += 1;
	doc.setFont('courier', 'italic');
	doc.setFontSize(pt(7));
	doc.text('Muchas Gracias...', innerX, y);
	y += 2.5;

	const boxBottom = Math.min(Math.max(y, boxTop + 16), pageH - 2);
	doc.setDrawColor(0);
	doc.setLineWidth(0.5);
	doc.rect(marginX, boxTop, contentW, boxBottom - boxTop);

	entregarPDF(doc, fileName);
}
