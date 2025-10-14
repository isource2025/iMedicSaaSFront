export interface Indicacion {
	NumeroVisita: number | null;
	NroIndicacion: number;
	NroAdicional: number | null;
	FechaCarga: string | null;
	HoraCarga: string | null;
	OperadorCarga: number | null;
	OperadorApellido?: string | null;
	OperadorNombres?: string | null;
	ProfesionalAsiste: number | null;
	FechaCumplido: string | null;
	HoraCumplido: string | null;
	FechaProximo: string | null;
	HoraProximo: string | null;
	FechaRevision: string | null;
	HoraRevision: string | null;
	TipoIndicacion: number | null;
	Codigo: number | null;
	Cantidad: number | null;
	TipoUnidad: string | null;
	Frecuencia: string | null;
	Observaciones: string | null;
	FechaExpiro: string | null;
	HoraExpiro: string | null;
	CantidadIndicada: number | null;
	Orden: number | null;
	Estado: string | null;
	CantidadPorTurno: number | null;
	CantidadEntregada: number | null;
	ParaFechaEntrega: string | null;
	FormaAdicional: string | null;
	NroIndicacionAnterior: number | null;
	IdSector: string | null;
	AliasMedicamento: string | null;
	ExcluidoDeEntrega: boolean | null;
}

export interface IndicacionesResponse {
	success: boolean;
	count?: number;
	data: Indicacion[];
	mensaje?: string;
	error?: string;
}

export interface IndicacionResponse {
	success: boolean;
	data: Indicacion | null;
	mensaje?: string;
	error?: string;
}

// Payload para crear una nueva indicación
export interface NuevaIndicacionPayload {
	NumeroVisita: number | null;
	NroAdicional: number | null;
	FechaCarga: string | null; // ISO date string
	HoraCarga: string | null; // HH:mm:ss
	OperadorCarga: number | null;
	ProfesionalAsiste: number | null;
	FechaCumplido: string | null;
	HoraCumplido: string | null;
	FechaProximo: string | null;
	HoraProximo: string | null;
	FechaRevision: string | null;
	HoraRevision: string | null;
	TipoIndicacion: number | null;
	Codigo: number | null;
	Cantidad: number | null;
	TipoUnidad: string | null;
	Frecuencia: string | null;
	Observaciones: string | null;
	FechaExpiro: string | null;
	HoraExpiro: string | null;
	CantidadIndicada: number | null;
	Orden: number | null;
	Estado: string | null;
	CantidadPorTurno: number | null;
	CantidadEntregada: number | null;
	ParaFechaEntrega: string | null; // date
	FormaAdicional: string | null;
	NroIndicacionAnterior: number | null;
	IdSector: string | null;
	AliasMedicamento: string | null;
	ExcluidoDeEntrega: boolean | null;
}

// Tipos para opciones de formulario
export interface OpcionFormulario {
	value: string | number;
	label: string;
}

// Respuesta del endpoint de datos del formulario
export interface FormularioDatosResponse {
	tiposIndicacion: {
		Valor: number;
		Descripcion: string;
		OrdenMedicacion: number;
		Tipo: string;
	}[];
	vademecum: {
		Valor: number;
		Nombre: string;
		Descripcion: string;
	}[];
	tiposDieta: {
		Valor: number;
		Descripcion: string;
	}[];
	tiposControles: {
		Valor: number;
		Descripcion: string;
	}[];
	controlesAsistenciales: {
		Valor: number;
		Descripcion: string;
	}[];
	unidadesMedida: {
		Valor: number;
		Descripcion: string;
	}[];
	frecuenciasAdmin: {
		Valor: string;
		Intervalo: number;
	}[];
}
