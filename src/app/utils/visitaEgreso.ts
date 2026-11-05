/**
 * Reglas de carga clínica en visitas egresadas:
 * se permite todo con fecha (día) anterior o igual al egreso;
 * el backend valida además la hora en el día de egreso.
 */

function parseDia(fecha?: string | null): Date | null {
	if (!fecha) return null;
	const m = String(fecha).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
	if (m) {
		const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
		d.setHours(0, 0, 0, 0);
		return d;
	}
	const iso = String(fecha).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
	if (iso) {
		const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
		d.setHours(0, 0, 0, 0);
		return d;
	}
	const parsed = new Date(fecha);
	if (Number.isNaN(parsed.getTime())) return null;
	parsed.setHours(0, 0, 0, 0);
	return parsed;
}

function startOfDay(d: Date): Date {
	const x = new Date(d);
	x.setHours(0, 0, 0, 0);
	return x;
}

/** ¿La fecha seleccionada admite nuevas cargas (día ≤ egreso)? */
export function puedeCargarEnFechaSeleccionada(
	selected: Date | null | undefined,
	opts: { egresada?: boolean; fechaEgresoSQL?: string | null },
): boolean {
	if (!opts.egresada) return true;
	const egreso = parseDia(opts.fechaEgresoSQL);
	if (!egreso || !selected) return true;
	return startOfDay(selected).getTime() <= egreso.getTime();
}
