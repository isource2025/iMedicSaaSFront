/**
 * Datos filiatorios del paciente (imPacientes) que el backend adjunta a la HC
 * de ingreso, a los pedidos de estudios y a las interconsultas.
 */
export interface DatosFiliatoriosPaciente {
	IdPaciente?: number | null;
	PacienteNombre?: string | null;
	PacienteDocumento?: string | null;
	PacienteTipoDocumento?: string | null;
	PacienteSexo?: string | null;
	PacienteSexoDescripcion?: string | null;
	PacienteFechaNacimiento?: string | null;
	PacienteEdad?: number | null;
	PacienteNumeroHC?: string | null;
	ObraSocial?: string | null;
	PacienteAfiliado?: string | null;
	PacienteDomicilio?: string | null;
	PacienteLocalidad?: string | null;
	PacienteTelefono?: string | null;
	PacienteTelefonoAlternativo?: string | null;
	PacienteEmail?: string | null;
	/** Sólo en pedidos e interconsultas. */
	TipoAtencion?: 'AMBULATORIO' | 'INTERNADO' | string | null;
	/** Sólo en pedidos e interconsultas. */
	Ubicacion?: string | null;
}
