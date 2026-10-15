import jsPDF from 'jspdf';
import { PDF_CONTENT_TOP, PDF_FOOTER_SPACE, PDF_COLORS } from './pdfHeader';
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
