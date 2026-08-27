import { clearCachedBedsList } from './bedsListCache';
import { clearBedSnapshot } from './bedSnapshotCache';
import { clearStoredBedsListFilters } from './bedsListFilters';
import { clearServiciosReceptorCache } from './serviciosReceptorCache';

/** Evita dependencia circular estática con los servicios de métricas. */
function clearMetricServiceCaches(): void {
	try {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		require('../services/ambulatorioService').limpiarCacheAmbulatorio();
	} catch {
		/* ignore */
	}
	try {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		require('../services/camasIndicadoresService').camasIndicadoresService.clearCache();
	} catch {
		/* ignore */
	}
}

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
			localStorage.removeItem('sectoresAsignados');
		}
	} catch {
		/* ignore */
	}
	try {
		clearServiciosReceptorCache();
	} catch {
		/* ignore */
	}
	clearMetricServiceCaches();
}
