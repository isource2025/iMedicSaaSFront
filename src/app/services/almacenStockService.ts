import { apiService } from './axios';
import type {
	CandidatosSalidaServicioResp,
	ExistenciasCatalogos,
	ExistenciasPage,
	PlanCuentaOpt,
	ProductoStock,
	ProductosCatalogos,
	ProductosPage,
	ProductoSearchCampo,
	ProveedoresClarionPage,
	RemitoCabecera,
	RemitoCliente,
	RemitoPaciente,
	RemitoProveedor,
	RemitosCatalogos,
	RemitosPage,
} from '../types/almacenStock';

interface ApiResp<T> {
	success: boolean;
	data?: T;
	mensaje?: string;
	message?: string;
}

const base = '/almacen';

async function unwrap<T>(promise: Promise<{ data?: ApiResp<T> }>): Promise<T> {
	const res = await promise;
	if (!res.data?.success) {
		throw new Error(res.data?.mensaje || res.data?.message || 'Error en almacén');
	}
	return res.data.data as T;
}

export const almacenStockService = {
	listarProductos: (params?: {
		search?: string;
		campo?: ProductoSearchCampo;
		idRubro?: number;
		idSubRubro?: number;
		page?: number;
		pageSize?: number;
	}) =>
		unwrap(
			apiService.get<ApiResp<ProductosPage>>(`${base}/productos`, {
				params: {
					search: params?.search || undefined,
					campo: params?.campo || undefined,
					idRubro: params?.idRubro || undefined,
					idSubRubro: params?.idSubRubro || undefined,
					page: params?.page || 1,
					pageSize: params?.pageSize || 40,
				},
			}),
		),

	obtenerProducto: (id: number) =>
		unwrap(apiService.get<ApiResp<ProductoStock>>(`${base}/productos/${id}`)),

	catalogosProductos: () =>
		unwrap(apiService.get<ApiResp<ProductosCatalogos>>(`${base}/productos/catalogos`)),

	buscarCuentasProducto: (search: string) =>
		unwrap(
			apiService.get<ApiResp<PlanCuentaOpt[]>>(`${base}/productos/cuentas`, {
				params: { search: search || undefined },
			}),
		),

	crearProducto: (body: Partial<ProductoStock> & { Descripcion: string }) =>
		unwrap(apiService.post<ApiResp<ProductoStock>>(`${base}/productos`, body)),

	actualizarProducto: (id: number, body: Partial<ProductoStock>) =>
		unwrap(apiService.put<ApiResp<ProductoStock>>(`${base}/productos/${id}`, body)),

	eliminarProducto: (id: number) =>
		unwrap(apiService.delete<ApiResp<{ ok: boolean }>>(`${base}/productos/${id}`)),

	listarRemitos: (params?: {
		search?: string;
		tipo?: string;
		idDeposito?: number;
		desde?: string;
		hasta?: string;
		page?: number;
		pageSize?: number;
	}) =>
		unwrap(
			apiService.get<ApiResp<RemitosPage>>(`${base}/remitos`, {
				params: {
					search: params?.search || undefined,
					tipo: params?.tipo || undefined,
					idDeposito: params?.idDeposito || undefined,
					desde: params?.desde || undefined,
					hasta: params?.hasta || undefined,
					page: params?.page || 1,
					pageSize: params?.pageSize || 30,
				},
			}),
		),

	obtenerRemito: (id: number) =>
		unwrap(apiService.get<ApiResp<RemitoCabecera>>(`${base}/remitos/${id}`)),

	catalogosRemitos: () =>
		unwrap(apiService.get<ApiResp<RemitosCatalogos>>(`${base}/remitos/catalogos`)),

	buscarProveedores: (search?: string) =>
		unwrap(
			apiService.get<ApiResp<RemitoProveedor[]>>(`${base}/remitos/proveedores`, {
				params: { search: search || undefined },
			}),
		),

	buscarClientes: (search: string) =>
		unwrap(
			apiService.get<ApiResp<RemitoCliente[]>>(`${base}/remitos/clientes`, {
				params: { search },
			}),
		),

	buscarPacientes: (search: string) =>
		unwrap(
			apiService.get<ApiResp<RemitoPaciente[]>>(`${base}/remitos/pacientes`, {
				params: { search },
			}),
		),

	proximoNroRemito: (tipo: string, grupo?: number) =>
		unwrap(
			apiService.get<ApiResp<{ tipo: string; grupo: number; letra: string; nro: number }>>(
				`${base}/remitos/proximo-nro`,
				{ params: { tipo, grupo } },
			),
		),

	crearRemito: (body: RemitoSaveBody) =>
		unwrap(apiService.post<ApiResp<RemitoCabecera>>(`${base}/remitos`, body)),

	actualizarRemito: (id: number, body: RemitoSaveBody) =>
		unwrap(apiService.put<ApiResp<RemitoCabecera>>(`${base}/remitos/${id}`, body)),

	eliminarRemito: (id: number) =>
		unwrap(apiService.delete<ApiResp<{ ok: boolean; IdTransaccion: number }>>(`${base}/remitos/${id}`)),

	candidatosSalidaServicio: (params: {
		idDepositoDest?: number;
		valorSector?: string;
		fecha?: string;
	}) =>
		unwrap(
			apiService.get<ApiResp<CandidatosSalidaServicioResp>>(
				`${base}/remitos/candidatos-salida-servicio`,
				{
					params: {
						idDepositoDest: params.idDepositoDest || undefined,
						valorSector: params.valorSector || undefined,
						fecha: params.fecha || undefined,
					},
				},
			),
		),

	excluirIndicacionEntrega: (nroIndicacion: number) =>
		unwrap(
			apiService.post<ApiResp<{ ok: boolean; NroIndicacion: number }>>(
				`${base}/remitos/indicaciones/${nroIndicacion}/excluir-entrega`,
				{},
			),
		),

	listarExistencias: (params?: {
		search?: string;
		idDeposito?: number;
		soloBajoMinimo?: boolean;
		page?: number;
		pageSize?: number;
	}) =>
		unwrap(
			apiService.get<ApiResp<ExistenciasPage>>(`${base}/existencias`, {
				params: {
					search: params?.search || undefined,
					idDeposito: params?.idDeposito || undefined,
					soloBajoMinimo: params?.soloBajoMinimo ? 1 : undefined,
					page: params?.page || 1,
					pageSize: params?.pageSize || 40,
				},
			}),
		),

	catalogosExistencias: () =>
		unwrap(apiService.get<ApiResp<ExistenciasCatalogos>>(`${base}/existencias/catalogos`)),

	listarProveedoresClarion: (params?: { search?: string; page?: number; pageSize?: number }) =>
		unwrap(
			apiService.get<ApiResp<ProveedoresClarionPage>>(`${base}/proveedores-clarion`, {
				params: {
					search: params?.search || undefined,
					page: params?.page || 1,
					pageSize: params?.pageSize || 40,
				},
			}),
		),
};

type RemitoSaveBody = {
	Fecha?: string;
	TipoCbte: string;
	IdDeposito: number;
	IdDepositoDest?: number | null;
	IdProveedor?: number | null;
	IdCliente?: number | null;
	GrupoCbte?: number;
	LetraCbte?: string;
	NroCbte?: number;
	Bultos?: number;
	Observaciones?: string;
	items: {
		IdProducto: number;
		Cantidad: number;
		ImporteUnitario?: number;
		ImporteTotal?: number;
		IdPaciente?: number | null;
		NroIndicacion?: number | null;
	}[];
};
