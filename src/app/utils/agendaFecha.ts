import { fechaCalendarioArgentina, horaWallArgentina } from '@/app/utils/dateUtils';

/** Horas después de medianoche en que aún se pueden cargar turnos del día anterior. */
export const MARGEN_CARGA_TURNOS_HS = 12;

/** Fecha local a medianoche (sin hora). */
export function inicioDelDia(d: Date): Date {
	const x = new Date(d);
	x.setHours(0, 0, 0, 0);
	return x;
}

export function hoyLocal(): Date {
	return parseIsoLocal(fechaCalendarioArgentina());
}

export function parseIsoLocal(iso: string): Date {
	const [y, m, dd] = String(iso).split('-').map(Number);
	return inicioDelDia(new Date(y, m - 1, dd));
}

function isoDeFecha(fecha: Date | string): string {
	if (typeof fecha === 'string') return String(fecha).slice(0, 10);
	return toIsoLocal(fecha);
}

/**
 * true si la fecha ya no admite carga/asignación de turnos.
 * Hasta `MARGEN_CARGA_TURNOS_HS` después de medianoche (calendario Argentina)
 * todavía se puede cargar el día anterior (urgencias / estadística nocturna).
 */
export function esFechaPasada(fecha: Date | string): boolean {
	const fechaIso = isoDeFecha(fecha);
	const hoy = fechaCalendarioArgentina();
	if (fechaIso >= hoy) return false;

	const [yh, mh, dh] = hoy.split('-').map(Number);
	const [yf, mf, df] = fechaIso.split('-').map(Number);
	const diffDays = Math.round(
		(Date.UTC(yh, mh - 1, dh) - Date.UTC(yf, mf - 1, df)) / 86_400_000,
	);
	if (diffDays > 1) return true;
	if (diffDays < 1) return false;

	const [hh] = horaWallArgentina(false).split(':').map(Number);
	return hh >= MARGEN_CARGA_TURNOS_HS;
}

export function toIsoLocal(d: Date = new Date()): string {
	return fechaCalendarioArgentina(d);
}

export { horaWallArgentina };
