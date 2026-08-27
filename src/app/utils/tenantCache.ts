import { getIdEmpresaFromToken } from './jwtSession';

/**
 * Identificador estable del tenant para claves de cache en memoria.
 * Prioriza JWT (sesión activa) y cae a localStorage durante el flujo de login.
 */
export function resolveTenantCacheId(): string {
	try {
		const fromToken = getIdEmpresaFromToken();
		if (fromToken != null) return String(fromToken);
		if (typeof localStorage === 'undefined') return '0';
		const raw = localStorage.getItem('empresaSeleccionada') || localStorage.getItem('empresaInfo');
		if (!raw) return '0';
		const parsed = JSON.parse(raw) as { idEmpresa?: string | number; id?: string | number };
		const id = parsed.idEmpresa ?? parsed.id;
		return id != null && String(id).trim() !== '' ? String(id).trim() : '0';
	} catch {
		return '0';
	}
}

/** Prefijo de cache atado al tenant actual. */
export function tenantCachePrefix(prefix: string): string {
	return `${prefix}:emp:${resolveTenantCacheId()}`;
}
