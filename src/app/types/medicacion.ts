export interface MedicacionActiva {
  id: number;
  descripcion: string;
  dosis?: string;
  frecuencia?: string;
  via?: string;
  fechaInicio?: string; // ISO string
  prescriptor?: string;
}

export interface MedicacionActivaResponse {
  success: boolean;
  mensaje?: string;
  data: MedicacionActiva[];
}
