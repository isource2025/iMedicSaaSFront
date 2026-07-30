// Tipos para Epicrisis (tabla imHCEpicrisis)

export interface Epicrisis {
	idHCEpicrisis?: number;
	idVisita: number;
	nroHC?: number | string;
	fecha: string; // YYYY-MM-DD
	hora: string; // HH:mm
	idSector?: string;
	sectorDescripcion?: string;
	profesional?: number;
	profesionalNombreCompleto?: string;
	epicrisis: string;
	numeroDocumento?: string | number;
	diagnostico?: string;
	diagnosticoText?: string;
}

export interface NuevaEpicrisisPayload {
	IdVisita: number;
	Fecha: string;
	Hora: string;
	IdSector: string;
	Epicrisis: string;
	NumeroDocumento: string | number;
	Profecional?: number;
	Diagnostico?: string;
	DiagnosticoText?: string;
	/** Si true, el backend agrega deslinde de responsabilidad por asistencia de IA */
	GeneradoConIA?: boolean;
}

export interface EpicrisisIaDraft {
	epicrisis: string;
	diagnostico?: string;
	diagnosticoText?: string;
	fuente: string;
	generadoConIA?: boolean;
	aviso?: string;
	modelo?: string;
	contextoChars?: number;
	disclaimer?: string;
}

export interface EpicrisisListResponse {
	success: boolean;
	data: Epicrisis[];
	mensaje?: string;
}

export interface EpicrisisResponse {
	success: boolean;
	data: Epicrisis;
	mensaje?: string;
}

export interface EpicrisisIaResponse {
	success: boolean;
	data: EpicrisisIaDraft;
	mensaje?: string;
}
