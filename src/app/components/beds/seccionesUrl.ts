import type { SidebarSection } from './contexts/BedDetailContext';

/** Secciones de la ficha clínica a las que se puede entrar directo con ?seccion=. */
export const SECCIONES_DESDE_URL = new Set<SidebarSection>([
	'hcIngreso',
	'indicaciones',
	'evoluciones',
	'interconsulta',
	'solicitudEstudios',
	'laboratorios',
	'protocolos',
	'epicrisis',
	'procedimientos',
	'movimientos',
	'medicacion-suministrada',
	'controles-frecuentes',
	'control',
	'evolucion-enfermeria',
	'dieta',
	'balance-hidrico',
	'insumos',
	'adjuntos',
]);

export function seccionDesdeUrl(): SidebarSection | null {
	if (typeof window === 'undefined') return null;
	const s = new URLSearchParams(window.location.search).get('seccion');
	return s && SECCIONES_DESDE_URL.has(s as SidebarSection) ? (s as SidebarSection) : null;
}
