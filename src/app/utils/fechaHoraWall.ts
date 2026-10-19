/**
 * Formatea DATETIME del HIS (hora de pared argentina, sin zona) para mostrar.
 * Si llega con `Z` (legado: tedious etiquetó UTC), se usan los componentes UTC
 * porque ahí vive la hora local. No usar toLocale* sobre ese ISO o resta 3 h.
 */
export function formatFechaHoraWall(
	fecha: string | Date | null | undefined,
	opts?: { withSeconds?: boolean },
): string {
	if (fecha == null || fecha === '') return '';

	const pad = (n: number) => String(n).padStart(2, '0');
	const asAmPm = (h24: number, mm: string) => {
		const ampm = h24 >= 12 ? 'p. m.' : 'a. m.';
		const h12 = h24 % 12 || 12;
		return `${h12}:${mm} ${ampm}`;
	};

	if (typeof fecha === 'string') {
		const s = fecha.trim();
		const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/);
		if (m) {
			const [, y, mo, d, hh, mm, ss] = m;
			const time = opts?.withSeconds && ss != null ? `${Number(hh)}:${mm}:${ss}` : asAmPm(Number(hh), mm);
			return `${d}/${mo}/${y}, ${time}`;
		}
	}

	const date = fecha instanceof Date ? fecha : new Date(fecha);
	if (Number.isNaN(date.getTime())) return '';

	const fromUtc =
		typeof fecha === 'string' && /Z$/i.test(fecha.trim());
	const y = fromUtc ? date.getUTCFullYear() : date.getFullYear();
	const mo = pad((fromUtc ? date.getUTCMonth() : date.getMonth()) + 1);
	const d = pad(fromUtc ? date.getUTCDate() : date.getDate());
	const h = fromUtc ? date.getUTCHours() : date.getHours();
	const mm = pad(fromUtc ? date.getUTCMinutes() : date.getMinutes());
	const ss = pad(fromUtc ? date.getUTCSeconds() : date.getSeconds());
	const time = opts?.withSeconds ? `${h}:${mm}:${ss}` : asAmPm(h, mm);
	return `${d}/${mo}/${y}, ${time}`;
}
