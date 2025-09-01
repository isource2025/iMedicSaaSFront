export interface EstudioProgramado {
  id: number;
  descripcion: string;
  fecha?: string; // ISO string programada
  hora?: string;  // HH:mm
  area?: string;  // Laboratorio, Imagen, etc.
  observaciones?: string;
}

export interface EstudiosProgramadosResponse {
  success: boolean;
  mensaje?: string;
  data: EstudioProgramado[];
}
