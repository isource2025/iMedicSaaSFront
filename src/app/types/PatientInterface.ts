export interface Patient {
  IDPaciente: number;
  ApellidoyNombre: string;
  Domicilio?: string;
  Sexo: string;
  NumeroHC: string;
  FechaNacimiento?: string;
  EstadoCivil?: string;
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
