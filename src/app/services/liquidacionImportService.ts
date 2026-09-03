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

export interface ImportacionDetalleFila {
	FilaExcel: number | null;
	IdPrestacion: number | null;
	IdDetalleExcel: number | null;
	Matricula: number | null;
	NumeroVisita: number | null;
	ImporteExcel: number | null;
	IdDetalle: number | null;
	TipoPrestacion: string | null;
	ImporteAnterior: number | null;
	ImporteNuevo: number | null;
	Estado: string;
	Detalle: string | null;
	profesional?: string | null;
	codigo?: string | null;
	importeFinal?: number | null;
}

export interface ImportacionDetalle extends ImportacionResumen {
	detalle: ImportacionDetalleFila[];
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
			{ ...configMultipart, timeout: 60000 },
		);
		return res.data.data;
	},

	async aplicar(
		file: File,
		opts: { confirmarParcial?: boolean; nombreArchivo?: string } = {},
	): Promise<PreviewLiquidacion> {
		const fd = new FormData();
		fd.append('archivo', file);
		if (opts.confirmarParcial) fd.append('confirmarParcial', 'true');
		if (opts.nombreArchivo?.trim()) fd.append('nombreArchivo', opts.nombreArchivo.trim());
		const res = await apiService.post<{ success: boolean; data: PreviewLiquidacion }>(
			'/liquidaciones/importe-liquidado/aplicar',
			fd,
			{ ...configMultipart, timeout: 120000 },
		);
		return res.data.data;
	},

	async listarImportaciones(query?: {
		limite?: number;
		desde?: string;
		hasta?: string;
	}): Promise<ImportacionResumen[]> {
		const params: Record<string, string | number> = { limite: query?.limite ?? 200 };
		if (query?.desde) params.desde = query.desde;
		if (query?.hasta) params.hasta = query.hasta;
		const res = await apiService.get<{ success: boolean; data: ImportacionResumen[] }>(
			'/liquidaciones/importaciones',
			{ params },
		);
		return res.data.data || [];
	},

	async obtenerImportacion(idImport: number): Promise<ImportacionDetalle> {
		const res = await apiService.get<{ success: boolean; data: ImportacionDetalle }>(
			`/liquidaciones/importaciones/${idImport}`,
		);
		return res.data.data;
	},

	async renombrar(
		idImport: number,
		archivo: string,
	): Promise<{ IdImport: number; Archivo: string }> {
		const res = await apiService.patch<{
			success: boolean;
			data: { IdImport: number; Archivo: string };
		}>(`/liquidaciones/importaciones/${idImport}`, { archivo });
		return res.data.data;
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
