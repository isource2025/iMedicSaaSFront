/** Fila de dbo.imInterCtrlDieta con descripción del tipo y nombres resueltos. */
export interface DietaControl {
	IdCtrlDieta: number;
	NumeroVisita: number;
	NroIndicacion: number | null;
	TipoDieta: number | null;
	DescripcionDieta: string | null;
	/** YYYY-MM-DD; null en las filas que genera la indicación (todavía sin suministrar). */
	FechaDieta: string | null;
	/** HH:MM:SS */
	HoraDieta: string | null;
	FechaCarga: string | null;
	HoraCarga: string | null;
	Observaciones: string | null;
	OperadorCarga: number | null;
	OperadorFullName: string | null;
	Profesional: number | null;
	ProfesionalFullName: string | null;
	Matricula: number | string | null;
}

export interface TipoDieta {
	Valor: number;
	Descripcion: string;
}

export interface DietaControlPayload {
	numeroVisita: number;
	tipoDieta: number;
	fechaDieta: string;
	horaDieta: string;
	observaciones?: string;
}
