'use client';

import { refreshBandeja, useNotificacionesStore } from '@/app/utils/notificacionesStore';

export type BandejaPedidosCount = {
	count: number;
	estudios: number;
	interconsultas: number;
	/** True cuando terminó la primera consulta (con o sin error). */
	loaded: boolean;
	refresh: () => Promise<void>;
};

/**
 * Contador de pedidos libres (estudios + interconsultas) en los servicios del usuario.
 * Lee del estado compartido de la campanita: se actualiza por SSE y no se vuelve a pedir al navegar.
 */
export function useBandejaPedidosCount(enabled = true): BandejaPedidosCount {
	const s = useNotificacionesStore(enabled);
	const active = enabled && Boolean(s.userKey);
	const estudios = active ? s.estudios : 0;
	const interconsultas = active ? s.interconsultas : 0;
	return {
		count: estudios + interconsultas,
		estudios,
		interconsultas,
		loaded: active && s.bandejaLoaded,
		refresh: refreshBandeja,
	};
}
