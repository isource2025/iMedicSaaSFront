import {
	clasificarEstadoMovimiento,
	diagnosticoTexto,
	disposicionTexto,
	etiquetaCama,
	etiquetaSector,
	fechaHoraEgreso,
	nombreOperador,
	ordenarMovimientos,
	rangoMovimiento,
	type MovimientoRowLike,
} from '../components/beds/movimientos/movimientosDisplay';
import type { EmpresaInfo } from '../services/empresaService';
import { horaMostrada } from './dateUtils';
import { cleanPdfValue, type PDFHeaderPatient } from './pdfHeader';
import { columnaHora, generarPDFTablaDiaria, type ColumnaTabla } from './pdfTablaDiaria';

export type PDFMovimientosOptions = {
	items: MovimientoRowLike[];
	/** Valor → descripción de imDisposicionEgreso (ver `catalogoDisposiciones`). */
	disposiciones?: Map<number, string>;
	empresaInfo?: EmpresaInfo | null;
	patient?: PDFHeaderPatient | null;
	fileName?: string;
};

const sinGuion = (v: string) => (v === '—' ? '' : v);

const horaIngreso = (m: MovimientoRowLike) =>
	sinGuion(horaMostrada((m.HoraAdmisionISO as string) || (m.HoraAdmision as string | number) || null));

/** Movimientos de cama de la visita: un renglón por ingreso a cama, agrupado por día de ingreso. */
export function generarPDFMovimientos({ items, disposiciones, empresaInfo, patient, fileName }: PDFMovimientosOptions) {
	const ordenados = ordenarMovimientos(items);
	const filas = ordenados.map((m, idx) => ({ ...m, EstadoUi: clasificarEstadoMovimiento(m, idx, ordenados) }));
	const catalogo = disposiciones ?? new Map<number, string>();

	const columnas: ColumnaTabla<MovimientoRowLike>[] = [
		columnaHora(horaIngreso),
		{ key: 'estado', label: 'ESTADO', w: 20, fuente: 'bold', tono: 'ink', celda: (m) => cleanPdfValue(m.EstadoUi as string) },
		{ key: 'cama', label: 'CAMA', w: 22, celda: (m) => sinGuion(etiquetaCama(m)) },
		{ key: 'sector', label: 'SECTOR', w: 0, celda: (m) => sinGuion(etiquetaSector(m)) },
		{ key: 'egreso', label: 'EGRESO', w: 28, celda: (m) => sinGuion(fechaHoraEgreso(m)) || 'En curso' },
		{ key: 'disposicion', label: 'DISPOSICIÓN', w: 30, opcional: true, celda: (m) => sinGuion(disposicionTexto(m, catalogo)) },
		{ key: 'operador', label: 'OPERADOR', w: 36, celda: (m) => sinGuion(nombreOperador(m)) },
	];

	return generarPDFTablaDiaria({
		titulo: 'Movimientos / Traslados',
		items: filas,
		columnas,
		fecha: (m) => rangoMovimiento(m)[0],
		hora: horaIngreso,
		unidad: ['movimiento', 'movimientos'],
		vacio: 'No hay movimientos registrados en el período seleccionado.',
		profesionales: () => [],
		nota: (m) => {
			const dx = sinGuion(diagnosticoTexto(m));
			return dx ? { etiqueta: 'DIAG.', texto: dx } : null;
		},
		notaDesde: 'estado',
		empresaInfo,
		patient,
		fileName: fileName || `Movimientos_${cleanPdfValue(patient?.numeroVisita) || 'paciente'}_${Date.now()}.pdf`,
	});
}
