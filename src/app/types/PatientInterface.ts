export interface Patient {
  IDPaciente: number;
  Numerodocumento?: string;
  ApellidoyNombre: string;
  Domicilio?: string;
  Sexo: string;
  NumeroHC: string;
  FechaNacimiento?: string;
  EstadoCivil?: string;
  Cobertura?: string;
}

export interface PatientFormData {
  ApellidoyNombre: string;
  Domicilio: string;
  Sexo: string;
  NumeroHC: string;
  FechaNacimiento: string;
  EstadoCivil: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  mensaje?: string;
}
