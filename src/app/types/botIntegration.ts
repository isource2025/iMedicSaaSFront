export interface BotMensajes {
	bienvenida: string;
	confirmacion: string;
	pedirDni: string;
}

export interface BotReglas {
	anticipacionMinHoras: number;
	diasMaxAntelacion: number;
	maxTurnosPorPacienteDia: number;
	requiereDNI: boolean;
	requiereRenaper: boolean;
	permiteSobreturno: boolean;
	crearPacienteAutomatico: boolean;
	sugerirPrimerTurnoDisponible: boolean;
	/** Días hacia adelante al buscar el primer turno (sin preferencia de día). */
	busquedaMaxDias: number;
	/** Máximo de profesionales consultados por especialidad. */
	busquedaMaxProfesionales: number;
	/** Consultas de agenda en paralelo por día. */
	busquedaConcurrencia: number;
	/** Tiempo máximo de búsqueda en milisegundos. */
	busquedaTimeoutMs: number;
}

export interface BotServicio {
	codigo: string;
	nombre: string;
}

export interface BotFlujoPaso {
	paso: number;
	id: string;
	titulo: string;
	mensajeUsuario: string;
	descripcion?: string;
	activo: boolean;
}

export interface BotConfigAdmin {
	nombreInstitucion: string;
	promptSistema: string;
	mensajes: BotMensajes;
	reglas: BotReglas;
	servicios: BotServicio[];
	especialidades?: BotEspecialidad[];
	profesionalesCount: number;
	flujo: BotFlujoPaso[];
	apiConfigurada: boolean;
	logsDisponibles: boolean;
	configDbDisponible: boolean;
}

export interface BotConfigSavePayload {
	nombreInstitucion?: string;
	promptSistema?: string;
	mensajes?: Partial<BotMensajes>;
	reglas?: Partial<BotReglas>;
	flujo?: BotFlujoPaso[];
}

export interface BotEspecialidad {
	valor: number;
	nombre: string;
	cantProfesionales: number;
}

export interface BotLogEntry {
	idLog: number;
	idConversacion: string | null;
	idTurno: number | null;
	idPaciente: number | null;
	accion: string;
	telefonoWhatsApp: string | null;
	resultado: string;
	mensajeError: string | null;
	fechaAccion: string;
}

export interface BotLogsResponse {
	disponible: boolean;
	logs: BotLogEntry[];
}

/** Config WhatsApp Meta por empresa (token enmascarado). */
export interface BotWhatsappConfig {
	configurado: boolean;
	idEmpresa: number;
	phoneNumberId: string | null;
	wabaId: string | null;
	accessTokenMasked: string | null;
	source: string | null;
	metaAppId: string | null;
	verifyTokenConfigured: boolean;
}

export interface BotWhatsappSavePayload {
	phoneNumberId?: string;
	wabaId?: string;
	/** Solo enviar si se quiere reemplazar el token. */
	accessToken?: string;
}
