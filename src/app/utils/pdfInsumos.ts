import type { InsumoRow } from '../components/beds/insumos/InsumosTable';
import type { EmpresaInfo } from '../services/empresaService';
import type { ProfesionalFirmaInfo } from './pdfExport';
import { cleanPdfValue, type PDFHeaderPatient } from './pdfHeader';
import { columnaHora, generarPDFTablaDiaria, lineasProfesional, type ColumnaTabla } from './pdfTablaDiaria';

export type PDFInsumosOptions = {
	items: InsumoRow[];
	empresaInfo?: EmpresaInfo | null;
	patient?: PDFHeaderPatient | null;
	fileName?: string;
};

function profesionalDe(r: InsumoRow): ProfesionalFirmaInfo | null {
	const nombre = cleanPdfValue(r.fullName);
	if (!nombre) return null;
	return { nombre, matricula: r.matricula ?? undefined, idPersonal: r.idPersonal ?? undefined };
}

const COLUMNAS: ColumnaTabla<InsumoRow>[] = [
	columnaHora((r) => r.horaCarga),
	{
		key: 'insumo',
		label: 'INSUMO',
		w: 0,
		fuente: 'bold',
		tono: 'ink',
		celda: (r) => cleanPdfValue(r.descripcion) || cleanPdfValue(r.medicamento),
	},
	{
		key: 'cantidad',
		label: 'CANT.',
		w: 14,
		celda: (r) => {
			const n = Number(r.cantidad);
			return Number.isFinite(n) && n > 0 ? String(n) : '';
		},
	},
	{ key: 'observaciones', label: 'OBSERVACIONES', w: 52, celda: (r) => cleanPdfValue(r.observaciones) },
	{ key: 'profesional', label: 'CARGÓ', w: 46, celda: (r) => lineasProfesional(profesionalDe(r)) },
];

/** Insumos indicados (imInterIndMedicas, tipo 9). */
export function generarPDFInsumos({ items, empresaInfo, patient, fileName }: PDFInsumosOptions) {
	return generarPDFTablaDiaria({
		titulo: 'Insumos',
		items,
		columnas: COLUMNAS,
		fecha: (r) => r.vigenteDesde,
		hora: (r) => r.horaCarga,
		unidad: ['insumo', 'insumos'],
		vacio: 'No hay insumos registrados en el período seleccionado.',
		profesionales: (r) => [profesionalDe(r)],
		empresaInfo,
		patient,
		fileName: fileName || `Insumos_${cleanPdfValue(patient?.numeroVisita) || 'paciente'}_${Date.now()}.pdf`,
	});
}
