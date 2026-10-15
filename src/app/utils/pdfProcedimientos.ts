import type { EmpresaInfo } from '../services/empresaService';
import type { FacPracticaVisita } from '../types/procedimientos';
import { cleanPdfValue, type PDFHeaderPatient } from './pdfHeader';
import { columnaHora, generarPDFTablaDiaria, PDF_TABLA_FONT, type ColumnaTabla } from './pdfTablaDiaria';

export type PDFProcedimientosOptions = {
	items: FacPracticaVisita[];
	empresaInfo?: EmpresaInfo | null;
	patient?: PDFHeaderPatient | null;
	fileName?: string;
};

const COLUMNAS: ColumnaTabla<FacPracticaVisita>[] = [
	{ ...columnaHora((e) => e.HoraPracticaInicio, (e) => e.HoraPracticaFin), opcional: true },
	{
		key: 'codigo',
		label: 'CÓDIGO',
		w: 17,
		tono: 'muted',
		tamano: PDF_TABLA_FONT - 0.8,
		celda: (e) => cleanPdfValue(e.Practica),
	},
	{
		key: 'practica',
		label: 'PRÁCTICA',
		w: 0,
		fuente: 'bold',
		tono: 'ink',
		celda: (e) => cleanPdfValue(e.PracticaDescripcion) || cleanPdfValue(e.Practica),
	},
	{
		key: 'cantidad',
		label: 'CANT.',
		w: 12,
		celda: (e) => {
			const n = Number(e.CantidadPractica);
			return Number.isFinite(n) && n > 0 ? String(n) : '';
		},
	},
	{
		key: 'sector',
		label: 'SECTOR',
		w: 36,
		celda: (e) => cleanPdfValue(e.SectorDescripcion) || cleanPdfValue(e.ValorSector),
	},
];

/** Procedimientos (imFacPracticas); los profesionales de cada práctica van bajo la fila. */
export function generarPDFProcedimientos({ items, empresaInfo, patient, fileName }: PDFProcedimientosOptions) {
	return generarPDFTablaDiaria({
		titulo: 'Procedimientos',
		items,
		columnas: COLUMNAS,
		fecha: (e) => e.FechaPractica,
		hora: (e) => e.HoraPracticaInicio,
		unidad: ['práctica', 'prácticas'],
		vacio: 'No hay procedimientos registrados en el período seleccionado.',
		profesionales: (e) =>
			(e.Firmantes ?? []).map((f) => ({ nombre: f.nombre, matricula: f.matricula, idPersonal: f.valor })),
		nota: (e) => ({ texto: cleanPdfValue(e.Profesionales) }),
		notaDesde: 'codigo',
		notaHasta: 'sector',
		empresaInfo,
		patient,
		fileName: fileName || `Procedimientos_${cleanPdfValue(patient?.numeroVisita) || 'paciente'}_${Date.now()}.pdf`,
	});
}
