/**
 * Tipos para Evolución de Enfermería
 */

export interface EvolucionEnfermeria {
  NumeroVisita: number;
  Profesional: number | null;
  ProfesionalApellido: string | null;
  ProfesionalNombres: string | null;
  FechaControl: string; // YYYY-MM-DD desde backend
  HoraControl: string; // HH:mm:ss desde backend
  /** Clave Clarion para update/delete */
  FechaControlClarion?: number | null;
  HoraControlClarion?: number | null;
  Observaciones: string | null;
  FechaHoraCarga: string | null; // datetime desde backend
  OperadorCarga: number | null;
  OperadorApellido: string | null;
  OperadorNombres: string | null;
}

export interface EvolucionEnfermeriaResponse {
  success: boolean;
  data: EvolucionEnfermeria[];
  mensaje?: string;
}
