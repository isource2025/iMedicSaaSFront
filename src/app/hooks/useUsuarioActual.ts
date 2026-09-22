'use client';

import { useMemo } from 'react';
import { authService } from '../services/authService';
import {
	getUserCodOperador,
	getUserMatricula,
	getUserValorPersonal,
} from '../utils/sessionUser';
import type { UserData } from '../types/AuthInterface';

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

/**
 * Dado un registro de internación, devuelve true si el usuario actual
 * fue quien lo creó.
 *
 * Acepta cualquiera de los campos de autoría que usan las tablas legacy:
 *   - `OperadorCarga` / `operadorCarga`  (imInterIndMedicas, imInterCtrlEvolucion)
 *   - `IdOperador`   / `idOperador`      (imPedidosEstudiosAdjuntos)
 *   - `CodOperador`  / `codOperador`     (varios)
 *   - `profesional`                      (imHCEvolucion → Profecional)
 *
 * Si el campo no existe en el registro devuelve `null` (no se puede
 * determinar propiedad → la capa de UI debe decidir si bloquear o no).
 */
export function esAdminClinico(): boolean {
	if (typeof window === 'undefined') return false;
	const rol = authService.getCurrentRol();
	if (!rol) return false;
	return rol.nombre === 'ADMIN' || rol.id === 1;
}

function nombreEsEnfermero(nombre: unknown): boolean {
	const n = String(nombre || '')
		.trim()
		.toUpperCase()
		.replace(/\s+/g, '_');
	return n === 'ENFERMERO' || n === 'ENFERMERIA' || n === 'ENFERMERA';
}

/** Rol de enfermería en sesión (principal o alguno de los asignados). */
export function esEnfermeroSesion(): boolean {
	if (typeof window === 'undefined') return false;
	if (nombreEsEnfermero(authService.getCurrentRol()?.nombre)) return true;
	try {
		const raw = localStorage.getItem('roles');
		const arr = raw ? JSON.parse(raw) : [];
		if (!Array.isArray(arr)) return false;
		return arr.some((r) => nombreEsEnfermero(typeof r === 'string' ? r : r?.nombre));
	} catch {
		return false;
	}
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

	if (autorRaw == null) return null; // no se puede determinar

	const autorNum = Number(autorRaw);
	if (!Number.isFinite(autorNum)) return null;

	// Comparamos contra CodOperador (campo habitual en esas tablas)
	if (usuario.codOperador != null && autorNum === usuario.codOperador) return true;

	// Algunos registros guardan ValorPersonal en cambio
	if (usuario.valorPersonal != null && autorNum === usuario.valorPersonal) return true;

	// imHCEvolucion: Profecional puede ser la matrícula
	if (usuario.matricula != null && autorNum === usuario.matricula) return true;

	return false;
}
