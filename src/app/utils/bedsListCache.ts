import type { Bed } from '../types/beds';
import { getIdEmpresaFromToken } from './jwtSession';

type BedsListCache = {
	ts: number;
	idEmpresa: string | null;
	beds: Bed[];
	states?: { id: string; valor: string; descripcion: string }[];
	sectores?: { id: string; valor: string; descripcion: string }[];
};

let cache: BedsListCache | null = null;

/** TTL corto: sirve para no re-pedir al abrir modales desde la lista. */
const DEFAULT_TTL_MS = 45_000;

function resolveEmpresaId(explicit?: string | number | null): string | null {
	if (explicit != null && String(explicit).trim() !== '') {
		return String(explicit).trim();
	}
	try {
		const fromToken = getIdEmpresaFromToken();
		if (fromToken != null && String(fromToken).trim() !== '') {
			return String(fromToken).trim();
		}
	} catch {
		/* ignore */
	}
	try {
		const raw =
			typeof localStorage !== 'undefined'
				? localStorage.getItem('empresaSeleccionada') || localStorage.getItem('empresaInfo')
				: null;
		if (!raw) return null;
		const parsed = JSON.parse(raw) as { idEmpresa?: string | number; id?: string | number };
		const id = parsed.idEmpresa ?? parsed.id;
		return id != null && String(id).trim() !== '' ? String(id).trim() : null;
	} catch {
		return null;
	}
}

function isSameEmpresa(cachedId: string | null, currentId: string | null): boolean {
	if (!cachedId || !currentId) return !cachedId && !currentId;
	return String(cachedId) === String(currentId);
}

export function clearCachedBedsList(): void {
	cache = null;
}

export function getCachedBedsList(
	maxAgeMs = DEFAULT_TTL_MS,
	idEmpresa?: string | number | null,
): Bed[] | null {
	if (!cache?.beds?.length) return null;
	const current = resolveEmpresaId(idEmpresa);
	if (!isSameEmpresa(cache.idEmpresa, current)) return null;
	if (Date.now() - cache.ts > maxAgeMs) return null;
	return cache.beds;
}

export function getCachedBedMeta(
	maxAgeMs = 5 * 60_000,
	idEmpresa?: string | number | null,
): {
	states?: BedsListCache['states'];
	sectores?: BedsListCache['sectores'];
} | null {
	if (!cache) return null;
	const current = resolveEmpresaId(idEmpresa);
	if (!isSameEmpresa(cache.idEmpresa, current)) return null;
	if (Date.now() - cache.ts > maxAgeMs) return null;
	return { states: cache.states, sectores: cache.sectores };
}

export function setCachedBedsList(
	beds: Bed[],
	extra?: { states?: BedsListCache['states']; sectores?: BedsListCache['sectores'] },
	idEmpresa?: string | number | null,
): void {
	const current = resolveEmpresaId(idEmpresa);
	const sameTenant = cache && isSameEmpresa(cache.idEmpresa, current);
	cache = {
		ts: Date.now(),
		idEmpresa: current,
		beds,
		states: extra?.states ?? (sameTenant ? cache?.states : undefined),
		sectores: extra?.sectores ?? (sameTenant ? cache?.sectores : undefined),
	};
}

export function setCachedBedMeta(
	extra: {
		states?: BedsListCache['states'];
		sectores?: BedsListCache['sectores'];
	},
	idEmpresa?: string | number | null,
): void {
	const current = resolveEmpresaId(idEmpresa);
	if (!cache || !isSameEmpresa(cache.idEmpresa, current)) {
		cache = { ts: Date.now(), idEmpresa: current, beds: [], ...extra };
		return;
	}
	cache = {
		...cache,
		idEmpresa: current,
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
