import { clearCachedBedsList } from './bedsListCache';
import { clearBedSnapshot } from './bedSnapshotCache';
import { clearStoredBedsListFilters } from './bedsListFilters';

/**
 * Limpia caches de UI atados al tenant (empresa).
 * Llamar en logout, login exitoso y 401.
 */
export function clearTenantUiCaches(): void {
	try {
		clearCachedBedsList();
	} catch {
		/* ignore */
	}
	try {
		clearBedSnapshot();
	} catch {
		/* ignore */
	}
	try {
		clearStoredBedsListFilters();
	} catch {
		/* ignore */
	}
	try {
		if (typeof localStorage !== 'undefined') {
			localStorage.removeItem('sectorSeleccionado');
		}
	} catch {
		/* ignore */
	}
}
