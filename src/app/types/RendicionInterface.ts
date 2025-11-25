/**
 * Interface para Rendición
 */
export interface Rendicion {
	IdRendicion: number;
	FechaGraba: string;
	OperGraba: number;
	IdTipoCliente: string;
	idCliente: number;
	ClienteRazonSocial: string;
	idPaciente: number;
	idConvenio: number;
	ConvenioNumero: number;
	ConvenioDescripcion: string;
	Periodo: number;
	Honorarios: number;
	Gastos: number;
	Medicamentos: number | null;
	OtrosServicios: number | null;
	Visitas: number | null;
	FechaCierre: string | null;
	HoraCierre: number | null;
	OperCierre: number | null;
	Observaciones: string | null;
	IdEmpresa: number | null;
	IdSucursal: number | null;
	IdTransaccion: number | null;
}

/**
 * Interface para datos de formulario de Rendición
 */
export interface RendicionFormData {
	IdTipoCliente: string;
	idCliente: number;
	idPaciente: number;
	idConvenio: number;
	Periodo: number;
	Honorarios: number;
	Gastos: number;
	Medicamentos?: number | null;
	OtrosServicios?: number | null;
	Visitas?: number | null;
	Observaciones?: string | null;
	IdEmpresa?: number | null;
	IdSucursal?: number | null;
}

/**
 * Interface para respuesta paginada de rendiciones
 */
export interface RendicionesPaginatedResponse {
	data: Rendicion[];
	totalCount: number;
	totalPages: number;
	currentPage: number;
	limit: number;
}
