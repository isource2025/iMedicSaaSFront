import type { DatosPacientePedido, PedidoEstudio } from './estudios';

export type EstadoSolicitudEstudio = 'PENDIENTE' | 'TOMADA' | 'PARCIAL' | 'CUMPLIDA';

/**
 * Una solicitud de estudios = N prácticas (Items) pedidas juntas al mismo servicio.
 * `Clave` es IdSolicitud (>0) o -IdPedido cuando es un pedido anterior sin cabecera (Legacy).
 */
export interface SolicitudEstudio extends DatosPacientePedido {
  Clave: number;
  IdSolicitud: number | null;
  Legacy: boolean;
  Estado: EstadoSolicitudEstudio;
  TotalItems: number;
  ItemsCumplidos: number;
  ItemsTomados: number;
  TomadoPor?: string | null;
  MatriculaToma?: number | null;
  FechaToma?: string | null;
  IdVisita: number;
  FechaPedidoISO?: string;
  HoraPedido?: string;
  EstadoUrgencia?: string | null;
  NotasObservacion?: string | null;
  MatriculaSolicitante?: number | null;
  MedicoSolicitanteNombre?: string | null;
  SectorSolicitante?: string | null;
  SectorSolicitanteNombre?: string | null;
  SectorReceptor?: string | null;
  SectorReceptorNombre?: string | null;
  ServicioCodigo?: string | null;
  ServicioDescripcion?: string | null;
  Items: PedidoEstudio[];
}

export interface ItemSolicitudPayload {
  idTipoPedido: number;
  idPractica?: number;
}

export interface CrearSolicitudEstudiosPayload {
  idVisita: number;
  sectorSolicitante?: string;
  idSectorReceptor: string;
  items: ItemSolicitudPayload[];
  notas?: string;
  estadoUrgencia?: 'Normal' | 'Medio' | 'Urgente';
}

export interface ActualizarSolicitudEstudiosPayload {
  notas?: string;
  estadoUrgencia?: 'Normal' | 'Medio' | 'Urgente';
  /** Solo si nada fue tomado ni cumplido. */
  idSectorReceptor?: string;
  items?: ItemSolicitudPayload[];
}

export interface CumplirSolicitudPayload {
  textoInforme: string;
  sectorServicio?: string;
  /** Si se omite, se cumplen todas las prácticas pendientes. */
  idsPedidos?: number[];
}
