export interface PedidoEstudio {
  IdPedido: number;
  IdVisita: number;
  FechaPedido?: string;
  FechaPedidoISO: string;
  HoraPedido?: string;
  IdTipoPedido?: number;
  CodigoPractica?: number;
  PracticaSolicitada: string;
  NotasObservacion?: string;
  MatriculaSolicitante?: number;
  MedicoSolicitanteNombre?: string;
  IdProtocolo?: number;
  EstadoUrgencia?: string;
  SectorSolicitante?: string;
  SectorReceptor?: string;
  SectorReceptorNombre?: string;
}

export interface PedidosEstudiosResponse {
  success: boolean;
  mensaje?: string;
  data: PedidoEstudio[];
}
