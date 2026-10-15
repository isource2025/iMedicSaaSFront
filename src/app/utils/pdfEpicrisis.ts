import jsPDF from 'jspdf';
import { EmpresaInfo } from '@/app/services/empresaService';
import { PdfBloques, type Campo } from './pdfBloques';
import { drawProfesionalFirmaBlock, formatMatricula, withPersonalFirmas, type ProfesionalFirmaInfo } from './pdfExport';
import {
	cleanPdfValue,
	drawDocumentFooters,
	drawDocumentHeader,
	drawRunningHeaders,
	entregarPDF,
	PDF_COLORS,
	PDF_CONTENT_TOP,
	type PDFHeaderOptions,
} from './pdfHeader';

export type EpicrisisPdfData = {
	idVisita?: number | string | null;
	fecha?: string | null;
	hora?: string | null;
	diagnostico?: string | null;
	diagnosticoDescripcion?: string | null;
	diagnosticoText?: string | null;
	epicrisis?: string | null;
	profesionalNombreCompleto?: string | null;
	profesional?: number | string | null;
	idPersonal?: number | string | null;
	matricula?: number | string | null;
	especialidad?: string | null;
	idSector?: string | null;
	sectorDescripcion?: string | null;
	numeroDocumento?: string | number | null;
};

export type EpicrisisPatientInfo = {
	nombre?: string;
	documento?: string;
	numeroVisita?: string | number;
	ubicacion?: string;
	fechaIngreso?: string;
	horaIngreso?: string;
};

function fechaCorta(v?: string | null): string {
	const s = cleanPdfValue(v);
	const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
	return iso ? `${iso[3]}/${iso[2]}/${iso[1]}` : s;
}

function horaCorta(v?: string | null): string {
	const m = cleanPdfValue(v).match(/(\d{1,2}):(\d{2})/);
	return m ? `${m[1].padStart(2, '0')}:${m[2]}` : cleanPdfValue(v);
}

/** Los textos de Clarion vienen con relleno de espacios al final de cada línea. */
function textoLimpio(v?: string | null): string {
	return String(v ?? '')
		.replace(/\r\n?/g, '\n')
		.replace(/[ \t]+$/gm, '')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}

const normalizar = (s: string) =>
	s
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9]+/gi, ' ')
		.trim()
		.toLowerCase();

function diagnosticos(e: EpicrisisPdfData): Campo[] {
	const cod = cleanPdfValue(e.diagnostico).toUpperCase();
	const desc = cleanPdfValue(e.diagnosticoDescripcion);
	const texto = textoLimpio(e.diagnosticoText);
	const cie = desc && cod ? `${desc} (${cod})` : desc || cod;
	const campos: Campo[] = [];
	if (cie) campos.push({ label: 'Diagnóstico (CIE)', valor: cie });
	// El texto libre suele repetir la descripción del código: solo se muestra si agrega algo.
	if (texto && normalizar(texto) !== normalizar(desc)) campos.push({ label: 'Detalle', valor: texto });
	return campos;
}

function profesionalDe(e: EpicrisisPdfData): ProfesionalFirmaInfo | null {
	const nombre = cleanPdfValue(e.profesionalNombreCompleto);
	const matricula = e.matricula ?? e.profesional ?? undefined;
	if (!nombre && !formatMatricula(matricula)) return null;
	return {
		nombre: nombre || undefined,
		matricula,
		idPersonal: e.idPersonal ?? undefined,
		especialidad: cleanPdfValue(e.especialidad) || undefined,
	};
}

/**
 * PDF de epicrisis: header institucional + paciente y, por epicrisis (una por hoja),
 * datos del registro, diagnóstico, resumen de la internación y firma del profesional.
 */
export async function generarPDFEpicrisis(
	data: EpicrisisPdfData | EpicrisisPdfData[],
	patient: EpicrisisPatientInfo,
	empresaInfo?: EmpresaInfo | null,
	fileName?: string,
) {
	const lista = (Array.isArray(data) ? data : [data])
		.map((e, i) => ({ e, i }))
		.sort(
			(a, b) =>
				`${cleanPdfValue(a.e.fecha)}${horaCorta(a.e.hora)}`.localeCompare(
					`${cleanPdfValue(b.e.fecha)}${horaCorta(b.e.hora)}`,
				) || a.i - b.i,
		)
		.map(({ e }) => e);
	const primera = lista[0];

	const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
	const headerOpts: PDFHeaderOptions = {
		title: 'Epicrisis',
		empresaInfo,
		emittedAt: new Date(),
		patient: {
			nombre: patient.nombre,
			numeroDocumento:
				patient.documento || (primera?.numeroDocumento != null ? String(primera.numeroDocumento) : ''),
			numeroVisita: patient.numeroVisita ?? primera?.idVisita,
			ubicacion: patient.ubicacion,
			fechaIngreso: patient.fechaIngreso,
			horaIngreso: patient.horaIngreso,
		},
	};
	const r = new PdfBloques(doc);
	r.y = await drawDocumentHeader(doc, headerOpts);

	const firmas = await withPersonalFirmas(lista.map(profesionalDe));

	if (!lista.length) {
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(9.5);
		doc.setTextColor(...PDF_COLORS.muted);
		doc.text('No hay epicrisis registradas.', r.x0, r.y + 2);
	}

	for (let i = 0; i < lista.length; i++) {
		const e = lista[i];
		if (i > 0) {
			doc.addPage();
			r.y = PDF_CONTENT_TOP + 2;
		}
		if (lista.length > 1) r.capitulo(`Epicrisis ${i + 1} de ${lista.length}`);

		const prof = firmas[i];
		r.meta([
			{ label: 'Fecha', value: [fechaCorta(e.fecha), horaCorta(e.hora)].filter(Boolean).join('  ') },
			{
				label: 'Profesional',
				value: cleanPdfValue(prof?.nombre).toUpperCase(),
				sub:
					[formatMatricula(prof?.matricula) && `Mat. ${formatMatricula(prof?.matricula)}`, cleanPdfValue(prof?.especialidad)]
						.filter(Boolean)
						.join('  ·  ') || undefined,
			},
			{ label: 'Sector', value: cleanPdfValue(e.sectorDescripcion) || cleanPdfValue(e.idSector) },
		]);

		const dx = diagnosticos(e);
		if (dx.length) {
			r.subtitulo('Diagnóstico');
			r.campos(dx);
		}

		r.subtitulo('Resumen de la internación');
		const texto = textoLimpio(e.epicrisis);
		if (texto) r.parrafo(texto);
		else {
			doc.setFont('helvetica', 'normal');
			doc.setFontSize(9);
			doc.setTextColor(...PDF_COLORS.muted);
			doc.text('Sin texto cargado.', r.x0, r.y);
			r.espacio(6);
		}

		if (prof) {
			r.espacio(4);
			r.ensure(47);
			r.y = await drawProfesionalFirmaBlock(doc, prof, r.y, { align: 'left', left: r.x1 - 62 });
		}
	}

	drawRunningHeaders(doc, headerOpts);
	drawDocumentFooters(doc, headerOpts);

	const visita = patient.numeroVisita ?? primera?.idVisita ?? 'sin_visita';
	entregarPDF(
		doc,
		fileName ||
			(lista.length === 1 ? `epicrisis_${visita}_${primera?.fecha || 'doc'}.pdf` : `epicrisis_${visita}.pdf`),
	);
}
