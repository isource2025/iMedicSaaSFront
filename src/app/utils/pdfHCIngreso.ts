import { EmpresaInfo } from '@/app/services/empresaService';
import { HCI_CAMPOS_TEXTO_LIBRE, buildHCIPhysicalExamSections } from './hciIngresoDisplay';
import { exportToPDF, type PDFPart, type ProfesionalFirmaInfo } from './pdfExport';
import { buildPacienteFields } from '@/app/components/beds/shared/pacienteFields';

type HCIngresoData = Record<string, any>;

/**
 * Exporta HC de ingreso con el mismo estándar PDF de la plataforma
 * (header de empresa, paciente y firma digital del profesional).
 */
export const generarPDFHistoriaClinica = async (
	data: HCIngresoData,
	pacienteNombre: string,
	pacienteDNI: string,
	empresaInfo?: EmpresaInfo,
) => {
	const profesional: ProfesionalFirmaInfo = {
		nombre:
			String(data.ProfesionalNombre || '').trim() ||
			(data.IdProfecional ? `Prof. ${data.IdProfecional}` : undefined),
		matricula: data.Matricula ?? undefined,
		idPersonal: data.IdPersonal ?? data.IdProfecional ?? undefined,
	};

	const filiatorios = buildPacienteFields(data).filter(
		(f) => f.label !== 'Paciente' && f.label !== 'Atención' && f.value,
	);

	const parts: PDFPart[] = [
		...(filiatorios.length
			? [
					{
						title: 'Datos del paciente',
						fields: filiatorios.map((f) => ({ label: f.label, value: f.value })),
					},
				]
			: []),
		{
			title: 'Datos de la HC',
			fields: [
				{ label: 'N. Visita', value: data.NumeroVisita },
				{ label: 'Fecha', value: data.FechaFormateada },
				{ label: 'Hora', value: data.HoraFormateada },
				{ label: 'Profesional', value: data.ProfesionalNombre || data.IdProfecional },
				{ label: 'Sector', value: data.SectorDescripcion || data.IdSector },
			],
		},
	];

	if (data.MotivoConsulta) {
		parts.push({
			title: 'Motivo de consulta',
			text: String(data.MotivoConsulta),
		});
	}

	if (data.EnfermedadActual) {
		parts.push({
			title: 'Enfermedad actual',
			text: String(data.EnfermedadActual),
		});
	}

	Object.entries(HCI_CAMPOS_TEXTO_LIBRE).forEach(([campo, tituloPdf]) => {
		const texto = data[campo] != null && data[campo] !== '' ? String(data[campo]).trim() : '';
		if (!texto) return;
		parts.push({ title: tituloPdf, text: texto });
	});

	const secciones = buildHCIPhysicalExamSections(data).sort((a, b) =>
		a.titulo.localeCompare(b.titulo, 'es'),
	);
	secciones.forEach((seccion) => {
		parts.push({
			title: seccion.titulo,
			fields: seccion.campos.map((c) => ({ label: c.label, value: c.valor })),
		});
	});

	await exportToPDF({
		title: 'Historia Clínica de Ingreso',
		parts,
		fileName: `HC_Ingreso_${data.NumeroVisita}_${Date.now()}.pdf`,
		orientation: 'portrait',
		empresaInfo,
		patientInfo: {
			numeroVisita: data.NumeroVisita,
			nombre: pacienteNombre,
			numeroDocumento: pacienteDNI,
		},
		profesionalInfo: profesional,
	});
};
