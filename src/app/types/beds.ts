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
  sector: string;
  numeroCama: string;
  estado: BedEstado;
  valorEstadoOriginal: string; // Valor original del estado (A, I, C, U, O, H, R)
  fechaIngreso: number;
  fechaEgreso: number;
  numeroVisita: number;
  observaciones: string;
}

export interface BedState {
  id: string;
  valor: string;
  descripcion: string;
}
