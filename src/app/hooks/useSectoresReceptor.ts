'use client';

import { useEffect, useLayoutEffect, useState } from 'react';
import estudiosService from '@/app/services/estudiosService';
import type { SectorReceptorEstudio } from '@/app/types/estudios';
import { getSectoresFromToken } from '@/app/utils/jwtSession';
import {
	peekCachedSectoresReceptor,
	setCachedSectoresReceptor,
	SERVICIOS_RECEPTOR_UPDATED_EVENT,
} from '@/app/utils/serviciosReceptorCache';

function sectoresDesdeLogin(): SectorReceptorEstudio[] {
	const fromJwt = getSectoresFromToken();
	if (fromJwt.length) {
		return fromJwt.map((s) => ({
			valor: s.valor,
			descripcion: s.descripcion,
			valorServicio: s.valorServicio,
			descripcionServicio: '',
			prefijos: [],
		}));
	}
	try {
		const raw = localStorage.getItem('sectoresAsignados');
		const arr = raw ? JSON.parse(raw) : [];
		if (!Array.isArray(arr)) return [];
		return arr
			.map((s: { idSector?: string; descripcion?: string; valorServicio?: string }) => ({
				valor: String(s.idSector || '').trim(),
				descripcion: String(s.descripcion || s.idSector || '').trim(),
				valorServicio: String(s.valorServicio || '').trim(),
				descripcionServicio: '',
				prefijos: [] as string[],
			}))
			.filter((s: SectorReceptorEstudio) => s.valor);
	} catch {
		return [];
	}
}

/** Sectores receptor: fuente = login (JWT / sectoresAsignados). Catálogo completo solo si no es soloMios. */
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
		if (soloMios) {
			const login = sectoresDesdeLogin();
			if (login.length) {
				setSectores(login);
				setCachedSectoresReceptor(login, { soloMios: true });
				setLoading(false);
				return;
			}
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
		if (soloMios && sectoresDesdeLogin().length) {
			setLoading(false);
			return;
		}
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
