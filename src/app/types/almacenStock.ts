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
	Foto?: string | null;
	TieneFoto?: boolean;
	Activo?: boolean;
	StockTotal?: number | null;
	DepositosConStock?: number | null;
	DepositosBajoMinimo?: number | null;
}

export type ProductosEstadoFiltro = '' | 'activos' | 'baja';
export type ProductosStockFiltro = '' | 'con' | 'sin' | 'bajo';
export type ProductosOrden = 'descripcion' | 'codigo' | 'precio' | 'stock';

export interface ProductosResumen {
	total: number;
	activos: number;
	bajas: number;
	conFoto: number;
	conPrecio: number;
	conBarra: number;
	conStock: number;
	bajoMinimo: number;
	conProveedor: number;
	pctActivos: number;
	pctConStock: number;
	pctConPrecio: number;
	pctConFoto: number;
	porRubro: { IdRubro: number | null; Descripcion: string; cantidad: number; conStock: number }[];
}

export interface ActividadDia {
	dia: string;
	entradas: number;
	salidas: number;
}

export interface MovimientoStock {
	Origen: 'REM' | 'AJU';
	IdTransaccion: number | null;
	Comprobante: string;
	Fecha: string | null;
	Hora: string | null;
	IdDeposito: number;
	DepositoNombre: string;
	IdProducto: number;
	ProductoNombre: string;
	Cantidad: number;
	Concepto: string | null;
}

export interface MovimientosPage {
	items: MovimientoStock[];
	page: number;
	pageSize: number;
	hasMore: boolean;
	dias: number | null;
}

export interface ProveedorDeProducto {
	IdProveedor: number;
	Descripcion: string;
	CodProveedor?: string | null;
	PrecioRef?: number | null;
	FechaRef?: string | null;
	PlazoEntrega?: number | null;
	IdStatus?: number | null;
}

export interface ProductoFicha {
	producto: ProductoStock;
	stock: ExistenciaStock[];
	proveedores: ProveedorDeProducto[];
	movimientos: MovimientoStock[];
	actividad: ActividadDia[];
	remitos: number;
	ultimoRemito: string | null;
}

export type CatalogoProductoNombre = 'rubros' | 'subrubros' | 'marcas' | 'unidades';

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
	/** Etiqueta UI: Descripcion — SectorNombre si hace falta. */
	Label?: string | null;
	SectorNombre?: string | null;
	IdDeposito: number;
	Descripcion?: string | null;
	IdSector?: string | null;
}

/** Candidato RSM desde imInterIndMedicas (Tipo = M). */
export interface CandidatoSalidaServicio {
	NroIndicacion: number;
	NumeroVisita: number;
	IdPaciente?: number | null;
	PacienteNombre?: string | null;
	Cama?: string | null;
	ValorSector?: string | null;
	ObraSocial?: string | null;
	Codigo?: number | null;
	IdProducto?: number | null;
	DescripcionProducto?: string | null;
	Frecuencia?: string | null;
	TipoIndicacionDescripcion?: string | null;
	Cantidad: number;
	CantidadEntregada: number;
	CantidadPendiente: number;
	CantidadSugerida: number;
	ImporteUnitario?: number | null;
	IdUnidad?: string | null;
	sinProducto?: boolean;
}

export interface CandidatosSalidaServicioResp {
	valorSector: string;
	idDepositoDest?: number | null;
	fecha: string;
	visitas: number;
	lineas: CandidatoSalidaServicio[];
}

/** Resumen de medicación Tipo M pendiente de entregar, por servicio/sector. */
export interface MedicacionPendienteServicio {
	ValorSector: string;
	SectorNombre?: string | null;
	IdDeposito?: number | null;
	DepositoNombre?: string | null;
	Lineas: number;
	Visitas: number;
	Pacientes: number;
}

export interface MedicacionPendienteServiciosResp {
	fecha: string;
	totalServicios: number;
	totalLineas: number;
	totalVisitas: number;
	servicios: MedicacionPendienteServicio[];
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

/** RemitosItems (+ datos de display de paciente / ubicación / OS) */
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
	PacienteNombre?: string | null;
	Cama?: string | null;
	ValorSector?: string | null;
	ObraSocial?: string | null;
	IdTipo?: string | null;
	Sentido?: string | null;
	IdDeposito?: number | null;
	NroIndicacion?: number | null;
}

/** Remitos (cabecera) */
export interface RemitoCabecera {
	IdTransaccion: number;
	TipoCbte?: string | null;
	TipoNombre?: string | null;
	/** E = entrada, S = salida (Tipos_Remitos.Sentido). */
	Sentido?: string | null;
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
	/** Si > 0, este remito es el espejo generado automáticamente desde esa transacción. */
	IdTransaccionOrig?: number | null;
	/** Vista de lista: primer comentario de Remitos_Observa. */
	Observaciones?: string | null;
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

/** Nivel de una fila de Stock según mínimo / punto de pedido / máximo. */
export type EstadoStock = 'sin' | 'bajo' | 'reponer' | 'exceso' | 'ok';
export type ExistenciasEstadoFiltro = '' | 'con' | 'sinParametros' | EstadoStock;
export type ExistenciasOrden = 'producto' | 'deposito' | 'cantidad' | 'critico' | 'reciente';

/** dbo.Stock + Productos + Depositos */
export interface ExistenciaStock {
	IdProducto: number;
	IdEmpresa?: number;
	IdSucursal?: number;
	/** null cuando la lista viene agrupada por producto (todos los depósitos). */
	IdDeposito: number | null;
	DepositoNombre?: string | null;
	DepositosCount?: number | null;
	agrupado?: boolean;
	Fecha?: string | null;
	Ubicacion?: string | null;
	StockMinimo?: number | null;
	StockMaximo?: number | null;
	PuntoPedido?: number | null;
	CantFisico: number;
	CantDisp: number;
	CodAlternativo?: string | null;
	Descripcion?: string | null;
	DescripcionC?: string | null;
	IdUnidad?: string | null;
	UnidadNombre?: string | null;
	IdRubro?: number | null;
	RubroNombre?: string | null;
	TieneFoto?: boolean;
	Precio?: number;
	Valorizado?: number;
	estado?: EstadoStock;
	nivelPct?: number | null;
	bajoMinimo?: boolean;
	bajoPunto?: boolean;
}

export interface ExistenciasPage {
	items: ExistenciaStock[];
	/** true = un renglón por producto con totales; false = por depósito. */
	agrupadoPorProducto?: boolean;
	total: number;
	page: number;
	pageSize: number;
	totalPages: number;
}

export interface ExistenciasCatalogos {
	depositos: RemitoDeposito[];
	rubros?: { IdRubro: number; Descripcion: string }[];
}

export interface ExistenciasResumen {
	filas: number;
	productos: number;
	depositos: number;
	conStock: number;
	sinStock: number;
	bajoMinimo: number;
	aReponer: number;
	exceso: number;
	conParametros: number;
	unidades: number;
	valorizado: number;
	pctConStock: number;
	pctConParametros: number;
	porDeposito: {
		IdDeposito: number;
		Descripcion: string;
		filas: number;
		conStock: number;
		bajoMinimo: number;
		unidades: number;
		valorizado: number;
	}[];
	porRubro: { IdRubro: number | null; Descripcion: string; filas: number; unidades: number; valorizado: number }[];
	actividad: ActividadDia[];
}

export interface ClaveStock {
	IdEmpresa?: number;
	IdSucursal?: number;
	IdDeposito: number;
	IdProducto: number;
}

export interface ParametrosStock {
	Ubicacion?: string;
	StockMinimo?: number;
	StockMaximo?: number;
	PuntoPedido?: number;
}

export interface AjusteResultado {
	IdTransaccion: number;
	Comprobante: string;
	NroCbte: number;
	delta?: number;
}

export type ExistenciaConAjuste = ExistenciaStock & { ajuste: AjusteResultado | null };

/** Status_Prov: 1 activo, 2 suspendido, 3 baja. */
export type EstadoProveedor = 1 | 2 | 3;
export type ProveedoresOrden = 'nombre' | 'reciente' | 'actividad' | 'codigo';

export interface ProveedorClarion {
	IdProveedor: number;
	Descripcion: string;
	NombreFantasia?: string | null;
	FechaAlta?: string | null;
	IdStatus?: number | null;
	StatusNombre?: string | null;
	IdTipoProv?: number | null;
	TipoNombre?: string | null;
	IdTipoProvCateg?: number | null;
	CategNombre?: string | null;
	Cuit?: string | null;
	CuitFmt?: string | null;
	IdTipoIva?: number | null;
	TipoIvaNombre?: string | null;
	Email?: string | null;
	Calle?: string | null;
	CalleNro?: number | null;
	Piso?: string | null;
	Depto?: string | null;
	IdCodPostal?: string | null;
	IdLocalidad?: number | null;
	LocalidadNombre?: string | null;
	IdProvincia?: number | null;
	ProvinciaNombre?: string | null;
	IdPais?: number | null;
	EntreCalles?: string | null;
	ChequesOrden?: string | null;
	IdBanco?: number | null;
	NroCuenta?: string | null;
	Descuento?: number;
	Domicilio?: string | null;
	Remitos?: number;
	UltimoRemito?: string | null;
	ImporteRemitos?: number;
	Productos?: number;
	Telefono?: string | null;
}

export interface ProveedorTelefono {
	Tipo?: string | null;
	Numero: string;
	Observaciones?: string | null;
}

export interface ProveedorContacto {
	Contacto: string;
	Cargo?: string | null;
	Interno?: string | null;
	Email?: string | null;
	Comentarios?: string | null;
}

export interface ProveedorObservacion {
	Fecha: string;
	Nro: number;
	Comentarios: string | null;
}

export interface ProveedorProducto {
	IdRegistro?: number;
	IdProducto: number;
	ProductoNombre?: string;
	IdUnidad?: string | null;
	CodProveedor?: string | null;
	DescProveedor?: string | null;
	PrecioRef?: number | null;
	FechaRef?: string | null;
	PlazoEntrega?: number | null;
}

export interface ProveedorDetalle extends ProveedorClarion {
	telefonos: ProveedorTelefono[];
	contactos: ProveedorContacto[];
	observaciones: ProveedorObservacion[];
	productos: ProveedorProducto[];
	ultimosRemitos: {
		IdTransaccion: number;
		Comprobante: string;
		Fecha: string | null;
		Importe: number;
		IdStatus: number | null;
		DepositoNombre: string | null;
	}[];
}

export type ProveedorSaveBody = Partial<ProveedorClarion> & {
	Descripcion: string;
	telefonos?: ProveedorTelefono[];
	contactos?: ProveedorContacto[];
	productos?: ProveedorProducto[];
	NuevaObservacion?: string;
};

export interface ProveedoresResumen {
	total: number;
	activos: number;
	suspendidos: number;
	bajas: number;
	conCuit: number;
	conEmail: number;
	conDomicilio: number;
	conRemitos: number;
	nuevos90: number;
	pctActivos: number;
	pctConCuit: number;
	pctConEmail: number;
	pctConDomicilio: number;
	porTipo: { IdTipoProv: number | null; Descripcion: string; cantidad: number }[];
	top: { IdProveedor: number; Descripcion: string; remitos: number; importe: number; ultimo: string | null }[];
}

export interface ProveedoresCatalogos {
	estados: { IdStatus: number; Descripcion: string }[];
	tipos: { IdTipoProv: number; Descripcion: string }[];
	categorias: { IdTipoProvCateg: number; Descripcion: string }[];
	tiposIva: { IdTipoIva: number; Descripcion: string; TipoIva?: string }[];
	paises: { IdPais: number; Descripcion: string }[];
	provincias: { IdProvincia: number; Descripcion: string; IdPais?: number }[];
	localidades: { IdLocalidad: number; Descripcion: string; IdProvincia?: number }[];
	bancos: { IdBanco: number; Descripcion: string }[];
	nextId: number;
}

export interface ProveedoresClarionPage {
	items: ProveedorClarion[];
	total: number;
	page: number;
	pageSize: number;
	totalPages: number;
}
