import { clearCachedBedsList } from './bedsListCache';
import { clearBedSnapshot } from './bedSnapshotCache';
import { clearStoredBedsListFilters } from './bedsListFilters';
import { clearServiciosReceptorCache } from './serviciosReceptorCache';
import { limpiarCacheVisitas } from './bedVisitaCache';

/** Evita dependencia circular estática con los servicios de métricas. */
function clearMetricServiceCaches(): void {
	try {
		require('../services/ambulatorioService').limpiarCacheAmbulatorio();
	} catch {
		/* ignore */
	}
	try {
		require('../services/camasIndicadoresService').camasIndicadoresService.clearCache();
	} catch {
		/* ignore */
	}
	try {
		require('./notificacionesStore').resetNotificacionesStore();
	} catch {
		/* ignore */
	}
	try {
		require('../components/beds/contexts/useBedSectionQuery').clearBedSectionCache();
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
	try {
		limpiarCacheVisitas();
	} catch {
		/* ignore */
	}
	clearMetricServiceCaches();
}
