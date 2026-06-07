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
