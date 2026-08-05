import { apiService } from './axios';
import type {
	AlmacenActa,
	AlmacenArticulo,
	AlmacenArticulosPage,
	AlmacenConfigCompleta,
	AlmacenDeposito,
	AlmacenDepositoResumen,
	AlmacenMovimiento,
	AlmacenOrden,
	AlmacenOrigen,
	AlmacenProveedor,
	AlmacenResumen,
	AlmacenRubro,
	AlmacenSolicitud,
	AlmacenStockRow,
	AlmacenTrazabilidadDetalle,
	AlmacenVademecumEstado,
	ApiResp,
} from '../types/almacen';

const base = '/almacen';

async function unwrap<T>(promise: PromiseLike<{ data: ApiResp<T> }>): Promise<T> {
	const res = await promise;
	if (!res.data?.success) {
		throw new Error(res.data?.mensaje || res.data?.message || 'Error en almacén');
	}
	return res.data.data as T;
}

export const almacenService = {
	resumen: () => unwrap(apiService.get<ApiResp<AlmacenResumen>>(`${base}/resumen`)),

	listarStock: (params?: {
		search?: string;
		idDeposito?: number;
		codigoDeposito?: string;
		bajoMinimo?: boolean;
		incluirCero?: boolean;
	}) =>
		unwrap(
			apiService.get<ApiResp<AlmacenStockRow[]>>(`${base}/stock`, {
				params: {
					search: params?.search || undefined,
					idDeposito: params?.idDeposito || undefined,
					codigoDeposito: params?.codigoDeposito || undefined,
					bajoMinimo: params?.bajoMinimo ? '1' : undefined,
					incluirCero: params?.incluirCero ? '1' : undefined,
				},
			}),
		),

	listarMovimientos: (params?: { limit?: number; idArticulo?: number }) =>
		unwrap(apiService.get<ApiResp<AlmacenMovimiento[]>>(`${base}/movimientos`, { params })),

	ajusteStock: (body: {
		idArticulo: number;
		idDeposito: number;
		lote?: string;
		cantidad: number;
		observaciones?: string;
		fechaVencimiento?: string;
	}) => unwrap(apiService.post<ApiResp<null>>(`${base}/stock/ajuste`, body)),

	salidaStock: (body: {
		idArticulo: number;
		idDeposito: number;
		lote?: string;
		cantidad: number;
		observaciones?: string;
		destino?: string;
	}) => unwrap(apiService.post<ApiResp<null>>(`${base}/stock/salida`, body)),

	listarDepositos: () => unwrap(apiService.get<ApiResp<AlmacenDeposito[]>>(`${base}/depositos`)),

	resumenDepositos: () =>
		unwrap(apiService.get<ApiResp<AlmacenDepositoResumen[]>>(`${base}/depositos/resumen`)),

	estadoVademecum: () =>
		unwrap(apiService.get<ApiResp<AlmacenVademecumEstado>>(`${base}/vademecum/estado`)),

	listarTrazabilidad: (params?: { search?: string; limit?: number; idArticulo?: number }) =>
		unwrap(
			apiService.get<ApiResp<AlmacenMovimiento[]>>(`${base}/trazabilidad`, {
				params: {
					search: params?.search || undefined,
					limit: params?.limit,
					idArticulo: params?.idArticulo || undefined,
				},
			}),
		),

	detalleTrazabilidadArticulo: (idArticulo: number) =>
		unwrap(apiService.get<ApiResp<AlmacenTrazabilidadDetalle>>(`${base}/trazabilidad/articulo/${idArticulo}`)),

	/** Paginado: devuelve { items, total, page, pageSize }. */
	listarArticulos: (opts?: string | { search?: string; page?: number; pageSize?: number; todos?: boolean }) => {
		const params =
			typeof opts === 'string'
				? { search: opts || undefined, page: 1, pageSize: 50 }
				: {
						search: opts?.search || undefined,
						page: opts?.page || 1,
						pageSize: opts?.pageSize || 50,
						todos: opts?.todos ? '1' : undefined,
					};
		return unwrap(apiService.get<ApiResp<AlmacenArticulosPage>>(`${base}/articulos`, { params }));
	},

	/** Atajo para selects (máx. pageSize, por defecto 100). */
	listarArticulosOpciones: async (search = '', pageSize = 100) => {
		const page = await unwrap(
			apiService.get<ApiResp<AlmacenArticulosPage>>(`${base}/articulos`, {
				params: { search: search || undefined, page: 1, pageSize },
			}),
		);
		return page.items || [];
	},

	crearArticulo: (body: {
		codigo: string;
		descripcion: string;
		unidadMedida?: string;
		stockMinimo?: number;
		observaciones?: string;
		tipoCodigo?: string;
		tipoNombre?: string;
	}) => unwrap(apiService.post<ApiResp<AlmacenArticulo>>(`${base}/articulos`, body)),

	actualizarArticulo: (
		id: number,
		body: Partial<{
			codigo: string;
			descripcion: string;
			unidadMedida: string;
			stockMinimo: number;
			activo: boolean;
			observaciones: string;
			tipoCodigo: string;
			tipoNombre: string;
		}>,
	) => unwrap(apiService.put<ApiResp<AlmacenArticulo>>(`${base}/articulos/${id}`, body)),

	eliminarArticulo: (id: number) =>
		unwrap(apiService.delete<ApiResp<AlmacenArticulo>>(`${base}/articulos/${id}`)),

	listarProveedores: (search = '') =>
		unwrap(
			apiService.get<ApiResp<AlmacenProveedor[]>>(`${base}/proveedores`, { params: { search } }),
		),

	crearProveedor: (body: {
		razonSocial: string;
		cuit?: string;
		direccion?: string;
		telefono?: string;
		email?: string;
		observaciones?: string;
	}) => unwrap(apiService.post<ApiResp<AlmacenProveedor>>(`${base}/proveedores`, body)),

	actualizarProveedor: (id: number, body: Partial<AlmacenProveedor> & { razonSocial?: string; observaciones?: string }) =>
		unwrap(apiService.put<ApiResp<AlmacenProveedor>>(`${base}/proveedores/${id}`, body)),

	eliminarProveedor: (id: number) =>
		unwrap(apiService.delete<ApiResp<AlmacenProveedor>>(`${base}/proveedores/${id}`)),

	listarSolicitudes: (params?: {
		estado?: string;
		search?: string;
		destino?: string;
		origen?: string;
		idSector?: string;
	}) =>
		unwrap(
			apiService.get<ApiResp<AlmacenSolicitud[]>>(`${base}/solicitudes`, {
				params: {
					estado: params?.estado,
					search: params?.search,
					idSector: params?.idSector || params?.origen || params?.destino,
				},
			}),
		),

	listarOrigenes: (opts?: { todos?: boolean; mios?: boolean }) =>
		unwrap(
			apiService.get<ApiResp<AlmacenOrigen[]>>(`${base}/solicitudes/origenes`, {
				params: {
					todos: opts?.todos ? '1' : undefined,
					mios: opts?.mios ? '1' : undefined,
				},
			}),
		),

	proximoNroPedido: () =>
		unwrap(apiService.get<ApiResp<{ nroPedido: string }>>(`${base}/solicitudes/proximo-nro`)),

	buscarArticuloPorCodigo: (
		codigo: string,
		params?: { origen?: string; idSector?: string; idDeposito?: number },
	) =>
		unwrap(
			apiService.get<ApiResp<AlmacenArticulo>>(
				`${base}/articulos/codigo/${encodeURIComponent(codigo)}`,
				{ params },
			),
		),

	obtenerSolicitud: (id: number) =>
		unwrap(apiService.get<ApiResp<AlmacenSolicitud>>(`${base}/solicitudes/${id}`)),

	crearSolicitud: (body: Record<string, unknown>) =>
		unwrap(apiService.post<ApiResp<AlmacenSolicitud>>(`${base}/solicitudes`, body)),

	actualizarSolicitud: (id: number, body: Record<string, unknown>) =>
		unwrap(apiService.put<ApiResp<AlmacenSolicitud>>(`${base}/solicitudes/${id}`, body)),

	cambiarEstadoSolicitud: (
		id: number,
		body: { estado: string; aprobador?: string; costoEstimado?: number },
	) => unwrap(apiService.post<ApiResp<AlmacenSolicitud>>(`${base}/solicitudes/${id}/estado`, body)),

	crearOrdenDesdeSolicitud: (idSolicitud: number, body: Record<string, unknown>) =>
		unwrap(apiService.post<ApiResp<AlmacenOrden>>(`${base}/solicitudes/${idSolicitud}/orden`, body)),

	ejecutarTransferenciaSolicitud: (idSolicitud: number) =>
		unwrap(
			apiService.post<ApiResp<AlmacenSolicitud>>(`${base}/solicitudes/${idSolicitud}/transferir`, {}),
		),

	listarOrdenes: (params?: { estado?: string; search?: string }) =>
		unwrap(apiService.get<ApiResp<AlmacenOrden[]>>(`${base}/ordenes`, { params })),

	obtenerOrden: (id: number) => unwrap(apiService.get<ApiResp<AlmacenOrden>>(`${base}/ordenes/${id}`)),

	crearOrden: (body: Record<string, unknown>) =>
		unwrap(apiService.post<ApiResp<AlmacenOrden>>(`${base}/ordenes`, body)),

	anularOrden: (id: number) =>
		unwrap(apiService.post<ApiResp<AlmacenOrden>>(`${base}/ordenes/${id}/anular`, {})),

	listarActas: (search = '') =>
		unwrap(apiService.get<ApiResp<AlmacenActa[]>>(`${base}/actas`, { params: { search } })),

	obtenerActa: (id: number) => unwrap(apiService.get<ApiResp<AlmacenActa>>(`${base}/actas/${id}`)),

	crearActa: (body: Record<string, unknown>) =>
		unwrap(apiService.post<ApiResp<AlmacenActa>>(`${base}/actas`, body)),

	getConfig: () => unwrap(apiService.get<ApiResp<AlmacenConfigCompleta>>(`${base}/config`)),

	listarRubros: (todos = false) =>
		unwrap(
			apiService.get<ApiResp<AlmacenRubro[]>>(`${base}/config/rubros`, {
				params: todos ? { todos: '1' } : undefined,
			}),
		),

	guardarRubro: (body: {
		idRubro?: number;
		codigo?: string;
		nombre?: string;
		activo?: boolean;
	}) => unwrap(apiService.post<ApiResp<AlmacenRubro>>(`${base}/config/rubros`, body)),

	eliminarRubro: (id: number) =>
		unwrap(apiService.delete<ApiResp<null>>(`${base}/config/rubros/${id}`)),

	guardarConfigSector: (body: {
		idSector: string;
		idDeposito?: number | null;
		puedeSolicitar?: boolean;
		activo?: boolean;
		orden?: number;
		observaciones?: string;
	}) => unwrap(apiService.post<ApiResp<unknown>>(`${base}/config/sectores`, body)),

	eliminarConfigSector: (idConfig: number) =>
		unwrap(apiService.delete<ApiResp<null>>(`${base}/config/sectores/${idConfig}`)),

	guardarDeposito: (body: {
		idDeposito?: number;
		codigo: string;
		nombre: string;
		esPrincipal?: boolean;
		activo?: boolean;
	}) => unwrap(apiService.post<ApiResp<AlmacenDeposito[]>>(`${base}/config/depositos`, body)),

	eliminarDeposito: (id: number) =>
		unwrap(apiService.delete<ApiResp<AlmacenDeposito[]>>(`${base}/config/depositos/${id}`)),
};

export default almacenService;
