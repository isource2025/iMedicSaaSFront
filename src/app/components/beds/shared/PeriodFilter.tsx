'use client';

import styles from './PeriodFilter.module.css';

/** Valores que entiende el backend en `?days=`: 0 = solo el día, N días hacia atrás, 'all' = todo. */
export type Periodo = '0' | '7' | '30' | 'all';

export const PERIODOS: { value: Periodo; label: string }[] = [
	{ value: '0', label: 'Hoy' },
	{ value: '7', label: 'Semana' },
	{ value: '30', label: 'Mes' },
	{ value: 'all', label: 'Todas' },
];

function inicioDelDia(d: Date): number {
	return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Acepta Date, 'YYYY-MM-DD…' (ISO) o 'DD/MM/YYYY…'. */
export function parseFechaFlexible(v: unknown): Date | null {
	if (v == null || v === '') return null;
	if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
	const s = String(v).trim();
	let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
	if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
	m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
	if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
	const d = new Date(s);
	return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Filtro de período del lado del cliente, con el día de referencia (calendario) como tope.
 * Los registros sin fecha legible se muestran siempre.
 */
export function filtrarPorPeriodo<T>(
	rows: T[],
	periodo: Periodo,
	getFecha: (row: T) => unknown,
	referencia?: Date | null,
): T[] {
	return filtrarPorRangoEnPeriodo(rows, periodo, (row) => {
		const f = getFecha(row);
		return [f, f];
	}, referencia);
}

/**
 * Igual que `filtrarPorPeriodo` para registros con duración (desde–hasta): entran si se
 * superponen con el período. `hasta` vacío = sigue abierto (hasta hoy).
 */
export function filtrarPorRangoEnPeriodo<T>(
	rows: T[],
	periodo: Periodo,
	getRango: (row: T) => [unknown, unknown],
	referencia?: Date | null,
): T[] {
	if (periodo === 'all') return rows;
	const hasta = inicioDelDia(referencia ?? new Date());
	const desde = hasta - Number(periodo) * 86_400_000;
	return rows.filter((row) => {
		const [ini, fin] = getRango(row);
		const fIni = parseFechaFlexible(ini);
		if (!fIni) return true;
		const fFin = parseFechaFlexible(fin) ?? new Date();
		return inicioDelDia(fIni) <= hasta && inicioDelDia(fFin) >= desde;
	});
}

export default function PeriodFilter({
	value,
	onChange,
	disabled,
}: {
	value: Periodo;
	onChange: (value: Periodo) => void;
	disabled?: boolean;
}) {
	return (
		<div className={styles.periodFilters} role="group" aria-label="Período">
			{PERIODOS.map((p) => (
				<button
					key={p.value}
					type="button"
					className={`${styles.periodTag} ${value === p.value ? styles.periodTagActive : ''}`}
					aria-pressed={value === p.value}
					onClick={() => onChange(p.value)}
					disabled={disabled}
				>
					{p.label}
				</button>
			))}
		</div>
	);
}
