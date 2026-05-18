import { apiService } from './axios';
import type {
	AgendaCatalogos,
	HorariosResponse,
	HorariosPayload,
	NoHorario,
	NoHorarioPayload,
} from '../types/agenda';

interface ApiResp<T> {
	success: boolean;
	data: T;
	mensaje?: string;
}

export const agendaConfigService = {
	async getCatalogos(): Promise<AgendaCatalogos> {
		const r = await apiService.get<ApiResp<AgendaCatalogos>>('/agenda/catalogos');
		return r.data.data;
	},

	async getHorarios(matricula: number): Promise<HorariosResponse> {
		const r = await apiService.get<ApiResp<HorariosResponse>>(
			`/agenda/horarios/${matricula}`,
		);
		return r.data.data;
	},

	async putHorarios(
		matricula: number,
		payload: HorariosPayload,
	): Promise<HorariosResponse> {
		const r = await apiService.put<ApiResp<HorariosResponse>>(
			`/agenda/horarios/${matricula}`,
			payload,
		);
		return r.data.data;
	},

	async getNoHorarios(
		matricula: number,
		params?: { desde?: string; hasta?: string },
	): Promise<NoHorario[]> {
		const qs = new URLSearchParams();
		if (params?.desde) qs.set('desde', params.desde);
		if (params?.hasta) qs.set('hasta', params.hasta);
		const suffix = qs.toString() ? `?${qs.toString()}` : '';
		const r = await apiService.get<ApiResp<NoHorario[]>>(
			`/agenda/no-horarios/${matricula}${suffix}`,
		);
		return r.data.data;
	},

	async createNoHorario(
		matricula: number,
		payload: NoHorarioPayload,
	): Promise<unknown> {
		const r = await apiService.post<ApiResp<unknown>>(
			`/agenda/no-horarios/${matricula}`,
			payload,
		);
		return r.data.data;
	},

	async updateNoHorario(
		matricula: number,
		body: NoHorarioPayload & {
			pk: { desdeFecha: string; horaDesde?: string; motivo: number };
		},
	): Promise<unknown> {
		const r = await apiService.put<ApiResp<unknown>>(
			`/agenda/no-horarios/${matricula}`,
			body,
		);
		return r.data.data;
	},

	async deleteNoHorario(
		matricula: number,
		body: { desdeFecha: string; horaDesde?: string; motivo: number },
	): Promise<unknown> {
		const r = await apiService.delete<ApiResp<unknown>>(
			`/agenda/no-horarios/${matricula}`,
			{ data: body },
		);
		return r.data.data;
	},
};
