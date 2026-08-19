import type { SectorReceptorEstudio } from '@/app/types/estudios';
import { getIdEmpresaFromToken } from './jwtSession';

export const SERVICIOS_RECEPTOR_UPDATED_EVENT = 'imedic:servicios-receptor-updated';

const PREFIX = 'imedic:serviciosReceptor:';
const COUNT_PREFIX = 'imedic:bandejaPedidosCount:';

/** Mostrar cache viejo; el listado de servicios casi no cambia. */
const STALE_MS = 7 * 24 * 60 * 60 * 1000;
/** Evitar pegarle al SQL en cada poll de la campana. */
export const SERVICIOS_RECEPTOR_FRESH_MS = 5 * 60 * 1000;

type SectoresEntry = {
	ts: number;
	idEmpresa: string;
	valorPersonal: string;
	soloMios: boolean;
	sectores: SectorReceptorEstudio[];
};

type CountEntry = {
	ts: number;
	idEmpresa: string;
	valorPersonal: string;
	estudios: number;
	interconsultas: number;
};

const memorySectores = new Map<string, SectoresEntry>();
const memoryCount = new Map<string, CountEntry>();

function lsGet(key: string): string | null {
	try {
		if (typeof localStorage === 'undefined') return null;
		return localStorage.getItem(key);
	} catch {
		return null;
	}
}

function lsSet(key: string, value: string): void {
	try {
		if (typeof localStorage === 'undefined') return;
		localStorage.setItem(key, value);
	} catch {
		/* quota / private mode */
	}
}

function lsRemovePrefix(prefix: string): void {
	try {
		if (typeof localStorage === 'undefined') return;
		const keys: string[] = [];
		for (let i = 0; i < localStorage.length; i++) {
			const k = localStorage.key(i);
			if (k && k.startsWith(prefix)) keys.push(k);
		}
		keys.forEach((k) => localStorage.removeItem(k));
	} catch {
		/* ignore */
	}
}

function currentEmpresaId(): string {
	try {
		const fromToken = getIdEmpresaFromToken();
		if (fromToken != null && String(fromToken).trim() !== '') {
			return String(fromToken).trim();
		}
	} catch {
		/* ignore */
	}
	try {
		const raw = lsGet('empresaSeleccionada') || lsGet('empresaInfo');
		if (!raw) return '';
		const parsed = JSON.parse(raw) as { idEmpresa?: string | number; id?: string | number };
		const id = parsed.idEmpresa ?? parsed.id;
		return id != null && String(id).trim() !== '' ? String(id).trim() : '';
	} catch {
		return '';
	}
}

function currentValorPersonal(): string {
	try {
		const raw = lsGet('user');
		if (!raw) return 'anon';
		const u = JSON.parse(raw) as Record<string, unknown>;
		const n = Number(u.idValorpersonal ?? u.valorPersonal ?? u.ValorPersonal ?? 0);
		return Number.isFinite(n) && n > 0 ? String(n) : 'anon';
	} catch {
		return 'anon';
	}
}

function sectoresKey(soloMios: boolean): string {
	const emp = currentEmpresaId() || 'emp';
	const vp = soloMios ? currentValorPersonal() : 'all';
	return `${PREFIX}${emp}:${vp}:${soloMios ? 'mios' : 'all'}`;
}

function countKey(): string {
	const emp = currentEmpresaId() || 'emp';
	return `${COUNT_PREFIX}${emp}:${currentValorPersonal()}`;
}

function normalizeList(list: SectorReceptorEstudio[]): SectorReceptorEstudio[] {
	return (Array.isArray(list) ? list : [])
		.map((s) => ({
			valor: String(s?.valor || '').trim(),
			descripcion: String(s?.descripcion || '').trim(),
			prefijos: Array.isArray(s?.prefijos) ? s.prefijos.map((p) => String(p).trim()).filter(Boolean) : [],
		}))
		.filter((s) => s.valor);
}

export function sectoresReceptorSignature(list: SectorReceptorEstudio[]): string {
	return normalizeList(list)
		.map((s) => `${s.valor}|${s.descripcion}|${s.prefijos.join(',')}`)
		.join(';');
}

function readSectoresEntry(soloMios: boolean): SectoresEntry | null {
	const key = sectoresKey(soloMios);
	const mem = memorySectores.get(key);
	if (mem) return mem;
	const raw = lsGet(key);
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw) as SectoresEntry;
		if (!parsed || !Array.isArray(parsed.sectores)) return null;
		memorySectores.set(key, parsed);
		return parsed;
	} catch {
		return null;
	}
}

export function peekCachedSectoresReceptor(opts?: {
	soloMios?: boolean;
	maxAgeMs?: number;
	allowStale?: boolean;
}): SectorReceptorEstudio[] | null {
	const soloMios = Boolean(opts?.soloMios);
	const entry = readSectoresEntry(soloMios);
	if (!entry) return null;
	const emp = currentEmpresaId();
	if (emp && entry.idEmpresa && entry.idEmpresa !== emp) return null;
	const maxAge = opts?.allowStale ? STALE_MS : (opts?.maxAgeMs ?? STALE_MS);
	if (Date.now() - Number(entry.ts || 0) > maxAge) return null;
	return normalizeList(entry.sectores);
}

export function setCachedSectoresReceptor(
	sectores: SectorReceptorEstudio[],
	opts?: { soloMios?: boolean },
): void {
	const soloMios = Boolean(opts?.soloMios);
	const key = sectoresKey(soloMios);
	const prev = readSectoresEntry(soloMios);
	const list = normalizeList(sectores);
	const entry: SectoresEntry = {
		ts: Date.now(),
		idEmpresa: currentEmpresaId(),
		valorPersonal: soloMios ? currentValorPersonal() : 'all',
		soloMios,
		sectores: list,
	};
	memorySectores.set(key, entry);
	lsSet(key, JSON.stringify(entry));
	const changed =
		!prev || sectoresReceptorSignature(prev.sectores) !== sectoresReceptorSignature(list);
	if (changed && typeof window !== 'undefined') {
		window.dispatchEvent(new Event(SERVICIOS_RECEPTOR_UPDATED_EVENT));
	}
}

export function peekCachedBandejaCount(): { estudios: number; interconsultas: number } | null {
	const key = countKey();
	let entry = memoryCount.get(key) || null;
	if (!entry) {
		const raw = lsGet(key);
		if (!raw) return null;
		try {
			entry = JSON.parse(raw) as CountEntry;
			if (entry) memoryCount.set(key, entry);
		} catch {
			return null;
		}
	}
	if (!entry) return null;
	const emp = currentEmpresaId();
	if (emp && entry.idEmpresa && entry.idEmpresa !== emp) return null;
	if (Date.now() - Number(entry.ts || 0) > STALE_MS) return null;
	return {
		estudios: Number(entry.estudios) || 0,
		interconsultas: Number(entry.interconsultas) || 0,
	};
}

export function setCachedBandejaCount(data: { estudios: number; interconsultas: number }): void {
	const key = countKey();
	const entry: CountEntry = {
		ts: Date.now(),
		idEmpresa: currentEmpresaId(),
		valorPersonal: currentValorPersonal(),
		estudios: Number(data.estudios) || 0,
		interconsultas: Number(data.interconsultas) || 0,
	};
	memoryCount.set(key, entry);
	lsSet(key, JSON.stringify(entry));
}

export function clearServiciosReceptorCache(): void {
	memorySectores.clear();
	memoryCount.clear();
	lsRemovePrefix(PREFIX);
	lsRemovePrefix(COUNT_PREFIX);
}
