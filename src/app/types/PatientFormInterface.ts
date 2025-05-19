export interface PatientFormData {
  // Datos de identificación (header)
  IDPaciente?: number;
  NumeroHC: string;
  TipoDocumento: string;
  Numerodocumento: string;
  ApellidoyNombre: string;
  
  // Datos personales y de contacto (solapa)
  Domicilio: string;
  ValorLocalidad: string;
  Provincia: string;
  Nacionalidad: string;
  FechaNacimiento: string;
  CUIT: string;
  Sexo: string;
  EstadoCivil: string;
  TelefonoParticular: string;
  TelefonoNegocio: string;
  Mail: string;
  NumeroCuenta: string;
  NumeroSSN: string;
}

export interface PatientFormProps {
  onSubmit: (data: PatientFormData) => Promise<boolean>;
  onCancel: () => void;
  isSubmitting: boolean;
  initialData?: Partial<PatientFormData>;
  isEditing?: boolean;
}
