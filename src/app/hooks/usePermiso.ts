'use client';

import { useEffect, useState } from 'react';
import { authService } from '../services/authService';
import {
	tienePermiso,
	permisosDeRol,
	tieneAccesoAModulo,
	tieneAccesoASubmodulo,
	modulosVisibles,
	type RolNombre,
	type ModuloDef,
} from '../utils/permisos';
import {
	esPermisoTablaMaestra,
	leerModulosEmpresaLocal,
	moduloEmpresaHabilitado,
} from '../utils/modulosEmpresa';

export interface RolEnUso {
	id: number;
	nombre: RolNombre | string;
	nivel: number;
}

interface PermisosState {
	rol: RolEnUso | null;
	permisos: string[];
	loaded: boolean; // true una vez que se leyó localStorage
}

/**
 * Lee de localStorage de forma segura (solo funciona en el cliente).
 * La lista guardada en login / refresh es la efectiva del servidor; no se
 * re-expanden plantillas locales (desharían un DENY por persona).
 */
function leerLocal(): PermisosState {
	if (typeof window === 'undefined') {
		return { rol: null, permisos: [], loaded: false };
	}
	return {
		rol: authService.getCurrentRol(),
		permisos: authService.getCurrentPermisos(),
		loaded: true,
	};
}

/**
 * Hook principal de permisos.
 *
 * – El estado inicial es vacío (servidor y cliente) para evitar errores de
 *   hidratación; en `useEffect` se lee localStorage.
 * – Mientras `loaded = false`, el Sidebar no muestra ítems de menú.
 * – Reactivo a `storage` (otras pestañas) y al evento `imedic:permisos-refresh`.
 */
export function usePermiso() {
	// Estado inicial idéntico en servidor y cliente (evita hydration mismatch).
	const [state, setState] = useState<PermisosState>({
		rol: null,
		permisos: [],
		loaded: false,
	});

	useEffect(() => {
		setState(leerLocal());

		const onStorage = (e: StorageEvent) => {
			if (e.key === 'rol' || e.key === 'roles' || e.key === 'permisos' || e.key === 'empresaModulos') {
				setState(leerLocal());
			}
		};
		const onRefresh = () => setState(leerLocal());
		window.addEventListener('storage', onStorage);
		window.addEventListener('imedic:permisos-refresh', onRefresh);
		return () => {
			window.removeEventListener('storage', onStorage);
			window.removeEventListener('imedic:permisos-refresh', onRefresh);
		};
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const { rol, permisos: lista, loaded } = state;
	const efectivos = permisosDeRol(rol ?? undefined, lista);
	const contratados = leerModulosEmpresaLocal();
	const packOk = (idModulo: string, subOCodigo?: string) =>
		esPermisoTablaMaestra(subOCodigo || '') ||
		moduloEmpresaHabilitado(contratados, idModulo);
	const moduloOk = (idModulo: string) =>
		moduloEmpresaHabilitado(contratados, idModulo) &&
		tieneAccesoAModulo(rol ?? undefined, idModulo, lista);

	return {
		rol,
		loaded,
		permisos: efectivos,
		puede: (codigo: string): boolean => {
			const idModulo = String(codigo || '').split('.')[0] || '';
			if (!packOk(idModulo, codigo)) return false;
			return tienePermiso(rol ?? undefined, codigo, lista);
		},
		puedeModulo: (idModulo: string): boolean => moduloOk(idModulo),
		puedeSubmodulo: (idModulo: string, idSubmodulo: string): boolean => {
			// TABLA: Configuración completa sin exigir el pack del módulo origen.
			if (esPermisoTablaMaestra(idSubmodulo)) {
				return tieneAccesoASubmodulo(
					rol ?? undefined,
					idModulo,
					idSubmodulo,
					lista,
				);
			}
			return (
				moduloOk(idModulo) &&
				tieneAccesoASubmodulo(rol ?? undefined, idModulo, idSubmodulo, lista)
			);
		},
		menu: modulosVisibles(rol ?? undefined, lista) as ModuloDef[],
	};
}

export function useRol(): RolEnUso | null {
	const { rol } = usePermiso();
	return rol;
}
