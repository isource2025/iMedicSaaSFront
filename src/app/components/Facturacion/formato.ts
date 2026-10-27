const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export function fmtFecha(iso: string | null | undefined): string {
	const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
	return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

/** Período de facturación: el día 1 se muestra como mes ("Ene 2026"); otro día, como fecha completa. */
export function fmtPeriodo(iso: string | null | undefined): string {
	const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
	if (!m) return '';
	return m[3] === '01' ? `${MESES[Number(m[2]) - 1]} ${m[1]}` : fmtFecha(iso);
}

const NUM = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 4 });
const MONEDA = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function fmtNumero(n: number | string | null | undefined): string {
	if (n === null || n === undefined || n === '') return '';
	const v = Number(n);
	return Number.isFinite(v) ? NUM.format(v) : String(n);
}

/** Importe sin signo, siempre con 2 decimales ("3.167,50"). */
export function fmtImporte(n: number | string | null | undefined): string {
	if (n === null || n === undefined || n === '') return '';
	const v = Number(n);
	return Number.isFinite(v) ? MONEDA.format(v) : String(n);
}

export function fmtMoneda(n: number | string | null | undefined): string {
	if (n === null || n === undefined || n === '') return '';
	const v = Number(n);
	return Number.isFinite(v) ? `$ ${MONEDA.format(v)}` : String(n);
}

export function hoyIso(): string {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Mes actual como "YYYY-MM", para inputs type="month". */
export function mesActual(): string {
	return hoyIso().slice(0, 7);
}
