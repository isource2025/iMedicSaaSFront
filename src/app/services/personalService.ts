import { apiService } from './axios';
import {
	Personal,
	PersonalFormData,
	ApiResponse,
	PersonalPaginationResponse,
	CatalogoItemNumerico,
	CatalogoItemTexto,
	EmpresaCatalogoItem,
	PersonalServicioDto,
	PersonalSectorAsignado,
	PersonalCodigoFacturacion,
	PersonalCuentaEstado,
	CrearPersonalCuentaData,
	ActualizarPersonalCuentaData,
} from '../types/personal';

/** Obtiene listado paginado de personal */
export const getPersonalList = async (
	page: number = 1,
	limit: number = 30,
	search: string = '',
): Promise<PersonalPaginationResponse> => {
	const params = new URLSearchParams({
		page: String(page),
		limit: String(limit),
	});
	if (search.trim()) params.append('search', search.trim());

	const response = await apiService.get<any>(`/personal?${params.toString()}`);
	return {
		data: response.data.data || [],
		pagination:
			response.data.pagination || {
				currentPage: 1,
				totalPages: 1,
				totalCount: 0,
				limit,
			},
	};
};

/** Próximo ID (autonumérico MAX+1) */
export const getNextId = async (): Promise<number> => {
	const response = await apiService.get<ApiResponse<{ Valor: number }>>(
		'/personal/next-id',
	);
	if (response.data.success && response.data.data) return response.data.data.Valor;
	throw new Error(response.data.mensaje || 'Error al obtener próximo ID');
};

export const getPersonalById = async (id: number): Promise<Personal> => {
	const response = await apiService.get<ApiResponse<Personal>>(`/personal/${id}`);
	if (response.data.success && response.data.data) return response.data.data;
	throw new Error(response.data.mensaje || 'Personal no encontrado');
};

export const createPersonal = async (
	data: PersonalFormData,
): Promise<Personal> => {
	try {
		const response = await apiService.post<ApiResponse<Personal>>('/personal', data);
		if (response.data.success && response.data.data) return response.data.data;
		throw new Error(response.data.mensaje || 'Error al crear el personal');
	} catch (error: any) {
		if (error.response) {
			throw new Error(error.response.data?.mensaje || 'Error al crear el personal');
		}
		throw error;
	}
};

export const updatePersonal = async (
	id: number,
	data: PersonalFormData,
): Promise<Personal> => {
	try {
		const response = await apiService.put<ApiResponse<Personal>>(
			`/personal/${id}`,
			data,
		);
		if (response.data.success && response.data.data) return response.data.data;
		throw new Error(response.data.mensaje || 'Error al actualizar el personal');
	} catch (error: any) {
		if (error.response) {
			throw new Error(error.response.data?.mensaje || 'Error al actualizar el personal');
		}
		throw error;
	}
};

export const deletePersonal = async (id: number): Promise<void> => {
	try {
		const response = await apiService.delete<ApiResponse<any>>(`/personal/${id}`);
		if (!response.data.success) {
			throw new Error(response.data.mensaje || 'Error al eliminar el personal');
		}
	} catch (error: any) {
		if (error.response) {
			throw new Error(error.response.data?.mensaje || 'Error al eliminar el personal');
		}
		throw error;
	}
};

// ----- Catálogos (solapa Datos Profesionales) -----

export const getEspecialidades = async (): Promise<CatalogoItemNumerico[]> => {
	const res = await apiService.get<ApiResponse<CatalogoItemNumerico[]>>(
		'/personal/catalogos/especialidades',
	);
	return res.data.success && res.data.data ? res.data.data : [];
};

export const getFunciones = async (): Promise<CatalogoItemNumerico[]> => {
	const res = await apiService.get<ApiResponse<CatalogoItemNumerico[]>>(
		'/personal/catalogos/funciones',
	);
	return res.data.success && res.data.data ? res.data.data : [];
};

export const getServicios = async (): Promise<CatalogoItemTexto[]> => {
	const res = await apiService.get<ApiResponse<CatalogoItemTexto[]>>(
		'/personal/catalogos/servicios',
	);
	return res.data.success && res.data.data ? res.data.data : [];
};

export const getCategorias = async (): Promise<CatalogoItemNumerico[]> => {
	const res = await apiService.get<ApiResponse<CatalogoItemNumerico[]>>(
		'/personal/catalogos/categorias',
	);
	return res.data.success && res.data.data ? res.data.data : [];
};

export const getClases = async (): Promise<CatalogoItemTexto[]> => {
	const res = await apiService.get<ApiResponse<CatalogoItemTexto[]>>(
		'/personal/catalogos/clases',
	);
	return res.data.success && res.data.data ? res.data.data : [];
};

export const getEmpresasCatalogo = async (): Promise<EmpresaCatalogoItem[]> => {
	const res = await apiService.get<ApiResponse<EmpresaCatalogoItem[]>>(
		'/personal/catalogos/empresas',
	);
	return res.data.success && res.data.data ? res.data.data : [];
};

export const getPersonalServicio = async (id: number): Promise<PersonalServicioDto> => {
	const res = await apiService.get<ApiResponse<PersonalServicioDto>>(`/personal/${id}/servicio`);
	if (res.data.success && res.data.data) return res.data.data;
	throw new Error(res.data.mensaje || 'Error al obtener servicio');
};

export const updatePersonalServicio = async (
	id: number,
	data: PersonalServicioDto,
): Promise<PersonalServicioDto> => {
	const res = await apiService.put<ApiResponse<PersonalServicioDto>>(
		`/personal/${id}/servicio`,
		data,
	);
	if (res.data.success && res.data.data) return res.data.data;
	throw new Error(res.data.mensaje || 'Error al guardar servicio');
};

export const getPersonalEmpresas = async (id: number): Promise<EmpresaCatalogoItem[]> => {
	const res = await apiService.get<ApiResponse<EmpresaCatalogoItem[]>>(`/personal/${id}/empresas`);
	if (res.data.success && res.data.data) return res.data.data;
	throw new Error(res.data.mensaje || 'Error al listar empresas');
};

export const addPersonalEmpresa = async (id: number, IdEmpresa: number): Promise<EmpresaCatalogoItem[]> => {
	const res = await apiService.post<ApiResponse<EmpresaCatalogoItem[]>>(`/personal/${id}/empresas`, {
		IdEmpresa,
	});
	if (res.data.success && res.data.data) return res.data.data;
	throw new Error(res.data.mensaje || 'Error al asociar empresa');
};

export const removePersonalEmpresa = async (
	id: number,
	idEmpresa: number,
): Promise<EmpresaCatalogoItem[]> => {
	const res = await apiService.delete<ApiResponse<EmpresaCatalogoItem[]>>(
		`/personal/${id}/empresas/${idEmpresa}`,
	);
	if (res.data.success && res.data.data) return res.data.data;
	throw new Error(res.data.mensaje || 'Error al quitar empresa');
};

export interface PersonalFirmaResponse {
	hasFirma: boolean;
	mime?: string;
	dataUrl?: string;
}

export const getPersonalFirma = async (id: number): Promise<PersonalFirmaResponse> => {
	const res = await apiService.get<ApiResponse<PersonalFirmaResponse>>(`/personal/${id}/firma`);
	if (res.data.success && res.data.data) return res.data.data;
	throw new Error(res.data.mensaje || 'Error al obtener firma');
};

export const uploadPersonalFirma = async (id: number, file: File): Promise<void> => {
	const fd = new FormData();
	fd.append('archivo', file);
	const res = await apiService.put<ApiResponse<unknown>>(`/personal/${id}/firma`, fd, {
		transformRequest: [
			(data: unknown, headers: Record<string, string>) => {
				if (data instanceof FormData) {
					delete headers['Content-Type'];
				}
				return data;
			},
		],
	});
	if (!res.data.success) throw new Error(res.data.mensaje || 'Error al subir firma');
};

export const deletePersonalFirma = async (id: number): Promise<void> => {
	const res = await apiService.delete<ApiResponse<unknown>>(`/personal/${id}/firma`);
	if (!res.data.success) throw new Error(res.data.mensaje || 'Error al eliminar firma');
};

export const getPersonalSectores = async (id: number): Promise<PersonalSectorAsignado[]> => {
	const res = await apiService.get<ApiResponse<PersonalSectorAsignado[]>>(`/personal/${id}/sectores`);
	if (res.data.success && res.data.data) return res.data.data;
	throw new Error(res.data.mensaje || 'Error al listar sectores');
};

export const addPersonalSector = async (
	id: number,
	idSector: string,
): Promise<PersonalSectorAsignado[]> => {
	const res = await apiService.post<ApiResponse<PersonalSectorAsignado[]>>(`/personal/${id}/sectores`, {
		idSector,
	});
	if (res.data.success && res.data.data) return res.data.data;
	throw new Error(res.data.mensaje || 'Error al asignar sector');
};

export const removePersonalSector = async (
	id: number,
	idSector: string,
): Promise<PersonalSectorAsignado[]> => {
	const q = encodeURIComponent(idSector);
	const res = await apiService.delete<ApiResponse<PersonalSectorAsignado[]>>(
		`/personal/${id}/sectores?idSector=${q}`,
	);
	if (res.data.success && res.data.data) return res.data.data;
	throw new Error(res.data.mensaje || 'Error al quitar sector');
};

/** Catálogo global de sectores (imSectores). */
export const getSectoresCatalogo = async (): Promise<{ IdSector: string; Descripcion: string }[]> => {
	const res = await apiService.get<{ success: boolean; data: { IdSector: string; Descripcion: string }[] }>(
		'/sectores',
	);
	const rows = res.data?.data;
	return Array.isArray(rows) ? rows : [];
};

export const getPersonalCodigosFacturacion = async (
	id: number,
): Promise<PersonalCodigoFacturacion[]> => {
	const res = await apiService.get<ApiResponse<PersonalCodigoFacturacion[]>>(
		`/personal/${id}/codigos-facturacion`,
	);
	if (res.data.success && res.data.data) return res.data.data;
	throw new Error(res.data.mensaje || 'Error al listar códigos');
};

export const addPersonalCodigoFacturacion = async (
	id: number,
	row: PersonalCodigoFacturacion,
): Promise<PersonalCodigoFacturacion[]> => {
	const res = await apiService.post<ApiResponse<PersonalCodigoFacturacion[]>>(
		`/personal/${id}/codigos-facturacion`,
		row,
	);
	if (res.data.success && res.data.data) return res.data.data;
	throw new Error(res.data.mensaje || 'Error al agregar código');
};

export const updatePersonalCodigoFacturacion = async (
	id: number,
	row: PersonalCodigoFacturacion,
): Promise<PersonalCodigoFacturacion[]> => {
	const res = await apiService.put<ApiResponse<PersonalCodigoFacturacion[]>>(
		`/personal/${id}/codigos-facturacion`,
		row,
	);
	if (res.data.success && res.data.data) return res.data.data;
	throw new Error(res.data.mensaje || 'Error al actualizar código');
};

export const removePersonalCodigoFacturacion = async (
	id: number,
	CodigoAsociacion: string,
): Promise<PersonalCodigoFacturacion[]> => {
	const q = encodeURIComponent(CodigoAsociacion);
	const res = await apiService.delete<ApiResponse<PersonalCodigoFacturacion[]>>(
		`/personal/${id}/codigos-facturacion?CodigoAsociacion=${q}`,
	);
	if (res.data.success && res.data.data) return res.data.data;
	throw new Error(res.data.mensaje || 'Error al eliminar código');
};

export const getPersonalCuenta = async (id: number): Promise<PersonalCuentaEstado> => {
	const res = await apiService.get<ApiResponse<PersonalCuentaEstado>>(`/personal/${id}/cuenta`);
	if (res.data.success && res.data.data) return res.data.data;
	throw new Error(res.data.mensaje || 'Error al obtener cuenta de acceso');
};

export const createPersonalCuenta = async (
	id: number,
	data: CrearPersonalCuentaData,
): Promise<PersonalCuentaEstado['cuenta']> => {
	const res = await apiService.post<ApiResponse<PersonalCuentaEstado['cuenta']>>(
		`/personal/${id}/cuenta`,
		data,
	);
	if (res.data.success && res.data.data) {
		return { tieneCuenta: true, ...res.data.data };
	}
	throw new Error(res.data.mensaje || 'Error al crear cuenta de acceso');
};

export const updatePersonalCuenta = async (
	id: number,
	data: ActualizarPersonalCuentaData,
): Promise<PersonalCuentaEstado['cuenta']> => {
	const res = await apiService.put<ApiResponse<PersonalCuentaEstado['cuenta']>>(
		`/personal/${id}/cuenta`,
		data,
	);
	if (res.data.success && res.data.data) {
		return { tieneCuenta: true, ...res.data.data };
	}
	throw new Error(res.data.mensaje || 'Error al actualizar cuenta de acceso');
};

export const changePersonalCuentaPassword = async (
	id: number,
	password: string,
): Promise<void> => {
	const res = await apiService.put<ApiResponse<unknown>>(`/personal/${id}/cuenta/password`, {
		password,
	});
	if (!res.data.success) {
		throw new Error(res.data.mensaje || 'Error al cambiar contraseña');
	}
};

export const personalService = {
	getPersonalList,
	getNextId,
	getPersonalById,
	createPersonal,
	updatePersonal,
	deletePersonal,
	getEspecialidades,
	getFunciones,
	getServicios,
	getCategorias,
	getClases,
	getEmpresasCatalogo,
	getPersonalServicio,
	updatePersonalServicio,
	getPersonalEmpresas,
	addPersonalEmpresa,
	removePersonalEmpresa,
	getPersonalFirma,
	uploadPersonalFirma,
	deletePersonalFirma,
	getPersonalSectores,
	addPersonalSector,
	removePersonalSector,
	getSectoresCatalogo,
	getPersonalCodigosFacturacion,
	addPersonalCodigoFacturacion,
	updatePersonalCodigoFacturacion,
	removePersonalCodigoFacturacion,
	getPersonalCuenta,
	createPersonalCuenta,
	updatePersonalCuenta,
	changePersonalCuentaPassword,
};

export default personalService;
