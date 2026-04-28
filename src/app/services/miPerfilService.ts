import { apiService } from './axios';

export interface MiPerfilResumenOperador {
	ValorPersonal: number;
	CodOperador: number;
	NombreRed: string;
	Nombres: string;
	Apellido: string;
	Matricula: number | null;
	MatriculaNacional: number | null;
	ApellidoNombrePersonal: string;
}

export interface MiPerfilResponse {
	success: boolean;
	data: {
		valorPersonal: number;
		resumenOperador: MiPerfilResumenOperador | null;
		personal: Record<string, unknown> | null;
	};
}

export interface LineaValorizacion {
	id: number;
	fecha: string | null;
	idConvenio: number | null;
	obraSocial: string;
	numeroVisita: number;
	descripcionPrestacion: string;
	cantidad: number;
	porcentaje: number;
	importeFinal: number;
	idPracticaCabecera: number | null;
	factura: number | null;
	idFactura: number | null;
}

export interface ProduccionPeriodo {
	desdeCalendario: string;
	hastaCalendario: string;
	fechaClarionDesde: number;
	fechaClarionHasta: number;
}

export interface ConvenioProduccionOption {
	idConvenio: number;
	obraSocial: string;
}

export interface ProduccionMesResponse {
	success: boolean;
	data: {
		periodo: ProduccionPeriodo;
		filtros?: { idConvenios: number[] };
		matricula: number | null;
		mensaje?: string;
		valorizacion: LineaValorizacion[];
		totales: {
			lineas: number;
			importeFinal: number;
			cantidadSumada: number;
		};
		practicasCabecera: Record<string, unknown>[];
	};
}

export interface ConveniosProduccionResponse {
	success: boolean;
	data: {
		periodo: ProduccionPeriodo;
		convenios: ConvenioProduccionOption[];
	};
}

export type ProduccionMesQuery = {
	desde?: string;
	hasta?: string;
	/** CSV de IDs numéricos; -1 = sin convenio */
	idConvenio?: string;
};

export const miPerfilService = {
	async obtenerPerfil(): Promise<MiPerfilResponse> {
		const res = await apiService.get<MiPerfilResponse>('/mi-perfil');
		return res.data;
	},

	async listarConveniosProduccion(params: {
		desde: string;
		hasta: string;
	}): Promise<ConveniosProduccionResponse> {
		const res = await apiService.get<ConveniosProduccionResponse>('/mi-perfil/produccion-mes/convenios', {
			params: { desde: params.desde, hasta: params.hasta },
		});
		return res.data;
	},

	async obtenerProduccionMes(query?: ProduccionMesQuery): Promise<ProduccionMesResponse> {
		const params: Record<string, string> = {};
		if (query?.desde) params.desde = query.desde;
		if (query?.hasta) params.hasta = query.hasta;
		if (query?.idConvenio) params.idConvenio = query.idConvenio;
		const res = await apiService.get<ProduccionMesResponse>('/mi-perfil/produccion-mes', {
			params: Object.keys(params).length ? params : undefined,
		});
		return res.data;
	},
};
