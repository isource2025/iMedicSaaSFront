export type BotModoControl = 'BOT' | 'HUMANO' | 'PAUSADO';

export type BotDireccionMensaje = 'IN' | 'OUT';

export type BotOrigenMensaje = 'PACIENTE' | 'BOT' | 'AGENTE' | 'SISTEMA';

export interface BotConversacion {
	idConversacion: string;
	telefonoWhatsApp: string;
	nombreContacto: string | null;
	idPaciente: number | null;
	dniPaciente: string | null;
	modoControl: BotModoControl;
	pasoBot: string | null;
	idAgente: number | null;
	nombreAgente: string | null;
	noLeidos: number;
	ultimoMensaje: string | null;
	fechaUltimoMensaje: string | null;
	fechaCreacion: string | null;
}

export interface BotMensajeChat {
	idMensaje: number;
	idConversacion: string;
	direccion: BotDireccionMensaje;
	origen: BotOrigenMensaje;
	contenido: string;
	estadoEntrega: string;
	idAgente: number | null;
	nombreAgente: string | null;
	metaMessageId: string | null;
	fechaMensaje: string;
}

export interface BotConversacionesResponse {
	disponible: boolean;
	almacenamiento: 'sql' | 'memoria';
	conversaciones: BotConversacion[];
}

export interface BotConversacionDetalle {
	conversacion: BotConversacion;
	mensajes: BotMensajeChat[];
}

export interface BotEnviarMensajeResult {
	conversacion: BotConversacion;
	mensaje: BotMensajeChat;
	pendienteMeta?: boolean;
	nota?: string;
}

export interface BotEstadoAlmacen {
	tablasSql: boolean;
	almacenamiento: 'sql' | 'memoria';
}
