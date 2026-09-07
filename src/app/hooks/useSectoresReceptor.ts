'use client';

import { useEffect, useLayoutEffect, useState } from 'react';
import estudiosService from '@/app/services/estudiosService';
import type { SectorReceptorEstudio } from '@/app/types/estudios';
import {
	peekCachedSectoresReceptor,
	setCachedSectoresReceptor,
	SERVICIOS_RECEPTOR_UPDATED_EVENT,
} from '@/app/utils/serviciosReceptorCache';

/**
 * Destinos de pedidos (estudios / interconsultas) = SERVICIOS (imServicios), no sectores.
 * soloMios → servicios asignados al personal (imPersonalServicios + fallbacks).
 */
export function useSectoresReceptor(opts?: {
	soloMios?: boolean;
	enabled?: boolean;
	force?: boolean;
}): {
	/** @deprecated Alias de `servicios` (compat). */
	sectores: SectorReceptorEstudio[];
	servicios: SectorReceptorEstudio[];
	loading: boolean;
} {
	const soloMios = Boolean(opts?.soloMios);
	const enabled = opts?.enabled !== false;
	const force = Boolean(opts?.force);
	const [servicios, setServicios] = useState<SectorReceptorEstudio[]>([]);
	const [loading, setLoading] = useState(enabled);

	useLayoutEffect(() => {
		if (!enabled) {
			setLoading(false);
			return;
		}
		if (force) {
			setLoading(true);
			return;
		}
		const cached = peekCachedSectoresReceptor({ soloMios, allowStale: true });
		if (cached !== null) {
			setServicios(cached);
			setLoading(false);
		} else {
			setLoading(true);
		}
	}, [enabled, soloMios, force]);

	useEffect(() => {
		if (!enabled) return;
		let cancelled = false;
		void estudiosService.listarSectoresReceptor({ soloMios, force }).then((list) => {
			if (cancelled) return;
			setServicios(list);
			setCachedSectoresReceptor(list, { soloMios });
			setLoading(false);
		});
		const onUpd = () => {
			const next = peekCachedSectoresReceptor({ soloMios, allowStale: true });
			if (next !== null) setServicios(next);
		};
		window.addEventListener(SERVICIOS_RECEPTOR_UPDATED_EVENT, onUpd);
		return () => {
			cancelled = true;
			window.removeEventListener(SERVICIOS_RECEPTOR_UPDATED_EVENT, onUpd);
		};
	}, [enabled, soloMios, force]);

	return { sectores: servicios, servicios, loading };
}
