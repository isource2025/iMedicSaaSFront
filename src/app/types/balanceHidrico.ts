export interface BalanceHidrico {
	IdBalanceHidrico: number;
	NumeroVisita: number;
	Fecha: string;
	Hora: string | null;
	HoraClarion?: number;
	Medicacion: string | null;
	Via: string | null;
	Ing_Par_Ingreso: number | null;
	Ing_Par_Paso: number | null;
	Ing_Aent_Alimento: string | null;
	Ing_Aent_Ingreso: number | null;
	Ing_Aent_Paso: number | null;
	Ing_Apar_Solucion: string | null;
	Ing_Apar_Ingreso: number | null;
	Ing_Apar_paso: number | null;
	Ing_Tranf_Ingreso: number | null;
	Ing_Tranf_paso: number | null;
	Egr_Diuresis: number | null;
	Egr_Catarsis: number | null;
	Egr_SNG_Vomito: number | null;
	Egr_Drenajes: number | null;
	TotalIngresos: number | null;
	TotalEgresos: number | null;
	Total: number | null;
	Profesional: number | null;
	Sector: string | null;
	ProfesionalApellido?: string | null;
	ProfesionalNombres?: string | null;
	Matricula?: string | number | null;
}

export interface BalanceHidricoResumen {
	registros: number;
	acumuladoIngresos: number;
	acumuladoEgresos: number;
	acumuladoBalance: number;
	ultimoBalance: {
		id: number;
		medicacion: string;
		hora: string | null;
		totalIngresos: number;
		totalEgresos: number;
		total: number;
	} | null;
}

export interface BalanceHidricoPayload {
	NumeroVisita: number;
	Fecha: string;
	Hora: string;
	Medicacion?: string;
	Via?: string;
	Ing_Par_Ingreso?: number;
	Ing_Par_Paso?: number;
	Ing_Aent_Alimento?: string;
	Ing_Aent_Ingreso?: number;
	Ing_Aent_Paso?: number;
	Ing_Apar_Solucion?: string;
	Ing_Apar_Ingreso?: number;
	Ing_Apar_paso?: number;
	Ing_Tranf_Ingreso?: number;
	Ing_Tranf_paso?: number;
	Egr_Diuresis?: number;
	Egr_Catarsis?: number;
	Egr_SNG_Vomito?: number;
	Egr_Drenajes?: number;
	Sector?: string;
}
