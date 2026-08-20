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

/** Visitas marcadas como vistas al cerrar el detalle: el GET /beds no debe reponer el badge. */
const VISTO_ENFERMERIA_TTL_MS = 90_000;
const vistasEnfermeriaRecientes = new Map<number, number>();

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
	return applyIndicacionesNuevasVistoLocal(cache.beds);
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

export function applyIndicacionesNuevasVistoLocal(beds: Bed[]): Bed[] {
	if (!beds?.length || !vistasEnfermeriaRecientes.size) return beds;
	const now = Date.now();
	return beds.map((b) => {
		const nro = Number(b.numeroVisita || b.NumeroVisita || 0);
		if (!nro) return b;
		const ts = vistasEnfermeriaRecientes.get(nro);
		if (!ts) return b;
		if (now - ts > VISTO_ENFERMERIA_TTL_MS) {
			vistasEnfermeriaRecientes.delete(nro);
			return b;
		}
		if (!b.indicacionesNuevasEnfermeria) return b;
		return { ...b, indicacionesNuevasEnfermeria: 0 };
	});
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
		beds: applyIndicacionesNuevasVistoLocal(beds),
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
				`${b.id}|${b.estado}|${b.numeroVisita}|${b.NombrePaciente}|${b.documentoPaciente}|${b.tipoRecurso}|${b.indicacionesNuevasEnfermeria ?? 0}`,
		)
		.join(';');
}

/** Tras cerrar el detalle, el badge debe desaparecer en la lista cacheada. */
export function clearIndicacionesNuevasEnfermeria(numeroVisita: number): void {
	const nro = Number(numeroVisita || 0);
	if (!nro) return;
	vistasEnfermeriaRecientes.set(nro, Date.now());
	if (!cache?.beds?.length) return;
	cache = {
		...cache,
		beds: applyIndicacionesNuevasVistoLocal(cache.beds),
	};
}
