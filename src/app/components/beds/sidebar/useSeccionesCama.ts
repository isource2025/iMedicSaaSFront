'use client';

import { useMemo } from 'react';
import { usePermiso } from '@/app/hooks/usePermiso';
import type { SidebarSection } from '../contexts/BedDetailContext';

/**
 * Mapeo entre cada `activeSection` del sidebar y su submódulo de permisos
 * dentro del módulo INTERNACION.
 *
 * Si una sección no aparece en este mapa, se considera siempre visible
 * (caso de "informe_evo" o utilitarios).
 */
export const SECTION_TO_PERM: Record<string, string> = {
	hcIngreso: 'HISTORIA_CLINICA',
	indicaciones: 'INDICACIONES',
	evoluciones: 'EVOLUCIONES',
	interconsulta: 'INTERCONSULTAS',
	'evolucion-enfermeria': 'EVOLUCION_ENFERMERIA',
	'controles-frecuentes': 'SIGNOS_VITALES',
	'medicacion-suministrada': 'MEDICACION',
	dieta: 'DIETA',
	'balance-hidrico': 'BALANCE_HIDRICO',
	insumos: 'INSUMOS',
	solicitudEstudios: 'ESTUDIOS',
	laboratorios: 'ADJUNTOS',
	protocolos: 'PROTOCOLOS',
	procedimientos: 'PROCEDIMIENTOS',
	movimientos: 'MOVIMIENTOS',
	adjuntos: 'ADJUNTOS',
	epicrisis: 'EPICRISIS',
};

export type SeccionCama = { id: SidebarSection; label: string };
export type GrupoSeccionesCama = { id: string; label: string; items: SeccionCama[] };

const MEDICA: SeccionCama[] = [
	{ id: 'hcIngreso', label: 'HC de Ingreso' },
	{ id: 'indicaciones', label: 'Indicaciones' },
	{ id: 'solicitudEstudios', label: 'Estudios' },
	{ id: 'interconsulta', label: 'Interconsultas' },
	{ id: 'protocolos', label: 'Protocolos' },
	{ id: 'procedimientos', label: 'Procedimientos' },
	{ id: 'evoluciones', label: 'Evoluciones' },
	{ id: 'epicrisis', label: 'Epicrisis' },
];

const ENFERMERIA: SeccionCama[] = [
	{ id: 'indicaciones', label: 'Indicaciones' },
	{ id: 'controles-frecuentes', label: 'Controles' },
	{ id: 'medicacion-suministrada', label: 'Medicación' },
	{ id: 'dieta', label: 'Dietas' },
	{ id: 'balance-hidrico', label: 'Balance hídrico' },
	{ id: 'evolucion-enfermeria', label: 'Evolución de enfermería' },
	{ id: 'insumos', label: 'Insumos' },
];

/**
 * Qué secciones del detalle de cama puede ver el usuario.
 *
 * Gestión Médica: se muestra con VER o CREAR en HC / evoluciones / indicaciones.
 * Administrativo tiene lectura clínica y debe ver el grupo; las acciones de
 * escritura siguen gated dentro de cada sección. Enfermero conserva solo
 * lectura clínica pero no el menú médico (sigue usando Gestión Enfermería).
 *
 * Gestión Enfermería: se muestra con VER o CREAR. El médico tiene lectura
 * de enfermería en la matriz; antes el grupo exigía CREAR y quedaba oculto.
 * Las acciones de escritura siguen gated dentro de cada sección.
 */
export function useSeccionesCama() {
	const { puedeSubmodulo, puede, rol, loaded } = usePermiso();

	const puedeVerSeccion = useMemo(
		() => (section: string) => {
			if (!loaded) return true;
			const sub = SECTION_TO_PERM[section];
			if (!sub) return true;
			if (!rol) return false;
			return puedeSubmodulo('INTERNACION', sub);
		},
		[puedeSubmodulo, rol, loaded],
	);

	const esEnfermero = loaded && String(rol?.nombre || '').toUpperCase() === 'ENFERMERO';
	const puedeGestionMedica = !loaded
		? true
		: !esEnfermero &&
		  (puedeSubmodulo('INTERNACION', 'HISTORIA_CLINICA') ||
				puedeSubmodulo('INTERNACION', 'EVOLUCIONES') ||
				puedeSubmodulo('INTERNACION', 'INDICACIONES'));

	const puedeGestionEnfermeria = !loaded
		? true
		: puedeSubmodulo('INTERNACION', 'EVOLUCION_ENFERMERIA') ||
		  puedeSubmodulo('INTERNACION', 'SIGNOS_VITALES') ||
		  puedeSubmodulo('INTERNACION', 'MEDICACION') ||
		  puedeSubmodulo('INTERNACION', 'DIETA') ||
		  puedeSubmodulo('INTERNACION', 'BALANCE_HIDRICO') ||
		  puedeSubmodulo('INTERNACION', 'INSUMOS');

	const puedeCargaDocumental =
		loaded &&
		(puede('INTERNACION.ADJUNTOS.CREAR') || puede('INTERNACION.ESTUDIOS.CREAR')) &&
		!puedeGestionMedica &&
		!puedeGestionEnfermeria;

	/** CARGA_HC: solo panel Otras Funciones (adjuntos + cerrar). */
	const mostrarSoloOtrasFunciones = loaded && String(rol?.nombre || '').toUpperCase() === 'CARGA_HC';

	const adjuntosEnOtras =
		(mostrarSoloOtrasFunciones || (!puedeGestionMedica && !puedeGestionEnfermeria)) &&
		puedeVerSeccion('adjuntos');

	/** Grupos visibles en el mismo orden que el sidebar, sin secciones repetidas. */
	const grupos = useMemo<GrupoSeccionesCama[]>(() => {
		const vistos = new Set<string>();
		const filtrar = (items: SeccionCama[]) =>
			items.filter((it) => {
				if (vistos.has(it.id) || !puedeVerSeccion(it.id)) return false;
				vistos.add(it.id);
				return true;
			});

		const out: GrupoSeccionesCama[] = [];
		if (!mostrarSoloOtrasFunciones && puedeGestionMedica) {
			out.push({ id: 'medica', label: 'Gestión Médica', items: filtrar(MEDICA) });
		}
		if (!mostrarSoloOtrasFunciones && puedeGestionEnfermeria) {
			out.push({ id: 'enfermeria', label: 'Gestión Enfermería', items: filtrar(ENFERMERIA) });
		}
		if (!mostrarSoloOtrasFunciones && puedeCargaDocumental) {
			out.push({
				id: 'documental',
				label: 'Carga documental',
				items: filtrar([
					{ id: 'laboratorios', label: 'Laboratorios' },
					{ id: 'adjuntos', label: 'Archivos adjuntos' },
				]),
			});
		}
		const otras: SeccionCama[] = [];
		if (adjuntosEnOtras) otras.push({ id: 'adjuntos', label: 'Archivos adjuntos' });
		if (!mostrarSoloOtrasFunciones) {
			otras.push({ id: 'movimientos', label: 'Movimientos' });
		}
		out.push({ id: 'otras', label: 'Otras funciones', items: filtrar(otras) });
		return out.filter((g) => g.items.length > 0);
	}, [
		puedeVerSeccion,
		mostrarSoloOtrasFunciones,
		puedeGestionMedica,
		puedeGestionEnfermeria,
		puedeCargaDocumental,
		adjuntosEnOtras,
	]);

	return {
		puedeVerSeccion,
		puedeGestionMedica,
		puedeGestionEnfermeria,
		puedeCargaDocumental,
		mostrarSoloOtrasFunciones,
		adjuntosEnOtras,
		grupos,
	};
}
