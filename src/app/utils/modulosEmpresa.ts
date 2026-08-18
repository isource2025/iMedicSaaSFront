import type { ModulosEmpresa } from '../types/superAdmin';

const SIEMPRE_VISIBLES = new Set(['USUARIO', 'PLATAFORMA']);

export function leerModulosEmpresaLocal(): ModulosEmpresa | null {
	if (typeof window === 'undefined') return null;
	try {
		const raw = localStorage.getItem('empresaModulos');
		if (!raw) return null;
		const parsed = JSON.parse(raw) as ModulosEmpresa;
		if (!parsed || !Array.isArray(parsed.modulosHabilitados)) return null;
		return parsed;
	} catch {
		return null;
	}
}

/** Si no hay lista (sesión vieja / Super Admin), no recorta. */
export function moduloEmpresaHabilitado(
	modulos: ModulosEmpresa | null | undefined,
	moduloId: string,
): boolean {
	if (SIEMPRE_VISIBLES.has(moduloId)) return true;
	const list = modulos?.modulosHabilitados;
	if (!list || list.length === 0) return true;
	return list.includes(moduloId);
}
