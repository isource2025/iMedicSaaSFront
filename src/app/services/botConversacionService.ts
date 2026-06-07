import { apiService } from './axios';
import type {
	BotConversacion,
	BotConversacionDetalle,
	BotConversacionesResponse,
	BotEnviarMensajeResult,
	BotEstadoAlmacen,
	BotMensajeChat,
	BotModoControl,
} from '../types/botConversacion';

interface ApiResp<T> {
	success: boolean;
	data: T;
	mensaje?: string;
	codigo?: string;
}

export const botConversacionService = {
	async getEstadoAlmacen(): Promise<BotEstadoAlmacen> {
		const { data } = await apiService.get<ApiResp<BotEstadoAlmacen>>(
			'/admin/bot/conversaciones/estado-almacen',
		);
		if (!data.success) throw new Error(data.mensaje || 'Error al consultar almacenamiento');
		return data.data;
	},

	async listarConversaciones(opts?: {
		limit?: number;
		soloNoLeidos?: boolean;
	}): Promise<BotConversacionesResponse> {
		const { data } = await apiService.get<ApiResp<BotConversacionesResponse>>(
			'/admin/bot/conversaciones',
			{
				params: {
					limit: opts?.limit ?? 50,
					soloNoLeidos: opts?.soloNoLeidos ? '1' : undefined,
				},
			},
		);
		if (!data.success) throw new Error(data.mensaje || 'Error al cargar conversaciones');
		return data.data;
	},

	async obtenerDetalle(idConversacion: string): Promise<BotConversacionDetalle> {
		const { data } = await apiService.get<ApiResp<BotConversacionDetalle>>(
			`/admin/bot/conversaciones/${encodeURIComponent(idConversacion)}`,
		);
		if (!data.success) throw new Error(data.mensaje || 'Error al cargar conversación');
		return data.data;
	},

	async listarMensajes(
		idConversacion: string,
		desdeId?: number,
	): Promise<BotMensajeChat[]> {
		const { data } = await apiService.get<ApiResp<BotMensajeChat[]>>(
			`/admin/bot/conversaciones/${encodeURIComponent(idConversacion)}/mensajes`,
			{ params: desdeId ? { desdeId } : undefined },
		);
		if (!data.success) throw new Error(data.mensaje || 'Error al cargar mensajes');
		return data.data;
	},

	async marcarLeida(idConversacion: string): Promise<BotConversacion> {
		const { data } = await apiService.post<ApiResp<BotConversacion>>(
			`/admin/bot/conversaciones/${encodeURIComponent(idConversacion)}/leer`,
		);
		if (!data.success) throw new Error(data.mensaje || 'Error al marcar como leída');
		return data.data;
	},

	async cambiarControl(
		idConversacion: string,
		modo: BotModoControl,
	): Promise<BotConversacion> {
		const { data } = await apiService.patch<ApiResp<BotConversacion>>(
			`/admin/bot/conversaciones/${encodeURIComponent(idConversacion)}/control`,
			{ modo },
		);
		if (!data.success) throw new Error(data.mensaje || 'Error al cambiar control');
		return data.data;
	},

	async enviarMensaje(
		idConversacion: string,
		contenido: string,
	): Promise<BotEnviarMensajeResult> {
		const { data } = await apiService.post<ApiResp<BotEnviarMensajeResult>>(
			`/admin/bot/conversaciones/${encodeURIComponent(idConversacion)}/mensajes`,
			{ contenido },
		);
		if (!data.success) throw new Error(data.mensaje || 'Error al enviar mensaje');
		return data.data;
	},

	async simularMensajeEntrante(payload: {
		telefono: string;
		mensaje: string;
		nombreContacto?: string;
		idConversacion?: string;
	}): Promise<{ conversacion: BotConversacion; mensaje: BotMensajeChat }> {
		const { data } = await apiService.post<
			ApiResp<{ conversacion: BotConversacion; mensaje: BotMensajeChat }>
		>('/admin/bot/conversaciones/simular', payload);
		if (!data.success) throw new Error(data.mensaje || 'Error al simular mensaje');
		return data.data;
	},
};
