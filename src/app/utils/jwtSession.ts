/** Lee idEmpresa del JWT en localStorage (solo UI; el backend valida el token). */
export function getIdEmpresaFromToken(): number | null {
	if (typeof window === 'undefined') return null;
	const token = localStorage.getItem('token');
	if (!token) return null;
	try {
		const payload = JSON.parse(atob(token.split('.')[1]));
		const id = payload?.idEmpresa;
		const n = id != null && id !== '' ? Number(id) : NaN;
		return Number.isFinite(n) && n > 0 ? n : null;
	} catch {
		return null;
	}
}
