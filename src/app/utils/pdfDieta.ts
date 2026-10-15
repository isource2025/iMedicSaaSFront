import type { EmpresaInfo } from '../services/empresaService';
import type { DietaControl } from '../types/dietaControl';
import type { ProfesionalFirmaInfo } from './pdfExport';
import { cleanPdfValue, type PDFHeaderPatient } from './pdfHeader';
import {
	columnaHora,
	fechaCorta,
	generarPDFTablaDiaria,
	horaCorta,
	lineasProfesional,
	PDF_TABLA_FONT,
	type ColumnaTabla,
} from './pdfTablaDiaria';

export type PDFDietaOptions = {
	items: DietaControl[];
	empresaInfo?: EmpresaInfo | null;
	patient?: PDFHeaderPatient | null;
	fileName?: string;
};

/** Las filas que genera la indicación no traen fecha de dieta: se ubican por la de carga. */
const fecha = (d: DietaControl) => d.FechaDieta || d.FechaCarga;
const hora = (d: DietaControl) => d.HoraDieta || d.HoraCarga;

function profesionalDe(d: DietaControl): ProfesionalFirmaInfo | null {
	const nombre = cleanPdfValue(d.ProfesionalFullName) || cleanPdfValue(d.OperadorFullName);
	if (!nombre) return null;
	return { nombre, matricula: d.Matricula ?? undefined, idPersonal: d.ValorPersonalProfesional ?? undefined };
}

const COLUMNAS: ColumnaTabla<DietaControl>[] = [
	columnaHora(hora),
	{
		key: 'dieta',
		label: 'TIPO DE DIETA',
		w: 0,
		fuente: 'bold',
		tono: 'ink',
		celda: (d) => [
			{ texto: cleanPdfValue(d.DescripcionDieta) || '-' },
			...(d.NroIndicacion
				? [{ texto: `Indicación #${d.NroIndicacion}`, fuente: 'normal' as const, tono: 'muted' as const, tamano: PDF_TABLA_FONT - 0.8 }]
				: []),
		],
	},
	{
		key: 'estado',
		label: 'ESTADO',
		w: 20,
		tamano: PDF_TABLA_FONT - 0.6,
		celda: (d) => (d.FechaDieta ? 'Suministrada' : 'Indicada'),
	},
	{
		key: 'carga',
		label: 'CARGA',
		w: 21,
		celda: (d) => [
			{ texto: fechaCorta(d.FechaCarga) || '-' },
			...(horaCorta(d.HoraCarga) ? [{ texto: horaCorta(d.HoraCarga), tono: 'muted' as const }] : []),
		],
	},
	{ key: 'profesional', label: 'PROFESIONAL', w: 44, celda: (d) => lineasProfesional(profesionalDe(d)) },
	{ key: 'observaciones', label: 'OBSERVACIONES', w: 46, celda: (d) => cleanPdfValue(d.Observaciones) },
];

/** Dietas del paciente (imInterCtrlDieta). */
export function generarPDFDieta({ items, empresaInfo, patient, fileName }: PDFDietaOptions) {
	return generarPDFTablaDiaria({
		titulo: 'Dietas del paciente',
		items,
		columnas: COLUMNAS,
		fecha,
		hora,
		unidad: ['dieta', 'dietas'],
		vacio: 'No hay dietas registradas en el período seleccionado.',
		profesionales: (d) => [profesionalDe(d)],
		empresaInfo,
		patient,
		fileName: fileName || `Dietas_${cleanPdfValue(patient?.numeroVisita) || 'paciente'}_${Date.now()}.pdf`,
	});
}
