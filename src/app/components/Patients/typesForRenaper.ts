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
}

export interface PersonaResponse {
	persona?: Persona;
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
