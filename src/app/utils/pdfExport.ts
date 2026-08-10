import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { EmpresaInfo } from '../services/empresaService';

export type ProfesionalFirmaInfo = {
	nombre?: string;
	matricula?: string | number | null;
	especialidad?: string;
	firmaDigital?: string;
};

/** Bloque de un registro exportable (evolución, control, etc.) con firma del ejecutor. */
export type PDFPart = {
	title?: string;
	fields?: Array<{ label: string; value?: string | number | null }>;
	textLabel?: string;
	text?: string | null;
	profesional?: ProfesionalFirmaInfo | null;
};

export interface PDFExportOptions {
	title: string;
	subtitle?: string;
	headers?: string[];
	data?: any[][];
	/** Si se informa, el PDF se arma por partes (cada registro + firma). */
	parts?: PDFPart[];
	fileName?: string;
	orientation?: 'portrait' | 'landscape';
	empresaInfo?: EmpresaInfo;
	patientInfo?: {
		numeroVisita?: string | number;
		nombre?: string;
		documento?: string;
		numeroDocumento?: string;
		ubicacion?: string;
		fechaIngreso?: string;
		horaIngreso?: string;
	};
	/** Firma global al final (solo si no hay `parts`). */
	profesionalInfo?: ProfesionalFirmaInfo;
	columnStyles?: Record<number, { cellWidth?: number | 'auto' | 'wrap'; minCellWidth?: number }>;
}

export function formatMatricula(matricula?: string | number | null): string | null {
	if (matricula == null || matricula === '') return null;
	const s = String(matricula).trim();
	if (!s || s === '0' || s.toLowerCase() === 'undefined' || s.toLowerCase() === 'null') return null;
	return s;
}

export function normalizeProfesionalFirma(
	info?: ProfesionalFirmaInfo | null,
): ProfesionalFirmaInfo | null {
	if (!info) return null;
	let nombre = String(info.nombre || '').trim();
	if (nombre === '-') nombre = '';
	const matricula = formatMatricula(info.matricula);
	const especialidad = String(info.especialidad || '').trim() || undefined;
	if (!nombre && !matricula) return null;
	return {
		nombre: nombre || (matricula ? `Mat. ${matricula}` : undefined),
		matricula: matricula || undefined,
		especialidad,
		firmaDigital: info.firmaDigital,
	};
}

async function loadSignatureDataUrl(source: string): Promise<string | null> {
	if (!source) return null;
	if (source.startsWith('data:image/')) return source;
	try {
		const response = await fetch(source);
		if (!response.ok) return null;
		const blob = await response.blob();
		return await new Promise<string>((resolve, reject) => {
			const reader = new FileReader();
			reader.onloadend = () => resolve(String(reader.result));
			reader.onerror = () => reject(new Error('No se pudo leer firma'));
			reader.readAsDataURL(blob);
		});
	} catch {
		return null;
	}
}

function ensureSpace(doc: jsPDF, y: number, needed: number, bottom = 18): number {
	const pageH = doc.internal.pageSize.getHeight();
	if (y + needed > pageH - bottom) {
		doc.addPage();
		return 14;
	}
	return y;
}

/**
 * Dibuja línea de firma + nombre completo + matrícula (+ especialidad / imagen).
 * Devuelve la Y siguiente.
 */
export async function drawProfesionalFirmaBlock(
	doc: jsPDF,
	profesional: ProfesionalFirmaInfo | null | undefined,
	startY: number,
	opts?: { align?: 'center' | 'left'; left?: number },
): Promise<number> {
	const info = normalizeProfesionalFirma(profesional);
	if (!info) return startY;

	const pageWidth = doc.internal.pageSize.getWidth();
	const align = opts?.align || 'center';
	let y = ensureSpace(doc, startY, 32);

	const lineW = 60;
	const centerX = pageWidth / 2;
	const leftX = opts?.left ?? 14;
	const lineX = align === 'center' ? centerX - lineW / 2 : leftX;
	const textX = align === 'center' ? centerX : leftX + lineW / 2;
	const textAlign = align === 'center' ? 'center' : 'center';

	doc.setDrawColor(0, 0, 0);
	doc.setLineWidth(0.3);
	doc.line(lineX, y, lineX + lineW, y);

	const firmaDataUrl = info.firmaDigital ? await loadSignatureDataUrl(info.firmaDigital) : null;
	if (firmaDataUrl) {
		try {
			doc.addImage(firmaDataUrl, 'PNG', lineX + 6, y - 16, 48, 14);
		} catch {
			// ignore image errors
		}
	}

	y += 5;
	doc.setFontSize(9);
	doc.setFont('helvetica', 'bold');
	doc.setTextColor(0, 0, 0);
	doc.text(String(info.nombre || '').toUpperCase(), textX, y, { align: textAlign });

	y += 4;
	doc.setFont('helvetica', 'normal');
	doc.setFontSize(8);
	if (info.matricula) {
		doc.text(`Mat. ${info.matricula}`, textX, y, { align: textAlign });
		y += 4;
	}
	if (info.especialidad) {
		doc.text(info.especialidad.toUpperCase(), textX, y, { align: textAlign });
		y += 4;
	}

	return y + 4;
}

function drawEmpresaHeader(
	doc: jsPDF,
	title: string,
	empresaInfo?: EmpresaInfo,
): number {
	const pageWidth = doc.internal.pageSize.getWidth();
	let currentY = 10;

	doc.setDrawColor(0, 0, 0);
	doc.setLineWidth(0.5);
	doc.rect(10, currentY, pageWidth - 20, 35);

	doc.setFillColor(240, 240, 240);
	doc.rect(12, currentY + 2, 30, 30, 'F');
	doc.setFontSize(8);
	doc.setTextColor(100, 100, 100);
	doc.text('LOGO', 27, currentY + 18, { align: 'center' });

	const empresaX = 45;
	const empresaStartY = currentY + 5;

	doc.setFillColor(0, 0, 0);
	doc.rect(empresaX, empresaStartY - 3, pageWidth - empresaX - 12, 6, 'F');
	doc.setTextColor(255, 255, 255);
	doc.setFontSize(12);
	doc.setFont('helvetica', 'bold');
	doc.text(title.toUpperCase(), empresaX + 2, empresaStartY + 1);

	doc.setTextColor(0, 0, 0);
	doc.setFontSize(8);
	doc.setFont('helvetica', 'normal');

	const col1X = empresaX + 2;
	const col2X = pageWidth - 70;
	let infoY = empresaStartY + 8;

	const direccionCompleta =
		[empresaInfo?.calle, empresaInfo?.calle_nro, empresaInfo?.Depto, empresaInfo?.piso]
			.filter(Boolean)
			.join(' ') || '-';

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
	doc.text(empresaInfo?.localidad || '-', col1X + 28, infoY);

	infoY += 4;
	doc.setFont('helvetica', 'bold');
	doc.text('TELÉFONO:', col1X, infoY);
	doc.setFont('helvetica', 'normal');
	doc.text(empresaInfo?.telefono || '-', col1X + 28, infoY);

	infoY = empresaStartY + 8;
	doc.setFont('helvetica', 'bold');
	doc.text('C.U.I.T.:', col2X, infoY);
	doc.setFont('helvetica', 'normal');
	doc.text(empresaInfo?.cuit || '-', col2X + 15, infoY);

	infoY += 4;
	doc.setFont('helvetica', 'bold');
	doc.text('CONDICIÓN:', col2X, infoY);
	doc.setFont('helvetica', 'normal');
	doc.text(empresaInfo?.condicionIva || '-', col2X + 22, infoY);

	infoY += 4;
	doc.setFont('helvetica', 'bold');
	doc.text('ING. BRUTOS:', col2X, infoY);
	doc.setFont('helvetica', 'normal');
	doc.text(empresaInfo?.ingresosBrutos || '-', col2X + 22, infoY);

	infoY += 4;
	doc.setFont('helvetica', 'bold');
	doc.text('PROVINCIA:', col2X, infoY);
	doc.setFont('helvetica', 'normal');
	doc.text(empresaInfo?.provincia || '-', col2X + 22, infoY);

	infoY += 4;
	doc.setFont('helvetica', 'bold');
	doc.text('EMAIL:', col2X, infoY);
	doc.setFont('helvetica', 'normal');
	const emailText = empresaInfo?.email || '-';
	doc.text(emailText.length > 25 ? emailText.substring(0, 25) + '...' : emailText, col2X + 15, infoY);

	infoY += 4;
	doc.setFont('helvetica', 'bold');
	doc.text('FAX:', col2X, infoY);
	doc.setFont('helvetica', 'normal');
	doc.text(empresaInfo?.fax || '-', col2X + 15, infoY);

	return currentY + 37;
}

function drawPatientInfo(
	doc: jsPDF,
	patientInfo: NonNullable<PDFExportOptions['patientInfo']>,
	startY: number,
): number {
	let currentY = startY + 3;
	doc.setFontSize(9);
	doc.setFont('helvetica', 'bold');

	let patInfoY = currentY;
	const leftCol = 12;

	doc.text(`Nro Visita: `, leftCol, patInfoY);
	doc.setFont('helvetica', 'normal');
	doc.text(`${patientInfo.numeroVisita || '-'}`, leftCol + 20, patInfoY);

	doc.setFont('helvetica', 'bold');
	doc.text(`Fecha: `, leftCol + 50, patInfoY);
	doc.setFont('helvetica', 'normal');
	doc.text(`${patientInfo.fechaIngreso || '-'}`, leftCol + 62, patInfoY);

	doc.setFont('helvetica', 'bold');
	doc.text(`Hora: `, leftCol + 95, patInfoY);
	doc.setFont('helvetica', 'normal');
	doc.text(`${patientInfo.horaIngreso || '-'}`, leftCol + 105, patInfoY);

	doc.setFont('helvetica', 'bold');
	doc.text(`Nro Documento: `, leftCol + 130, patInfoY);
	doc.setFont('helvetica', 'normal');
	doc.text(`${patientInfo.numeroDocumento || patientInfo.documento || '-'}`, leftCol + 158, patInfoY);

	patInfoY += 5;
	doc.setFont('helvetica', 'bold');
	doc.text(`Apellido y Nombre: `, leftCol, patInfoY);
	doc.setFont('helvetica', 'normal');
	doc.text(`${patientInfo.nombre || '-'}`, leftCol + 35, patInfoY);

	patInfoY += 5;
	doc.setFont('helvetica', 'bold');
	doc.text(`Ubicación: `, leftCol, patInfoY);
	doc.setFont('helvetica', 'normal');
	doc.text(`${patientInfo.ubicacion || '-'}`, leftCol + 20, patInfoY);

	return startY + 17;
}

function drawFooters(doc: jsPDF) {
	const pageWidth = doc.internal.pageSize.getWidth();
	const pageHeight = doc.internal.pageSize.getHeight();
	const pageCount = doc.getNumberOfPages();
	const now = new Date();
	const dateStr = now.toLocaleDateString('es-AR');
	const timeStr = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

	for (let i = 1; i <= pageCount; i++) {
		doc.setPage(i);
		doc.setFontSize(7);
		doc.setTextColor(100, 100, 100);
		doc.setFont('helvetica', 'normal');
		doc.text(`Date: ${dateStr}`, 12, pageHeight - 5);
		doc.text(`Time: ${timeStr}`, pageWidth / 2, pageHeight - 5, { align: 'center' });
		doc.text(`Page: ${i}/${pageCount}`, pageWidth - 12, pageHeight - 5, { align: 'right' });
	}
}

async function drawParts(doc: jsPDF, parts: PDFPart[], startY: number): Promise<number> {
	const pageWidth = doc.internal.pageSize.getWidth();
	let y = startY;

	for (let i = 0; i < parts.length; i++) {
		const part = parts[i];
		y = ensureSpace(doc, y, 28);
		y += i === 0 ? 2 : 4;

		// Separador / título de parte
		doc.setDrawColor(0, 181, 226);
		doc.setLineWidth(0.4);
		doc.line(12, y, pageWidth - 12, y);
		y += 5;

		doc.setFontSize(10);
		doc.setFont('helvetica', 'bold');
		doc.setTextColor(0, 131, 169);
		doc.text(part.title || `Registro ${i + 1}`, 12, y);
		doc.setTextColor(0, 0, 0);
		y += 5;

		if (part.fields?.length) {
			doc.setFontSize(8);
			for (const f of part.fields) {
				const label = String(f.label || '').trim();
				const value = f.value == null || f.value === '' ? '—' : String(f.value);
				y = ensureSpace(doc, y, 8);
				doc.setFont('helvetica', 'bold');
				doc.text(`${label}:`, 12, y);
				doc.setFont('helvetica', 'normal');
				const lines = doc.splitTextToSize(value, pageWidth - 55);
				doc.text(lines, 42, y);
				y += Math.max(4, lines.length * 3.6) + 1;
			}
		}

		if (part.text && String(part.text).trim()) {
			y = ensureSpace(doc, y, 16);
			if (part.textLabel) {
				doc.setFont('helvetica', 'bold');
				doc.setFontSize(8);
				doc.text(`${part.textLabel}:`, 12, y);
				y += 4;
			}
			doc.setFont('helvetica', 'normal');
			doc.setFontSize(8);
			const textLines = doc.splitTextToSize(String(part.text), pageWidth - 24);
			for (const line of textLines) {
				y = ensureSpace(doc, y, 5);
				doc.text(line, 12, y);
				y += 3.8;
			}
			y += 2;
		}

		y = await drawProfesionalFirmaBlock(doc, part.profesional, y + 4);
		y += 2;
	}

	return y;
}

export const exportToPDF = async ({
	title,
	subtitle,
	headers = [],
	data = [],
	parts,
	fileName = 'export.pdf',
	orientation = 'portrait',
	empresaInfo,
	patientInfo,
	profesionalInfo,
	columnStyles,
}: PDFExportOptions) => {
	const doc = new jsPDF({
		orientation,
		unit: 'mm',
		format: 'a4',
	});

	const pageWidth = doc.internal.pageSize.getWidth();
	let currentY = drawEmpresaHeader(doc, title, empresaInfo);

	if (patientInfo) {
		currentY = drawPatientInfo(doc, patientInfo, currentY);
	}

	if (subtitle) {
		doc.setFontSize(10);
		doc.setFont('helvetica', 'italic');
		doc.setTextColor(60, 60, 60);
		doc.text(subtitle, pageWidth / 2, currentY, { align: 'center' });
		currentY += 6;
		doc.setTextColor(0, 0, 0);
	}

	if (parts && parts.length > 0) {
		await drawParts(doc, parts, currentY);
	} else {
		autoTable(doc, {
			head: [headers],
			body: data,
			startY: currentY,
			theme: 'grid',
			styles: {
				fontSize: 8,
				cellPadding: 3,
				overflow: 'linebreak',
				font: 'helvetica',
				cellWidth: 'wrap',
			},
			headStyles: {
				fillColor: [0, 181, 226],
				textColor: [255, 255, 255],
				fontStyle: 'bold',
				halign: 'center',
				fontSize: 9,
			},
			columnStyles: columnStyles || {
				3: { cellWidth: 'auto', minCellWidth: 60 },
			},
			alternateRowStyles: {
				fillColor: [245, 247, 250],
			},
			margin: { top: 10, right: 10, bottom: 30, left: 10 },
		});

		if (profesionalInfo?.nombre) {
			const finalY = (doc as any).lastAutoTable?.finalY || currentY + 50;
			await drawProfesionalFirmaBlock(doc, profesionalInfo, finalY + 16);
		}
	}

	drawFooters(doc);
	doc.save(fileName);
};
