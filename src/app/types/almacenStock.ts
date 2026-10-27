export interface ProductoStock {
	IdProducto: number;
	CodAlternativo?: string | null;
	Descripcion?: string | null;
	DescripcionC?: string | null;
	IdRubro?: number | null;
	IdSubRubro?: number | null;
	IdLinea?: number | null;
	IdStatus?: number | null;
	IdTipoMateria?: string | null;
	IdUnidad?: string | null;
	UnidadNombre?: string | null;
	IdTipoPrd?: number | null;
	TipoPrdNombre?: string | null;
	IdMarca?: number | null;
	MarcaNombre?: string | null;
	IdColor?: number | null;
	ColorNombre?: string | null;
	IdMoneda?: number | null;
	MonedaNombre?: string | null;
	IdTipoIva?: number | null;
	TipoIvaNombre?: string | null;
	PrecioBase?: number | null;
	PrecioVenta?: number | null;
	PrecioCosto?: number | null;
	PuntoPedido?: number | null;
	Cotizacion?: number | null;
	StockMinimo?: number | null;
	StockMaximo?: number | null;
	ControlarStock?: number | null;
	EnLista?: number | null;
	ConFabricacion?: number | null;
	EsKit?: number | null;
	EsPartida?: number | null;
	IdCtaVta?: number | null;
	CtaVtaNombre?: string | null;
	IdCtaCmpra?: number | null;
	CtaCmpraNombre?: string | null;
	RubroNombre?: string | null;
	SubRubroNombre?: string | null;
	RubSubLin?: string | null;
	CBarra?: string | null;
	Texto?: string | null;
}

export interface ProductosPage {
	items: ProductoStock[];
	total: number;
	page: number;
	pageSize: number;
	totalPages: number;
}

export interface CatalogoItem {
	Id?: number;
	Descripcion: string;
	[key: string]: unknown;
}

export interface ProductosCatalogos {
	rubros: { IdRubro: number; Descripcion: string }[];
	subrubros: { IdSubRubro: number; IdRubro: number; Descripcion: string }[];
	unidades: { IdUnidad: string; Descripcion: string }[];
	marcas?: { IdMarca: number; Descripcion: string }[];
	colores?: { IdColor: number; Descripcion: string }[];
	tiposPrd?: { IdTipoPrd: number; Descripcion: string }[];
	monedas?: { IdMoneda: number; Descripcion: string }[];
	tiposIva?: { IdTipoIva: number; Descripcion: string; TipoIva?: string }[];
	nextId?: number;
}

export interface PlanCuentaOpt {
	IdCuenta: number;
	CodCuenta?: string | null;
	Descripcion?: string | null;
	label?: string;
}

export type ProductoSearchCampo =
	| 'descripcion'
	| 'codigo'
	| 'secundario'
	| 'rubro'
	| 'subrubro'
	| 'barra'
	| 'toda'
	| 'alias';

/** Remitos — Tipos_Remitos */
export interface RemitoTipo {
	IdTipo: string;
	Descripcion?: string | null;
	Sentido?: string | null;
	usaProveedor?: boolean;
	usaDepDestino?: boolean;
	usaCliente?: boolean;
	IdStatus?: number | null;
}

export interface RemitoDeposito {
	IdDeposito: number;
	Descripcion?: string | null;
}

export interface RemitoProveedor {
	IdProveedor: number;
	Descripcion?: string | null;
}

export interface RemitoCliente {
	IdCliente: number;
	Descripcion?: string | null;
}

export interface RemitoPaciente {
	IdPaciente: number;
	Descripcion?: string | null;
	Documento?: string | null;
}

/** RemitosItems */
export interface RemitoItem {
	IdTransaccion?: number;
	Renglon?: number;
	IdProducto: number;
	DescripcionProducto?: string | null;
	Cantidad: number;
	IdUnidad?: string | null;
	ImporteUnitario: number;
	ImporteTotal: number;
	IdPaciente?: number | null;
	IdTipo?: string | null;
	Sentido?: string | null;
	IdDeposito?: number | null;
}

/** Remitos (cabecera) */
export interface RemitoCabecera {
	IdTransaccion: number;
	TipoCbte?: string | null;
	TipoNombre?: string | null;
	GrupoCbte?: number | null;
	LetraCbte?: string | null;
	NroCbte?: number | null;
	NroRemitoFmt?: string | null;
	IdDeposito?: number | null;
	DepositoNombre?: string | null;
	IdDepositoDest?: number | null;
	DepositoDestNombre?: string | null;
	IdProveedor?: number | null;
	ProveedorNombre?: string | null;
	IdCliente?: number | null;
	ClienteNombre?: string | null;
	Fecha?: string | null;
	Bultos?: number | null;
	IdStatus?: number | null;
	StatusNombre?: string | null;
	ImportePPP?: number | null;
	TotalRemito?: number;
	items?: RemitoItem[];
	observaciones?: { Item: number; Fecha?: string | null; Comentarios?: string | null }[];
}

export interface RemitosPage {
	items: RemitoCabecera[];
	total: number;
	page: number;
	pageSize: number;
	totalPages: number;
}

export interface RemitosCatalogos {
	tipos: RemitoTipo[];
	depositos: RemitoDeposito[];
	proveedores: RemitoProveedor[];
}
