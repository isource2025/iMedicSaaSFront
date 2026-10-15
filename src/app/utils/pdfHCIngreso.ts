import jsPDF from 'jspdf';
import { EmpresaInfo } from '@/app/services/empresaService';
import { HCI_CAMPOS_TEXTO_LIBRE, buildHCIPhysicalExamSections } from './hciIngresoDisplay';
import { drawProfesionalFirmaBlock, withPersonalFirma, type ProfesionalFirmaInfo } from './pdfExport';
import { PdfBloques, type Campo } from './pdfBloques';
import {
	cleanPdfValue,
	drawDocumentFooters,
	drawDocumentHeader,
	drawRunningHeaders,
	entregarPDF,
	type PDFHeaderOptions,
} from './pdfHeader';

type HCIngresoData = Record<string, any>;

/** Orden clínico de lectura de las secciones agrupadas por `buildHCIPhysicalExamSections`. */
const CAPITULOS: Array<{ titulo: string; secciones: string[] }> = [
	{ titulo: 'Anamnesis', secciones: ['ANTECEDENTES', 'ENFERMEDAD'] },
	{
		titulo: 'Examen físico',
		secciones: [
			'SIGNOS VITALES',
			'PIEL Y FANERAS',
			'TEJIDO CELULAR SUBCUTÁNEO',
			'SISTEMA LINFÁTICO',
			'SISTEMA VENOSO',
			'SISTEMA OSTEOARTICULOMUSCULAR',
			'CABEZA',
			'EXAMEN OFTALMOLÓGICO',
			'CUELLO',
			'MAMAS',
			'MAMAS — INSPECCIÓN',
			'MAMAS — PALPACIÓN',
			'APARATO RESPIRATORIO',
			'APARATO CARDIOVASCULAR',
			'ABDOMEN',
			'APARATO DIGESTIVO INFERIOR',
			'APARATO UROGENITAL',
			'EXAMEN GINECOLÓGICO',
			'EXAMEN OBSTÉTRICO',
			'SISTEMA NERVIOSO',
		],
	},
	{ titulo: 'Estudios complementarios', secciones: ['ELECTROCARDIOGRAMA', 'RADIOGRAFÍA DE TÓRAX'] },
	{ titulo: 'Evaluación y plan', secciones: ['DIAGNÓSTICO', 'PLAN DIAGNÓSTICO', 'PLAN TERAPÉUTICO'] },
	{ titulo: 'Otros registros', secciones: ['CONTROL FRECUENTE (ASOCIADO A LA HC)', 'OTROS DATOS DE LA HC'] },
];

/** Textos libres de imHCI y en qué capítulo van (antes o después de las secciones agrupadas). */
const TEXTOS_POR_CAPITULO: Record<string, { antes?: string[]; despues?: string[] }> = {
	'Estudios complementarios': { despues: ['EXAMENCOMPLEMENTARIO'] },
	'Evaluación y plan': {
		antes: ['Semiologia', 'IMPRESIONDIAGNOSTICA'],
		despues: ['COMENTARIODEINGRESO', 'ModMedica'],
	},
};

/** Signos vitales medibles: van como tarjetas, en este orden. La unidad solo se agrega a valores numéricos. */
const VITALES_TARJETA: Array<{ key: string; label: string; unidad?: string }> = [
	{ key: 'SV_PA', label: 'TA', unidad: 'mmHg' },
	{ key: 'SV_FC', label: 'FC', unidad: 'lpm' },
	{ key: 'SV_FR', label: 'FR', unidad: 'rpm' },
	{ key: 'SV_TAX', label: 'Temp. axilar', unidad: '°C' },
	{ key: 'SV_GLUCEMIA', label: 'Glucemia', unidad: 'mg/dL' },
	{ key: 'SV_PESOACTUAL', label: 'Peso actual', unidad: 'kg' },
	{ key: 'SV_PESOHABITUAL', label: 'Peso habitual', unidad: 'kg' },
	{ key: 'SV_TALLA', label: 'Talla' },
];
const VITALES_TARJETA_KEYS = new Set(VITALES_TARJETA.map((v) => v.key));

function tarjetasVitales(data: HCIngresoData): Campo[] {
	return VITALES_TARJETA.flatMap(({ key, label, unidad }) => {
		const v = cleanPdfValue(data[key]);
		if (!v) return [];
		const numerico = /^\d+([.,]\d+)?(\/\d+([.,]\d+)?)?$/.test(v);
		return [{ label, valor: numerico && unidad ? `${v} ${unidad}` : v }];
	});
}

const sentenceCase = (s: string) => {
	const t = s.toLowerCase();
	return t.charAt(0).toUpperCase() + t.slice(1);
};

const textoDe = (data: HCIngresoData, campo: string) => {
	const v = data[campo];
	return v == null ? '' : String(v).trim();
};


/**
 * PDF de la HC de ingreso: header institucional + paciente, y el cuerpo ordenado
 * como se lee clínicamente (anamnesis → examen físico → estudios → evaluación y plan).
 */
export const generarPDFHistoriaClinica = async (
	data: HCIngresoData,
	pacienteNombre: string,
	pacienteDNI: string,
	empresaInfo?: EmpresaInfo,
	ubicacion?: string,
) => {
	const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
	const headerOpts: PDFHeaderOptions = {
		title: 'Historia Clínica de Ingreso',
		empresaInfo,
		emittedAt: new Date(),
		patient: {
			numeroVisita: data.NumeroVisita,
			nombre: data.PacienteNombre || pacienteNombre,
			numeroDocumento: data.PacienteDocumento || pacienteDNI,
			tipoDocumento: data.PacienteTipoDocumento,
			sexo: data.PacienteSexoDescripcion || data.PacienteSexo,
			edad: data.PacienteEdad,
			fechaNacimiento: data.PacienteFechaNacimiento,
			fechaIngreso: data.VisitaFechaIngreso,
			horaIngreso: data.VisitaHoraIngreso,
			cobertura: data.ObraSocial,
			ubicacion: ubicacion || data.Ubicacion,
		},
	};

	const r = new PdfBloques(doc);
	r.y = await drawDocumentHeader(doc, headerOpts);

	const filiatorios: Campo[] = [
		{ label: 'Estado civil', valor: cleanPdfValue(data.PacienteEstadoCivil) },
		{ label: 'Ocupación', valor: cleanPdfValue(data.PacienteOcupacion) },
		{ label: 'Nacionalidad', valor: cleanPdfValue(data.PacienteNacionalidad) },
		{ label: 'Domicilio', valor: cleanPdfValue(data.PacienteDomicilio) },
		{ label: 'Localidad', valor: cleanPdfValue(data.PacienteLocalidad) },
		{ label: 'C.P.', valor: cleanPdfValue(data.PacienteCodigoPostal) },
		{ label: 'Provincia', valor: cleanPdfValue(data.PacienteProvincia) },
	].filter((c) => c.valor);
	if (filiatorios.length) {
		r.subtitulo('Datos del paciente');
		r.campos(filiatorios);
		r.espacio(1);
	}

	const profesionalNombre = cleanPdfValue(data.ProfesionalNombre);
	const matricula = cleanPdfValue(data.Matricula);
	r.meta([
		{
			label: 'Fecha de la HC',
			value: [
				cleanPdfValue(data.FechaFormateada).replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$3/$2/$1'),
				cleanPdfValue(data.HoraFormateada),
			]
				.filter(Boolean)
				.join('  ·  '),
		},
		{
			label: 'Profesional',
			value: profesionalNombre || (matricula ? `Mat. ${matricula}` : ''),
			sub:
				[profesionalNombre && matricula ? `Mat. ${matricula}` : '', cleanPdfValue(data.EspecialidadDescripcion)]
					.filter(Boolean)
					.join('  ·  ') || undefined,
		},
		{ label: 'Sector', value: cleanPdfValue(data.SectorDescripcion) || cleanPdfValue(data.IdSector) },
	]);

	const vitales = tarjetasVitales(data);
	const sinVitalesTarjeta = Object.fromEntries(
		Object.entries(data).filter(([k]) => !VITALES_TARJETA_KEYS.has(k)),
	);
	const secciones = new Map(buildHCIPhysicalExamSections(sinVitalesTarjeta).map((s) => [s.titulo, s.campos]));
	const usadas = new Set<string>();

	const motivo = textoDe(data, 'MotivoConsulta');
	const enfermedad = textoDe(data, 'EnfermedadActual');

	for (const cap of CAPITULOS) {
		const extra = TEXTOS_POR_CAPITULO[cap.titulo] || {};
		const antes = (extra.antes || []).filter((c) => textoDe(data, c));
		const despues = (extra.despues || []).filter((c) => textoDe(data, c));
		const presentes = cap.secciones.filter((s) => secciones.get(s)?.length);
		const esAnamnesis = cap.titulo === 'Anamnesis';
		const tieneAnamnesis = esAnamnesis && (motivo || enfermedad);
		const conVitales = cap.titulo === 'Examen físico' && vitales.length > 0;
		if (!presentes.length && !antes.length && !despues.length && !tieneAnamnesis && !conVitales) continue;

		r.capitulo(cap.titulo);

		if (esAnamnesis) {
			if (motivo) {
				r.subtitulo('Motivo de consulta');
				r.parrafo(motivo);
			}
			if (enfermedad) {
				r.subtitulo('Enfermedad actual');
				r.parrafo(enfermedad);
			}
		}

		for (const campo of antes) {
			r.subtitulo(sentenceCase(HCI_CAMPOS_TEXTO_LIBRE[campo]));
			r.parrafo(textoDe(data, campo));
		}

		if (conVitales) {
			r.subtitulo('Signos vitales');
			r.tarjetas(vitales);
		}

		for (const titulo of presentes) {
			usadas.add(titulo);
			const campos = secciones.get(titulo)!;
			r.subtitulo(sentenceCase(titulo === 'SIGNOS VITALES' ? 'Estado general' : titulo));
			if (campos.every((c) => /^\d+$/.test(c.label))) r.lista(campos);
			else r.campos(campos);
		}

		for (const campo of despues) {
			r.subtitulo(sentenceCase(HCI_CAMPOS_TEXTO_LIBRE[campo]));
			r.parrafo(textoDe(data, campo));
		}
	}

	const sueltas = Array.from(secciones.keys()).filter((t) => !usadas.has(t));
	for (const titulo of sueltas) {
		r.subtitulo(sentenceCase(titulo));
		r.campos(secciones.get(titulo)!);
	}

	const profesional: ProfesionalFirmaInfo = {
		nombre: profesionalNombre || (data.IdProfecional ? `Prof. ${data.IdProfecional}` : undefined),
		matricula: data.Matricula ?? undefined,
		idPersonal: data.IdPersonal ?? data.IdProfecional ?? undefined,
		especialidad: cleanPdfValue(data.EspecialidadDescripcion) || undefined,
	};
	r.espacio(6);
	r.ensure(46);
	const firmaW = 60;
	await drawProfesionalFirmaBlock(doc, await withPersonalFirma(profesional), r.y, {
		align: 'left',
		left: r.x1 - firmaW,
	});

	drawRunningHeaders(doc, headerOpts);
	drawDocumentFooters(doc, headerOpts);
	entregarPDF(doc, `HC_Ingreso_${data.NumeroVisita}_${Date.now()}.pdf`);
};
