import { getResolvedApiBaseUrl } from './axios';
import { apiService } from './axios';
import type { TurneroAdminState, TurneroDisplayState, TurneroPantallaLink, TurneroPantallaResumen } from '@/app/types/turnero';

interface ApiResp<T> {
	success: boolean;
	data: T;
	mensaje?: string;
}

export const turneroService = {
	async listPantallas(): Promise<TurneroPantallaResumen[]> {
		const r = await apiService.get<ApiResp<TurneroPantallaResumen[]>>('/turnero/pantallas');
		return r.data.data;
	},

	async getAdminConfig(idPantalla?: number): Promise<TurneroAdminState> {
		const r = await apiService.get<ApiResp<TurneroAdminState>>('/turnero/config', {
			params: idPantalla ? { idPantalla } : undefined,
		});
		return r.data.data;
	},

	async createPantalla(payload: {
		nombre: string;
		sectoresFiltrados?: string[];
		copiarDesdeIdPantalla?: number;
	}): Promise<TurneroAdminState> {
		const r = await apiService.post<ApiResp<TurneroAdminState>>('/turnero/pantallas', payload);
		return r.data.data;
	},

	async deletePantalla(idPantalla: number): Promise<void> {
		await apiService.delete(`/turnero/pantallas/${idPantalla}`);
	},

	async saveAdminConfig(payload: {
		idPantalla?: number;
		nombre?: string;
		config: TurneroAdminState['config'];
	}): Promise<TurneroAdminState> {
		const r = await apiService.put<ApiResp<TurneroAdminState>>('/turnero/config', payload);
		return r.data.data;
	},

	async regenerarToken(idPantalla?: number): Promise<TurneroAdminState> {
		const r = await apiService.post<ApiResp<TurneroAdminState>>('/turnero/config/regenerar-token', {
			idPantalla,
		});
		return r.data.data;
	},

	async getDisplayUrl(): Promise<{
		displayPath: string;
		publicToken: string;
		nombre: string;
		pantallas: TurneroPantallaLink[];
	}> {
		const r = await apiService.get<
			ApiResp<{
				displayPath: string;
				publicToken: string;
				nombre: string;
				pantallas: TurneroPantallaLink[];
			}>
		>('/turnero/url');
		return r.data.data;
	},

	async llamarPorPantalla(matricula: number, idTurno: number) {
		const r = await apiService.post<ApiResp<unknown>>(
			`/agenda/${matricula}/turnos/${idTurno}/llamar`,
		);
		return r.data.data;
	},

	async fetchDisplay(token: string): Promise<TurneroDisplayState> {
		const base = getResolvedApiBaseUrl();
		const res = await fetch(`${base}/turnero/display/${encodeURIComponent(token)}`, {
			cache: 'no-store',
		});
		if (!res.ok) {
			const body = await res.json().catch(() => ({}));
			throw new Error(body?.mensaje || 'No se pudo cargar la pantalla');
		}
		const json = (await res.json()) as ApiResp<TurneroDisplayState>;
		return json.data;
	},

	getDisplayEventsUrl(token: string): string {
		const base = getResolvedApiBaseUrl();
		return `${base}/turnero/display/${encodeURIComponent(token)}/events`;
	},

	getDisplayPageUrl(token: string): string {
		if (typeof window !== 'undefined') {
			return `${window.location.origin}/display/${token}`;
		}
		return `/display/${token}`;
	},
};
