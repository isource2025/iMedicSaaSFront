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

export type SectorSesionJwt = {
	valor: string;
	descripcion: string;
	valorServicio: string;
};

/** Sectores del perfil capturados en el login (JWT). */
export function getSectoresFromToken(): SectorSesionJwt[] {
	const payload = readJwtPayload();
	if (!payload || !Array.isArray(payload.sectores)) return [];
	const seen = new Set<string>();
	const out: SectorSesionJwt[] = [];
	for (const raw of payload.sectores) {
		const s = raw as { idSector?: string; valor?: string; descripcion?: string; valorServicio?: string };
		const valor = String(s?.valor || s?.idSector || '').trim();
		if (!valor) continue;
		const k = valor.toUpperCase();
		if (seen.has(k)) continue;
		seen.add(k);
		out.push({
			valor,
			descripcion: String(s?.descripcion || valor).trim(),
			valorServicio: String(s?.valorServicio || '').trim(),
		});
	}
	return out;
}
