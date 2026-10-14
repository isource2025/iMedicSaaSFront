import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { EmpresaInfo } from '../services/empresaService';
import {
	PDF_CONTENT_TOP,
	PDF_FOOTER_SPACE,
	PDF_MARGIN_X,
	PDF_COLORS,
	drawDocumentFooters,
	drawDocumentHeader,
	drawRunningHeaders,
	type PDFHeaderOptions,
	type PDFHeaderPatient,
} from './pdfHeader';
import {
	getFirmaParaPdf,
	getPersonalFirma,
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
	/** Varios bloques de texto (pedido + respuesta, etc.). */
	textBlocks?: Array<{ label?: string; value?: string | null }>;
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
	patientInfo?: PDFHeaderPatient;
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
 * Convierte la firma a JPEG opaco (fondo blanco) para jsPDF.
 * Evita getImageData (puede fallar) y recorta solo vía re-encode.
 */
async function prepareFirmaForJsPdf(
	source: string,
): Promise<{ dataUrl: string; format: 'JPEG' | 'PNG' } | null> {
	const raw = await loadSignatureDataUrl(source);
	if (!raw) return null;

	if (typeof window === 'undefined' || typeof Image === 'undefined') {
		const format = raw.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG';
		return { dataUrl: raw, format };
	}

	return new Promise((resolve) => {
		const img = new Image();
		img.onload = () => {
			try {
				const w = img.naturalWidth || img.width || 0;
				const h = img.naturalHeight || img.height || 0;
				if (!w || !h) {
					resolve({
						dataUrl: raw,
						format: raw.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG',
					});
					return;
				}
				const canvas = document.createElement('canvas');
				canvas.width = w;
				canvas.height = h;
				const ctx = canvas.getContext('2d');
				if (!ctx) {
					resolve({
						dataUrl: raw,
						format: raw.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG',
					});
					return;
				}
				ctx.fillStyle = '#ffffff';
				ctx.fillRect(0, 0, w, h);
				ctx.drawImage(img, 0, 0);
				resolve({ dataUrl: canvas.toDataURL('image/jpeg', 0.92), format: 'JPEG' });
			} catch (err) {
				console.warn('[pdf] prepareFirma fallback raw:', err);
				resolve({
					dataUrl: raw,
					format: raw.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG',
				});
			}
		};
		img.onerror = () => {
			console.warn('[pdf] No se pudo decodificar la imagen de firma');
			resolve(null);
		};
		img.src = raw;
	});
}

async function fetchFirmaDataUrl(keys: {
	idPersonal?: string | null;
	matricula?: string | null;
}): Promise<string | null> {
	const candidates = Array.from(
		new Set([keys.idPersonal, keys.matricula].filter((k): k is string => Boolean(k))),
	);
	if (!candidates.length) return null;

	for (const key of candidates) {
		// 1) Endpoint clínico dedicado (preferido)
		try {
			const f = await getFirmaParaPdf(key);
			if (f?.hasFirma && f.dataUrl) return f.dataUrl;
		} catch (err) {
			console.warn('[pdf] /firmas/personal falló', key, err);
		}
		// 2) Rutas personal públicas
		try {
			const f = await getPersonalFirmaByIdPublic(key);
			if (f?.hasFirma && f.dataUrl) return f.dataUrl;
		} catch {
			/* ignore */
		}
		try {
			const f = await getPersonalFirmaByMatricula(key);
			if (f?.hasFirma && f.dataUrl) return f.dataUrl;
		} catch {
			/* ignore */
		}
		// 3) Misma ruta que el modal de Personal (requiere CONFIGURACION.PERSONAL.VER)
		try {
			const n = Number(key);
			if (Number.isFinite(n) && n > 0) {
				const f = await getPersonalFirma(n);
				if (f?.hasFirma && f.dataUrl) return f.dataUrl;
			}
		} catch {
			/* ignore */
		}
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

/** Igual que `withPersonalFirma` pero para varios profesionales (una búsqueda por persona). */
export async function withPersonalFirmas<T extends ProfesionalFirmaInfo | null | undefined>(
	infos: T[],
): Promise<Array<ProfesionalFirmaInfo | null | undefined>> {
	const firmas = await resolveFirmasFromPersonal(infos);
	return infos.map((i) => attachFirma(i, firmas));
}

function ensureSpace(doc: jsPDF, y: number, needed: number, bottom = PDF_FOOTER_SPACE + 2): number {
	const pageH = doc.internal.pageSize.getHeight();
	if (y + needed > pageH - bottom) {
		doc.addPage();
		return PDF_CONTENT_TOP;
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
	opts?: { align?: 'center' | 'left'; left?: number; lineW?: number },
): Promise<number> {
	const info = normalizeProfesionalFirma(profesional);
	if (!info) return startY;

	const pageWidth = doc.internal.pageSize.getWidth();
	const align = opts?.align || 'center';
	const imgH = 18;
	const lineW = opts?.lineW ?? 60;
	const imgW = Math.min(52, lineW);
	let y = ensureSpace(doc, startY, imgH + 28);

	const centerX = pageWidth / 2;
	const leftX = opts?.left ?? 14;
	const lineX = align === 'center' ? centerX - lineW / 2 : leftX;
	const textX = align === 'center' ? centerX : leftX + lineW / 2;
	const textAlign = 'center' as const;

	const firmaSrc = info.firmaDigital;
	if (firmaSrc) {
		const prepared = await prepareFirmaForJsPdf(firmaSrc);
		const imgX = align === 'center' ? centerX - imgW / 2 : lineX;
		const attempts: Array<{ dataUrl: string; format: 'JPEG' | 'PNG' }> = [];
		if (prepared) attempts.push(prepared);
		if (firmaSrc.startsWith('data:image/')) {
			attempts.push({
				dataUrl: firmaSrc,
				format: firmaSrc.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG',
			});
		}
		let drawn = false;
		for (const attempt of attempts) {
			try {
				doc.addImage(attempt.dataUrl, attempt.format, imgX, y, imgW, imgH);
				drawn = true;
				break;
			} catch (err) {
				console.warn('[pdf] addImage firma falló:', attempt.format, err);
			}
		}
		if (drawn) y += imgH + 1;
		else console.warn('[pdf] Firma digital presente pero no se pudo incrustar en el PDF');
	} else {
		console.warn(
			'[pdf] Sin imagen de firma para',
			info.nombre,
			'mat=',
			info.matricula,
			'id=',
			info.idPersonal,
		);
	}

	doc.setDrawColor(0, 0, 0);
	doc.setLineWidth(0.3);
	doc.line(lineX, y, lineX + lineW, y);

	y += 5;
	const nombre = String(info.nombre || '').toUpperCase();
	const anchoNombre = lineW + 6;
	let fontNombre = 9;
	doc.setFont('helvetica', 'bold');
	doc.setFontSize(fontNombre);
	while (fontNombre > 7 && doc.getTextWidth(nombre) > anchoNombre) doc.setFontSize((fontNombre -= 0.5));
	doc.setTextColor(0, 0, 0);
	const lineasNombre = doc.splitTextToSize(nombre, anchoNombre) as string[];
	lineasNombre.forEach((l, i) => doc.text(l, textX, y + i * 3.6, { align: textAlign }));
	y += (lineasNombre.length - 1) * 3.6;

	y += 4;
	doc.setFont('helvetica', 'normal');
	doc.setFontSize(8);
	doc.setTextColor(...PDF_COLORS.muted);
	const detalle = [info.matricula && `Mat. ${info.matricula}`, info.especialidad?.toUpperCase()]
		.filter(Boolean)
		.join('  ·  ');
	if (detalle) {
		doc.text(detalle, textX, y, { align: textAlign });
		y += 4;
	}
	doc.setTextColor(0, 0, 0);

	return y + 4;
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
			const left = 12;
			const right = pageWidth - 12;
			const usable = right - left;
			for (const f of part.fields) {
				const label = String(f.label || '').trim();
				const value = f.value == null || f.value === '' ? '—' : String(f.value);
				y = ensureSpace(doc, y, 10);
				const labelText = label ? `${label}:` : '';
				doc.setFont('helvetica', 'bold');
				const labelW = labelText ? doc.getTextWidth(labelText) : 0;
				const gap = 2.2;
				const maxInlineLabel = usable * 0.45;
				if (labelW > 0 && labelW <= maxInlineLabel) {
					doc.text(labelText, left, y);
					doc.setFont('helvetica', 'normal');
					const valueX = left + labelW + gap;
					const lines = doc.splitTextToSize(value, Math.max(24, right - valueX));
					doc.text(lines, valueX, y);
					y += Math.max(4.2, lines.length * 3.8) + 1;
				} else {
					if (labelText) {
						const labelLines = doc.splitTextToSize(labelText, usable);
						doc.text(labelLines, left, y);
						y += labelLines.length * 3.8;
					}
					doc.setFont('helvetica', 'normal');
					const lines = doc.splitTextToSize(value, usable);
					doc.text(lines, left, y);
					y += Math.max(4.2, lines.length * 3.8) + 1;
				}
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

		if (part.textBlocks?.length) {
			for (const block of part.textBlocks) {
				const label = String(block.label || '').trim();
				const value = block.value == null || String(block.value).trim() === ''
					? '—'
					: String(block.value);
				y = ensureSpace(doc, y, 14);
				if (label) {
					doc.setFont('helvetica', 'bold');
					doc.setFontSize(8);
					doc.text(`${label}:`, 12, y);
					y += 4;
				}
				doc.setFont('helvetica', 'normal');
				doc.setFontSize(8);
				const textLines = doc.splitTextToSize(value, pageWidth - 24);
				for (const line of textLines) {
					y = ensureSpace(doc, y, 5);
					doc.text(line, 12, y);
					y += 3.8;
				}
				y += 2;
			}
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

	const headerOpts: PDFHeaderOptions = { title, empresaInfo, patient: patientInfo, emittedAt: new Date() };
	let currentY = await drawDocumentHeader(doc, headerOpts);

	if (subtitle) {
		doc.setFontSize(9);
		doc.setFont('helvetica', 'normal');
		doc.setTextColor(...PDF_COLORS.muted);
		doc.text(subtitle, PDF_MARGIN_X, currentY);
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
		const afterPartsY = await drawParts(doc, partsWithFirma, currentY);
		const partsAlreadySigned = partsWithFirma.some((p) => p.profesional);
		if (profesionalWithFirma?.nombre && !partsAlreadySigned) {
			await drawProfesionalFirmaBlock(doc, profesionalWithFirma, afterPartsY + 8);
		}
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
			margin: { top: PDF_CONTENT_TOP, right: 10, bottom: PDF_FOOTER_SPACE + 4, left: 10 },
		});

		if (profesionalWithFirma?.nombre) {
			const finalY = (doc as any).lastAutoTable?.finalY || currentY + 50;
			await drawProfesionalFirmaBlock(doc, profesionalWithFirma, finalY + 16);
		}
	}

	drawRunningHeaders(doc, headerOpts);
	drawDocumentFooters(doc, headerOpts);
	doc.save(fileName);
};
