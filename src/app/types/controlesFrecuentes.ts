export interface ControlFrecuente {
  Valor: number;
  NumeroVisita: number | null;
  FechaCarga: string | null;
  HoraCarga: string | null;
  OperadorCarga: number | null;
  OperadorApellido: string | null;
  OperadorNombres: string | null;
  Profesional: number | null;
  ProfesionalApellido: string | null;
  ProfesionalNombres: string | null;
  FechaControl: string | null;
  HoraControl: string | null;
  Pulso: number | null;
  Maximo: number | null;
  Minimo: number | null;
  FrecuenciaRespiratoria: number | null;
  Axilar: number | null;
  Rectal: number | null;
  Observaciones: string | null;
  Nroindicacion: number | null;
  Hgt: string | null;
  IdSector: string | null;
  PAMedia: number | null;
  Saturometria: number | null;
  Peso: number | null;
  Talla: number | null;
  IdTurno: number | null;
  IdHci: number | null;
}

export interface ControlesFrecuentesResponse {
  success: boolean;
  data: ControlFrecuente[];
  mensaje?: string;
}
