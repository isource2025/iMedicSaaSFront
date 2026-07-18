export type FuncionRequerida = {
	codigo: number;
	nombre: string;
	unidad: number;
};

export type TipoProtocolo = {
	tipoProtocolo: string;
	descripcion: string;
	numeroActual: number;
	idSector: string | null;
	tieneProForma: boolean;
};

export type PracticaProtocolo = {
	idPractica: number;
	tipoPractica: string;
	descripcion: string;
	funcionesRequeridas: FuncionRequerida[];
};

export type ProfesionalBusqueda = {
	valorPersonal: number;
	matricula: number | null;
	apellidoNombre: string;
};

export type ProfesionalEnProtocolo = {
	valorPersonal: number;
	matricula?: number | null;
	apellidoNombre?: string | null;
	funcion: number;
	funcionNombre: string;
};

export type PracticaEnProtocolo = {
	valorPractica: number;
	codigoPractica: number;
	tipoPractica: string;
	descripcion: string;
	cantidad: number;
	profesionales: ProfesionalEnProtocolo[];
};

export type ProtocoloClinico = {
	idProtocolo: number;
	numeroProtocolo: number;
	numeroVisita: number;
	idPaciente: number;
	fecha: string | null;
	tipoProtocolo: string;
	tipoDescripcion: string | null;
	fechaHoraInicio: string | null;
	fechaHoraFin: string | null;
	diagnosticoPre: string | null;
	diagnosticoPos: string | null;
	tecnica: string | null;
	texto: string;
	estado: string | null;
	idOperador: number | null;
	operadorNombre: string | null;
	operadorMatricula: number | null;
	practicas: PracticaEnProtocolo[];
};

export type CrearProtocoloPayload = {
	numeroVisita: number;
	tipoProtocolo?: string;
	texto: string;
	tecnica?: string;
	diagnosticoPre?: string;
	diagnosticoPos?: string;
	fechaHoraInicio?: string | null;
	fechaHoraFin?: string | null;
	estado?: string;
	idOperador?: number;
	sector?: string;
	idPractica: number;
	tipoPractica?: string;
	profesionales: { valorPersonal: number; funcion: number }[];
};
