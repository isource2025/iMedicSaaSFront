/** Fecha local a medianoche (sin hora). */
export function inicioDelDia(d: Date): Date {
	const x = new Date(d);
	x.setHours(0, 0, 0, 0);
	return x;
}

export function hoyLocal(): Date {
	return inicioDelDia(new Date());
}

export function parseIsoLocal(iso: string): Date {
	const [y, m, dd] = String(iso).split('-').map(Number);
	return inicioDelDia(new Date(y, m - 1, dd));
}

/** true si la fecha (día) es anterior a hoy (hora local). */
export function esFechaPasada(fecha: Date | string): boolean {
	const day = typeof fecha === 'string' ? parseIsoLocal(fecha) : inicioDelDia(fecha);
	return day.getTime() < hoyLocal().getTime();
}

export function toIsoLocal(d: Date): string {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const dd = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${dd}`;
}
