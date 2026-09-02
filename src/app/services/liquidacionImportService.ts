import { apiService } from './axios';

/**
 * Importación del Excel de liquidación de honorarios.
 *
 * El archivo se sube dos veces a propósito: primero a `preview`, que no escribe
 * nada y devuelve fila por fila qué va a pasar, y después a `aplicar`. Así el
 * servidor no guarda estado entre los dos pasos.
 */

export type EstadoFilaLiquidacion =
	| 'APLICADO'
	| 'SIN_CAMBIO'
	| 'AMBIGUA'
	| 'SIN_MATCH'
	| 'DUPLICADA_EXCEL';

export interface FilaLiquidacion {
	/** Número de fila tal como se ve en el Excel. */
	fila: number;
	idPrestacion: number | null;
	importeExcel: number | null;
	matricula: number | null;
	numeroVisita: number | null;
	idDetalleExcel: number | null;
	cantidad: number | null;
	codigo: string | null;
	profesional: string | null;
	/** imFacDetalle.IDDETALLE elegido, null si no se pudo resolver. */
	idDetalle: number | null;
	tipoPrestacion: string | null;
	importeFinal: number | null;
	importeAnterior: number | null;
	importeNuevo: number | null;
	coincideImporte: boolean | null;
	coincideMatricula: boolean | null;
	coincideVisita: boolean | null;
	estado: EstadoFilaLiquidacion;
	detalle: string | null;
}

export interface ResumenLiquidacion {
	filas: number;
	aplicables: number;
	sinCambio: number;
	ambiguas: number;
	sinMatch: number;
	duplicadas: number;
	rechazadas: number;
	importeArchivo: number;
	importeAplicable: number;
	importeDistintoAlFacturado: number;
}

export interface ImportacionResumen {
	IdImport: number;
	Archivo: string;
	Hoja?: string | null;
	FechaHora: string;
	Usuario: string | null;
	IdOperador?: number | null;
	FilasArchivo: number;
	FilasAplicadas: number;
	FilasRechazadas: number;
	ImporteAplicado: number;
	Estado: 'APLICADO' | 'REVERTIDO';
}

export interface PreviewLiquidacion {
	archivo: string;
	hoja: string;
	filaEncabezado: number;
	columnasDetectadas: string[];
	filas: FilaLiquidacion[];
	resumen: ResumenLiquidacion;
	hash: string;
	importacionPrevia: ImportacionResumen | null;
	aplicado: {
		idImport: number;
		filasAplicadas: number;
		filasRechazadas: number;
		importeAplicado: number;
	} | null;
}

/** El navegador tiene que poner el boundary del multipart, no axios. */
const configMultipart = {
	transformRequest: [
		(data: unknown, headers: Record<string, string>) => {
			if (data instanceof FormData) delete headers['Content-Type'];
			return data;
		},
	],
};

export const liquidacionImportService = {
	async previsualizar(file: File): Promise<PreviewLiquidacion> {
		const fd = new FormData();
		fd.append('archivo', file);
		const res = await apiService.post<{ success: boolean; data: PreviewLiquidacion }>(
			'/liquidaciones/importe-liquidado/preview',
			fd,
			configMultipart,
		);
		return res.data.data;
	},

	async aplicar(file: File, confirmarParcial = false): Promise<PreviewLiquidacion> {
		const fd = new FormData();
		fd.append('archivo', file);
		if (confirmarParcial) fd.append('confirmarParcial', 'true');
		const res = await apiService.post<{ success: boolean; data: PreviewLiquidacion }>(
			'/liquidaciones/importe-liquidado/aplicar',
			fd,
			configMultipart,
		);
		return res.data.data;
	},

	async listarImportaciones(limite = 20): Promise<ImportacionResumen[]> {
		const res = await apiService.get<{ success: boolean; data: ImportacionResumen[] }>(
			'/liquidaciones/importaciones',
			{ params: { limite } },
		);
		return res.data.data || [];
	},

	async revertir(
		idImport: number,
	): Promise<{ idImport: number; revertidas: number; omitidas: number }> {
		const res = await apiService.post<{
			success: boolean;
			data: { idImport: number; revertidas: number; omitidas: number };
		}>(`/liquidaciones/importaciones/${idImport}/revertir`);
		return res.data.data;
	},
};
