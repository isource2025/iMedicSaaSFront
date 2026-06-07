import { apiService } from './axios';
import type {
	BotConfigAdmin,
	BotConfigSavePayload,
	BotLogsResponse,
} from '../types/botIntegration';

interface ApiResp<T> {
	success: boolean;
	data: T;
	mensaje?: string;
}

export const botIntegrationService = {
	async getAdminConfig(): Promise<BotConfigAdmin> {
		const { data } = await apiService.get<ApiResp<BotConfigAdmin>>('/admin/bot/config');
		if (!data.success) throw new Error(data.mensaje || 'Error al cargar configuración del bot');
		return data.data;
	},

	async getLogs(limit = 50): Promise<BotLogsResponse> {
		const { data } = await apiService.get<ApiResp<BotLogsResponse>>('/admin/bot/logs', {
			params: { limit },
		});
		if (!data.success) throw new Error(data.mensaje || 'Error al cargar logs');
		return data.data;
	},

	async saveConfig(payload: BotConfigSavePayload): Promise<BotConfigAdmin> {
		const { data } = await apiService.patch<ApiResp<BotConfigAdmin>>('/admin/bot/config', payload);
		if (!data.success) throw new Error(data.mensaje || 'Error al guardar configuración');
		return data.data;
	},
};
