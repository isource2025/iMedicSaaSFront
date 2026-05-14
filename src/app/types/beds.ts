export type BedEstado =
	| 'acompañante'
	| 'aislada'
	| 'cerrada'
	| 'desocupada'
	| 'ocupada'
	| 'Que haceres domésticos'
	| 'reparacion'
	| 'disponible'
	| 'mantenimiento';

/** Tipo de recurso en imHabitacionCamas.Tipo (texto en BD: cama, consultorio, insumos, …) */
export type BedTipoRecurso = 'cama' | 'consultorio' | 'insumos';

export interface Bed {
	id: string;
	numeroCama: string;
	sector: string;
	estado: string;
	valorEstadoOriginal?: string;
	fechaIngreso?: number;
	fechaEgreso?: number;
	observaciones?: string;
	NumeroVisita?: number;
	ubicacionPaciente?: string;
	mostrarNumeroVisita?: string;
	numeroVisita: number;
	NombrePaciente?: string;
	documentoPaciente?: string;
	SexoPaciente?: string;
	descripcionSexo?: string;
	estadoDescripcion?: string;
	diagnosticoDescripcion?: string;
	servicioMedicoDescripcion?: string;
	razonSocialCliente?: string;
	fechaAdmisionMovimiento?: number; // Fecha exacta del movimiento
	horaAdmisionMovimiento?: number; // Hora exacta del movimiento
	fechaIngresoFormateada?: string; // Fecha ya formateada desde el padre
	fechaIngresoSQL?: string; // Fecha de ingreso en formato SQL (DD/MM/YYYY)
	horaIngresoSQL?: string; // Hora de ingreso en formato SQL (HH:MM:SS)
	/** Valor crudo de imHabitacionCamas.Tipo */
	tipoRaw?: string;
	/** Tipo de recurso normalizado para UI y permisos de acciones */
	tipoRecurso: BedTipoRecurso;
}

export interface BedState {
	id: string;
	valor: string;
	descripcion: string;
}
