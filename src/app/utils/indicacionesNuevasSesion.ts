/** Ids de indicaciones vistas como "Nueva" en la sesión actual de detalle de cama. */
const nuevasPorVisita = new Map<number, Set<number>>();
const listeners = new Set<() => void>();

function notify() {
	listeners.forEach((cb) => {
		try {
			cb();
		} catch {
			/* ignore */
		}
	});
}

/** Suscribirse a cambios del snapshot (para re-pintar badge tras limpiar SQL). */
export function subscribeNuevasEnfermeriaSesion(cb: () => void): () => void {
	listeners.add(cb);
	return () => {
		listeners.delete(cb);
	};
}

export function rememberNuevasEnfermeriaSesion(
	numeroVisita: number,
	nros: number[],
): void {
	const nro = Number(numeroVisita || 0);
	if (!nro || !nros?.length) return;
	let set = nuevasPorVisita.get(nro);
	if (!set) {
		set = new Set();
		nuevasPorVisita.set(nro, set);
	}
	let changed = false;
	for (const id of nros) {
		const n = Number(id);
		if (Number.isFinite(n) && n > 0 && !set.has(n)) {
			set.add(n);
			changed = true;
		}
	}
	if (changed) notify();
}

export function fueNuevaEnSesion(
	numeroVisita: number,
	nroIndicacion: number | string | null | undefined,
): boolean {
	const visita = Number(numeroVisita || 0);
	const id = Number(nroIndicacion || 0);
	if (!visita || !id) return false;
	return nuevasPorVisita.get(visita)?.has(id) ?? false;
}

/** Al salir del detalle: la próxima entrada no debe reutilizar el snapshot. */
export function clearNuevasEnfermeriaSesion(numeroVisita: number): void {
	const nro = Number(numeroVisita || 0);
	if (!nro) return;
	if (!nuevasPorVisita.has(nro)) return;
	nuevasPorVisita.delete(nro);
	notify();
}
