import { apiService } from './axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export interface Sector {
	IdSector: string;
	Descripcion: string;
	AmbInt?: string;
	Activo?: number;
}

export interface ServicioMedico {
	IdServicio: string;
	Descripcion: string;
}

export const sectoresService = {
	async getSectores(): Promise<Sector[]> {
		const response = await apiService.get<{ success: boolean; data: Sector[] }>(
			`${BASE_URL}/sectores`,
		);
		return response.data.data || [];
	},

	async crearSector(body: {
		valor: string;
		descripcion: string;
		ambInt?: string;
	}): Promise<Sector> {
		const response = await apiService.post<{ success: boolean; data: Sector; mensaje?: string }>(
			`${BASE_URL}/sectores`,
			body,
		);
		if (!response.data?.success) throw new Error(response.data?.mensaje || 'No se pudo crear');
		return response.data.data;
	},

	async actualizarSector(
		valor: string,
		body: { descripcion: string; ambInt?: string },
	): Promise<Sector> {
		const response = await apiService.put<{ success: boolean; data: Sector; mensaje?: string }>(
			`${BASE_URL}/sectores/${encodeURIComponent(valor)}`,
			body,
		);
		if (!response.data?.success) throw new Error(response.data?.mensaje || 'No se pudo actualizar');
		return response.data.data;
	},

	async getServiciosMedicos(): Promise<ServicioMedico[]> {
		const response = await apiService.get<{ success: boolean; data: ServicioMedico[] }>(
			`${BASE_URL}/sectores/servicios-medicos`,
		);
		return response.data.data || [];
	},

	async crearServicio(body: { valor: string; descripcion: string }): Promise<ServicioMedico> {
		const response = await apiService.post<{
			success: boolean;
			data: ServicioMedico;
			mensaje?: string;
		}>(`${BASE_URL}/sectores/servicios-medicos`, body);
		if (!response.data?.success) throw new Error(response.data?.mensaje || 'No se pudo crear');
		return response.data.data;
	},

	async actualizarServicio(
		valor: string,
		body: { descripcion: string },
	): Promise<ServicioMedico> {
		const response = await apiService.put<{
			success: boolean;
			data: ServicioMedico;
			mensaje?: string;
		}>(`${BASE_URL}/sectores/servicios-medicos/${encodeURIComponent(valor)}`, body);
		if (!response.data?.success) throw new Error(response.data?.mensaje || 'No se pudo actualizar');
		return response.data.data;
	},
};
