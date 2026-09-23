'use client';

import { useEffect } from 'react';
import { indicacionesService } from '../services/indicacionesService';
import { clearIndicacionesNuevasEnfermeria } from '../utils/bedsListCache';
import {
	clearNuevasEnfermeriaSesion,
	rememberNuevasEnfermeriaSesion,
} from '../utils/indicacionesNuevasSesion';
import { esEnfermeroSesion } from './useUsuarioActual';

const limpioEnviado = new Set<number>();

/**
 * Limpia Estado 'N' → NULL en SQL al entrar al detalle (enfermería).
 * Guarda los ids limpiados en sesión para que la UI actual siga mostrando "Nueva".
 * Limpia el badge de las cards en caché (lista / reentrada).
 */
export function marcarIndicacionesVistasEnfermeria(
	numeroVisita: number | null | undefined,
): void {
	const nro = Number(numeroVisita || 0);
	if (!nro || !esEnfermeroSesion()) return;

	clearIndicacionesNuevasEnfermeria(nro);
	if (limpioEnviado.has(nro)) return;
	limpioEnviado.add(nro);

	void indicacionesService
		.marcarVistoEnfermeria(nro)
		.then((res) => {
			rememberNuevasEnfermeriaSesion(nro, res.nros || []);
		})
		.catch((err) => {
			limpioEnviado.delete(nro);
			console.warn('No se pudo limpiar el estado Nueva de las indicaciones:', err);
		});
}

/**
 * Al abrir el detalle de cama, limpia Estado N→NULL en SQL.
 * Al desmontar, limpia el snapshot de sesión para que al reentrar no se vea "Nueva".
 */
export function useMarcarIndicacionesVistasAlSalir(
	numeroVisita: number | null | undefined,
): void {
	const nro = Number(numeroVisita || 0);

	useEffect(() => {
		if (!nro || !esEnfermeroSesion()) return;
		limpioEnviado.delete(nro);
		marcarIndicacionesVistasEnfermeria(nro);

		return () => {
			clearNuevasEnfermeriaSesion(nro);
			limpioEnviado.delete(nro);
		};
	}, [nro]);
}
