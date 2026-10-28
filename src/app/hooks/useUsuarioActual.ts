'use client';

import { useMemo } from 'react';
import { authService } from '../services/authService';
import {
	getUserCodOperador,
	getUserMatricula,
	getUserValorPersonal,
} from '../utils/sessionUser';
import type { UserData } from '../types/AuthInterface';
import { tienePermiso } from '../utils/permisos';

export interface UsuarioActual {
	/** CodOperador en imPassword (id interno de sesión). */
	codOperador: number | null;
	/** ValorPersonal en imPersonal (FK de imPassword). */
	valorPersonal: number | null;
	/** Matrícula profesional (imPersonal.Matricula). */
	matricula: number | null;
	nombre: string;
	apellido: string;
}

/**
 * Devuelve los datos del usuario logueado (leídos de localStorage).
 *
 * En el servidor siempre devuelve null.
 */
export function useUsuarioActual(): UsuarioActual | null {
	return useMemo(() => {
		if (typeof window === 'undefined') return null;
		const u = authService.getCurrentUser() as UserData | null;
		if (!u) return null;
		const codOperador = getUserCodOperador(u) ?? null;
		const valorPersonal = getUserValorPersonal(u) ?? null;
		const matricula = getUserMatricula(u) ?? null;
		return {
			codOperador,
			valorPersonal,
			matricula,
			nombre: String(u.nombre || ''),
			apellido: String(u.apellido || ''),
		};
	}, []);
}

/** ¿Puede editar registros clínicos ajenos? (permiso, no nombre de rol). */
export function esAdminClinico(): boolean {
	if (typeof window === 'undefined') return false;
	const rol = authService.getCurrentRol();
	const lista = authService.getCurrentPermisos();
	return tienePermiso(rol ?? undefined, 'INTERNACION.REGISTROS.EDITAR_AJENOS', lista);
}

/** ¿Puede marcar indicaciones como vistas? (antes: rol enfermero). */
export function esEnfermeroSesion(): boolean {
	if (typeof window === 'undefined') return false;
	const rol = authService.getCurrentRol();
	const lista = authService.getCurrentPermisos();
	return tienePermiso(rol ?? undefined, 'INTERNACION.INDICACIONES.MARCAR_VISTO', lista);
}

export function esRegistroPropio(
	registro: Record<string, unknown> | null | undefined,
	usuario: UsuarioActual | null,
): boolean | null {
	if (!registro || !usuario) return null;

	const autorRaw =
		registro.OperadorCarga ??
		registro.operadorCarga ??
		registro.IdOperador ??
		registro.idOperador ??
		registro.CargadoPor ??
		registro.cargadoPor ??
		registro.IdProfecional ??
		registro.idProfecional ??
		registro.CodOperador ??
		registro.codOperador ??
		registro.Profesional ??
		registro.profesional ??
		registro.Profecional ??
		null;

	if (autorRaw == null) return null;

	const autorNum = Number(autorRaw);
	if (!Number.isFinite(autorNum)) return null;

	if (usuario.codOperador != null && autorNum === usuario.codOperador) return true;
	if (usuario.valorPersonal != null && autorNum === usuario.valorPersonal) return true;
	if (usuario.matricula != null && autorNum === usuario.matricula) return true;

	return false;
}
