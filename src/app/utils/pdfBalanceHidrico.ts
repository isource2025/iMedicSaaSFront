import type { EmpresaInfo } from '../services/empresaService';
import type { BalanceHidrico } from '../types/balanceHidrico';
import { etiquetaTransfusion, lineasDrenaje, volumenDrenajes } from '../types/balanceHidrico';
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
	| 'Egr_Colostomia'
	| 'Egr_Ileostomia'
	| 'Egr_SNG'
	| 'Egr_Vomito';

const n0 = (v: unknown) => {
	const n = Number(v);
	return Number.isFinite(n) ? n : 0;
};

/** 0 queda vacío para no ensuciar la grilla, como en pantalla. */
const ml = (n: number) => (n === 0 ? '' : Number.isInteger(n) ? String(n) : n.toFixed(1));
const conSigno = (n: number) => (n > 0 ? `+${ml(n)}` : n < 0 ? ml(n) : '0');

const sumar = (rows: BalanceHidrico[], k: CampoMl) => rows.reduce((s, r) => s + n0(r[k]), 0);
const sumarDrenajes = (rows: BalanceHidrico[]) => rows.reduce((s, r) => s + volumenDrenajes(r), 0);

/** Totales clínicos: cuentan los "Paso" (volumen efectivo) menos los egresos. */
function totalesDe(rows: BalanceHidrico[]) {
	const ingresos = sumar(rows, 'Ing_Par_Paso') + sumar(rows, 'Ing_Aent_Paso') + sumar(rows, 'Ing_Apar_paso') + sumar(rows, 'Ing_Tranf_paso');
	const egresos =
		sumar(rows, 'Egr_Diuresis') +
		sumar(rows, 'Egr_Catarsis') +
		sumar(rows, 'Egr_Colostomia') +
		sumar(rows, 'Egr_Ileostomia') +
		sumar(rows, 'Egr_SNG') +
		sumar(rows, 'Egr_Vomito') +
		sumarDrenajes(rows);
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
	{
		key: 'Ing_Tranf_paso',
		label: 'PASO',
		w: 16,
		align: 'center',
		...TRANSF,
		celda: (r) => {
			const tipo = etiquetaTransfusion(r.Ing_Tranf_Tipo);
			const v = ml(n0(r.Ing_Tranf_paso));
			if (!tipo) return v;
			return [
				...(v ? [{ texto: v }] : []),
				{ texto: tipo, tono: 'muted' as const, tamano: PDF_TABLA_FONT - 0.8 },
			];
		},
	},
	numero('Egr_Diuresis', 'DIURESIS', 13, EGR),
	numero('Egr_Catarsis', 'CATARSIS', 13, EGR),
	numero('Egr_Colostomia', 'COLOST.', 12, { ...EGR, opcional: true }),
	numero('Egr_Ileostomia', 'ILEOST.', 12, { ...EGR, opcional: true }),
	numero('Egr_SNG', 'SONDA N/G', 13, EGR),
	numero('Egr_Vomito', 'VÓMITO', 12, { ...EGR, opcional: true }),
	{
		key: 'Egr_Drenajes',
		label: 'DRENAJES',
		w: 18,
		align: 'center',
		...EGR,
		celda: (r) => {
			const lineas = lineasDrenaje(r);
			if (!lineas.length) return '';
			return lineas.map((d) => ({
				texto: d.tipo ? `${ml(d.qty) || '0'} ${d.tipo}` : ml(d.qty) || '0',
			}));
		},
	},
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
		'Egr_Colostomia',
		'Egr_Ileostomia',
		'Egr_SNG',
		'Egr_Vomito',
	];
	const salida: Record<string, string> = {
		ingresos: ml(t.ingresos) || '0',
		egresos: ml(t.egresos) || '0',
		balance: conSigno(t.balance),
		Egr_Drenajes: ml(sumarDrenajes(rows)),
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
