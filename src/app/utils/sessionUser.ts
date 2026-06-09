'use client';

import { authService } from '../services/authService';
import type { SectorInfo, UserData } from '../types/AuthInterface';

function parseNumericId(...candidates: Array<string | number | undefined | null>): number | undefined {
	for (const value of candidates) {
		if (value == null || value === '') continue;
		if (typeof value === 'number' && Number.isFinite(value)) return value;
		const parsed = parseInt(String(value).trim(), 10);
		if (Number.isFinite(parsed)) return parsed;
	}
	return undefined;
}

export function getStoredUser(): UserData | null {
	if (typeof window === 'undefined') return null;
	return (authService.getCurrentUser() as UserData | null) || null;
}

export function getSessionUser(contextUser?: UserData | null): UserData | null {
	return getStoredUser() || contextUser || null;
}

export function getUserCodOperador(user?: UserData | null): number | undefined {
	return parseNumericId(
		user?.idCodOperador,
		user?.codOperador,
		user?.codigoOperador,
		user?.CodOperador,
	);
}

/** Matrícula profesional (imPersonal.Matricula). */
export function getUserMatricula(user?: UserData | null): number | undefined {
	return parseNumericId(user?.matricula, user?.Matricula);
}

/**
 * CodOperador para imHCI.IdProfecional e imInterCtrlFrecuente (OperadorCarga / Profesional).
 * Siempre prioriza localStorage vía getSessionUser.
 */
export function getHcIdProfesional(contextUser?: UserData | null): number | undefined {
	const user = getSessionUser(contextUser);
	return getUserCodOperador(user);
}

export function resolveHcSector(
	sectorFromContext?: SectorInfo | null,
	bedSector?: string | null,
): { id: string; descripcion: string } {
	const fromSession = getSessionSector(sectorFromContext);
	const idFromSession = getSectorId(fromSession);
	if (idFromSession) {
		return {
			id: idFromSession,
			descripcion: getSectorDescripcion(fromSession) || idFromSession,
		};
	}
	const bed = String(bedSector || '').trim();
	if (bed) {
		return { id: bed.slice(0, 4), descripcion: bed };
	}
	return { id: '', descripcion: '' };
}

export function getUserValorPersonal(user?: UserData | null): number | undefined {
	return parseNumericId(user?.idValorpersonal, user?.valorPersonal);
}

export function getUserDisplayName(user?: UserData | null): string {
	const nombre = String(user?.nombre || '').trim();
	const apellido = String(user?.apellido || '').trim();
	return `${nombre} ${apellido}`.trim();
}

export function getStoredSector(): SectorInfo | null {
	if (typeof window === 'undefined') return null;
	const raw = localStorage.getItem('sectorSeleccionado');
	if (!raw) return null;
	try {
		return JSON.parse(raw) as SectorInfo;
	} catch {
		return null;
	}
}

export function getSessionSector(contextSector?: SectorInfo | null): SectorInfo | null {
	return contextSector || getStoredSector() || null;
}

export function getSectorId(sector?: SectorInfo | null): string {
	return String(sector?.idSector || '').trim();
}

export function getSectorDescripcion(sector?: SectorInfo | null): string {
	return String(sector?.descripcion || '').trim();
}
