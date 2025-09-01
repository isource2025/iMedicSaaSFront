export type BedEstado = 
  | 'acompañante' 
  | 'aislada' 
  | 'cerrada' 
  | 'desocupada' 
  | 'ocupada' 
  | 'Que haceres domésticos' 
  | 'reparacion'
  | 'disponible'
  | 'mantenimiento';

export interface Bed {
  id: string;
  numeroCama: string;
  sector: string;
  estado: string;
  valorEstadoOriginal?: string;
  fechaIngreso?: number;
  fechaEgreso?: number;
  observaciones?: string;
  numeroVisita?: number;
  mostrarNumeroVisita?: string;
  nombrePaciente?: string;
  documentoPaciente?: string;
  SexoPaciente?: string;
  descripcionSexo?: string;
  estadoDescripcion?: string;
  diagnosticoDescripcion?: string;
  servicioMedicoDescripcion?: string;
  razonSocialCliente?: string;
  fechaAdmisionMovimiento?: number; // Fecha exacta del movimiento
  horaAdmisionMovimiento?: number; // Hora exacta del movimiento
  fechaIngresoFormateada?: string; // Fecha ya formateada desde el padre
}

export interface BedState {
  id: string;
  valor: string;
  descripcion: string;
}
