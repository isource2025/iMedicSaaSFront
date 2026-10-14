import jsPDF from 'jspdf';
import type { EmpresaInfo } from '../services/empresaService';
import { drawProfesionalFirmaBlock, withPersonalFirmas, type ProfesionalFirmaInfo } from './pdfExport';
import {
	cleanPdfValue,
	drawDocumentFooters,
	drawDocumentHeader,
	drawRunningHeaders,
	PDF_COLORS,
	PDF_CONTENT_TOP,
	PDF_FOOTER_SPACE,
	PDF_MARGIN_X,
	type PDFHeaderOptions,
	type PDFHeaderPatient,
} from './pdfHeader';

export type EvolucionPdfItem = {
	/** yyyy-mm-dd o dd/mm/yyyy */
	fecha?: string | null;
	hora?: string | null;
	texto?: string | null;
	profesional?: ProfesionalFirmaInfo | null;
};

export type PDFEvolucionesOptions = {
	items: EvolucionPdfItem[];
	empresaInfo?: EmpresaInfo | null;
	patient?: PDFHeaderPatient | null;
	title?: string;
	fileName?: string;
};

const COL_FECHA = 24;
const COL_HORA = 15;
const LINE_H = 4.4;
/** Debe cubrir lo que reserva `drawProfesionalFirmaBlock`, para que el salto de página lo haga este módulo. */
const FIRMA_H = 47;

function fechaCorta(v?: string | null): string {
	const s = cleanPdfValue(v);
	const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
	return iso ? `${iso[3]}/${iso[2]}/${iso[1]}` : s;
}

function horaCorta(v?: string | null): string {
	const m = cleanPdfValue(v).match(/(\d{1,2}):(\d{2})/);
	return m ? `${m[1].padStart(2, '0')}:${m[2]}` : cleanPdfValue(v);
}

/** Orden cronológico (ascendente), como se lee una internación. */
function claveOrden(e: EvolucionPdfItem): string {
	const f = fechaCorta(e.fecha).split('/');
	const fecha = f.length === 3 ? `${f[2]}${f[1]}${f[0]}` : '';
	return `${fecha}${horaCorta(e.hora).padStart(5, '0')}`;
}

/**
 * PDF de evoluciones: header institucional + paciente, y cada evolución como
 * fila fecha · hora · texto con la firma del profesional que la escribió.
 */
export async function generarPDFEvoluciones({
	items,
	empresaInfo,
	patient,
	title = 'Evoluciones',
	fileName,
}: PDFEvolucionesOptions) {
	const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
	const headerOpts: PDFHeaderOptions = { title, empresaInfo, patient, emittedAt: new Date() };
	const x0 = PDF_MARGIN_X;
	const x1 = doc.internal.pageSize.getWidth() - PDF_MARGIN_X;
	const tx = x0 + COL_FECHA + COL_HORA;
	const tw = x1 - tx;
	const limite = () => doc.internal.pageSize.getHeight() - PDF_FOOTER_SPACE - 2;

	const evoluciones = items
		.filter((e) => cleanPdfValue(e.texto))
		.sort((a, b) => claveOrden(a).localeCompare(claveOrden(b)));
	const profesionales = await withPersonalFirmas(evoluciones.map((e) => e.profesional));

	let y = await drawDocumentHeader(doc, headerOpts);

	const fechas = evoluciones.map((e) => fechaCorta(e.fecha)).filter(Boolean);
	const rango =
		fechas.length && fechas[0] !== fechas[fechas.length - 1]
			? `del ${fechas[0]} al ${fechas[fechas.length - 1]}`
			: fechas[0] || '';
	doc.setFont('helvetica', 'normal');
	doc.setFontSize(8);
	doc.setTextColor(...PDF_COLORS.muted);
	doc.text(
		[`${evoluciones.length} ${evoluciones.length === 1 ? 'evolución' : 'evoluciones'}`, rango].filter(Boolean).join('  ·  '),
		x0,
		y,
	);
	y += 4;

	const encabezadoColumnas = () => {
		doc.setFillColor(...PDF_COLORS.panel);
		doc.setDrawColor(...PDF_COLORS.line);
		doc.setLineWidth(0.2);
		doc.rect(x0, y, x1 - x0, 7, 'FD');
		doc.setFont('helvetica', 'bold');
		doc.setFontSize(6.5);
		doc.setTextColor(...PDF_COLORS.muted);
		doc.text('FECHA', x0 + 2.5, y + 4.6, { charSpace: 0.4 });
		doc.text('HORA', x0 + COL_FECHA + 1, y + 4.6, { charSpace: 0.4 });
		doc.text('EVOLUCIÓN', tx + 1, y + 4.6, { charSpace: 0.4 });
		y += 7 + 5;
	};

	const nuevaPagina = () => {
		doc.addPage();
		y = PDF_CONTENT_TOP;
		encabezadoColumnas();
	};

	encabezadoColumnas();

	if (!evoluciones.length) {
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(9.5);
		doc.setTextColor(...PDF_COLORS.muted);
		doc.text('No hay evoluciones registradas en el período seleccionado.', x0 + 2.5, y + 2);
	}

	for (let i = 0; i < evoluciones.length; i++) {
		const e = evoluciones[i];
		const fecha = fechaCorta(e.fecha);
		const hora = horaCorta(e.hora);
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(9.3);
		const lineas = doc.splitTextToSize(String(e.texto).replace(/\r\n?/g, '\n').trim(), tw - 1) as string[];
		const alto = lineas.length * LINE_H + (profesionales[i] ? FIRMA_H : 3);
		// Texto y firma van juntos: si no entran acá pero sí en una hoja nueva, se pasa entera.
		const altoHojaNueva = limite() - PDF_CONTENT_TOP - 12;
		if (y + alto > limite() && alto <= altoHojaNueva) nuevaPagina();
		else if (y + LINE_H * 2 > limite()) nuevaPagina();

		const cabecera = (continuacion: boolean) => {
			doc.setFont('helvetica', 'bold');
			doc.setFontSize(9);
			doc.setTextColor(...(continuacion ? PDF_COLORS.muted : PDF_COLORS.ink));
			doc.text(fecha || '-', x0 + 2.5, y);
			doc.setFont('helvetica', 'normal');
			doc.setTextColor(...PDF_COLORS.text);
			doc.text(hora || '-', x0 + COL_FECHA + 1, y);
			if (continuacion) {
				doc.setFontSize(6.5);
				doc.setTextColor(...PDF_COLORS.muted);
				doc.text('(continúa)', x0 + 2.5, y + 3.6);
			}
		};
		cabecera(false);

		doc.setFont('helvetica', 'normal');
		doc.setFontSize(9.3);
		for (const linea of lineas) {
			if (y + LINE_H > limite()) {
				nuevaPagina();
				cabecera(true);
				doc.setFont('helvetica', 'normal');
				doc.setFontSize(9.3);
			}
			doc.setTextColor(...PDF_COLORS.ink);
			doc.text(linea, tx + 1, y);
			y += LINE_H;
		}

		const profesional = profesionales[i];
		if (profesional) {
			y += 2;
			if (y + FIRMA_H > limite()) nuevaPagina();
			y = await drawProfesionalFirmaBlock(doc, profesional, y, { align: 'left', left: x1 - 62 });
		} else {
			y += 3;
		}

		if (i < evoluciones.length - 1) {
			doc.setDrawColor(...PDF_COLORS.line);
			doc.setLineWidth(0.2);
			doc.line(x0, y - 1, x1, y - 1);
			y += 5;
		}
	}

	drawRunningHeaders(doc, headerOpts);
	drawDocumentFooters(doc, headerOpts);
	doc.save(fileName || `Evoluciones_${cleanPdfValue(patient?.numeroVisita) || 'paciente'}_${Date.now()}.pdf`);
}
