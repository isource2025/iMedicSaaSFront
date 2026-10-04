/**
 * Cache en memoria de las secciones de la ficha de cama que cargan "todo lo de la visita"
 * (HC ingreso, interconsultas, estudios, laboratorios, protocolos, procedimientos).
 * La precarga deja los datos acá y la sección los muestra sin loader al abrirse.
 */

type Entry = { ts: number; data: unknown; precargado: boolean };

const store = new Map<string, Entry>();
const inflight = new Map<string, Promise<unknown>>();

/** Más viejo que esto no se muestra: la sección vuelve a cargar con loader. */
const MAX_AGE_MS = 10 * 60_000;
/** Una precarga más nueva que esto se usa tal cual la primera vez que se abre la sección. */
const FRESH_MS = 30_000;

export type VisitaCacheKey = string;

export function visitaCacheKey(
	seccion: string,
	numeroVisita: number | string | null | undefined,
): VisitaCacheKey | null {
	const nv = Number(numeroVisita);
	return Number.isFinite(nv) && nv > 0 ? `${seccion}:${nv}` : null;
}

function vigente(key: VisitaCacheKey | null): Entry | undefined {
	if (!key) return undefined;
	const e = store.get(key);
	return e && Date.now() - e.ts <= MAX_AGE_MS ? e : undefined;
}

/** Lectura sin efectos (para el estado inicial de la sección). */
export function peekVisita<T>(key: VisitaCacheKey | null): T | undefined {
	return vigente(key)?.data as T | undefined;
}

/**
 * Al montar la sección: devuelve lo cacheado y si hay que refrescarlo atrás.
 * Una precarga reciente se usa sin volver a pedirla; después siempre se refresca.
 */
export function tomarVisita<T>(key: VisitaCacheKey | null): { data: T; refrescar: boolean } | undefined {
	const e = vigente(key);
	if (!e) return undefined;
	const refrescar = !e.precargado || Date.now() - e.ts >= FRESH_MS;
	e.precargado = false;
	return { data: e.data as T, refrescar };
}

export function guardarVisita<T>(key: VisitaCacheKey | null, data: T, precargado = false): void {
	if (!key) return;
	store.set(key, { ts: Date.now(), data, precargado });
}

/**
 * Pide los datos guardando el resultado en el cache. Si hay una precarga en curso
 * para la misma clave, la reutiliza (salvo `force`, para recargar después de guardar).
 */
export function cargarVisita<T>(
	key: VisitaCacheKey | null,
	loader: () => Promise<T>,
	force = false,
	precargado = false,
): Promise<T> {
	if (!key) return loader();
	const pending = inflight.get(key);
	if (pending && !force) return pending as Promise<T>;
	const job: Promise<T> = loader()
		.then((data) => {
			if (inflight.get(key) === job) guardarVisita(key, data, precargado);
			return data;
		})
		.finally(() => {
			if (inflight.get(key) === job) inflight.delete(key);
		});
	inflight.set(key, job);
	return job;
}

export async function precargarVisita<T>(key: VisitaCacheKey | null, loader: () => Promise<T>): Promise<void> {
	if (!key) return;
	const e = vigente(key);
	if (e && Date.now() - e.ts < FRESH_MS) return;
	try {
		await cargarVisita(key, loader, false, true);
	} catch {
		/* la sección vuelve a intentar al abrirse */
	}
}

export function limpiarCacheVisitas(): void {
	store.clear();
	inflight.clear();
}
