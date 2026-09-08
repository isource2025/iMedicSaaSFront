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
		fotoPerfil?: PersonalFotoResponse;
	};
}

export interface PersonalFotoResponse {
	hasFirma: boolean;
	mime?: string;
	dataUrl?: string;
}

export interface ProduccionFila {
	id: number;
	idMatch?: string | null;
	valorizada?: boolean;
	fecha: string | null;
	codigoPractica: string;
	descripcionPractica: string;
	funcionDescripcion?: string;
	cantidad: number;
	numeroVisita?: string;
	dniPaciente: string;
	nombrePaciente: string;
	cobertura: string;
	porcentajeFacturado: number;
	importeUnitario: number;
	total: number;
	/** Importe que la obra social liquidó, del último Excel importado. null = sin liquidar. */
	liquidado?: number | null;
	noFacturable?: boolean;
	nroRendicion?: number | null;
}

export interface ProduccionPeriodo {
	desdeCalendario: string;
	hastaCalendario: string;
	fechaClarionDesde: number;
	fechaClarionHasta: number;
}

export interface ProduccionMesResponse {
	success: boolean;
	data: {
		periodo: ProduccionPeriodo;
		filtros?: { idConvenios: number[] };
		matricula: number | null;
		mensaje?: string;
		registros: ProduccionFila[];
		totales: {
			lineas: number;
			total: number;
			cantidad: number;
		};
	};
}

export type ProduccionMesQuery = {
	desde?: string;
	hasta?: string;
};

export const miPerfilService = {
	async obtenerPerfil(): Promise<MiPerfilResponse> {
		const res = await apiService.get<MiPerfilResponse>('/mi-perfil');
		return res.data;
	},

	async obtenerFotoPerfil(): Promise<{ success: boolean; data: PersonalFotoResponse }> {
		const res = await apiService.get<{ success: boolean; data: PersonalFotoResponse }>('/mi-perfil/foto');
		return res.data;
	},

	async obtenerProduccionMes(query?: ProduccionMesQuery): Promise<ProduccionMesResponse> {
		const params: Record<string, string> = {};
		if (query?.desde) params.desde = query.desde;
		if (query?.hasta) params.hasta = query.hasta;
		const res = await apiService.get<ProduccionMesResponse>('/mi-perfil/produccion-mes', {
			params: Object.keys(params).length ? params : undefined,
		});
		return res.data;
	},
};
