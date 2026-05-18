import { apiService } from './axios';

interface ApiResp<T> {
	success: boolean;
	data: T;
	mensaje?: string;
}

export interface TurnoAdminRow {
	idTurno: number;
	dia: string | null;
	fecha: string | null;
	hora: string | null;
	horaClarion?: number | null;
	idPaciente: number | null;
	pacienteNombre: string | null;
	numeroDocumento: number | null;
	profesional: number;
	profesionalNombre: string | null;
	sector: string;
	horallegada: string | null;
	horaIngreso: string | null;
	horaSalida: string | null;
	horaAtencion: string | null;
	especialidad: number | null;
	observaciones: string | null;
	fechaCarga: string | null;
	horaCarga: string | null;
	codOperador: number | null;
	status: number | null;
	estado: string;
	tipoTurno: number | null;
	tipoTurnoLabel: string;
	numeroVisita: number | null;
	motivoCancelacion: string | null;
	idClasificacionTriage: number | null;
	diagnostico: string | null;
	personalAtendio: string | null;
}

export interface TurnosAdminFiltros {
	q?: string;
	fechaDesde?: string;
	fechaHasta?: string;
	status?: string;
	tipoTurno?: string;
	sector?: string;
	profesional?: string;
	triage?: string;
	idTurno?: string;
	idPaciente?: string;
	numeroDocumento?: string;
}

export interface TurnosAdminListResponse {
	data: TurnoAdminRow[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export const turnosAdminService = {
	async listar(
		filtros: TurnosAdminFiltros,
		page = 1,
		limit = 25,
	): Promise<TurnosAdminListResponse> {
		const qs = new URLSearchParams();
		qs.set('page', String(page));
		qs.set('limit', String(limit));
		if (filtros.q) qs.set('q', filtros.q);
		if (filtros.fechaDesde) qs.set('fechaDesde', filtros.fechaDesde);
		if (filtros.fechaHasta) qs.set('fechaHasta', filtros.fechaHasta);
		if (filtros.status !== undefined && filtros.status !== '')
			qs.set('status', filtros.status);
		if (filtros.tipoTurno !== undefined && filtros.tipoTurno !== '')
			qs.set('tipoTurno', filtros.tipoTurno);
		if (filtros.sector) qs.set('sector', filtros.sector);
		if (filtros.profesional) qs.set('profesional', filtros.profesional);
		if (filtros.triage !== undefined && filtros.triage !== '')
			qs.set('triage', filtros.triage);
		if (filtros.idTurno) qs.set('idTurno', filtros.idTurno);
		if (filtros.idPaciente) qs.set('idPaciente', filtros.idPaciente);
		if (filtros.numeroDocumento) qs.set('numeroDocumento', filtros.numeroDocumento);

		const r = await apiService.get<ApiResp<TurnosAdminListResponse>>(
			`/turnos-admin?${qs.toString()}`,
		);
		return r.data.data;
	},
};
