import jsPDF from 'jspdf';
import type { EmpresaInfo } from '../services/empresaService';
import { PdfBloques, type Campo } from './pdfBloques';
import {
	cleanPdfValue,
	drawDocumentFooters,
	drawDocumentHeader,
	drawRunningHeaders,
	entregarPDF,
	type PDFHeaderOptions,
	type PDFHeaderPatient,
} from './pdfHeader';
import { fechaCorta } from './pdfTablaDiaria';

/** Fila de `obtenerAdmisionDetallada` (imVisita + catálogos). */
export type AdmisionPdf = Record<string, unknown>;

export type PDFAdmisionOptions = {
	admision: AdmisionPdf;
	empresaInfo?: EmpresaInfo | null;
	patient?: PDFHeaderPatient | null;
	fileName?: string;
};

const txt = (a: AdmisionPdf, ...keys: string[]) => {
	for (const k of keys) {
		const v = cleanPdfValue(a[k] as string | number | null | undefined);
		if (v && v !== '0') return v;
	}
	return '';
};

const codigoYDescripcion = (codigo: string, desc: string) => (codigo && desc && desc !== codigo ? `${codigo} - ${desc}` : desc || codigo);

const conValor = (campos: Campo[]) => campos.filter((c) => c.valor);

/** Datos administrativos de la internación: ingreso, cobertura, médicos y egreso. */
export async function generarPDFAdmision({ admision: a, empresaInfo, patient, fileName }: PDFAdmisionOptions) {
	const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
	const headerOpts: PDFHeaderOptions = { title: 'Datos de la internación', empresaInfo, patient, emittedAt: new Date() };
	const r = new PdfBloques(doc);
	r.y = await drawDocumentHeader(doc, headerOpts);

	const egresada = Boolean(txt(a, 'FechaEgreso'));
	const ubicacion = [txt(a, 'SectorDescripcion', 'Sector'), txt(a, 'Habitacion') && `Cama ${txt(a, 'Habitacion')}`]
		.filter(Boolean)
		.join(' · ');
	r.meta([
		{ label: 'Ingreso', value: [fechaCorta(txt(a, 'FechaAdmision')), txt(a, 'HoraAdmision')].filter(Boolean).join(' ') },
		{ label: 'Egreso', value: egresada ? [fechaCorta(txt(a, 'FechaEgreso')), txt(a, 'HoraEgreso')].filter(Boolean).join(' ') : 'Internado' },
		{ label: 'Ubicación', value: ubicacion },
		{ label: 'Visita', value: txt(a, 'NumeroVisita') },
	]);

	const ingreso = conValor([
		{ label: 'Clase de paciente', valor: txt(a, 'ClasePacienteDescripcion', 'ClasePaciente') },
		{ label: 'Tipo de admisión', valor: txt(a, 'TipoAdmisionDescripcion', 'TipoAdmision') },
		{ label: 'Tipo de paciente', valor: txt(a, 'TipoPacienteDescripcion', 'TipoPaciente') },
		{ label: 'Lugar del episodio', valor: txt(a, 'LugarEpisodioDescripcion') },
		{ label: 'Origen', valor: txt(a, 'OrigenAdmisionDescripcion') },
		{ label: 'Servicio', valor: txt(a, 'ServicioHospitalDescripcion', 'ServicioHospital') },
		{ label: 'N° de internación', valor: txt(a, 'NumeroInternacion') },
		{ label: 'Diagnóstico de ingreso', valor: codigoYDescripcion(txt(a, 'Diagnostico'), txt(a, 'DiagnosticoDescripcion')) },
	]);
	if (ingreso.length) {
		r.subtitulo('Ingreso');
		r.campos(ingreso);
	}

	const cobertura = conValor([
		{ label: 'Cobertura', valor: txt(a, 'CoberturaOS') },
		{ label: 'Plan / contrato', valor: txt(a, 'ContratoDescripcion') },
		{ label: 'N° de afiliado', valor: txt(a, 'NumeroSSN') },
	]);
	if (cobertura.length) {
		r.subtitulo('Cobertura');
		r.campos(cobertura);
	}

	const medicos = conValor([
		{ label: 'Médico admisor', valor: txt(a, 'DoctorAdmisorNombre') },
		{ label: 'Médico asistente', valor: txt(a, 'DoctorAsistiendoNombre') },
		{ label: 'Médico de cabecera', valor: txt(a, 'DoctorCabeceraNombre') },
	]);
	if (medicos.length) {
		r.subtitulo('Médicos');
		r.campos(medicos);
	}

	if (egresada) {
		const egreso = conValor([
			{ label: 'Disposición', valor: txt(a, 'DisposicionEgresoDescripcion') },
			{ label: 'Días de estadía', valor: txt(a, 'DiasEstadia') },
			{ label: 'Diagnóstico de egreso', valor: codigoYDescripcion(txt(a, 'DiagnosticoEgreso'), txt(a, 'DiagnosticoEgresoDescripcion')) },
			{ label: 'Registró el egreso', valor: txt(a, 'OperadorEgresoNombre') },
		]);
		if (egreso.length) {
			r.subtitulo('Egreso');
			r.campos(egreso);
		}
	}

	drawRunningHeaders(doc, headerOpts);
	drawDocumentFooters(doc, headerOpts);
	entregarPDF(doc, fileName || `Admision_${txt(a, 'NumeroVisita') || 'paciente'}_${Date.now()}.pdf`);
}
