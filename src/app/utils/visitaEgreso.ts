/**
 * Ventana de carga clínica: día >= admisión y, si egresada, día <= egreso.
 * La hora exacta la valida el backend.
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

export type VentanaCargaVisita = {
	egresada?: boolean;
	fechaEgresoSQL?: string | null;
	fechaIngresoSQL?: string | null;
};

/** ¿La fecha seleccionada admite nuevas cargas (admisión ≤ día ≤ egreso)? */
export function puedeCargarEnFechaSeleccionada(
	selected: Date | null | undefined,
	opts: VentanaCargaVisita,
): boolean {
	if (!selected) return true;
	const day = startOfDay(selected).getTime();

	const admision = parseDia(opts.fechaIngresoSQL);
	if (admision && day < admision.getTime()) return false;

	if (opts.egresada) {
		const egreso = parseDia(opts.fechaEgresoSQL);
		if (egreso && day > egreso.getTime()) return false;
	}

	return true;
}

export function mensajeFueraDeVentanaCarga(opts: VentanaCargaVisita): string {
	if (opts.egresada) {
		return 'Solo se pueden agregar registros entre la admisión y la fecha/hora de egreso.';
	}
	return 'No se pueden agregar registros con fecha anterior a la admisión.';
}
