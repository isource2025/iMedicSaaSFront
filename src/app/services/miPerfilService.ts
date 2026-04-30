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
	hora?: string | null;
	codigoPractica: string;
	descripcionPractica: string;
	cantidad: number;
	dniPaciente: string;
	nombrePaciente: string;
	cobertura: string;
	porcentajeFacturado: number;
	importeUnitario: number;
	total: number;
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
		registros: ProduccionFila[];
		totales: {
			lineas: number;
			total: number;
			cantidad: number;
		};
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

	async actualizarPerfil(payload: Record<string, unknown>): Promise<MiPerfilResponse> {
		const res = await apiService.put<MiPerfilResponse>('/mi-perfil', payload);
		return res.data;
	},

	async obtenerFotoPerfil(): Promise<{ success: boolean; data: PersonalFotoResponse }> {
		const res = await apiService.get<{ success: boolean; data: PersonalFotoResponse }>('/mi-perfil/foto');
		return res.data;
	},

	async actualizarFotoPerfil(file: File): Promise<{ success: boolean; mensaje?: string }> {
		const fd = new FormData();
		fd.append('archivo', file);
		const res = await apiService.put<{ success: boolean; mensaje?: string }>('/mi-perfil/foto', fd, {
			transformRequest: [
				(data: unknown, headers: Record<string, string>) => {
					if (data instanceof FormData) delete headers['Content-Type'];
					return data;
				},
			],
		});
		return res.data;
	},

	async eliminarFotoPerfil(): Promise<{ success: boolean; mensaje?: string }> {
		const res = await apiService.delete<{ success: boolean; mensaje?: string }>('/mi-perfil/foto');
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
