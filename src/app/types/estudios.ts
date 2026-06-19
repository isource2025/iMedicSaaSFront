export interface PedidoEstudio {
  IdPedido: number;
  IdVisita: number;
  FechaPedido?: string;
  FechaPedidoISO: string;
  HoraPedido?: string;
  IdTipoPedido?: number;
  TipoPedidoDescripcion?: string;
  CodigoPractica?: number;
  PracticaSolicitada: string;
  NomencladorDescripcion?: string;
  NotasObservacion?: string;
  MatriculaSolicitante?: number;
  MedicoSolicitanteNombre?: string;
  IdProtocolo?: number;
  EstadoUrgencia?: string;
  SectorSolicitante?: string;
  SectorSolicitanteNombre?: string;
  SectorReceptor?: string;
  SectorReceptorNombre?: string;
  ServicioCodigo?: string;
  ServicioDescripcion?: string;
  CategoriaPedido?: string;
}

export interface PedidosEstudiosResponse {
  success: boolean;
  mensaje?: string;
  data: PedidoEstudio[];
}
