'use client';

import { useCallback, useEffect, useState } from 'react';
import estudiosService from '@/app/services/estudiosService';
import { interconsultasService } from '@/app/services/interconsultasService';
import { useAppContext } from '@/app/contexts/AppContext';
import { resolveSectorReceptor } from '@/app/utils/resolveSectorReceptor';

const POLL_MS = 5000;

/** Contador de pedidos libres (estudios + interconsultas) para el badge del menú. */
export function useBandejaPedidosCount(enabled = true) {
	const [count, setCount] = useState(0);
	const { sectorSeleccionado } = useAppContext();

	const refresh = useCallback(async () => {
		if (!enabled) {
			setCount(0);
			return;
		}
		try {
			const sectores = await estudiosService.listarSectoresReceptor();
			const sector = resolveSectorReceptor(sectorSeleccionado, sectores);
			if (!sector) {
				setCount(0);
				return;
			}
			const [estudios, ics] = await Promise.all([
				estudiosService.listarPendientes(sector),
				interconsultasService.listarPendientes(sector),
			]);
			const libres =
				estudios.filter((r) => !r.Tomado).length + ics.filter((r) => !r.Tomado).length;
			setCount(libres);
		} catch {
			setCount(0);
		}
	}, [enabled, sectorSeleccionado]);

	useEffect(() => {
		if (!enabled) return;
		void refresh();
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
	}, [enabled, refresh]);

	return { count, refresh };
}
