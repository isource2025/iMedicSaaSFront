import jsPDF from 'jspdf';
import type { EmpresaInfo } from '../services/empresaService';
import type { RemitoCabecera, RemitoItem } from '../types/almacenStock';
import { PdfBloques } from './pdfBloques';
import {
	cleanPdfValue,
	drawDocumentFooters,
	drawDocumentHeader,
	drawRunningHeaders,
	entregarPDF,
	fitText,
	PDF_COLORS,
	PDF_CONTENT_TOP,
	PDF_FOOTER_SPACE,
	PDF_PAGE,
	type PDFHeaderOptions,
} from './pdfHeader';

export type PDFRemitoOptions = {
	remito: RemitoCabecera;
	empresaInfo?: EmpresaInfo | null;
	fileName?: string;
};

type Columna = {
	label: string;
	w: number;
	align?: 'left' | 'right';
	celda: (it: RemitoItem) => string;
};

function fmtCantidad(n?: number | null): string {
	const v = Number(n);
	if (!Number.isFinite(v)) return '';
	if (Math.abs(v - Math.round(v)) < 1e-9) return String(Math.round(v));
	return v.toLocaleString('es-AR', { maximumFractionDigits: 4 });
}

function fmtMoney(n?: number | null): string {
	const v = Number(n);
	return (Number.isFinite(v) ? v : 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
}

function fmtFecha(v?: string | null): string {
	const s = cleanPdfValue(v);
	if (!s) return '';
	const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
	return iso ? `${iso[3]}/${iso[2]}/${iso[1]}` : s;
}

function paciente(it: RemitoItem): string {
	const nombre = cleanPdfValue(it.PacienteNombre) || (it.IdPaciente != null ? `Pac. ${it.IdPaciente}` : '');
	const cama = cleanPdfValue(it.Cama);
	return [nombre, cama && `cama ${cama}`].filter(Boolean).join(' ┬À ');
}

const COLUMNAS: Columna[] = [
	{ label: 'C├ôD.', w: 16, celda: (it) => String(it.IdProducto ?? '') },
	{ label: 'DESCRIPCI├ôN', w: 0, celda: (it) => cleanPdfValue(it.DescripcionProducto) || `C├│digo ${it.IdProducto}` },
	{ label: 'CANT.', w: 14, align: 'right', celda: (it) => fmtCantidad(it.Cantidad) },
	{ label: 'U.MED', w: 13, celda: (it) => cleanPdfValue(it.IdUnidad) },
	{ label: 'PACIENTE', w: 48, celda: paciente },
	{ label: 'IMP. UNIT.', w: 22, align: 'right', celda: (it) => fmtMoney(it.ImporteUnitario) },
	{ label: 'TOTAL', w: 24, align: 'right', celda: (it) => fmtMoney(it.ImporteTotal) },
];

/** Remito (cabecera + ├¡tems) listo para imprimir y firmar. */
export async function generarPDFRemito({ remito, empresaInfo, fileName }: PDFRemitoOptions) {
	const doc = new jsPDF(PDF_PAGE);
	const nro = cleanPdfValue(remito.NroRemitoFmt) || String(remito.IdTransaccion);
	const opts: PDFHeaderOptions = {
		title: `Remito ${nro}`,
		empresaInfo,
	};
	const b = new PdfBloques(doc);
	b.y = await drawDocumentHeader(doc, opts);

	const destino =
		cleanPdfValue(remito.DepositoDestNombre) ||
		cleanPdfValue(remito.ProveedorNombre) ||
		cleanPdfValue(remito.ClienteNombre);
	b.meta([
		{ label: 'Fecha', value: fmtFecha(remito.Fecha) },
		{ label: 'Tipo', value: cleanPdfValue(remito.TipoNombre) || cleanPdfValue(remito.TipoCbte) },
		{ label: 'Dep├│sito', value: cleanPdfValue(remito.DepositoNombre) || String(remito.IdDeposito ?? '') },
		{
			label: remito.DepositoDestNombre ? 'Destino' : remito.ProveedorNombre ? 'Proveedor' : 'Cliente',
			value: destino,
		},
	]);

	const items = remito.items || [];
	const anchoFijo = COLUMNAS.reduce((s, c) => s + c.w, 0);
	const anchos = COLUMNAS.map((c) => (c.w > 0 ? c.w : b.width - anchoFijo));
	const pad = 1.6;
	const filaH = 6;

	const encabezadoTabla = () => {
		doc.setFillColor(...PDF_COLORS.brandSoft);
		doc.rect(b.x0, b.y, b.width, filaH, 'F');
		doc.setFont('helvetica', 'bold');
		doc.setFontSize(7);
		doc.setTextColor(...PDF_COLORS.muted);
		let x = b.x0;
		COLUMNAS.forEach((c, i) => {
			const tx = c.align === 'right' ? x + anchos[i] - pad : x + pad;
			doc.text(c.label, tx, b.y + 4, { align: c.align === 'right' ? 'right' : 'left' });
			x += anchos[i];
		});
		b.y += filaH;
	};

	encabezadoTabla();
	const limite = () => doc.internal.pageSize.getHeight() - PDF_FOOTER_SPACE - 2;
	items.forEach((it, idx) => {
		if (b.y + filaH > limite()) {
			doc.addPage();
			b.y = PDF_CONTENT_TOP;
			encabezadoTabla();
		}
		if (idx % 2 === 1) {
			doc.setFillColor(...PDF_COLORS.panel);
			doc.rect(b.x0, b.y, b.width, filaH, 'F');
		}
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(8);
		doc.setTextColor(...PDF_COLORS.ink);
		let x = b.x0;
		COLUMNAS.forEach((c, i) => {
			const texto = fitText(doc, c.celda(it), anchos[i] - 2 * pad);
			const tx = c.align === 'right' ? x + anchos[i] - pad : x + pad;
			doc.text(texto, tx, b.y + 4.1, { align: c.align === 'right' ? 'right' : 'left' });
			x += anchos[i];
		});
		doc.setDrawColor(...PDF_COLORS.line);
		doc.setLineWidth(0.1);
		doc.line(b.x0, b.y + filaH, b.x1, b.y + filaH);
		b.y += filaH;
	});
	if (!items.length) {
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(9);
		doc.setTextColor(...PDF_COLORS.muted);
		doc.text('El remito no tiene ├¡tems.', b.x0 + pad, b.y + 5);
		b.y += 8;
	}

	const bultos = items.reduce((s, it) => s + Math.abs(Number(it.Cantidad) || 0), 0);
	const total = items.reduce((s, it) => s + (Number(it.ImporteTotal) || 0), 0);
	b.y += 4;
	b.ensure(12);
	doc.setFont('helvetica', 'bold');
	doc.setFontSize(9);
	doc.setTextColor(...PDF_COLORS.ink);
	doc.text(
		`├ìtems: ${items.length}    Bultos: ${fmtCantidad(remito.Bultos ?? bultos)}    Total: ${fmtMoney(remito.TotalRemito ?? total)}`,
		b.x1,
		b.y,
		{ align: 'right' },
	);
	b.y += 8;

	const obs = (remito.observaciones || [])
		.map((o) => cleanPdfValue(o.Comentarios))
		.filter(Boolean)
		.join('\n');
	if (obs) {
		b.subtitulo('Observaciones');
		b.parrafo(obs);
	}

	b.ensure(28);
	b.y += 16;
	const firmaW = (b.width - 20) / 2;
	doc.setDrawColor(...PDF_COLORS.text);
	doc.setLineWidth(0.2);
	doc.setFont('helvetica', 'normal');
	doc.setFontSize(8);
	doc.setTextColor(...PDF_COLORS.muted);
	[
		{ x: b.x0, label: 'Entreg├│ (firma y aclaraci├│n)' },
		{ x: b.x0 + firmaW + 20, label: 'Recibi├│ (firma y aclaraci├│n)' },
	].forEach(({ x, label }) => {
		doc.line(x, b.y, x + firmaW, b.y);
		doc.text(label, x + firmaW / 2, b.y + 4, { align: 'center' });
	});

	drawRunningHeaders(doc, opts);
	drawDocumentFooters(doc, opts);
	entregarPDF(doc, fileName || `Remito_${nro.replace(/[^\w-]+/g, '_')}.pdf`);
}
