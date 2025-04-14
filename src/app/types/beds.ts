export type BedEstado = 'ocupada' | 'disponible' | 'mantenimiento';

export interface Bed {
  id: string;
  sector: string;
  numeroCama: string;
  estado: BedEstado;
  fechaIngreso: number;
  fechaEgreso: number;
  numeroVisita: number;
  observaciones: string;
}
