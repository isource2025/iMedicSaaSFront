function readJwtPayload(): Record<string, unknown> | null {
	if (typeof window === 'undefined') return null;
	const token = localStorage.getItem('token');
	if (!token) return null;
	try {
		return JSON.parse(atob(token.split('.')[1])) as Record<string, unknown>;
	} catch {
		return null;
	}
}

/** Lee idEmpresa del JWT en localStorage (solo UI; el backend valida el token). */
export function getIdEmpresaFromToken(): number | null {
	const payload = readJwtPayload();
	if (!payload) return null;
	const id = payload.idEmpresa;
	const n = id != null && id !== '' ? Number(id) : NaN;
	return Number.isFinite(n) && n > 0 ? n : null;
}

/** Lee el sector de sesión del JWT (código Valor de imSectores). */
export function getIdSectorFromToken(): string | null {
	const payload = readJwtPayload();
	if (!payload) return null;
	const s = String(payload.idSector || '').trim();
	return s || null;
}
