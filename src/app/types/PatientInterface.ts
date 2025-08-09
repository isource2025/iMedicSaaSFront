export interface Patient {
	IDPaciente: number;
	ApellidoyNombre: string;
	TipoDocumento: string;
	NumeroDocumento: string;
	Domicilio: string;
	ValorLocalidad: string;
	Provincia: string;
	Nacionalidad: string;
	Sexo: string;
	NumeroHC: string;
	FechaNacimiento: string;
	Hora: string;
	CUIT: string;
	EstadoCivil: string;
	Religion: string;
	Raza: string;
	TelefonoParticular: string;
	TelefonoNegocio: string;
	Mail: string;
	NumeroSSN: string;
	NumeroCuenta: string;
}

export interface PatientFormData {
	// Datos de identificación (header)
	IDPaciente?: number;
	NumeroHC: string;
	TipoDocumento: string;
	NumeroDocumento: string;
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

	// Otros Datos
	Raza?: string;
	Idioma?: string;
	Religion?: string;
	GrupoEtnico?: string;
	EstadoMilitar?: string;
	LicenciaConducir?: string;
	DadorOrganos?: string;
	OrdenNacimiento?: number | string; // Usamos string también por el input
	LugarNacimiento?: string;
	FechaDefuncion?: string;
	HoraDefuncion?: string;
	Foto?: string | null; // Asegúrate de que este campo exista

	// --- NUEVO CAMPO PARA DATOS LABORALES ---
	Trabajos?: Trabajo[];
}

export interface ApiResponse<T> {
	success: boolean;
	data?: T;
	mensaje?: string;
}

export interface Trabajo {
	id: number | string;
	Ocupacion?: string;
	DocumentoEmpresa?: string;
	RazonSocial?: string;
	DomicilioEmpresa?: string;
	TelefonoEmpresa?: string;
	CuitEmpresa?: string;
	SituacionLaboral?: string;
	NivelEstudios?: string;
}
