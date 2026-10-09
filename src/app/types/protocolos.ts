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

/** Práctica facturable de la cirugía (imFacPracticas por IdProtocolo) con su equipo. */
export type PracticaEnProtocolo = {
	valorPractica: number;
	codigoPractica: number;
	tipoPractica: string;
	descripcion: string;
	cantidad: number;
	/** Facturada o valorizada por facturación (Status 100): no se puede tocar. */
	facturada: boolean;
	status: number;
	profesionales: ProfesionalEnProtocolo[];
};

export type RubroMedicamento = 'Medicamento' | 'Descartable';

/** Producto del vademécum (imVademecum.Troquel). */
export type MedicamentoBusqueda = {
	idProducto: number;
	nombre: string;
	presentacion: string | null;
	rubro: RubroMedicamento;
	unidad: string | null;
};

/** Default de un tipo de protocolo (HCTiposProtocolosMeds). */
export type MedicamentoPorDefecto = {
	idProducto: number;
	rubro: RubroMedicamento;
	cantidad: number | null;
	unidad: string | null;
	descripcion: string;
	presentacion: string | null;
};

/** Medicamento/descartable usado en el protocolo (HCProtocolosMedicamentos). */
export type MedicamentoEnProtocolo = {
	idProtocoloMedicamento: number;
	idProducto: number;
	rubro: string;
	cantidad: number | null;
	unidad: string | null;
	orden: number;
	descripcion: string;
	presentacion: string | null;
};

export type ProtocoloClinico = {
	idProtocolo: number;
	numeroProtocolo: number;
	numeroVisita: number;
	idPaciente: number;
	/** "YYYY-MM-DDTHH:mm:ss" hora de pared (sin zona). */
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
	tieneFacturadas: boolean;
	medicamentos: MedicamentoEnProtocolo[];
};

export type ProfesionalPayload = { valorPersonal: number; funcion: number };

export type PracticaPayload = {
	/** Solo en edición: Valor de imFacPracticas de una práctica ya existente. */
	valorPractica?: number;
	idPractica: number;
	tipoPractica: string;
	cantidad?: number;
	profesionales: ProfesionalPayload[];
};

export type MedicamentoPayload = {
	idProducto: number;
	rubro: RubroMedicamento | string;
	cantidad?: number | null;
	unidad?: string | null;
	descripcion?: string | null;
};

export type CrearProtocoloPayload = {
	numeroVisita: number;
	tipoProtocolo?: string;
	texto: string;
	tecnica?: string;
	diagnosticoPre?: string;
	diagnosticoPos?: string;
	/** Hora de pared "YYYY-MM-DDTHH:mm" (datetime-local). */
	fechaHoraInicio?: string | null;
	/** Obligatoria: es la fecha de las prácticas facturables. */
	fechaHoraFin: string;
	estado?: string;
	idOperador?: number;
	sector?: string;
	practicas: PracticaPayload[];
	medicamentos?: MedicamentoPayload[];
};

/**
 * Edición: las prácticas facturadas no se pueden modificar ni quitar; el resto se puede
 * editar, quitar o agregar. `practicas` ausente → no se tocan; `medicamentos` ausente → no se tocan.
 */
export type ActualizarProtocoloPayload = {
	texto: string;
	tecnica?: string;
	diagnosticoPre?: string;
	diagnosticoPos?: string;
	estado?: string;
	fechaHoraInicio?: string | null;
	fechaHoraFin?: string;
	sector?: string;
	practicas?: PracticaPayload[];
	medicamentos?: MedicamentoPayload[];
};
