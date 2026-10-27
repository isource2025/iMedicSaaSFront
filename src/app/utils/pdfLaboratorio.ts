import type { EmpresaInfo } from '../services/empresaService';
import { laboratoriosService } from '../services/laboratoriosService';
import type { ExamenLabCompleto, ExamenLabDetalle } from '../types/laboratorios';
import { cleanPdfValue, type PDFHeaderPatient } from './pdfHeader';
import { generarPDFTablaDiaria, PDF_TABLA_FONT, type ColumnaTabla } from './pdfTablaDiaria';

export type PDFLaboratorioOptions = {
	items: ExamenLabCompleto[];
	empresaInfo?: EmpresaInfo | null;
	patient?: PDFHeaderPatient | null;
	fileName?: string;
};

/** Una fila por parámetro; el estudio se rotula solo en su primer parámetro. */
type FilaLab = { examen: ExamenLabCompleto; detalle: ExamenLabDetalle | null; primera: boolean };

const fechaDe = (e: ExamenLabCompleto) => cleanPdfValue(e.FechaExamen).slice(0, 10);

function referencia(d: ExamenLabDetalle): string {
	const ref = cleanPdfValue(d.ValorReferencia);
	if (ref) return ref;
	return d.ValorMinimo != null && d.ValorMaximo != null ? `${d.ValorMinimo} - ${d.ValorMaximo}` : '';
}

const COLUMNAS: ColumnaTabla<FilaLab>[] = [
	{
		key: 'estudio',
		label: 'ESTUDIO',
		w: 36,
		celda: ({ examen, primera }) =>
			primera
				? [
						{ texto: cleanPdfValue(laboratoriosService.getTipoEstudioNombre(examen.TipoEstudio)) || 'Laboratorio', fuente: 'bold', tono: 'ink' },
						...(cleanPdfValue(examen.Protocolo)
							? [{ texto: `Prot. ${cleanPdfValue(examen.Protocolo)}`, tono: 'muted' as const, tamano: PDF_TABLA_FONT - 0.8 }]
							: []),
					]
				: [{ texto: '' }],
	},
	{ key: 'parametro', label: 'PARÁMETRO', w: 0, celda: ({ detalle }) => cleanPdfValue(detalle?.NombreParametro) },
	{
		key: 'resultado',
		label: 'RESULTADO',
		w: 26,
		celda: ({ detalle }) =>
			detalle
				? [{ texto: cleanPdfValue(detalle.Resultado) || '-', fuente: detalle.FueraDeRango ? 'bold' : 'normal', tono: 'ink' }]
				: '',
	},
	{ key: 'unidad', label: 'UNIDAD', w: 20, celda: ({ detalle }) => cleanPdfValue(detalle?.UnidadMedida) },
	{ key: 'referencia', label: 'REFERENCIA', w: 34, celda: ({ detalle }) => (detalle ? referencia(detalle) : '') },
	{
		key: 'estado',
		label: 'ESTADO',
		w: 24,
		tamano: PDF_TABLA_FONT - 0.6,
		celda: ({ detalle }) =>
			detalle ? [{ texto: detalle.FueraDeRango ? 'Fuera de rango' : 'Normal', tono: detalle.FueraDeRango ? 'ink' : 'muted', fuente: detalle.FueraDeRango ? 'bold' : 'normal' }] : '',
	},
];

/** Resultados de laboratorio (imHCExamenesLab*): por día, un renglón por parámetro. */
export function generarPDFLaboratorio({ items, empresaInfo, patient, fileName }: PDFLaboratorioOptions) {
	const filas = items.flatMap((examen): FilaLab[] => {
		const detalles = (examen.detalles ?? []).filter(Boolean);
		if (!detalles.length) return [{ examen, detalle: null, primera: true }];
		return detalles.map((detalle, i) => ({ examen, detalle, primera: i === 0 }));
	});
	return generarPDFTablaDiaria({
		titulo: 'Resultados de laboratorio',
		items: filas,
		columnas: COLUMNAS,
		fecha: (f) => fechaDe(f.examen),
		hora: (f) => f.examen.HoraExamen,
		unidad: ['parámetro', 'parámetros'],
		vacio: 'No hay estudios de laboratorio en el período seleccionado.',
		profesionales: () => [],
		empresaInfo,
		patient,
		fileName: fileName || `Laboratorio_${cleanPdfValue(patient?.numeroVisita) || 'paciente'}_${Date.now()}.pdf`,
	});
}
