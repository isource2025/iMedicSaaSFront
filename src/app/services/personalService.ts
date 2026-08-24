import { apiService } from './axios';
import { clearServiciosReceptorCache } from '@/app/utils/serviciosReceptorCache';
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
	PersonalServicioAsignado,
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
	try {
		const res = await apiService.get<ApiResponse<CatalogoItemTexto[]>>(
			'/personal/catalogos/servicios',
		);
		const rows = res.data.success && res.data.data ? res.data.data : [];
		return rows
			.map((r) => {
				const row = (r || {}) as unknown as Record<string, unknown>;
				return {
					valor: String(
						row.valor ?? row.Valor ?? row.id ?? row.IdServicio ?? row.idServicio ?? '',
					).trim(),
					descripcion: String(row.descripcion ?? row.Descripcion ?? '').trim(),
				};
			})
			.filter((r) => r.valor);
	} catch {
		return [];
	}
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

/** Firma del personal por matrícula (para PDFs; no requiere permiso de configuración). */
export const getPersonalFirmaByMatricula = async (
	matricula: number | string,
): Promise<PersonalFirmaResponse> => {
	const m = Number(matricula);
	if (!Number.isFinite(m) || m <= 0) return { hasFirma: false };
	const res = await apiService.get<ApiResponse<PersonalFirmaResponse>>(
		`/personal/firma/por-matricula/${m}`,
	);
	if (res.data.success && res.data.data) return res.data.data;
	throw new Error(res.data.mensaje || 'Error al obtener firma');
};

/** Firma por ID de personal (Valor) — endpoint clínico sin permiso de configuración. */
export const getPersonalFirmaByIdPublic = async (
	id: number | string,
): Promise<PersonalFirmaResponse> => {
	const n = Number(id);
	if (!Number.isFinite(n) || n <= 0) return { hasFirma: false };
	const res = await apiService.get<ApiResponse<PersonalFirmaResponse>>(
		`/personal/firma/por-id/${n}`,
	);
	if (res.data.success && res.data.data) return res.data.data;
	throw new Error(res.data.mensaje || 'Error al obtener firma');
};

/**
 * Endpoint clínico dedicado a PDFs (auth+tenant, sin permiso de configuración).
 * Acepta matrícula o ID (Valor) de imPersonal.
 */
export const getFirmaParaPdf = async (
	key: number | string,
): Promise<PersonalFirmaResponse> => {
	const n = Number(key);
	if (!Number.isFinite(n) || n <= 0) return { hasFirma: false };
	const res = await apiService.get<ApiResponse<PersonalFirmaResponse>>(
		`/firmas/personal/${n}`,
		{ timeout: 60000 },
	);
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

function mapServicioAsignado(s: Record<string, unknown> | null | undefined): PersonalServicioAsignado {
	const row = s || {};
	return {
		idServicio: String(
			row.idServicio ?? row.IdServicio ?? row.id ?? row.valor ?? row.Valor ?? '',
		).trim(),
		Descripcion: String(row.Descripcion ?? row.descripcion ?? '').trim(),
	};
}

function mapSectorAsignado(s: Record<string, unknown> | null | undefined): PersonalSectorAsignado {
	const row = s || {};
	return {
		idSector: String(row.idSector ?? row.IdSector ?? '').trim(),
		Descripcion: String(row.Descripcion ?? row.descripcion ?? '').trim(),
		ValorServicio: String(row.ValorServicio ?? row.valorServicio ?? '').trim() || undefined,
		DescripcionServicio: String(row.DescripcionServicio ?? row.descripcionServicio ?? '').trim() || undefined,
	};
}

export const getPersonalSectores = async (id: number): Promise<PersonalSectorAsignado[]> => {
	try {
		const res = await apiService.get<ApiResponse<PersonalSectorAsignado[]>>(`/personal/${id}/sectores`);
		if (res.data.success && res.data.data) {
			return (res.data.data as unknown as Record<string, unknown>[])
				.map(mapSectorAsignado)
				.filter((s) => s.idSector);
		}
		return [];
	} catch {
		return [];
	}
};

export const addPersonalSector = async (
	id: number,
	idSector: string,
): Promise<PersonalSectorAsignado[]> => {
	const res = await apiService.post<ApiResponse<PersonalSectorAsignado[]>>(`/personal/${id}/sectores`, {
		idSector,
	});
	if (res.data.success && res.data.data) {
		return (res.data.data as unknown as Record<string, unknown>[])
			.map(mapSectorAsignado)
			.filter((s) => s.idSector);
	}
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
	if (res.data.success && res.data.data) {
		return (res.data.data as unknown as Record<string, unknown>[]).map(mapSectorAsignado).filter((s) => s.idSector);
	}
	throw new Error(res.data.mensaje || 'Error al quitar sector');
};

export const getPersonalServiciosPedidos = async (id: number): Promise<PersonalServicioAsignado[]> => {
	try {
		const res = await apiService.get<ApiResponse<PersonalServicioAsignado[]>>(
			`/personal/${id}/servicios-pedidos`,
		);
		if (res.data.success && res.data.data) {
			return (res.data.data as unknown as Record<string, unknown>[])
				.map(mapServicioAsignado)
				.filter((s) => s.idServicio);
		}
		return [];
	} catch {
		return [];
	}
};

export const addPersonalServicioPedido = async (
	id: number,
	idServicio: string,
): Promise<PersonalServicioAsignado[]> => {
	const res = await apiService.post<ApiResponse<PersonalServicioAsignado[]>>(
		`/personal/${id}/servicios-pedidos`,
		{ idServicio },
	);
	if (res.data.success && res.data.data) {
		clearServiciosReceptorCache();
		return (res.data.data as unknown as Record<string, unknown>[])
			.map(mapServicioAsignado)
			.filter((s) => s.idServicio);
	}
	throw new Error(res.data.mensaje || 'Error al asignar servicio');
};

export const removePersonalServicioPedido = async (
	id: number,
	idServicio: string,
): Promise<PersonalServicioAsignado[]> => {
	const q = encodeURIComponent(idServicio);
	const res = await apiService.delete<ApiResponse<PersonalServicioAsignado[]>>(
		`/personal/${id}/servicios-pedidos?idServicio=${q}`,
	);
	if (res.data.success && res.data.data) {
		clearServiciosReceptorCache();
		return (res.data.data as unknown as Record<string, unknown>[])
			.map(mapServicioAsignado)
			.filter((s) => s.idServicio);
	}
	throw new Error(res.data.mensaje || 'Error al quitar servicio');
};

export const replacePersonalAsignaciones = async (
	id: number,
	body: { sectores: string[]; servicios?: string[] },
): Promise<{ sectores: PersonalSectorAsignado[]; servicios: PersonalServicioAsignado[] }> => {
	try {
		const res = await apiService.put<
			ApiResponse<{ sectores: PersonalSectorAsignado[]; servicios: PersonalServicioAsignado[] }>
		>(`/personal/${id}/asignaciones`, body);
		if (res.data.success && res.data.data) {
			clearServiciosReceptorCache();
			const d = res.data.data;
			return {
				sectores: ((d.sectores || []) as unknown as Record<string, unknown>[])
					.map(mapSectorAsignado)
					.filter((s) => s.idSector),
				servicios: ((d.servicios || []) as unknown as Record<string, unknown>[])
					.map(mapServicioAsignado)
					.filter((s) => s.idServicio),
			};
		}
		throw new Error(res.data.mensaje || 'Error al guardar asignaciones');
	} catch (error: unknown) {
		const ax = error as { response?: { data?: { mensaje?: string } }; message?: string };
		throw new Error(ax.response?.data?.mensaje || ax.message || 'Error al guardar asignaciones');
	}
};

function pickCatalogoField(row: Record<string, unknown>, ...names: string[]): string {
	const lower: Record<string, unknown> = {};
	for (const [k, v] of Object.entries(row || {})) {
		lower[String(k).toLowerCase().trim()] = v;
	}
	for (const n of names) {
		const v = lower[n.toLowerCase()] ?? row[n];
		if (v != null && String(v).trim() !== '') return String(v).trim();
	}
	return '';
}

function mapSectorCatalogoRow(row: Record<string, unknown> | null | undefined) {
	const r = row || {};
	const IdSector = pickCatalogoField(
		r,
		'IdSector',
		'idSector',
		'idsector',
		'Valor',
		'valor',
	);
	if (!IdSector || IdSector === '0') return null;
	return {
		IdSector,
		Descripcion: pickCatalogoField(r, 'Descripcion', 'descripcion', 'descripcionSector') || IdSector,
		ValorServicio: pickCatalogoField(r, 'ValorServicio', 'valorServicio'),
		DescripcionServicio: pickCatalogoField(r, 'DescripcionServicio', 'descripcionServicio'),
	};
}

/** Catálogo global de sectores (imSectores). */
export const getSectoresCatalogo = async (): Promise<
	{ IdSector: string; Descripcion: string; ValorServicio?: string; DescripcionServicio?: string }[]
> => {
	const parse = (payload: unknown) => {
		const body = payload as { data?: unknown; success?: boolean } | unknown[] | undefined;
		const rows = Array.isArray(body)
			? body
			: Array.isArray((body as { data?: unknown })?.data)
				? ((body as { data: unknown[] }).data)
				: [];
		return (rows as Record<string, unknown>[])
			.map(mapSectorCatalogoRow)
			.filter((s): s is NonNullable<typeof s> => Boolean(s));
	};

	const urls = ['/personal/catalogos/sectores', '/sectores', '/auth/sectores'];
	for (const url of urls) {
		try {
			const res = await apiService.get<{ success: boolean; data: Record<string, unknown>[] }>(url);
			const out = parse(res.data);
			if (out.length) return out;
		} catch (err) {
			console.error(`[personal] catálogo sectores ${url}:`, err);
		}
	}
	return [];
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
		return res.data.data;
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
		return res.data.data;
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

export type PersonalExportField = { id: string; label: string };

export const getExportFields = async (): Promise<PersonalExportField[]> => {
	const res = await apiService.get<ApiResponse<PersonalExportField[]>>(
		'/personal/export-fields',
	);
	if (res.data.success && Array.isArray(res.data.data)) return res.data.data;
	throw new Error(res.data.mensaje || 'Error al obtener campos de exportación');
};

export const getSyncFisicoEstado = async (): Promise<{ disponible: boolean }> => {
	const res = await apiService.get<ApiResponse<{ disponible: boolean }>>(
		'/personal/sync-fisico/estado',
	);
	if (res.data.success && res.data.data) return res.data.data;
	throw new Error(res.data.mensaje || 'Error al consultar sync físico');
};

export type CuentaSoloNube = {
	valor: number;
	nombreRed: string | null;
	apellidoNombre: string;
	numeroDocumento: number | null;
	ocultoPorIdReservado?: boolean;
};

export const getCuentasSoloNube = async (): Promise<CuentaSoloNube[]> => {
	const res = await apiService.get<ApiResponse<CuentaSoloNube[]>>(
		'/personal/cuentas-solo-nube',
	);
	if (res.data.success && Array.isArray(res.data.data)) return res.data.data;
	throw new Error(res.data.mensaje || 'Error al detectar cuentas sin ficha física');
};

export type RepararCuentasSoloNubeResult = {
	total: number;
	reparados: Array<{ valor: number; nombreRed: string | null; apellidoNombre: string }>;
	errores: Array<{
		valor: number;
		nombreRed: string | null;
		apellidoNombre: string;
		error: string;
	}>;
};

export const repararCuentasSoloNube = async (): Promise<RepararCuentasSoloNubeResult> => {
	const res = await apiService.post<
		ApiResponse<RepararCuentasSoloNubeResult> & { mensaje?: string }
	>('/personal/reparar-cuentas-solo-nube');
	if (!res.data.data) {
		throw new Error(res.data.mensaje || 'Error al reparar cuentas sin ficha física');
	}
	return res.data.data;
};

export type SyncFisicoInformeItem = {
	cantidad: number;
	texto: string;
	extra?: string | null;
	error?: boolean;
};

export type SyncCampoCambio = {
	campo: string;
	de: string;
	a: string;
};

export type SyncPermisoModulo = {
	modulo: string;
	items: Array<{ nombre: string; acciones: string[] }>;
};

export type SyncRolTipo = {
	idRol: number;
	nombre: string;
	etiqueta: string;
	permisos: number;
	usuarios: number;
	modulos: SyncPermisoModulo[];
};

export type SyncCambioUsuario = {
	tipo: 'ficha' | 'cuenta' | 'rol' | 'sector' | 'servicio' | 'vinculo';
	accion: string;
	titulo: string;
	campos?: SyncCampoCambio[];
	idRol?: number;
	usuarioRed?: string | null;
	error?: string | null;
	agregados?: string[];
	quitados?: string[];
};

export type SyncUsuarioInforme = {
	valor: number;
	nombre: string;
	cambios: SyncCambioUsuario[];
};

export type SyncFisicoInforme = {
	mensaje: string;
	sinCambios: boolean;
	items: SyncFisicoInformeItem[];
	usuarios?: SyncUsuarioInforme[];
	catalogoSectores?: Array<{
		valor: string;
		descripcion: string;
		accion: string;
		de?: string;
	}>;
	catalogoServicios?: Array<{
		valor: string;
		descripcion: string;
		accion: string;
		de?: string;
	}>;
	roles?: {
		asignados: number;
		yaTenia: number;
		sinRol: number;
		porTipo: SyncRolTipo[];
	};
};

export type SyncFisicoResumen = {
	personal: number;
	personalTotal?: number;
	personalNuevos?: number;
	personalActualizados?: number;
	passwords?: number;
	passwordsEscritos?: number;
	passwordsErrores?: number;
	passwordsTotal?: number;
	passwordsNuevos?: number;
	passwordsActualizados?: number;
	sectoresAsignaciones?: number;
	sectoresAsignacionesTotal?: number;
	sectoresCatalogoCambios?: number;
	serviciosAsignaciones?: number;
	serviciosAsignacionesTotal?: number;
	serviciosCatalogoCambios?: number;
	vinculos?: number;
	vinculosTotal?: number;
	rolesAsignados?: number;
	rolesYaTenia?: number;
	rolesSinAsignar?: number;
	rolesPorTipo?: Record<string, number>;
	sinCambios?: boolean;
	totalCambios?: number;
	informe?: SyncFisicoInforme;
	usuarios?: SyncUsuarioInforme[];
};

export const syncDesdeFisico = async (): Promise<SyncFisicoResumen> => {
	// Copy de ~1000 cuentas + personal: más allá del timeout global 15s
	const res = await apiService.post<ApiResponse<SyncFisicoResumen>>(
		'/personal/sync-desde-fisico',
		{},
		{ timeout: 300000 },
	);
	if (!res.data.success || !res.data.data) {
		throw new Error(res.data.mensaje || 'Error al sincronizar desde base física');
	}
	const data = res.data.data;
	const usuarios = data.informe?.usuarios?.length
		? data.informe.usuarios
		: data.usuarios || [];
	return {
		...data,
		usuarios,
		informe: {
			mensaje: data.informe?.mensaje || '',
			sinCambios: !!data.informe?.sinCambios,
			items: data.informe?.items || [],
			usuarios,
			catalogoSectores: data.informe?.catalogoSectores || [],
			catalogoServicios: data.informe?.catalogoServicios || [],
			roles: data.informe?.roles,
		},
	};
};

export const exportarPersonal = async (
	campos: string[],
): Promise<{
	columns: PersonalExportField[];
	rows: Record<string, unknown>[];
}> => {
	const res = await apiService.post<
		ApiResponse<{
			columns: PersonalExportField[];
			rows: Record<string, unknown>[];
		}>
	>('/personal/exportar', { campos });
	if (res.data.success && res.data.data) return res.data.data;
	throw new Error(res.data.mensaje || 'Error al exportar personal');
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
	getPersonalFirmaByMatricula,
	getPersonalFirmaByIdPublic,
	getFirmaParaPdf,
	uploadPersonalFirma,
	deletePersonalFirma,
	getPersonalSectores,
	addPersonalSector,
	removePersonalSector,
	getPersonalServiciosPedidos,
	addPersonalServicioPedido,
	removePersonalServicioPedido,
	replacePersonalAsignaciones,
	getSectoresCatalogo,
	getPersonalCodigosFacturacion,
	addPersonalCodigoFacturacion,
	updatePersonalCodigoFacturacion,
	removePersonalCodigoFacturacion,
	getPersonalCuenta,
	createPersonalCuenta,
	updatePersonalCuenta,
	changePersonalCuentaPassword,
	getExportFields,
	getSyncFisicoEstado,
	getCuentasSoloNube,
	repararCuentasSoloNube,
	syncDesdeFisico,
	exportarPersonal,
};

export default personalService;
