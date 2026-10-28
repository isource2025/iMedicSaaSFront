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
	Ing_Tranf_Tipo: string | null;
	Egr_Diuresis: number | null;
	Egr_Catarsis: number | null;
	Egr_Colostomia: number | null;
	Egr_Ileostomia: number | null;
	Egr_SNG: number | null;
	Egr_Vomito: number | null;
	Egr_SNG_Vomito: number | null;
	Egr_Drenaje1: number | null;
	Egr_Drenaje1Tipo: string | null;
	Egr_Drenaje2: number | null;
	Egr_Drenaje2Tipo: string | null;
	Egr_Drenaje3: number | null;
	Egr_Drenaje3Tipo: string | null;
	Egr_Drenaje4: number | null;
	Egr_Drenaje4Tipo: string | null;
	Egr_Drenaje5: number | null;
	Egr_Drenaje5Tipo: string | null;
	Egr_Drenajes: number | null;
	TotalIngresos: number | null;
	TotalEgresos: number | null;
	Total: number | null;
	Profesional: number | null;
	Sector: string | null;
	ProfesionalApellido?: string | null;
	ProfesionalNombres?: string | null;
	Matricula?: string | number | null;
	/** imPersonal.Valor de quien cargó: para buscar su firma digital. */
	ValorPersonalProfesional?: number | null;
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

export interface TotalesBalance {
	ingresos: number;
	egresos: number;
	balance: number;
	/** Suma por columna, para la fila "Totales" de la grilla. */
	porColumna: {
		Ing_Par_Ingreso: number;
		Ing_Par_Paso: number;
		Ing_Aent_Ingreso: number;
		Ing_Aent_Paso: number;
		Ing_Apar_Ingreso: number;
		Ing_Apar_paso: number;
		Ing_Tranf_Ingreso: number;
		Ing_Tranf_paso: number;
		Egr_Diuresis: number;
		Egr_Catarsis: number;
		Egr_Colostomia: number;
		Egr_Ileostomia: number;
		Egr_SNG: number;
		Egr_Vomito: number;
		Egr_Drenajes: number;
	};
}

export const TIPOS_TRANSFUSION = [
	{ id: 'GR', label: 'Glóbulo rojo' },
	{ id: 'PLAQUETA', label: 'Plaqueta' },
	{ id: 'PLASMA', label: 'Plasma' },
] as const;

export type TipoTransfusion = (typeof TIPOS_TRANSFUSION)[number]['id'];

export function etiquetaTransfusion(tipo?: string | null): string {
	return TIPOS_TRANSFUSION.find((t) => t.id === tipo)?.label || (tipo ? String(tipo) : '');
}

export const TIPOS_DRENAJE = [
	'Torácico',
	'Abdominal',
	'Penrose',
	'Kher',
	'Jackson-Pratt',
	'Hemovac',
	'Vesical',
	'Pleural',
	'Otro',
];

export const N_DRENAJES = 5;

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
	Ing_Tranf_Tipo?: string;
	Egr_Diuresis?: number;
	Egr_Catarsis?: number;
	Egr_Colostomia?: number;
	Egr_Ileostomia?: number;
	Egr_SNG?: number;
	Egr_Vomito?: number;
	Egr_SNG_Vomito?: number;
	Egr_Drenaje1?: number;
	Egr_Drenaje1Tipo?: string;
	Egr_Drenaje2?: number;
	Egr_Drenaje2Tipo?: string;
	Egr_Drenaje3?: number;
	Egr_Drenaje3Tipo?: string;
	Egr_Drenaje4?: number;
	Egr_Drenaje4Tipo?: string;
	Egr_Drenaje5?: number;
	Egr_Drenaje5Tipo?: string;
	Egr_Drenajes?: number;
	Sector?: string;
}

export function volumenDrenajes(r: {
	Egr_Drenaje1?: number | null;
	Egr_Drenaje2?: number | null;
	Egr_Drenaje3?: number | null;
	Egr_Drenaje4?: number | null;
	Egr_Drenaje5?: number | null;
	Egr_Drenajes?: number | null;
}): number {
	let s = 0;
	for (let i = 1; i <= N_DRENAJES; i++) {
		s += Number((r as Record<string, number | null | undefined>)[`Egr_Drenaje${i}`]) || 0;
	}
	return s || Number(r.Egr_Drenajes) || 0;
}

export function lineasDrenaje(r: BalanceHidrico): { n: number; qty: number; tipo: string }[] {
	const out: { n: number; qty: number; tipo: string }[] = [];
	for (let i = 1; i <= N_DRENAJES; i++) {
		const qty = Number(r[`Egr_Drenaje${i}` as keyof BalanceHidrico]) || 0;
		const tipo = String(r[`Egr_Drenaje${i}Tipo` as keyof BalanceHidrico] || '').trim();
		if (qty || tipo) out.push({ n: i, qty, tipo });
	}
	if (!out.length && Number(r.Egr_Drenajes)) {
		out.push({ n: 1, qty: Number(r.Egr_Drenajes), tipo: '' });
	}
	return out;
}

export function textoDrenajes(r: BalanceHidrico): string {
	return lineasDrenaje(r)
		.map((d) => (d.tipo ? `${d.qty || 0} ${d.tipo}` : String(d.qty)))
		.join(' · ');
}
