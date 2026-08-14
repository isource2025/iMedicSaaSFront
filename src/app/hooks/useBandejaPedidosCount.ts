'use client';

import { useCallback, useEffect, useState } from 'react';
import estudiosService from '@/app/services/estudiosService';
import { interconsultasService } from '@/app/services/interconsultasService';
import { useAppContext } from '@/app/contexts/AppContext';
import { resolveSectorReceptor } from '@/app/utils/resolveSectorReceptor';

const POLL_MS = 45_000;

export type BandejaPedidosCount = {
	count: number;
	estudios: number;
	interconsultas: number;
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
	const { sectorSeleccionado } = useAppContext();

	const refresh = useCallback(async () => {
		if (!enabled) {
			setEstudios(0);
			setInterconsultas(0);
			return;
		}
		try {
			const sectores = await estudiosService.listarSectoresReceptor({ soloMios: true });
			if (!sectores.length) {
				setEstudios(0);
				setInterconsultas(0);
				return;
			}
			const preferred = resolveSectorReceptor(sectorSeleccionado, sectores);
			const ordered = preferred
				? [preferred, ...sectores.map((s) => s.valor).filter((v) => v !== preferred)]
				: sectores.map((s) => s.valor);
			const unique = Array.from(
				new Set(ordered.map((v) => String(v || '').trim()).filter(Boolean)),
			);

			const counts = await Promise.all(
				unique.map(async (sector) => {
					const [est, ics] = await Promise.all([
						estudiosService.listarPendientes(sector),
						interconsultasService.listarPendientes(sector),
					]);
					return {
						estudios: est.filter((r) => !r.Tomado).length,
						interconsultas: ics.filter((r) => !r.Tomado).length,
					};
				}),
			);
			setEstudios(counts.reduce((a, b) => a + b.estudios, 0));
			setInterconsultas(counts.reduce((a, b) => a + b.interconsultas, 0));
		} catch {
			setEstudios(0);
			setInterconsultas(0);
		}
	}, [enabled, sectorSeleccionado]);

	useEffect(() => {
		if (!enabled) return;
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
		refresh,
	};
}
