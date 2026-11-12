export interface Persona {
	numeroDocumento?: string | number;
	apellido?: string;
	nombres?: string;
	calle?: string;
	numero?: string | number;
	fechaNacimiento?: string;
	sexo?: string; // 'M' | 'F' | etc.
	ciudad?: string;
	provincia?: string;
	pais?: string;
	/** Aviso de fallecimiento de RENAPER (ej. "FALLECIDO", "Sin Aviso de Fallecimiento"). */
	mensaf?: string;
}

/**
 * GET /renaper/buscar-persona/:documento/:sexo?
 * `personas` trae todas las del DNI (RENAPER informa una por sexo); `persona` es la del sexo pedido.
 */
export interface PersonaResponse {
	success?: boolean;
	persona?: Persona | null;
	personas?: Persona[];
	multiples?: boolean;
	descripcionError?: string;
}

export interface LocalidadData {
	Valor?: string | number;
	ValorProvincia?: string | number;
	Descripcion?: string;
}
export interface LocalidadResponse {
	data: LocalidadData;
}
