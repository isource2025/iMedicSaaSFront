'use client';

import { useEffect, useState } from 'react';

/** Portal mount + bloqueo de scroll del layout al abrir modales fullscreen. */
export function useModalLayer(open: boolean) {
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	useEffect(() => {
		if (!open) return;
		const main = document.querySelector('main');
		const prevBody = document.body.style.overflow;
		const prevMain = main instanceof HTMLElement ? main.style.overflow : '';
		document.body.style.overflow = 'hidden';
		if (main instanceof HTMLElement) main.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = prevBody;
			if (main instanceof HTMLElement) main.style.overflow = prevMain;
		};
	}, [open]);

	return mounted;
}
