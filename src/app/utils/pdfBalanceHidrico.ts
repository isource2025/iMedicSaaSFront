import type { EmpresaInfo } from '../services/empresaService';
import type { BalanceHidrico } from '../types/balanceHidrico';
import { formatMatricula, type ProfesionalFirmaInfo } from './pdfExport';
import { cleanPdfValue, type PDFHeaderPatient } from './pdfHeader';
import { columnaHora, generarPDFTablaDiaria, PDF_TABLA_FONT, type ColumnaTabla } from './pdfTablaDiaria';

export type PDFBalanceHidricoOptions = {
	items: BalanceHidrico[];
	empresaInfo?: EmpresaInfo | null;
	patient?: PDFHeaderPatient | null;
	fileName?: string;
};

type CampoMl =
	| 'Ing_Par_Ingreso'
	| 'Ing_Par_Paso'
	| 'Ing_Aent_Ingreso'
	| 'Ing_Aent_Paso'
	| 'Ing_Apar_Ingreso'
	| 'Ing_Apar_paso'
	| 'Ing_Tranf_Ingreso'
	| 'Ing_Tranf_paso'
	| 'Egr_Diuresis'
	| 'Egr_Catarsis'
	| 'Egr_SNG_Vomito'
	| 'Egr_Drenajes';

const n0 = (v: unknown) => {
	const n = Number(v);
	return Number.isFinite(n) ? n : 0;
};

/** 0 queda vacío para no ensuciar la grilla, como en pantalla. */
const ml = (n: number) => (n === 0 ? '' : Number.isInteger(n) ? String(n) : n.toFixed(1));
const conSigno = (n: number) => (n > 0 ? `+${ml(n)}` : n < 0 ? ml(n) : '0');

const sumar = (rows: BalanceHidrico[], k: CampoMl) => rows.reduce((s, r) => s + n0(r[k]), 0);

/** Totales clínicos: cuentan los "Paso" (volumen efectivo) menos los egresos. */
function totalesDe(rows: BalanceHidrico[]) {
	const ingresos = sumar(rows, 'Ing_Par_Paso') + sumar(rows, 'Ing_Aent_Paso') + sumar(rows, 'Ing_Apar_paso') + sumar(rows, 'Ing_Tranf_paso');
	const egresos = sumar(rows, 'Egr_Diuresis') + sumar(rows, 'Egr_Catarsis') + sumar(rows, 'Egr_SNG_Vomito') + sumar(rows, 'Egr_Drenajes');
	return { ingresos, egresos, balance: ingresos - egresos };
}

function profesionalDe(r: BalanceHidrico): ProfesionalFirmaInfo | null {
	const nombre = cleanPdfValue(`${r.ProfesionalApellido || ''} ${r.ProfesionalNombres || ''}`);
	if (!nombre) return null;
	return { nombre, matricula: r.Matricula ?? undefined, idPersonal: r.ValorPersonalProfesional ?? undefined };
}

const PAR = { grupo: 'INGRESOS PARENTERAL', grupoCorto: 'PARENTERAL' };
const AENT = { grupo: 'ALIMENTACIÓN ENTERAL', grupoCorto: 'ALIM. ENTERAL', opcional: true };
const APAR = { grupo: 'ALIMENTACIÓN PARENTERAL', grupoCorto: 'ALIM. PARENT.', opcional: true };
const TRANSF = { grupo: 'TRANSFUSIÓN', grupoCorto: 'TRANSF.', opcional: true };
const EGR = { grupo: 'EGRESOS' };
const TOT = { grupo: 'BALANCE' };

const numero = (key: CampoMl, label: string, w: number, extra: Partial<ColumnaTabla<BalanceHidrico>> = {}): ColumnaTabla<BalanceHidrico> => ({
	key,
	label,
	w,
	align: 'center',
	celda: (r) => ml(n0(r[key])),
	...extra,
});

const COLUMNAS: ColumnaTabla<BalanceHidrico>[] = [
	columnaHora((r) => r.Hora),
	{
		key: 'medicacion',
		label: 'MEDICACIÓN',
		w: 0,
		...PAR,
		celda: (r) => [
			{ texto: cleanPdfValue(r.Medicacion) || '-', tono: cleanPdfValue(r.Medicacion) ? undefined : 'muted' },
			...(cleanPdfValue(r.Via) ? [{ texto: `Vía ${cleanPdfValue(r.Via)}`, tono: 'muted' as const, tamano: PDF_TABLA_FONT - 0.8 }] : []),
		],
	},
	numero('Ing_Par_Ingreso', 'ING.', 11, PAR),
	numero('Ing_Par_Paso', 'PASO', 11, PAR),
	{ key: 'alimento', label: 'ALIMENTO', w: 22, ...AENT, celda: (r) => cleanPdfValue(r.Ing_Aent_Alimento) },
	numero('Ing_Aent_Ingreso', 'ING.', 11, AENT),
	numero('Ing_Aent_Paso', 'PASO', 11, AENT),
	{ key: 'solucion', label: 'SOLUCIÓN', w: 22, ...APAR, celda: (r) => cleanPdfValue(r.Ing_Apar_Solucion) },
	numero('Ing_Apar_Ingreso', 'ING.', 11, APAR),
	numero('Ing_Apar_paso', 'PASO', 11, APAR),
	numero('Ing_Tranf_Ingreso', 'ING.', 11, TRANSF),
	numero('Ing_Tranf_paso', 'PASO', 11, TRANSF),
	numero('Egr_Diuresis', 'DIURESIS', 17, EGR),
	numero('Egr_Catarsis', 'CATARSIS', 17, EGR),
	numero('Egr_SNG_Vomito', 'SNG/VÓM.', 17, EGR),
	numero('Egr_Drenajes', 'DRENAJES', 17, EGR),
	{ key: 'ingresos', label: 'ING.', w: 13, align: 'center', ...TOT, celda: (r) => ml(totalesDe([r]).ingresos) },
	{ key: 'egresos', label: 'EGR.', w: 13, align: 'center', ...TOT, celda: (r) => ml(totalesDe([r]).egresos) },
	{
		key: 'balance',
		label: 'TOTAL',
		w: 14,
		align: 'center',
		...TOT,
		fuente: 'bold',
		tono: 'ink',
		celda: (r) => conSigno(totalesDe([r]).balance),
	},
];

function totalesFila(rows: BalanceHidrico[]): Record<string, string> {
	const t = totalesDe(rows);
	const campos: CampoMl[] = [
		'Ing_Par_Ingreso',
		'Ing_Par_Paso',
		'Ing_Aent_Ingreso',
		'Ing_Aent_Paso',
		'Ing_Apar_Ingreso',
		'Ing_Apar_paso',
		'Ing_Tranf_Ingreso',
		'Ing_Tranf_paso',
		'Egr_Diuresis',
		'Egr_Catarsis',
		'Egr_SNG_Vomito',
		'Egr_Drenajes',
	];
	const salida: Record<string, string> = {
		ingresos: ml(t.ingresos) || '0',
		egresos: ml(t.egresos) || '0',
		balance: conSigno(t.balance),
	};
	campos.forEach((k) => {
		salida[k] = ml(sumar(rows, k));
	});
	return salida;
}

/** Balance hídrico (imBalanceHidrico): ingresos y egresos por registro, totales por día y firmas al final. */
export function generarPDFBalanceHidrico({ items, empresaInfo, patient, fileName }: PDFBalanceHidricoOptions) {
	return generarPDFTablaDiaria({
		titulo: 'Balance hídrico',
		orientacion: 'landscape',
		items,
		columnas: COLUMNAS,
		fecha: (r) => r.Fecha,
		hora: (r) => r.Hora,
		unidad: ['registro', 'registros'],
		vacio: 'No hay registros de balance hídrico en el período seleccionado.',
		profesionales: (r) => [profesionalDe(r)],
		nota: (r) => {
			const p = profesionalDe(r);
			if (!p) return null;
			const mat = formatMatricula(p.matricula);
			return { etiqueta: 'CARGÓ', texto: mat ? `${p.nombre} · Mat. ${mat}` : p.nombre || '' };
		},
		notaDesde: 'medicacion',
		totales: totalesFila,
		empresaInfo,
		patient,
		fileName: fileName || `Balance_hidrico_${cleanPdfValue(patient?.numeroVisita) || 'paciente'}_${Date.now()}.pdf`,
	});
}
