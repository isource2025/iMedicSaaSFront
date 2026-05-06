export interface Personal {
	Valor: number;
	TipoDocumento: string | null;
	NumeroDocumento: number | null;
	ApellidoNombre: string;
	Domicilio: string | null;
	ValorLocalidad: number | null;
	Provincia: number | null;
	Nacionalidad: string | null;
	FechaNacimiento: string | null;
	FechaNacimientoClarion?: number | null;
	Sexo: string | null;
	EstadoCivil: string | null;
	Telefono: string | null;
	// Datos profesionales
	MatriculaProvincial: number | null;
	MatriculaNacional: number | null;
	ValorEspecialidad: number | null;
	ValorFunciones: number | null;
	ValorServicio: string | null;
	/** Servicio para facturación (columna `ValorServicioParaFacturar` en BD). */
	ValorServicioParaFacturar: string | null;
	ValorCategoria: number | null;
	ValorClase: string | null;
	LugarTrabajo: string | null;
	LugarCobro: string | null;
	NumeroSocio: number | null;
	ConvenioFacturacion: string | null;
	IdEspecialidadME: number | null;
	Estado: number | null;
	CUIT: string | null;
	Observaciones: string | null;
	/** Rol asignado (IdRol de imRoles). null si el personal no tiene rol. */
	Rol: number | null;
}

export interface PersonalFormData {
	Valor?: number;
	TipoDocumento: string;
	NumeroDocumento: string;
	ApellidoNombre: string;
	Domicilio: string;
	ValorLocalidad: string;
	Provincia: string;
	Nacionalidad: string;
	FechaNacimiento: string;
	Sexo: string;
	EstadoCivil: string;
	Telefono: string;
	// Datos profesionales
	MatriculaProvincial: string;
	MatriculaNacional: string;
	ValorEspecialidad: string;
	ValorFunciones: string;
	ValorCategoria: string;
	ValorClase: string;
	LugarTrabajo: string;
	LugarCobro: string;
	NumeroSocio: string;
	ConvenioFacturacion: string;
	IdEspecialidadME: string;
}

export interface ApiResponse<T> {
	success: boolean;
	data?: T;
	mensaje?: string;
	message?: string;
}

export interface PersonalPaginationResponse {
	data: Personal[];
	pagination: {
		currentPage: number;
		totalPages: number;
		totalCount: number;
		limit: number;
	};
}

export interface CatalogoItemNumerico {
	valor: number;
	descripcion: string;
}

export interface CatalogoItemTexto {
	valor: string;
	descripcion: string;
}

export interface EmpresaCatalogoItem {
	IdEmpresa: number;
	Descripcion: string;
}

export interface PersonalServicioDto {
	ValorServicio: string | null;
	ValorServicioParaFacturar: string | null;
}

export interface PersonalSectorAsignado {
	idSector: string;
	Descripcion: string;
}

export interface PersonalCodigoFacturacion {
	CodigoAsociacion: string;
	CodigoFacturacion: string;
}
