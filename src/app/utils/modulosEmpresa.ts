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

/**
 * Tablas maestras (TURNOS/ADMISION/INTERNACION/FACTURACION.TABLA.*) viven bajo
 * Configuración y deben poder usarse aunque el pack clínico no esté contratado
 * (p. ej. sectores/servicios de agenda sin pack INTERNACION).
 */
export function esPermisoTablaMaestra(codigoOSubmodulo: string): boolean {
	const s = String(codigoOSubmodulo || '').trim().toUpperCase();
	if (!s) return false;
	if (s === 'TABLA') return true;
	const partes = s.split('.');
	return partes[1] === 'TABLA';
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
