'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Redirección de la ruta vieja bajo Turnos. */
export default function BandejaPedidosRedirect() {
	const router = useRouter();
	useEffect(() => {
		const qs = typeof window !== 'undefined' ? window.location.search : '';
		router.replace(`/dashboard/bandeja-pedidos${qs}`);
	}, [router]);
	return null;
}
