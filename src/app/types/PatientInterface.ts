export interface Patient {
	IDPaciente: number;
	ApellidoyNombre: string;
	TipoDocumento: string; // presente en backend obtenerPacientePorId
	NumeroDocumento: string;
	Domicilio: string;
	ValorLocalidad: string; // se maneja como string en selects aunque provenga numérico
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
	TelefonoCelular: string;
	Mail: string;
	Cobertura: string;
	nAfiliado: string;
	FotoURL?: string | null;
	LicenciaConducir?: string | null;
	DadorOrganos?: string | null;
	OrdenNacimiento?: number | null;
	LugarNacimiento?: string | null;
	FechaDefuncion?: string | null;
	HoraDefuncion?: string | null;
	IdiomaPrimario?: string | null;
	GrupoEtnico?: string | null;
	EstadoMilitar?: string | null;
	Ciudadania?: string | null;
	SituacionLaboral?: string | null;
	NivelEstudios?: string | null;
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
	TelefonoCelular: string;
	Mail: string;
	Cobertura: string;
	nAfiliado: string;
	FotoURL?: string | null;

	// Otros Datos
	Raza?: string;
	Idioma?: string; // alias frontend
	IdiomaPrimario?: string; // backend field
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

	SituacionLaboral?: string;
	NivelEstudios?: string;
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
}
