import type jsPDF from 'jspdf';
import type { EmpresaInfo } from '../services/empresaService';
import type { Adjunto } from '../types/adjuntos';
import { cleanPdfValue, PDF_COLORS, PDF_CONTENT_TOP, PDF_FOOTER_SPACE, PDF_MARGIN_X, type PDFHeaderPatient } from './pdfHeader';
import { columnaHora, generarPDFTablaDiaria, type ColumnaTabla } from './pdfTablaDiaria';

export type AdjuntoPdf = Pick<Adjunto, 'IdAdjunto' | 'NombreArchivo' | 'TipoArchivo' | 'FechaCarga'> &
	Partial<Pick<Adjunto, 'TipoImagen' | 'TipoImagenNombre' | 'NombreUsuario'>>;

export type PDFAdjuntosOptions = {
	items: AdjuntoPdf[];
	/** Bytes del archivo; si se pasa, las imágenes se agregan como páginas después del índice. */
	cargarArchivo?: (a: AdjuntoPdf) => Promise<Blob | null>;
	empresaInfo?: EmpresaInfo | null;
	patient?: PDFHeaderPatient | null;
	fileName?: string;
};

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * FechaCarga del HIS es hora de pared (sin zona). Si llega con Z (legado),
 * los componentes UTC son la hora local — no restar UTC-3.
 */
function fechaHoraLocal(v?: string | null): [string, string] {
	const s = cleanPdfValue(v);
	const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
	if (m) return [`${m[1]}-${m[2]}-${m[3]}`, `${m[4]}:${m[5]}`];
	const d = s ? new Date(s) : null;
	if (!d || Number.isNaN(d.getTime())) return [s.slice(0, 10), ''];
	const fromUtc = /Z$/i.test(s);
	const y = fromUtc ? d.getUTCFullYear() : d.getFullYear();
	const mo = (fromUtc ? d.getUTCMonth() : d.getMonth()) + 1;
	const day = fromUtc ? d.getUTCDate() : d.getDate();
	const h = fromUtc ? d.getUTCHours() : d.getHours();
	const mi = fromUtc ? d.getUTCMinutes() : d.getMinutes();
	return [`${y}-${pad(mo)}-${pad(day)}`, `${pad(h)}:${pad(mi)}`];
}

const extension = (a: AdjuntoPdf) => (cleanPdfValue(a.NombreArchivo).match(/\.([a-z0-9]+)$/i)?.[1] || '').toLowerCase();

export function esImagenAdjunta(a: AdjuntoPdf): boolean {
	const tipo = cleanPdfValue(a.TipoArchivo).toLowerCase();
	return tipo.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'].includes(extension(a));
}

export function esPdfAdjunto(a: AdjuntoPdf): boolean {
	return cleanPdfValue(a.TipoArchivo).toLowerCase().includes('pdf') || extension(a) === 'pdf';
}

function tipoArchivo(a: AdjuntoPdf): string {
	if (esPdfAdjunto(a)) return 'PDF';
	if (esImagenAdjunta(a)) return 'Imagen';
	return extension(a).toUpperCase() || cleanPdfValue(a.TipoArchivo);
}

type ImagenPdf = { data: string | Uint8Array; formato: 'JPEG' | 'PNG'; w: number; h: number };

const MAX_LADO = 1800;

async function imagenParaPdf(doc: jsPDF, blob: Blob): Promise<ImagenPdf | null> {
	if (typeof createImageBitmap === 'function' && typeof document !== 'undefined') {
		const bmp = await createImageBitmap(blob);
		const escala = Math.min(1, MAX_LADO / Math.max(bmp.width, bmp.height));
		const canvas = document.createElement('canvas');
		canvas.width = Math.round(bmp.width * escala);
		canvas.height = Math.round(bmp.height * escala);
		const ctx = canvas.getContext('2d');
		if (!ctx) return null;
		ctx.fillStyle = '#fff';
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
		bmp.close();
		return { data: canvas.toDataURL('image/jpeg', 0.85), formato: 'JPEG', w: canvas.width, h: canvas.height };
	}
	const formato = blob.type.includes('png') ? 'PNG' : blob.type.includes('jpeg') || blob.type.includes('jpg') ? 'JPEG' : null;
	if (!formato) return null;
	const data = new Uint8Array(await blob.arrayBuffer());
	const props = doc.getImageProperties(data);
	return { data, formato, w: props.width, h: props.height };
}

async function paginasDeImagenes(doc: jsPDF, imagenes: AdjuntoPdf[], cargar: NonNullable<PDFAdjuntosOptions['cargarArchivo']>) {
	const x0 = PDF_MARGIN_X;
	for (const a of imagenes) {
		let img: ImagenPdf | null = null;
		try {
			const blob = await cargar(a);
			img = blob ? await imagenParaPdf(doc, blob) : null;
		} catch {
			img = null;
		}
		doc.addPage('a4', 'portrait');
		const x1 = doc.internal.pageSize.getWidth() - PDF_MARGIN_X;
		const yMax = doc.internal.pageSize.getHeight() - PDF_FOOTER_SPACE - 2;
		let y = PDF_CONTENT_TOP + 2;
		const [fecha, hora] = fechaHoraLocal(a.FechaCarga);
		doc.setFont('helvetica', 'bold');
		doc.setFontSize(9);
		doc.setTextColor(...PDF_COLORS.ink);
		doc.text(doc.splitTextToSize(cleanPdfValue(a.NombreArchivo) || `Adjunto ${a.IdAdjunto}`, x1 - x0)[0], x0, y);
		y += 4;
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(7.6);
		doc.setTextColor(...PDF_COLORS.muted);
		const meta = [
			cleanPdfValue(a.TipoImagenNombre),
			[fecha.split('-').reverse().join('/'), hora].filter(Boolean).join(' '),
			cleanPdfValue(a.NombreUsuario) && `Cargó: ${cleanPdfValue(a.NombreUsuario)}`,
		].filter(Boolean);
		doc.text(meta.join('  ·  '), x0, y);
		y += 4;
		if (!img) {
			doc.text('No se pudo obtener la imagen desde el servidor de archivos.', x0, y + 4);
			continue;
		}
		const escala = Math.min((x1 - x0) / img.w, (yMax - y) / img.h);
		const w = img.w * escala;
		const h = img.h * escala;
		doc.addImage(img.data, img.formato, x0 + (x1 - x0 - w) / 2, y, w, h);
	}
}

const COLUMNAS: ColumnaTabla<AdjuntoPdf>[] = [
	columnaHora((a) => fechaHoraLocal(a.FechaCarga)[1]),
	{ key: 'archivo', label: 'ARCHIVO', w: 0, fuente: 'bold', tono: 'ink', celda: (a) => cleanPdfValue(a.NombreArchivo) },
	{ key: 'categoria', label: 'CATEGORÍA', w: 40, celda: (a) => cleanPdfValue(a.TipoImagenNombre) || cleanPdfValue(a.TipoImagen) },
	{ key: 'tipo', label: 'TIPO', w: 16, celda: tipoArchivo },
	{ key: 'cargo', label: 'CARGÓ', w: 40, celda: (a) => cleanPdfValue(a.NombreUsuario) },
];

/** Índice de archivos adjuntos y, si se pueden descargar, las imágenes a continuación. */
export function generarPDFAdjuntos({ items, cargarArchivo, empresaInfo, patient, fileName }: PDFAdjuntosOptions) {
	const imagenes = items.filter(esImagenAdjunta);
	return generarPDFTablaDiaria({
		titulo: 'Archivos adjuntos',
		items,
		columnas: COLUMNAS,
		fecha: (a) => fechaHoraLocal(a.FechaCarga)[0],
		hora: (a) => fechaHoraLocal(a.FechaCarga)[1],
		unidad: ['archivo', 'archivos'],
		vacio: 'No hay archivos adjuntos en el período seleccionado.',
		profesionales: () => [],
		despues: cargarArchivo && imagenes.length ? (doc) => paginasDeImagenes(doc, imagenes, cargarArchivo) : undefined,
		empresaInfo,
		patient,
		fileName: fileName || `Adjuntos_${cleanPdfValue(patient?.numeroVisita) || 'paciente'}_${Date.now()}.pdf`,
	});
}
