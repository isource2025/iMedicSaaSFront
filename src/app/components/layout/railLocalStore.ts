'use client';

import { useEffect, useSyncExternalStore } from 'react';

/**
 * Pantallas con su propio riel de acciones (p. ej. la ficha de cama) se registran acá
 * para que el layout no monte el riel global en la misma esquina.
 */
let activos = 0;
const listeners = new Set<() => void>();

function emitir() {
	listeners.forEach((l) => l());
}

function suscribir(l: () => void) {
	listeners.add(l);
	return () => {
		listeners.delete(l);
	};
}

export function useRegistrarRailLocal() {
	useEffect(() => {
		activos += 1;
		emitir();
		return () => {
			activos -= 1;
			emitir();
		};
	}, []);
}

export function useHayRailLocal() {
	return useSyncExternalStore(
		suscribir,
		() => activos > 0,
		() => false,
	);
}
