/**
 * Datos filiatorios del paciente (imPacientes) que el backend adjunta a la HC
 * de ingreso. Coincide campo por campo con los que viajan en los pedidos, para
 * poder reutilizar el mismo armado de etiquetas.
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
