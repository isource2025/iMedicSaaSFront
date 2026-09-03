import type { EstadoFilaLiquidacion, FilaLiquidacion } from '@/app/services/liquidacionImportService';
import ui from '../../profile/profile.module.css';

export const ETIQUETA_ESTADO: Record<EstadoFilaLiquidacion, string> = {
	APLICADO: 'Coincide',
	SIN_CAMBIO: 'Ya estaba',
	AMBIGUA: 'Ambigua',
	SIN_MATCH: 'Sin coincidencia',
	DUPLICADA_EXCEL: 'Repetida',
};

export type FilaTablaLiquidacion = {
	key: string;
	profesional: string | null;
	matricula: number | null;
	numeroVisita: number | null;
	codigo: string | null;
	idPrestacion: number | null;
	importeFinal: number | null;
	importeAnterior: number | null;
	importeNuevo: number | null;
	estado: string;
};

export function formatImporte(n: number | null | undefined) {
	if (n == null || Number.isNaN(Number(n))) return '—';
	return Number(n).toLocaleString('es-AR', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
}

export function formatFechaHora(valor: string | null | undefined) {
	if (!valor) return '—';
	const d = new Date(valor);
	if (Number.isNaN(d.getTime())) return String(valor);
	return d.toLocaleString('es-AR', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
}

export function claseEstadoFila(estado: string) {
	const e = String(estado || '').toUpperCase();
	if (e === 'APLICADO') return ui.amountStrong;
	if (e === 'SIN_CAMBIO' || e === 'REVERTIDO' || e === 'AMBIGUA' || e === 'DUPLICADA_EXCEL') {
		return ui.badgePending;
	}
	return ui.badgeNoFact;
}

export function etiquetaEstadoFila(estado: string) {
	const e = String(estado || '').toUpperCase() as EstadoFilaLiquidacion | 'REVERTIDO';
	if (e === 'REVERTIDO') return 'Revertida';
	return ETIQUETA_ESTADO[e as EstadoFilaLiquidacion] || estado;
}

export function filaDesdePreview(f: FilaLiquidacion): FilaTablaLiquidacion {
	return {
		key: `${f.fila}-${f.idPrestacion ?? 'sin'}`,
		profesional: f.profesional,
		matricula: f.matricula,
		numeroVisita: f.numeroVisita,
		codigo: f.codigo,
		idPrestacion: f.idPrestacion,
		importeFinal: f.importeFinal,
		importeAnterior: f.importeAnterior,
		importeNuevo: f.importeExcel,
		estado: f.estado,
	};
}
