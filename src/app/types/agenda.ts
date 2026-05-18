// Tipos del módulo Agenda (configuración + turnos).

export type DiaSemana =
	| 'Lunes'
	| 'Martes'
	| 'Miercoles'
	| 'Jueves'
	| 'Viernes'
	| 'Sabado'
	| 'Domingo';

export const DIAS_SEMANA: DiaSemana[] = [
	'Lunes',
	'Martes',
	'Miercoles',
	'Jueves',
	'Viernes',
	'Sabado',
	'Domingo',
];

export interface RangoHorario {
	inicio: string; // 'HH:MM'
	fin: string;
	intervaloMin?: number | null;
	consultorio?: string | null;
	servicio?: string | null;
}

export interface DiaHorario {
	dia: DiaSemana;
	rangos: RangoHorario[];
}

export interface HorariosResponse {
	matricula: number;
	intervaloMin: number | null;
	consultorio: string | null;
	servicio: string | null;
	dias: DiaHorario[];
	permanentes: Array<{
		horaInicio: string | null;
		horaFin: string | null;
		intervaloMin: number | null;
		consultorio: string | null;
		servicio: string | null;
	}>;
}

export interface HorariosPayload {
	intervaloMin: number;
	consultorio?: string | null;
	servicio?: string | null;
	dias: { dia: DiaSemana; rangos: { inicio: string; fin: string }[] }[];
}

export interface NoHorario {
	matricula: number;
	desdeFecha: string | null; // 'YYYY-MM-DD'
	hastaFecha: string | null;
	horaDesde: string | null; // 'HH:MM'
	horaHasta: string | null;
	diaCompleto: boolean;
	motivo: number;
	motivoLabel: string;
	fechaCarga?: string | null;
	horaCarga?: string | null;
	codOperador?: number | null;
}

export interface NoHorarioPayload {
	desdeFecha: string;
	hastaFecha?: string;
	horaDesde?: string;
	horaHasta?: string;
	diaCompleto?: boolean;
	motivo: number;
}

export interface AgendaCatalogos {
	dias: DiaSemana[];
	motivosNoHorario: Record<number, string>;
	statusTurno: Record<number, string>;
	tipoTurno: Record<number, string>;
	intervalosSugeridos: number[];
}
