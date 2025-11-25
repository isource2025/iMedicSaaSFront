/**
 * Servicio para gestión de rendiciones
 */
import { Rendicion, RendicionFormData, RendicionesPaginatedResponse } from '../types/RendicionInterface';
import { apiService } from './axios';

/**
 * Obtiene rendiciones con paginación, búsqueda y filtros
 */
export const getRendiciones = async (
	page: number = 1,
	limit: number = 30,
	search: string = '',
	estado: string = 'all',
	mes: number | null = null,
	anio: number | null = null
): Promise<RendicionesPaginatedResponse> => {
	try {
		const params = new URLSearchParams({
			page: page.toString(),
			limit: limit.toString(),
		});

		if (search) {
			params.append('search', search);
		}
		
		if (estado && estado !== 'all') {
			params.append('estado', estado);
		}
		
		if (mes !== null) {
			params.append('mes', mes.toString());
		}
		
		if (anio !== null) {
			params.append('anio', anio.toString());
		}

		const response = await apiService.get<RendicionesPaginatedResponse>(
			`/rendiciones?${params.toString()}`
		);

		return response.data;
	} catch (error) {
		console.error('Error en getRendiciones:', error);
		throw error;
	}
};

/**
 * Obtiene una rendición por ID
 */
export const getRendicionById = async (id: number): Promise<Rendicion> => {
	try {
		const response = await apiService.get<Rendicion>(`/rendiciones/${id}`);
		return response.data;
	} catch (error) {
		console.error('Error en getRendicionById:', error);
		throw error;
	}
};

/**
 * Crea una nueva rendición
 */
export const createRendicion = async (data: RendicionFormData): Promise<Rendicion> => {
	try {
		const response = await apiService.post<Rendicion>('/rendiciones', data);
		return response.data;
	} catch (error) {
		console.error('Error en createRendicion:', error);
		throw error;
	}
};

/**
 * Actualiza una rendición existente
 */
export const updateRendicion = async (id: number, data: RendicionFormData): Promise<Rendicion> => {
	try {
		const response = await apiService.put<Rendicion>(`/rendiciones/${id}`, data);
		return response.data;
	} catch (error) {
		console.error('Error en updateRendicion:', error);
		throw error;
	}
};

/**
 * Elimina una rendición
 */
export const deleteRendicion = async (id: number): Promise<void> => {
	try {
		await apiService.delete(`/rendiciones/${id}`);
	} catch (error) {
		console.error('Error en deleteRendicion:', error);
		throw error;
	}
};

export const rendicionService = {
	getRendiciones,
	getRendicionById,
	createRendicion,
	updateRendicion,
	deleteRendicion,
};
