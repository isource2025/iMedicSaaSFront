import type { Bed } from '../types/beds';

type BedsListCache = {
	ts: number;
	beds: Bed[];
	states?: { id: string; valor: string; descripcion: string }[];
	sectores?: { id: string; valor: string; descripcion: string }[];
};

let cache: BedsListCache | null = null;

/** TTL corto: sirve para no re-pedir al abrir modales desde la lista. */
const DEFAULT_TTL_MS = 45_000;

export function getCachedBedsList(maxAgeMs = DEFAULT_TTL_MS): Bed[] | null {
	if (!cache?.beds?.length) return null;
	if (Date.now() - cache.ts > maxAgeMs) return null;
	return cache.beds;
}

export function getCachedBedMeta(maxAgeMs = 5 * 60_000): {
	states?: BedsListCache['states'];
	sectores?: BedsListCache['sectores'];
} | null {
	if (!cache) return null;
	if (Date.now() - cache.ts > maxAgeMs) return null;
	return { states: cache.states, sectores: cache.sectores };
}

export function setCachedBedsList(
	beds: Bed[],
	extra?: { states?: BedsListCache['states']; sectores?: BedsListCache['sectores'] },
): void {
	cache = {
		ts: Date.now(),
		beds,
		states: extra?.states ?? cache?.states,
		sectores: extra?.sectores ?? cache?.sectores,
	};
}

export function setCachedBedMeta(extra: {
	states?: BedsListCache['states'];
	sectores?: BedsListCache['sectores'];
}): void {
	if (!cache) {
		cache = { ts: Date.now(), beds: [], ...extra };
		return;
	}
	cache = {
		...cache,
		states: extra.states ?? cache.states,
		sectores: extra.sectores ?? cache.sectores,
	};
}

export function bedsListSignature(beds: Bed[]): string {
	return beds
		.map(
			(b) =>
				`${b.id}|${b.estado}|${b.numeroVisita}|${b.NombrePaciente}|${b.documentoPaciente}|${b.tipoRecurso}`,
		)
		.join(';');
}
