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
  Cumplido?: boolean;
  EstadoUrgencia?: string;
  SectorSolicitante?: string;
  SectorSolicitanteNombre?: string;
  SectorReceptor?: string;
  SectorReceptorNombre?: string;
  ServicioCodigo?: string;
  ServicioDescripcion?: string;
  CategoriaPedido?: string;
  TextoResultado?: string | null;
  FechaResultado?: string | null;
  PracticaFacturada?: number | null;
  MatriculaRealizador?: number | null;
  RealizadorNombre?: string | null;
  Tomado?: boolean;
  MatriculaToma?: number | null;
  NombreToma?: string | null;
  FechaToma?: string | null;
  EstadoWorkflow?: 'PENDIENTE' | 'TOMADO' | 'CUMPLIDO' | string;
  PacienteNombre?: string | null;
  PacienteDocumento?: string | null;
  PacienteSexo?: string | null;
  PacienteSexoDescripcion?: string | null;
  ObraSocial?: string | null;
  TipoAtencion?: 'AMBULATORIO' | 'INTERNADO' | string | null;
  Ubicacion?: string | null;
  IdPaciente?: number | null;
}

export interface SectorReceptorEstudio {
  valor: string;
  descripcion: string;
  prefijos: string[];
}

export interface TipoPedidoEstudio {
  idTipoPedido: number;
  descripcion: string;
  idPractica: number;
}

export interface CrearPedidoEstudioPayload {
  idVisita: number;
  sectorSolicitante: string;
  idTipoPedido: number;
  idSectorReceptor: string;
  notas?: string;
  estadoUrgencia?: 'Normal' | 'Medio' | 'Urgente';
  matriculaSolicitante?: number;
}

export interface CumplirPedidoPayload {
  textoInforme: string;
  sectorServicio?: string;
  codPractica?: number;
  matriculaRealizador?: number;
}

export interface PedidosEstudiosResponse {
  success: boolean;
  mensaje?: string;
  data: PedidoEstudio[];
}
