import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { EmpresaInfo } from '@/app/services/empresaService';
import { formatSqlDate } from '@/app/utils/dateUtils';

export type EpicrisisPdfData = {
	idVisita?: number | string | null;
	fecha?: string | null;
	hora?: string | null;
	diagnostico?: string | null;
	diagnosticoText?: string | null;
	epicrisis?: string | null;
	profesionalNombreCompleto?: string | null;
	profesional?: number | string | null;
	idSector?: string | null;
	sectorDescripcion?: string | null;
	numeroDocumento?: string | number | null;
};

export type EpicrisisPatientInfo = {
	nombre?: string;
	documento?: string;
	numeroVisita?: string | number;
	ubicacion?: string;
};

function formatFecha(fecha?: string | null) {
	if (!fecha) return '—';
	try {
		return formatSqlDate(fecha, { showTime: false, showDate: true, showYear: true }) || fecha;
	} catch {
		return fecha;
	}
}

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
	const pageH = doc.internal.pageSize.getHeight();
	if (y + needed > pageH - 20) {
		doc.addPage();
		return 15;
	}
	return y;
}

/**
 * PDF narrativo de una epicrisis (estilo HC de ingreso).
 */
export function generarPDFEpicrisis(
	data: EpicrisisPdfData,
	patient: EpicrisisPatientInfo,
	empresaInfo?: EmpresaInfo | null,
	fileName?: string,
) {
	const doc = new jsPDF();
	let y = 10;

	const colorPrimario: [number, number, number] = [0, 131, 169];
	const colorSecundario: [number, number, number] = [0, 181, 226];
	const colorTexto: [number, number, number] = [51, 65, 85];
	const colorGris: [number, number, number] = [100, 116, 139];
	const pageWidth = doc.internal.pageSize.getWidth();

	// Header empresa
	doc.setDrawColor(0, 0, 0);
	doc.setLineWidth(0.5);
	doc.rect(10, y, pageWidth - 20, 35);

	doc.setFillColor(240, 240, 240);
	doc.rect(12, y + 2, 30, 30, 'F');
	doc.setFontSize(8);
	doc.setTextColor(100, 100, 100);
	doc.text('LOGO', 27, y + 18, { align: 'center' });

	const empresaX = 45;
	const empresaStartY = y + 5;

	doc.setFillColor(0, 0, 0);
	doc.rect(empresaX, empresaStartY - 3, pageWidth - empresaX - 12, 6, 'F');
	doc.setTextColor(255, 255, 255);
	doc.setFontSize(12);
	doc.setFont('helvetica', 'bold');
	doc.text('EPICRISIS', empresaX + 2, empresaStartY + 1);

	doc.setTextColor(0, 0, 0);
	doc.setFontSize(8);
	doc.setFont('helvetica', 'normal');

	const col1X = empresaX + 2;
	const col2X = pageWidth - 70;
	let infoY = empresaStartY + 8;

	const direccionCompleta =
		[empresaInfo?.calle, empresaInfo?.calle_nro, empresaInfo?.Depto, empresaInfo?.piso]
			.filter(Boolean)
			.join(' ') || '—';

	doc.setFont('helvetica', 'bold');
	doc.text('RAZÓN SOCIAL:', col1X, infoY);
	doc.setFont('helvetica', 'normal');
	doc.text(empresaInfo?.razonSocial || empresaInfo?.descripcion || 'HOSPITAL', col1X + 28, infoY);

	infoY += 4;
	doc.setFont('helvetica', 'bold');
	doc.text('DIRECCIÓN:', col1X, infoY);
	doc.setFont('helvetica', 'normal');
	doc.text(direccionCompleta, col1X + 28, infoY);

	infoY += 4;
	doc.setFont('helvetica', 'bold');
	doc.text('LOCALIDAD:', col1X, infoY);
	doc.setFont('helvetica', 'normal');
	doc.text(empresaInfo?.localidad || '—', col1X + 28, infoY);

	infoY += 4;
	doc.setFont('helvetica', 'bold');
	doc.text('TELÉFONO:', col1X, infoY);
	doc.setFont('helvetica', 'normal');
	doc.text(empresaInfo?.telefono || '—', col1X + 28, infoY);

	infoY = empresaStartY + 8;
	doc.setFont('helvetica', 'bold');
	doc.text('C.U.I.T.:', col2X, infoY);
	doc.setFont('helvetica', 'normal');
	doc.text(empresaInfo?.cuit || '—', col2X + 15, infoY);

	infoY += 4;
	doc.setFont('helvetica', 'bold');
	doc.text('EMAIL:', col2X, infoY);
	doc.setFont('helvetica', 'normal');
	const emailText = empresaInfo?.email || '—';
	doc.text(emailText.length > 25 ? `${emailText.substring(0, 25)}...` : emailText, col2X + 15, infoY);

	y += 38;

	const pacienteNombre = patient.nombre || '—';
	const pacienteDoc =
		patient.documento ||
		(data.numeroDocumento != null ? String(data.numeroDocumento) : '') ||
		'—';

	doc.setFillColor(248, 250, 252);
	doc.rect(10, y, 190, 8, 'F');
	doc.setTextColor(...colorPrimario);
	doc.setFontSize(11);
	doc.setFont('helvetica', 'bold');
	doc.text(`Paciente: ${pacienteNombre} — DNI: ${pacienteDoc}`, 15, y + 5.5);
	y += 12;

	const diagnosticoLine = [data.diagnostico, data.diagnosticoText].filter(Boolean).join(' — ') || '—';
	const profesional =
		data.profesionalNombreCompleto ||
		(data.profesional != null ? `Profesional ${data.profesional}` : '—');
	const sector = data.sectorDescripcion || data.idSector || '—';

	const metaRows = [
		['N. Visita:', String(patient.numeroVisita ?? data.idVisita ?? '—')],
		['Fecha:', formatFecha(data.fecha)],
		['Hora:', data.hora || '—'],
		['Profesional:', profesional],
		['Sector:', sector],
		...(patient.ubicacion ? [['Ubicación:', patient.ubicacion] as [string, string]] : []),
		['Diagnóstico:', diagnosticoLine],
	];

	autoTable(doc, {
		startY: y,
		head: [],
		body: metaRows,
		theme: 'plain',
		styles: {
			fontSize: 9,
			cellPadding: 2,
			textColor: colorTexto,
		},
		columnStyles: {
			0: { fontStyle: 'bold', cellWidth: 32, textColor: colorPrimario },
			1: { cellWidth: 158 },
		},
		margin: { left: 15, right: 15 },
	});

	y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

	y = ensureSpace(doc, y, 20);
	doc.setFillColor(...colorSecundario);
	doc.rect(10, y, 190, 7, 'F');
	doc.setTextColor(255, 255, 255);
	doc.setFontSize(10);
	doc.setFont('helvetica', 'bold');
	doc.text('TEXTO DE LA EPICRISIS', 15, y + 5);
	y += 10;

	doc.setTextColor(...colorTexto);
	doc.setFontSize(9);
	doc.setFont('helvetica', 'normal');
	const texto = (data.epicrisis || '').trim() || '—';
	const lines = doc.splitTextToSize(texto, 180) as string[];
	const lineHeight = 4.5;
	for (const line of lines) {
		y = ensureSpace(doc, y, lineHeight + 2);
		doc.text(line, 15, y);
		y += lineHeight;
	}

	const totalPages = doc.getNumberOfPages();
	for (let i = 1; i <= totalPages; i++) {
		doc.setPage(i);
		doc.setFontSize(8);
		doc.setTextColor(...colorGris);
		doc.setFont('helvetica', 'normal');
		doc.text(`Página ${i} de ${totalPages}`, 105, 287, { align: 'center' });
		doc.text(`Generado: ${new Date().toLocaleString('es-AR')}`, 105, 292, { align: 'center' });
	}

	const visita = patient.numeroVisita ?? data.idVisita ?? 'sin_visita';
	doc.save(fileName || `epicrisis_${visita}_${data.fecha || 'doc'}.pdf`);
}
