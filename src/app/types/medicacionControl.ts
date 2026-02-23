/**
 * Tipos para el control de medicación suministrada
 */

export interface MedicacionControl {
  IDCtrlMedica: number;
  IDFactura: number | null;
  IDDetalle: number | null;
  NroIndicacion: number | null;
  ModuloOrigen: string | null;
  TipoMedicamento: string | null;
  NumeroVisita: number;
  Sector: string | null;
  FechaCarga: string | null; // DateTime convertido a string
  HoraCarga: string | null; // Formato HH:mm:ss
  OperadorCarga: number | null;
  OperadorApellido: string | null;
  OperadorNombres: string | null;
  OperadorFullName: string | null;
  Profesional: number | null;
  ProfesionalApellido: string | null;
  ProfesionalNombres: string | null;
  ProfesionalFullName: string | null;
  FechaControl: string | null; // DateTime convertido a string
  HoraControl: string | null; // Formato HH:mm:ss
  Troquel: number | null;
  Cantidad: number | null;
  TipoUnidad: string | null;
  Observaciones: string | null;
  IDCliente: number | null;
  Status: string | null;
  CantidadIndicada: number | null;
  IdTurno: number | null;
  NombreMedicamento: string | null;
  DescripcionMedicamento: string | null;
  NroAdicional: number | null;
  FormaAdicional: string | null;
  adicionales?: MedicacionControl[]; // Indicaciones adicionales agrupadas (viene del backend)
}

export interface MedicacionControlResponse {
  success: boolean;
  data: MedicacionControl[];
  mensaje?: string;
  error?: string;
}

export interface MedicacionControlSingleResponse {
  success: boolean;
  data: MedicacionControl | null;
  mensaje?: string;
  error?: string;
}
