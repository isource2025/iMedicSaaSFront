import { apiService } from './axios';
import type {
	CandidatosSalidaServicioResp,
	CatalogoProductoNombre,
	ClaveStock,
	EstadoProveedor,
	ExistenciaConAjuste,
	ExistenciaStock,
	ExistenciasCatalogos,
	ExistenciasEstadoFiltro,
	ExistenciasOrden,
	ExistenciasPage,
	ExistenciasResumen,
	MedicacionPendienteServiciosResp,
	MovimientosPage,
	ParametrosStock,
	PlanCuentaOpt,
	ProductoFicha,
	ProductoStock,
	ProductosCatalogos,
	ProductosEstadoFiltro,
	ProductosOrden,
	ProductosPage,
	ProductosResumen,
	ProductosStockFiltro,
	ProductoSearchCampo,
	ProveedorDetalle,
	ProveedoresCatalogos,
	ProveedoresClarionPage,
	ProveedoresOrden,
	ProveedoresResumen,
	ProveedorSaveBody,
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
		estado?: ProductosEstadoFiltro;
		stock?: ProductosStockFiltro;
		conFoto?: boolean;
		orden?: ProductosOrden;
		page?: number;
		pageSize?: number;
	}) =>
		unwrap(
			apiService.get<ApiResp<ProductosPage>>(`${base}/productos`, {
				params: {
					search: params?.search || undefined,
					campo: params?.campo || undefined,
					idRubro: params?.idRubro ?? undefined,
					idSubRubro: params?.idSubRubro ?? undefined,
					estado: params?.estado || undefined,
					stock: params?.stock || undefined,
					conFoto: params?.conFoto ? 1 : undefined,
					orden: params?.orden || undefined,
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
		sentido?: 'E' | 'S';
		/** Status_Remitos: 0 anulado, 1 pendiente, 2 confirmado */
		estado?: number;
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
					sentido: params?.sentido || undefined,
					estado: params?.estado ?? undefined,
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

	anularRemito: (id: number) =>
		unwrap(apiService.post<ApiResp<RemitoCabecera>>(`${base}/remitos/${id}/anular`, {})),

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

	medicacionPendienteServicios: (fecha?: string) =>
		unwrap(
			apiService.get<ApiResp<MedicacionPendienteServiciosResp>>(
				`${base}/remitos/medicacion-pendiente-servicios`,
				{ params: { fecha: fecha || undefined } },
			),
		),

	excluirIndicacionEntrega: (nroIndicacion: number) =>
		unwrap(
			apiService.post<ApiResp<{ ok: boolean; NroIndicacion: number }>>(
				`${base}/remitos/indicaciones/${nroIndicacion}/excluir-entrega`,
				{},
			),
		),

	resumenProductos: () => unwrap(apiService.get<ApiResp<ProductosResumen>>(`${base}/productos/resumen`)),

	fichaProducto: (id: number) => unwrap(apiService.get<ApiResp<ProductoFicha>>(`${base}/productos/${id}/ficha`)),

	estadoProducto: (id: number, activo: boolean) =>
		unwrap(apiService.post<ApiResp<ProductoStock>>(`${base}/productos/${id}/estado`, { Activo: activo })),

	/** Baja lógica si el producto tiene historia; si no, se borra. */
	eliminarProductoModo: async (id: number) => {
		const res = await apiService.delete<ApiResp<{ modo: 'baja' | 'eliminado'; producto?: ProductoStock }>>(
			`${base}/productos/${id}`,
		);
		if (!res.data?.success) throw new Error(res.data?.mensaje || 'No se pudo borrar');
		return { ...(res.data.data as { modo: 'baja' | 'eliminado' }), mensaje: res.data.mensaje };
	},

	/** La foto viaja con el token, así que se pide como blob y se muestra con un object URL. */
	fotoProducto: async (id: number, signal?: AbortSignal) => {
		const res = await apiService.get<Blob>(`${base}/productos/${id}/foto`, { responseType: 'blob', signal });
		return res.data;
	},

	subirFotoProducto: (id: number, file: File) => {
		const fd = new FormData();
		fd.append('foto', file);
		return unwrap(
			apiService.post<ApiResp<ProductoStock>>(`${base}/productos/${id}/foto`, fd, {
				headers: { 'Content-Type': 'multipart/form-data' },
				timeout: 60000,
			}),
		);
	},

	quitarFotoProducto: (id: number) =>
		unwrap(apiService.delete<ApiResp<ProductoStock>>(`${base}/productos/${id}/foto`)),

	guardarCatalogoProducto: (
		catalogo: CatalogoProductoNombre,
		body: { Descripcion: string; Id?: string | number; IdRubro?: number | null },
		id?: string | number | null,
	) =>
		unwrap(
			id != null && id !== ''
				? apiService.put<ApiResp<{ id: string | number; Descripcion: string }>>(
						`${base}/productos/catalogos/${catalogo}/${encodeURIComponent(String(id))}`,
						body,
					)
				: apiService.post<ApiResp<{ id: string | number; Descripcion: string }>>(
						`${base}/productos/catalogos/${catalogo}`,
						body,
					),
		),

	eliminarCatalogoProducto: (catalogo: CatalogoProductoNombre, id: string | number, idRubro?: number | null) =>
		unwrap(
			apiService.delete<ApiResp<{ ok: boolean }>>(
				`${base}/productos/catalogos/${catalogo}/${encodeURIComponent(String(id))}`,
				{ params: { IdRubro: idRubro ?? undefined } },
			),
		),

	listarExistencias: (params?: {
		search?: string;
		idDeposito?: number;
		idRubro?: number;
		idProducto?: number;
		estado?: ExistenciasEstadoFiltro;
		orden?: ExistenciasOrden;
		soloBajoMinimo?: boolean;
		page?: number;
		pageSize?: number;
	}) =>
		unwrap(
			apiService.get<ApiResp<ExistenciasPage>>(`${base}/existencias`, {
				params: {
					search: params?.search || undefined,
					idDeposito: params?.idDeposito ?? undefined,
					idRubro: params?.idRubro ?? undefined,
					idProducto: params?.idProducto ?? undefined,
					estado: params?.estado || undefined,
					orden: params?.orden || undefined,
					soloBajoMinimo: params?.soloBajoMinimo ? 1 : undefined,
					page: params?.page || 1,
					pageSize: params?.pageSize || 40,
				},
			}),
		),

	catalogosExistencias: () =>
		unwrap(apiService.get<ApiResp<ExistenciasCatalogos>>(`${base}/existencias/catalogos`)),

	resumenExistencias: (idDeposito?: number) =>
		unwrap(
			apiService.get<ApiResp<ExistenciasResumen>>(`${base}/existencias/resumen`, {
				params: { idDeposito: idDeposito ?? undefined },
				timeout: 60000,
			}),
		),

	movimientosStock: (params?: {
		idProducto?: number;
		idDeposito?: number;
		dias?: number;
		page?: number;
		pageSize?: number;
	}) =>
		unwrap(
			apiService.get<ApiResp<MovimientosPage>>(`${base}/existencias/movimientos`, {
				params: {
					idProducto: params?.idProducto ?? undefined,
					idDeposito: params?.idDeposito ?? undefined,
					dias: params?.dias ?? undefined,
					page: params?.page || 1,
					pageSize: params?.pageSize || 30,
				},
				timeout: 60000,
			}),
		),

	crearExistencia: (body: ClaveStock & ParametrosStock & { CantidadInicial?: number; Motivo?: string }) =>
		unwrap(apiService.post<ApiResp<ExistenciaConAjuste>>(`${base}/existencias`, body)),

	actualizarExistencia: (k: ClaveStock, body: ParametrosStock) =>
		unwrap(apiService.put<ApiResp<ExistenciaStock>>(rutaStock(k), body)),

	ajustarExistencia: (body: ClaveStock & { Modo: 'delta' | 'conteo'; Cantidad: number; Motivo: string }) =>
		unwrap(apiService.post<ApiResp<ExistenciaConAjuste>>(`${base}/existencias/ajustes`, body)),

	eliminarExistencia: (k: ClaveStock) => unwrap(apiService.delete<ApiResp<{ ok: boolean }>>(rutaStock(k))),

	listarProveedoresClarion: (params?: {
		search?: string;
		estado?: EstadoProveedor | null;
		idTipo?: number | null;
		orden?: ProveedoresOrden;
		page?: number;
		pageSize?: number;
	}) =>
		unwrap(
			apiService.get<ApiResp<ProveedoresClarionPage>>(`${base}/proveedores-clarion`, {
				params: {
					search: params?.search || undefined,
					estado: params?.estado ?? undefined,
					idTipo: params?.idTipo ?? undefined,
					orden: params?.orden || undefined,
					page: params?.page || 1,
					pageSize: params?.pageSize || 40,
				},
			}),
		),

	resumenProveedores: () =>
		unwrap(apiService.get<ApiResp<ProveedoresResumen>>(`${base}/proveedores-clarion/resumen`)),

	catalogosProveedores: () =>
		unwrap(apiService.get<ApiResp<ProveedoresCatalogos>>(`${base}/proveedores-clarion/catalogos`)),

	obtenerProveedor: (id: number) =>
		unwrap(apiService.get<ApiResp<ProveedorDetalle>>(`${base}/proveedores-clarion/${id}`)),

	crearProveedor: (body: ProveedorSaveBody) =>
		unwrap(apiService.post<ApiResp<ProveedorDetalle>>(`${base}/proveedores-clarion`, body)),

	actualizarProveedor: (id: number, body: ProveedorSaveBody) =>
		unwrap(apiService.put<ApiResp<ProveedorDetalle>>(`${base}/proveedores-clarion/${id}`, body)),

	estadoProveedor: (id: number, estado: EstadoProveedor) =>
		unwrap(
			apiService.post<ApiResp<ProveedorDetalle>>(`${base}/proveedores-clarion/${id}/estado`, { IdStatus: estado }),
		),

	eliminarProveedor: async (id: number) => {
		const res = await apiService.delete<ApiResp<{ modo: 'baja' | 'eliminado' }>>(
			`${base}/proveedores-clarion/${id}`,
		);
		if (!res.data?.success) throw new Error(res.data?.mensaje || 'No se pudo borrar');
		return { ...(res.data.data as { modo: 'baja' | 'eliminado' }), mensaje: res.data.mensaje };
	},
};

function rutaStock(k: ClaveStock) {
	return `${base}/existencias/${k.IdEmpresa ?? 1}/${k.IdSucursal ?? 1}/${k.IdDeposito}/${k.IdProducto}`;
}

type RemitoSaveBody = {
	Fecha?: string;
	/** HH:mm */
	Hora?: string;
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
