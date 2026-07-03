import { apiService } from './axios';

interface ApiResp<T> {
	success: boolean;
	data: T;
	mensaje?: string;
}

export interface DiagnosticoCie10 {
	valor: number;
	codigo: string;
	descripcion: string;
}

export interface ClienteCobertura {
	valor: number;
	razonSocial: string;
	tipo: string;
}

export interface CierreHciPayload {
	motivoConsulta?: string;
	enfermedadActual?: string;
	semiologia?: string;
	pa?: string;
	fc?: string;
	fr?: string;
	tax?: string;
	glucemia?: string;
	talla?: string;
	peso?: string;
	impresionGeneral?: string;
}

export interface CierreTurnoPayload {
	diagnostico: string;
	hci?: CierreHciPayload;
}

export interface CierreTurnoResult {
	idTurno: number;
	status: number;
	horaSalida: string | null;
	numeroVisita: number;
	idHci?: number;
	valorPractica?: number;
	idFacProfesional?: number;
}

export interface AgendaJornada {
	index: number;
	label: string;
	inicio: string;
	fin: string;
	titulo: string;
}

export interface AgendaSlot {
	hora: string;
	horaClarion?: number;
	jornadaIndex?: number;
	sector: string;
	estado: string;
	status?: number | null;
	tipoTurno?: number | null;
	esSobreturno?: boolean;
	idTurno?: number | null;
	idPaciente?: number | null;
	pacienteNombre?: string | null;
	numeroDocumento?: number | null;
	observaciones?: string | null;
	motivoCancelacion?: string | null;
	idClasificacionTriage?: number | null;
	horaLlegada?: string | null;
	horaAtencion?: string | null;
	horaSalida?: string | null;
	sexo?: string | null;
	fechaNacimiento?: string | null;
	edad?: number | null;
	cobertura?: string | null;
	racControles?: number;
	racMedicacion?: number;
}

/** 0 = turno de grilla, 1 = sobreturno */
export const TIPO_TURNO_GRILLA = 0;
export const TIPO_TURNO_SOBRETURNO = 1;

export interface AgendaDia {
	fecha: string;
	dia: string;
	bloqueado: boolean;
	motivo?: string;
	jornadas?: AgendaJornada[];
	slots: AgendaSlot[];
}

export interface AgendaProfesionalMeta {
	matricula: number;
	nombre: string | null;
	especialidad: number;
	valorServicio: number | null;
	sector: string | null;
}

export interface SlotsResponse {
	matricula: number;
	desde: string;
	hasta: string;
	dias: AgendaDia[];
	profesional?: AgendaProfesionalMeta;
}

export interface DiasAgendaResponse {
	matricula: number;
	desde: string;
	hasta: string;
	fechas: string[];
}

export interface ResumenDia {
	fecha: string;
	bloqueado: boolean;
	total: number;
	libres: number;
	ocupados: number;
}

export interface MedicoDisponible {
	matricula: number;
	nombre: string;
	total: number;
	ocupados: number;
	libres: number;
}

export interface ControlFrecuenteTurno {
	Valor: number;
	FechaControl: string;
	HoraControl: string;
	Pulso?: number | null;
	Maximo?: number | null;
	Minimo?: number | null;
	FrecuenciaRespiratoria?: number | null;
	Axilar?: number | null;
	Rectal?: number | null;
	Hgt?: string | null;
	PAMedia?: number | null;
	Saturometria?: number | null;
	Peso?: number | null;
	Talla?: number | null;
	IMC?: number | null;
	Observaciones?: string | null;
	OperadorApellido?: string | null;
	OperadorNombres?: string | null;
}

export interface MedicacionTurno {
	IDCtrlMedica: number;
	FechaControl: string;
	HoraControl: string;
	Troquel: number;
	Cantidad: number;
	TipoUnidad: string;
	Observaciones?: string | null;
	NombreMedicamento?: string | null;
	DescripcionMedicamento?: string | null;
}

export interface RacTurnoData {
	turno: {
		idTurno: number;
		idPaciente: number | null;
		pacienteNombre: string | null;
		numeroDocumento: number | null;
		profesional: number;
		sector: string;
		numeroVisita: number;
		idClasificacionTriage: number | null;
		observaciones: string | null;
	};
	controles: ControlFrecuenteTurno[];
	medicacion: MedicacionTurno[];
}

export interface TurnoAsignado {
	idTurno: number;
	fecha: string;
	hora: string | null;
	idPaciente: number | null;
	pacienteNombre: string | null;
	profesional: number;
	profesionalNombre?: string | null;
	sector: string;
	observaciones: string | null;
	status: number | null;
	estado: string;
	tipoTurno: number | null;
	esSobreturno?: boolean;
	numeroDocumento: number | null;
	motivoCancelacion: string | null;
	idClasificacionTriage?: number | null;
	horaLlegada?: string | null;
	horaAtencion?: string | null;
	horaSalida?: string | null;
	sexo?: string | null;
	fechaNacimiento?: string | null;
	edad?: number | null;
	cobertura?: string | null;
	racControles?: number;
	racMedicacion?: number;
}

export const agendaService = {
	async getSlots(
		matricula: number,
		desde: string,
		hasta: string,
		opts?: { ligero?: boolean },
	): Promise<SlotsResponse> {
		const qs = new URLSearchParams({ desde, hasta });
		if (opts?.ligero) qs.set('ligero', '1');
		const r = await apiService.get<ApiResp<SlotsResponse>>(
			`/agenda/${matricula}/slots?${qs.toString()}`,
		);
		return r.data.data;
	},

	/** Días del rango con cupos de agenda (calendario mensual). */
	async getDiasConAgenda(
		matricula: number,
		desde: string,
		hasta: string,
	): Promise<DiasAgendaResponse> {
		const qs = new URLSearchParams({ desde, hasta });
		const r = await apiService.get<ApiResp<DiasAgendaResponse>>(
			`/agenda/${matricula}/dias-agenda?${qs.toString()}`,
			{ timeout: 60_000 },
		);
		return r.data.data;
	},

	async getResumen(matricula: number, fecha: string): Promise<ResumenDia> {
		const r = await apiService.get<ApiResp<ResumenDia>>(
			`/agenda/${matricula}/resumen?fecha=${encodeURIComponent(fecha)}`,
		);
		return r.data.data;
	},

	async getProfesionales(
		filtros?: { servicio?: string; especialidad?: number },
	): Promise<MedicoDisponible[]> {
		const qs = new URLSearchParams();
		if (filtros?.servicio) qs.set('servicio', filtros.servicio);
		if (filtros?.especialidad != null && filtros.especialidad > 0) {
			qs.set('especialidad', String(filtros.especialidad));
		}
		const r = await apiService.get<ApiResp<MedicoDisponible[]>>(
			`/agenda/profesionales?${qs.toString()}`,
		);
		return r.data.data;
	},

	async getDisponibilidad(
		fecha: string,
		filtros?: { servicio?: string; especialidad?: number },
	): Promise<MedicoDisponible[]> {
		const qs = new URLSearchParams({ fecha });
		if (filtros?.servicio) qs.set('servicio', filtros.servicio);
		if (filtros?.especialidad != null && filtros.especialidad > 0) {
			qs.set('especialidad', String(filtros.especialidad));
		}
		const r = await apiService.get<ApiResp<MedicoDisponible[]>>(
			`/agenda/disponibilidad?${qs.toString()}`,
		);
		return r.data.data;
	},

	async asignarTurno(
		matricula: number,
		payload: {
			fecha: string;
			hora: string;
			horaClarion?: number;
			sector: string;
			idPaciente: number;
			observaciones?: string;
			tipoTurno?: number;
		},
	): Promise<{ idTurno: number | null; accion: 'created' | 'updated' }> {
		const r = await apiService.post<ApiResp<{ idTurno: number | null; accion: 'created' | 'updated' }>>(
			`/agenda/${matricula}/turnos`,
			payload,
		);
		return r.data.data;
	},

	async actualizarTurno(
		matricula: number,
		idTurno: number,
		payload: { idPaciente: number; observaciones?: string },
	): Promise<{ idTurno: number; status: number }> {
		const r = await apiService.patch<ApiResp<{ idTurno: number; status: number }>>(
			`/agenda/${matricula}/turnos/${idTurno}`,
			payload,
		);
		return r.data.data;
	},

	async cancelarTurno(
		matricula: number,
		idTurno: number,
	): Promise<{ idTurno: number; status: number }> {
		const r = await apiService.patch<ApiResp<{ idTurno: number; status: number }>>(
			`/agenda/${matricula}/turnos/${idTurno}/cancelar`,
		);
		return r.data.data;
	},

	async borrarTurno(
		matricula: number,
		idTurno: number,
	): Promise<{ idTurno: number; accion: 'deleted' | 'cleared' }> {
		const r = await apiService.delete<ApiResp<{ idTurno: number; accion: 'deleted' | 'cleared' }>>(
			`/agenda/${matricula}/turnos/${idTurno}`,
		);
		return r.data.data;
	},

	async cerrarTurno(
		matricula: number,
		idTurno: number,
		payload?: CierreTurnoPayload,
	): Promise<CierreTurnoResult> {
		const r = await apiService.patch<ApiResp<CierreTurnoResult>>(
			`/agenda/${matricula}/turnos/${idTurno}/cerrar`,
			payload || {},
		);
		return r.data.data;
	},

	async buscarDiagnosticos(q: string, limit = 30): Promise<DiagnosticoCie10[]> {
		const qs = new URLSearchParams({ q, limit: String(limit) });
		const r = await apiService.get<ApiResp<DiagnosticoCie10[]>>(
			`/agenda/diagnosticos/buscar?${qs.toString()}`,
		);
		return r.data.data;
	},

	async buscarClientes(q: string, limit = 30): Promise<ClienteCobertura[]> {
		const qs = new URLSearchParams({ q, limit: String(limit) });
		const r = await apiService.get<ApiResp<ClienteCobertura[]>>(
			`/agenda/clientes/buscar?${qs.toString()}`,
		);
		return r.data.data;
	},

	async getTurnos(
		matricula: number,
		desde: string,
		hasta: string,
	): Promise<TurnoAsignado[]> {
		const qs = new URLSearchParams({ desde, hasta });
		const r = await apiService.get<ApiResp<TurnoAsignado[]>>(
			`/agenda/${matricula}/turnos?${qs.toString()}`,
		);
		return r.data.data;
	},

	async getTurnosPorPaciente(idPaciente: number): Promise<TurnoAsignado[]> {
		const qs = new URLSearchParams({ idPaciente: String(idPaciente) });
		const r = await apiService.get<ApiResp<TurnoAsignado[]>>(
			`/agenda/turnos-por-paciente?${qs.toString()}`,
		);
		return r.data.data;
	},

	async getRacTurno(idTurno: number): Promise<RacTurnoData> {
		const r = await apiService.get<ApiResp<RacTurnoData>>(`/agenda/turnos/${idTurno}/rac`);
		return r.data.data;
	},

	async crearControlRac(
		idTurno: number,
		payload: Record<string, unknown>,
	): Promise<{ Valor: number }> {
		const r = await apiService.post<ApiResp<{ Valor: number }>>(
			`/agenda/turnos/${idTurno}/rac/controles`,
			payload,
		);
		return r.data.data;
	},

	async crearMedicacionRac(
		idTurno: number,
		payload: Record<string, unknown>,
	): Promise<{ idCtrlMedica: number }> {
		const r = await apiService.post<ApiResp<{ idCtrlMedica: number }>>(
			`/agenda/turnos/${idTurno}/rac/medicacion`,
			payload,
		);
		return r.data.data;
	},

	async actualizarTriageRac(
		idTurno: number,
		payload: { idClasificacionTriage: number | null; observaciones?: string },
	): Promise<RacTurnoData> {
		const r = await apiService.patch<ApiResp<RacTurnoData>>(
			`/agenda/turnos/${idTurno}/rac/triage`,
			payload,
		);
		return r.data.data;
	},

	async eliminarControlRac(idTurno: number, valor: number): Promise<void> {
		await apiService.delete(`/agenda/turnos/${idTurno}/rac/controles/${valor}`);
	},

	async eliminarMedicacionRac(idTurno: number, idCtrlMedica: number): Promise<void> {
		await apiService.delete(`/agenda/turnos/${idTurno}/rac/medicacion/${idCtrlMedica}`);
	},
};
