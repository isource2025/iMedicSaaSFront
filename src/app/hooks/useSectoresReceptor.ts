'use client';

import { useEffect, useLayoutEffect, useState } from 'react';
import estudiosService from '@/app/services/estudiosService';
import type { SectorReceptorEstudio } from '@/app/types/estudios';
import {
	peekCachedSectoresReceptor,
	SERVICIOS_RECEPTOR_UPDATED_EVENT,
} from '@/app/utils/serviciosReceptorCache';

/** Servicios receptor: hidrata desde localStorage y refresca en segundo plano. */
export function useSectoresReceptor(opts?: { soloMios?: boolean; enabled?: boolean }): {
	sectores: SectorReceptorEstudio[];
	loading: boolean;
} {
	const soloMios = Boolean(opts?.soloMios);
	const enabled = opts?.enabled !== false;
	const [sectores, setSectores] = useState<SectorReceptorEstudio[]>([]);
	const [loading, setLoading] = useState(enabled);

	useLayoutEffect(() => {
		if (!enabled) {
			setLoading(false);
			return;
		}
		const cached = peekCachedSectoresReceptor({ soloMios, allowStale: true });
		if (cached !== null) {
			setSectores(cached);
			setLoading(false);
		} else {
			setLoading(true);
		}
	}, [enabled, soloMios]);

	useEffect(() => {
		if (!enabled) return;
		let cancelled = false;
		void estudiosService.listarSectoresReceptor({ soloMios }).then((list) => {
			if (cancelled) return;
			setSectores(list);
			setLoading(false);
		});
		const onUpd = () => {
			const next = peekCachedSectoresReceptor({ soloMios, allowStale: true });
			if (next !== null) setSectores(next);
		};
		window.addEventListener(SERVICIOS_RECEPTOR_UPDATED_EVENT, onUpd);
		return () => {
			cancelled = true;
			window.removeEventListener(SERVICIOS_RECEPTOR_UPDATED_EVENT, onUpd);
		};
	}, [enabled, soloMios]);

	return { sectores, loading };
}
