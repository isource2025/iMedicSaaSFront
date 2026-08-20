'use client';

import { useEffect } from 'react';
import { indicacionesService } from '../services/indicacionesService';
import { clearIndicacionesNuevasEnfermeria } from '../utils/bedsListCache';
import { esEnfermeroSesion } from './useUsuarioActual';

const pendingTimers = new Map<number, ReturnType<typeof setTimeout>>();
const vistoEnviado = new Set<number>();

/** Marca indicaciones nuevas como vistas (enfermería) y limpia el badge de las cards. */
export function marcarIndicacionesVistasEnfermeria(
	numeroVisita: number | null | undefined,
): void {
	const nro = Number(numeroVisita || 0);
	if (!nro || !esEnfermeroSesion()) return;

	const pending = pendingTimers.get(nro);
	if (pending) {
		clearTimeout(pending);
		pendingTimers.delete(nro);
	}

	clearIndicacionesNuevasEnfermeria(nro);
	if (vistoEnviado.has(nro)) return;
	vistoEnviado.add(nro);

	void indicacionesService.marcarVistoEnfermeria(nro).catch((err) => {
		vistoEnviado.delete(nro);
		console.warn('No se pudieron marcar las indicaciones como vistas:', err);
	});
}

/**
 * Conserva el estado "nueva" mientras el detalle de cama está abierto.
 * Al salir (Cerrar, atrás, otra ruta) marca como visto para que no vuelva en cards ni al reabrir.
 */
export function useMarcarIndicacionesVistasAlSalir(
	numeroVisita: number | null | undefined,
): void {
	const nro = Number(numeroVisita || 0);

	useEffect(() => {
		if (!nro || !esEnfermeroSesion()) return;

		const existing = pendingTimers.get(nro);
		if (existing) {
			clearTimeout(existing);
			pendingTimers.delete(nro);
		}
		vistoEnviado.delete(nro);

		return () => {
			if (!esEnfermeroSesion()) return;
			clearIndicacionesNuevasEnfermeria(nro);
			if (vistoEnviado.has(nro)) return;
			const prev = pendingTimers.get(nro);
			if (prev) clearTimeout(prev);
			pendingTimers.set(
				nro,
				setTimeout(() => {
					pendingTimers.delete(nro);
					marcarIndicacionesVistasEnfermeria(nro);
				}, 250),
			);
		};
	}, [nro]);
}
