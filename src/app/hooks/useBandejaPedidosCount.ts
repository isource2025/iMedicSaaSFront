'use client';

import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import estudiosService from '@/app/services/estudiosService';
import solicitudesEstudiosService from '@/app/services/solicitudesEstudiosService';
import { solicitudesMultiHabilitado } from '@/app/utils/solicitudesMulti';
import { peekCachedBandejaCount } from '@/app/utils/serviciosReceptorCache';

const POLL_MS = 45_000;

export type BandejaPedidosCount = {
	count: number;
	estudios: number;
	interconsultas: number;
	/** True cuando terminó la primera consulta (con o sin error). */
	loaded: boolean;
	refresh: () => Promise<void>;
};

/** Contador de pedidos libres (estudios + interconsultas) en los servicios del usuario. */
export function useBandejaPedidosCount(
	enabled = true,
	options?: { poll?: boolean },
): BandejaPedidosCount {
	const poll = options?.poll !== false;
	const [estudios, setEstudios] = useState(0);
	const [interconsultas, setInterconsultas] = useState(0);
	const [loaded, setLoaded] = useState(false);

	const refresh = useCallback(async () => {
		if (!enabled) {
			setEstudios(0);
			setInterconsultas(0);
			setLoaded(false);
			return;
		}
		try {
			const data = solicitudesMultiHabilitado()
				? await solicitudesEstudiosService.contarLibresBandeja({ soloMios: true })
				: await estudiosService.contarLibres({ soloMios: true });
			setEstudios(data.estudios);
			setInterconsultas(data.interconsultas);
		} catch {
			const fallback = peekCachedBandejaCount();
			if (fallback) {
				setEstudios(fallback.estudios);
				setInterconsultas(fallback.interconsultas);
			}
		} finally {
			setLoaded(true);
		}
	}, [enabled]);

	useLayoutEffect(() => {
		if (!enabled) return;
		const local = peekCachedBandejaCount();
		if (local) {
			setEstudios(local.estudios);
			setInterconsultas(local.interconsultas);
		}
	}, [enabled]);

	useEffect(() => {
		if (!enabled) {
			setLoaded(false);
			return;
		}
		void refresh();
		if (!poll) return;
		const t = window.setInterval(() => {
			if (document.visibilityState === 'visible') void refresh();
		}, POLL_MS);
		const onVis = () => {
			if (document.visibilityState === 'visible') void refresh();
		};
		document.addEventListener('visibilitychange', onVis);
		return () => {
			window.clearInterval(t);
			document.removeEventListener('visibilitychange', onVis);
		};
	}, [enabled, refresh, poll]);

	return {
		count: estudios + interconsultas,
		estudios,
		interconsultas,
		loaded,
		refresh,
	};
}
