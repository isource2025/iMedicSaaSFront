import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { EmpresaInfo } from '../services/empresaService';
import {
	getPersonalFirmaByIdPublic,
	getPersonalFirmaByMatricula,
} from '../services/personalService';

export type ProfesionalFirmaInfo = {
	nombre?: string;
	matricula?: string | number | null;
	/** Valor (ID) en imPersonal — preferido para buscar firma. */
	idPersonal?: string | number | null;
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
	const idPersonal = formatMatricula(info.idPersonal);
	const especialidad = String(info.especialidad || '').trim() || undefined;
	if (!nombre && !matricula && !idPersonal) return null;
	return {
		nombre: nombre || (matricula ? `Mat. ${matricula}` : undefined),
		matricula: matricula || undefined,
		idPersonal: idPersonal || undefined,
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

/**
 * Convierte la firma a JPEG opaco (fondo blanco) y recorta márgenes
 * para que jsPDF la incruste bien y el trazo se vea a tamaño útil.
 */
async function prepareFirmaForJsPdf(
	source: string,
): Promise<{ dataUrl: string; format: 'JPEG' } | null> {
	const raw = await loadSignatureDataUrl(source);
	if (!raw) return null;
	if (typeof window === 'undefined') {
		return { dataUrl: raw, format: 'JPEG' };
	}

	return new Promise((resolve) => {
		const img = new Image();
		img.onload = () => {
			try {
				const w = img.naturalWidth || img.width;
				const h = img.naturalHeight || img.height;
				if (!w || !h) {
					resolve(null);
					return;
				}

				const src = document.createElement('canvas');
				src.width = w;
				src.height = h;
				const sctx = src.getContext('2d');
				if (!sctx) {
					resolve(null);
					return;
				}
				sctx.fillStyle = '#ffffff';
				sctx.fillRect(0, 0, w, h);
				sctx.drawImage(img, 0, 0);

				const pixels = sctx.getImageData(0, 0, w, h).data;
				let minX = w;
				let minY = h;
				let maxX = 0;
				let maxY = 0;
				const threshold = 245;
				for (let y = 0; y < h; y++) {
					for (let x = 0; x < w; x++) {
						const i = (y * w + x) * 4;
						if (pixels[i] < threshold || pixels[i + 1] < threshold || pixels[i + 2] < threshold) {
							if (x < minX) minX = x;
							if (y < minY) minY = y;
							if (x > maxX) maxX = x;
							if (y > maxY) maxY = y;
						}
					}
				}

				const pad = 8;
				if (maxX <= minX || maxY <= minY) {
					minX = 0;
					minY = 0;
					maxX = w - 1;
					maxY = h - 1;
				} else {
					minX = Math.max(0, minX - pad);
					minY = Math.max(0, minY - pad);
					maxX = Math.min(w - 1, maxX + pad);
					maxY = Math.min(h - 1, maxY + pad);
				}

				const cw = Math.max(1, maxX - minX + 1);
				const ch = Math.max(1, maxY - minY + 1);
				const out = document.createElement('canvas');
				out.width = cw;
				out.height = ch;
				const octx = out.getContext('2d');
				if (!octx) {
					resolve(null);
					return;
				}
				octx.fillStyle = '#ffffff';
				octx.fillRect(0, 0, cw, ch);
				octx.drawImage(src, minX, minY, cw, ch, 0, 0, cw, ch);
				resolve({ dataUrl: out.toDataURL('image/jpeg', 0.92), format: 'JPEG' });
			} catch {
				resolve(null);
			}
		};
		img.onerror = () => resolve(null);
		img.src = raw;
	});
}

async function fetchFirmaDataUrl(keys: {
	idPersonal?: string | null;
	matricula?: string | null;
}): Promise<string | null> {
	const tried = new Set<string>();
	const tryMat = async (key: string) => {
		if (!key || tried.has(`m:${key}`)) return null;
		tried.add(`m:${key}`);
		try {
			const f = await getPersonalFirmaByMatricula(key);
			if (f?.hasFirma && f.dataUrl) return f.dataUrl;
		} catch {
			/* ignore */
		}
		return null;
	};
	const tryId = async (key: string) => {
		if (!key || tried.has(`id:${key}`)) return null;
		tried.add(`id:${key}`);
		const n = Number(key);
		if (!Number.isFinite(n) || n <= 0) return null;
		try {
			const f = await getPersonalFirmaByIdPublic(n);
			if (f?.hasFirma && f.dataUrl) return f.dataUrl;
		} catch {
			/* ignore */
		}
		return null;
	};

	if (keys.idPersonal) {
		const byMatAsId = await tryMat(keys.idPersonal);
		if (byMatAsId) return byMatAsId;
		const byId = await tryId(keys.idPersonal);
		if (byId) return byId;
	}
	if (keys.matricula) {
		const byMat = await tryMat(keys.matricula);
		if (byMat) return byMat;
		const byId = await tryId(keys.matricula);
		if (byId) return byId;
	}
	return null;
}

/** Completa firmaDigital desde Personal (imPersonal.Firma). */
async function resolveFirmasFromPersonal(
	items: Array<ProfesionalFirmaInfo | null | undefined>,
): Promise<Map<string, string>> {
	const map = new Map<string, string>();
	const keys: Array<{ idPersonal: string | null; matricula: string | null; cacheKey: string }> = [];
	const seen = new Set<string>();
	for (const p of items) {
		if (!p || p.firmaDigital) continue;
		const idPersonal = formatMatricula(p.idPersonal);
		const matricula = formatMatricula(p.matricula);
		const cacheKey = idPersonal || matricula;
		if (!cacheKey || seen.has(cacheKey)) continue;
		seen.add(cacheKey);
		keys.push({ idPersonal, matricula, cacheKey });
	}
	await Promise.all(
		keys.map(async ({ idPersonal, matricula, cacheKey }) => {
			const url = await fetchFirmaDataUrl({ idPersonal, matricula });
			if (!url) return;
			map.set(cacheKey, url);
			if (matricula) map.set(matricula, url);
			if (idPersonal) map.set(idPersonal, url);
		}),
	);
	return map;
}

function attachFirma(
	info: ProfesionalFirmaInfo | null | undefined,
	firmas: Map<string, string>,
): ProfesionalFirmaInfo | null | undefined {
	if (!info) return info;
	if (info.firmaDigital) return info;
	const idPersonal = formatMatricula(info.idPersonal);
	const matricula = formatMatricula(info.matricula);
	const url =
		(idPersonal && firmas.get(idPersonal)) ||
		(matricula && firmas.get(matricula)) ||
		undefined;
	return url ? { ...info, firmaDigital: url } : info;
}

/** Resuelve la imagen de firma desde Personal para un profesional (por matrícula / id). */
export async function withPersonalFirma(
	info?: ProfesionalFirmaInfo | null,
): Promise<ProfesionalFirmaInfo | null | undefined> {
	const firmas = await resolveFirmasFromPersonal([info]);
	return attachFirma(info, firmas);
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
 * Dibuja imagen de firma + línea + nombre completo + matrícula.
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
	const imgH = 18;
	const imgW = 52;
	let y = ensureSpace(doc, startY, imgH + 28);

	const lineW = 60;
	const centerX = pageWidth / 2;
	const leftX = opts?.left ?? 14;
	const lineX = align === 'center' ? centerX - lineW / 2 : leftX;
	const textX = align === 'center' ? centerX : leftX + lineW / 2;
	const textAlign = 'center' as const;

	const prepared = info.firmaDigital ? await prepareFirmaForJsPdf(info.firmaDigital) : null;
	if (prepared) {
		try {
			const imgX = align === 'center' ? centerX - imgW / 2 : lineX;
			doc.addImage(prepared.dataUrl, prepared.format, imgX, y, imgW, imgH);
			y += imgH + 1;
		} catch (err) {
			console.warn('[pdf] No se pudo incrustar la firma digital:', err);
		}
	}

	doc.setDrawColor(0, 0, 0);
	doc.setLineWidth(0.3);
	doc.line(lineX, y, lineX + lineW, y);

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

	const firmas = await resolveFirmasFromPersonal([
		...(parts || []).map((p) => p.profesional),
		profesionalInfo,
	]);

	const partsWithFirma = parts?.map((p) => ({
		...p,
		profesional: attachFirma(p.profesional, firmas),
	}));
	const profesionalWithFirma = attachFirma(profesionalInfo, firmas);

	if (partsWithFirma && partsWithFirma.length > 0) {
		await drawParts(doc, partsWithFirma, currentY);
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

		if (profesionalWithFirma?.nombre) {
			const finalY = (doc as any).lastAutoTable?.finalY || currentY + 50;
			await drawProfesionalFirmaBlock(doc, profesionalWithFirma, finalY + 16);
		}
	}

	drawFooters(doc);
	doc.save(fileName);
};
