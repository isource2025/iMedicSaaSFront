import type { EmpresaInfo } from '../services/empresaService';
import type { MedicacionControl } from '../types/medicacionControl';
import type { ProfesionalFirmaInfo } from './pdfExport';
import { cleanPdfValue, type PDFHeaderPatient } from './pdfHeader';
import { columnaHora, generarPDFTablaDiaria, lineasProfesional, PDF_TABLA_FONT, type ColumnaTabla } from './pdfTablaDiaria';

export type PDFMedicacionOptions = {
	items: MedicacionControl[];
	empresaInfo?: EmpresaInfo | null;
	patient?: PDFHeaderPatient | null;
	fileName?: string;
};

function cantidad(m: MedicacionControl): string {
	const n = Number(m.CantidadIndicada) > 0 ? Number(m.CantidadIndicada) : Number(m.Cantidad);
	if (!Number.isFinite(n) || n <= 0) return '';
	return [String(n), cleanPdfValue(m.TipoUnidad)].filter(Boolean).join(' ');
}

function profesionalDe(m: MedicacionControl): ProfesionalFirmaInfo | null {
	const nombre = cleanPdfValue(m.ProfesionalFullName) || cleanPdfValue(m.OperadorFullName);
	if (!nombre) return null;
	return {
		nombre,
		matricula: m.MatriculaProfesional ?? m.Matricula ?? undefined,
		idPersonal: m.ValorPersonalProfesional ?? undefined,
	};
}

const nombreMedicamento = (m: MedicacionControl) =>
	cleanPdfValue(m.NombreMedicamento) || cleanPdfValue(m.DescripcionMedicamento) || cleanPdfValue(m.Troquel);

const COLUMNAS: ColumnaTabla<MedicacionControl>[] = [
	columnaHora((m) => m.HoraControl),
	{
		key: 'medicamento',
		label: 'MEDICAMENTO',
		w: 0,
		fuente: 'bold',
		tono: 'ink',
		celda: (m) => [
			{ texto: nombreMedicamento(m) || '-' },
			...(m.adicionales ?? []).map((a) => ({
				texto: `+ ${[nombreMedicamento(a), cantidad(a)].filter(Boolean).join('  ')}`,
				fuente: 'normal' as const,
				tono: 'muted' as const,
				tamano: PDF_TABLA_FONT - 0.6,
			})),
		],
	},
	{ key: 'cantidad', label: 'CANT.', w: 13, celda: cantidad },
	{ key: 'sector', label: 'SECTOR', w: 16, celda: (m) => cleanPdfValue(m.Sector) },
	{ key: 'profesional', label: 'CONTROLA / APLICA', w: 47, celda: (m) => lineasProfesional(profesionalDe(m)) },
	{ key: 'observaciones', label: 'OBSERVACIONES', w: 38, celda: (m) => cleanPdfValue(m.Observaciones) },
];

/** Medicamentos suministrados (imInterCtrlMedicamento). */
export function generarPDFMedicacion({ items, empresaInfo, patient, fileName }: PDFMedicacionOptions) {
	return generarPDFTablaDiaria({
		titulo: 'Medicamentos suministrados',
		items,
		columnas: COLUMNAS,
		fecha: (m) => m.FechaControl,
		hora: (m) => m.HoraControl,
		unidad: ['medicamento', 'medicamentos'],
		vacio: 'No hay medicación suministrada en el período seleccionado.',
		profesionales: (m) => [profesionalDe(m)],
		empresaInfo,
		patient,
		fileName: fileName || `Medicacion_${cleanPdfValue(patient?.numeroVisita) || 'paciente'}_${Date.now()}.pdf`,
	});
}
