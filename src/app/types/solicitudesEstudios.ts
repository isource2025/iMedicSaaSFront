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
