import type { EmpresaInfo } from '../services/empresaService';
import type { ControlFrecuente } from '../types/controlesFrecuentes';
import type { ProfesionalFirmaInfo } from './pdfExport';
import { cleanPdfValue, type PDFHeaderPatient } from './pdfHeader';
import { columnaHora, generarPDFTablaDiaria, lineasProfesional, type ColumnaTabla } from './pdfTablaDiaria';

export type PDFControlesOptions = {
	items: ControlFrecuente[];
	empresaInfo?: EmpresaInfo | null;
	patient?: PDFHeaderPatient | null;
	fileName?: string;
};

const num = (v: unknown, dec = 0) => {
	const n = Number(v);
	return Number.isFinite(n) && n > 0 ? n.toFixed(dec) : '';
};

function profesionalDe(c: ControlFrecuente): ProfesionalFirmaInfo | null {
	const nombre =
		cleanPdfValue(`${c.ProfesionalApellido || ''} ${c.ProfesionalNombres || ''}`) ||
		cleanPdfValue(`${c.OperadorApellido || ''} ${c.OperadorNombres || ''}`);
	if (!nombre) return null;
	return {
		nombre,
		matricula: c.MatriculaProfesional ?? c.Matricula ?? undefined,
		idPersonal: c.ValorPersonalProfesional ?? undefined,
	};
}

const PA = { grupo: 'PRESIÓN ARTERIAL', grupoCorto: 'P. ARTERIAL' };
const TEMP = { grupo: 'TEMPERATURA', grupoCorto: 'TEMP.' };

const COLUMNAS: ColumnaTabla<ControlFrecuente>[] = [
	columnaHora((c) => c.HoraControl),
	{ key: 'pulso', label: 'PULSO', w: 13, align: 'center', celda: (c) => num(c.Pulso) },
	{ key: 'max', label: 'MÁX.', w: 14, align: 'center', ...PA, celda: (c) => num(c.Maximo) },
	{ key: 'min', label: 'MÍN.', w: 14, align: 'center', ...PA, celda: (c) => num(c.Minimo) },
	{ key: 'fr', label: 'FR', w: 10, align: 'center', celda: (c) => num(c.FrecuenciaRespiratoria) },
	{ key: 'axilar', label: 'AXILAR', w: 15, align: 'center', ...TEMP, celda: (c) => num(c.Axilar, 1) },
	{ key: 'rectal', label: 'RECTAL', w: 15, align: 'center', ...TEMP, opcional: true, celda: (c) => num(c.Rectal, 1) },
	{ key: 'sat', label: 'SAT. %', w: 13, align: 'center', opcional: true, celda: (c) => num(c.Saturometria) },
	{ key: 'hgt', label: 'HGT', w: 18, align: 'center', celda: (c) => (cleanPdfValue(c.Hgt) === '0' ? '' : cleanPdfValue(c.Hgt)) },
	{ key: 'peso', label: 'PESO', w: 12, align: 'center', opcional: true, celda: (c) => num(c.Peso, 1) },
	{ key: 'talla', label: 'TALLA', w: 12, align: 'center', opcional: true, celda: (c) => num(c.Talla) },
	{ key: 'profesional', label: 'PROFESIONAL', w: 0, celda: (c) => lineasProfesional(profesionalDe(c)) },
];

/** Controles frecuentes / signos vitales (imInterCtrlFrecuente). */
export function generarPDFControles({ items, empresaInfo, patient, fileName }: PDFControlesOptions) {
	return generarPDFTablaDiaria({
		titulo: 'Controles frecuentes',
		items,
		columnas: COLUMNAS,
		fecha: (c) => c.FechaControl,
		hora: (c) => c.HoraControl,
		unidad: ['control', 'controles'],
		vacio: 'No hay controles registrados en el período seleccionado.',
		profesionales: (c) => [profesionalDe(c)],
		nota: (c) => ({ etiqueta: 'OBS.', texto: cleanPdfValue(c.Observaciones) }),
		notaHasta: 'profesional',
		empresaInfo,
		patient,
		fileName: fileName || `Controles_${cleanPdfValue(patient?.numeroVisita) || 'paciente'}_${Date.now()}.pdf`,
	});
}
