export type AlmacenTab =
	| 'stock'
	| 'depositos'
	| 'articulos'
	| 'proveedores'
	| 'solicitudes'
	| 'ordenes'
	| 'actas'
	| 'trazabilidad'
	| 'movimientos'
	| 'config';

export interface AlmacenOrigen {
	IdSector: string;
	Nombre: string;
	IdConfig?: number | null;
	IdDeposito?: number | null;
	DepositoCodigo?: string | null;
	DepositoNombre?: string | null;
}

export interface AlmacenRubro {
	IdRubro: number;
	Codigo: string;
	Nombre: string;
	Activo: boolean | number;
	Orden: number;
}

export interface AlmacenConfigSector {
	IdConfig: number;
	IdSector: string;
	Nombre: string;
	IdDeposito?: number | null;
	DepositoCodigo?: string | null;
	DepositoNombre?: string | null;
	PuedeSolicitar: boolean | number;
	Activo: boolean | number;
	Orden: number;
	Observaciones?: string | null;
}

export interface AlmacenConfigCompleta {
	sectoresConfig: AlmacenConfigSector[];
	sectoresHospital: { IdSector: string; Nombre: string; AmbInt?: unknown }[];
	rubros: AlmacenRubro[];
	depositos: AlmacenDeposito[];
}

export type EstadoSolicitud =
	| 'BORRADOR'
	| 'SOLICITADA'
	| 'APROBADA'
	| 'RECHAZADA'
	| 'EN_COMPRA'
	| 'COMPLETADA'
	| 'ANULADA';

export type EstadoOrden = 'EMITIDA' | 'PARCIAL' | 'RECIBIDA' | 'ANULADA';

export interface AlmacenResumen {
	articulosActivos: number;
	solicitudesPendientes: number;
	ordenesAbiertas: number;
	actasUltimos30Dias: number;
	articulosBajoMinimo: number;
	/** Bajo mínimo por cada depósito activo (datos de BD, sin códigos fijos) */
	bajoMinimoPorDeposito?: {
		idDeposito: number;
		codigo: string;
		nombre: string;
		esPrincipal?: boolean;
		bajoMinimo: number;
	}[];
}

export type OrigenSolicitud = string;

export interface AlmacenDeposito {
	IdDeposito: number;
	Codigo: string;
	Nombre: string;
	EsPrincipal: boolean | number;
	Activo: boolean | number;
}

export interface AlmacenDepositoTipoResumen {
	tipoCodigo: string;
	tipoNombre: string;
	items: number;
	itemsConStock: number;
	bajoMinimo: number;
	stockTotal: number;
	stockMinimoTotal: number;
	porcentaje: number;
}

export interface AlmacenDepositoResumen extends AlmacenDeposito {
	itemsCatalogo: number;
	stockTotal: number;
	bajoMinimo: number;
	porTipo: AlmacenDepositoTipoResumen[];
}

export interface AlmacenArticulo {
	IdArticulo: number;
	Codigo: string;
	Descripcion: string;
	UnidadMedida?: string | null;
	StockMinimo: number;
	Activo: boolean | number;
	Observaciones?: string | null;
	StockTotal?: number;
	TipoCodigo?: string | null;
	TipoNombre?: string | null;
	Origen?: string | null;
}

export interface AlmacenVademecumEstado {
	disponible: boolean;
	enVademecum: number;
	importados: number;
	articulosActivos?: number;
	mensaje?: string | null;
	insertados?: number;
	actualizados?: number;
	nota?: string;
	ultimaSync?: string | null;
	autoSync?: boolean;
}

export interface AlmacenArticulosPage {
	items: AlmacenArticulo[];
	total: number;
	page: number;
	pageSize: number;
}

export interface AlmacenProveedor {
	IdProveedor: number;
	RazonSocial: string;
	CUIT?: string | null;
	Direccion?: string | null;
	Telefono?: string | null;
	Email?: string | null;
	Observaciones?: string | null;
	Activo: boolean | number;
}

export interface AlmacenStockRow {
	IdArticulo: number;
	Codigo: string;
	Descripcion: string;
	UnidadMedida?: string | null;
	StockMinimo: number;
	IdDeposito: number;
	Deposito: string;
	DepositoCodigo?: string;
	Lote: string;
	Cantidad: number;
	FechaVencimiento?: string | null;
	BajoMinimo: number | boolean;
	TipoCodigo?: string | null;
	TipoNombre?: string | null;
	Origen?: string | null;
}

export interface AlmacenMovimiento {
	IdMovimiento: number;
	Tipo: string;
	IdArticulo: number;
	Codigo: string;
	Descripcion: string;
	UnidadMedida?: string | null;
	IdDeposito: number;
	Deposito: string;
	DepositoCodigo?: string | null;
	Lote: string;
	Cantidad: number;
	SaldoResultante?: number | null;
	IdDocumento?: number | null;
	TipoDocumento?: string | null;
	Observaciones?: string | null;
	Fecha: string;
	Operador?: string | null;
	NroDocumento?: string | null;
	IdDocumentoPadre?: number | null;
	NroDocumentoPadre?: string | null;
}

export interface SolicitudItem {
	IdItem?: number;
	IdSolicitud?: number;
	Renglon?: number;
	IdArticulo?: number | null;
	Codigo?: string | null;
	Descripcion: string;
	Observaciones?: string | null;
	Cantidad: number;
	Existencia?: number;
	StockMinimo?: number;
	UnidadMedida?: string | null;
}

export interface AlmacenSolicitud {
	IdSolicitud: number;
	NroPedido: string;
	FechaPedido: string;
	FechaEmision?: string | null;
	/** @deprecated usar Origen — columna legacy Destino */
	Destino?: string | null;
	/** Sector hospital (imSectores) que pide */
	IdSector?: string | null;
	/** Nombre del sector origen */
	Origen?: OrigenSolicitud | null;
	Justificacion?: string | null;
	Estado: EstadoSolicitud | string;
	/** COMPRA (provisión / compra) | TRANSFERENCIA (entre depósitos) */
	TipoSolicitud?: 'COMPRA' | 'TRANSFERENCIA' | string | null;
	IdDepositoOrigen?: number | null;
	IdDepositoDestino?: number | null;
	DepositoOrigenNombre?: string | null;
	DepositoOrigenCodigo?: string | null;
	DepositoDestinoNombre?: string | null;
	DepositoDestinoCodigo?: string | null;
	Solicitante?: string | null;
	Aprobador?: string | null;
	FechaAprobacion?: string | null;
	CostoEstimado?: number | null;
	Observaciones?: string | null;
	PedidoParaDias?: number | null;
	FrecuenciaMuestreoMeses?: number | null;
	RetrasoEstimadoDias?: number | null;
	IncluirSinMovimientos?: boolean | number | null;
	IncluirStockSuficiente?: boolean | number | null;
	Rubro?: string | null;
	FechaUltimaMod?: string | null;
	FechaAlta?: string | null;
	Emitido?: boolean | number;
	Satisfecho?: boolean | number;
	CantItems?: number;
	items?: SolicitudItem[];
}

export interface AlmacenTrazabilidadDetalle {
	articulo: AlmacenArticulo;
	ubicaciones: { IdDeposito: number; Codigo: string; Nombre: string; Cantidad: number }[];
	timeline: {
		fecha: string;
		tipo: string;
		cantidad: number;
		saldo?: number | null;
		ubicacion?: string | null;
		ubicacionCodigo?: string | null;
		lote?: string | null;
		documentoTipo?: string | null;
		documentoId?: number | null;
		documentoNro?: string | null;
		documentoPadreNro?: string | null;
		operador?: string | null;
		observaciones?: string | null;
		idMovimiento: number;
	}[];
}

export interface OrdenItem {
	IdItem?: number;
	IdOrden?: number;
	Renglon?: number;
	IdArticulo?: number | null;
	Descripcion: string;
	Observaciones?: string | null;
	Cantidad: number;
	PrecioUnitario: number;
	Subtotal: number;
	CantidadRecibida?: number;
}

export interface AlmacenOrden {
	IdOrden: number;
	NroOrden: string;
	IdSolicitud?: number | null;
	NroPedido?: string | null;
	NroExpediente?: string | null;
	NroConcurso?: string | null;
	NroAdjudicacion?: string | null;
	NroAutorizacion?: string | null;
	TipoOperacion?: string | null;
	CondPago?: string | null;
	FechaInvitacion?: string | null;
	LugarEntrega?: string | null;
	IdProveedor?: number | null;
	IdDeposito?: number | null;
	Estado: EstadoOrden | string;
	Total: number;
	Observaciones?: string | null;
	Proveedor?: string | null;
	ProveedorCUIT?: string | null;
	ProveedorDireccion?: string | null;
	DepositoNombre?: string | null;
	items?: OrdenItem[];
}

export interface ActaItem {
	IdItem?: number;
	IdActa?: number;
	Renglon?: number;
	IdArticulo?: number | null;
	IdOrdenItem?: number | null;
	Descripcion: string;
	Marca?: string | null;
	Lote?: string | null;
	Cantidad: number;
	PrecioUnitario: number;
	PrecioTotal: number;
}

export interface AlmacenActa {
	IdActa: number;
	NroActa: string;
	Fecha: string;
	IdOrden: number;
	NroOrden?: string;
	NroExpediente?: string | null;
	IdProveedor?: number | null;
	IdDeposito: number;
	Descuento: number;
	Total: number;
	NroFactura?: string | null;
	Estado: string;
	Observaciones?: string | null;
	Proveedor?: string | null;
	ProveedorCUIT?: string | null;
	DepositoNombre?: string | null;
	items?: ActaItem[];
}

export interface ApiResp<T> {
	success: boolean;
	data?: T;
	mensaje?: string;
	message?: string;
}
