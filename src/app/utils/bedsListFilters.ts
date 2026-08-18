const STORAGE_KEY = 'imedic:bedsListFilters';

export type BedsListFilters = {
	sector: string;
};

export function getStoredBedsListFilters(): BedsListFilters | null {
	if (typeof sessionStorage === 'undefined') return null;
	try {
		const raw = sessionStorage.getItem(STORAGE_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as BedsListFilters;
		const sector = String(parsed?.sector || '').trim();
		if (!sector) return null;
		return { sector };
	} catch {
		return null;
	}
}

export function setStoredBedsListFilters(filters: BedsListFilters): void {
	if (typeof sessionStorage === 'undefined') return;
	try {
		const sector = String(filters.sector || '').trim() || 'all';
		sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ sector }));
	} catch {
		/* ignore */
	}
}

export function clearStoredBedsListFilters(): void {
	if (typeof sessionStorage === 'undefined') return;
	try {
		sessionStorage.removeItem(STORAGE_KEY);
	} catch {
		/* ignore */
	}
}

/** Ruta de la lista de camas respetando el sector filtrado. */
export function bedsListHref(sector?: string | null): string {
	const value = String(sector || getStoredBedsListFilters()?.sector || '').trim();
	if (!value || value === 'all') return '/dashboard/beds';
	return `/dashboard/beds?sector=${encodeURIComponent(value)}`;
}
