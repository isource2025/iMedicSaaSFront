'use client';

import { useEffect, useRef, useState } from 'react';
import { useBedDetail } from './contexts/BedDetailContext';
import { prefetchBedSection, toISODate } from './contexts/useBedSectionQuery';
import { SECTION_TO_PERM } from './sidebar/SidebarFilters';
import { usePermiso } from '@/app/hooks/usePermiso';
import { precargarVisita, visitaCacheKey } from '@/app/utils/bedVisitaCache';

type Props = {
	numeroVisita: number | null;
};

/** `porFecha`: se descarta si el usuario cambia de día antes de que salga. */
type Tarea = { seccion: string; porFecha?: boolean; run: () => Promise<unknown> };

/** Si la sección inicial no avisa (p. ej. abre en Adjuntos), arranca igual pasado este tiempo. */
const ARRANQUE_FALLBACK_MS = 5000;
/** Recorrer el calendario día por día no dispara una precarga por cada click. */
const DEBOUNCE_FECHA_MS = 800;
const CONCURRENCIA = 3;

const CHUNKS: Record<string, () => Promise<unknown>> = {
	'medicacion-suministrada': () => import('./medicacion/MedicacionSuministradaSection'),
	'controles-frecuentes': () => import('./controles/ControlesFrecuentesSection'),
	'evolucion-enfermeria': () => import('./evolucion/EvolucionEnfermeriaSection'),
	insumos: () => import('./insumos/InsumosSection'),
	movimientos: () => import('./movimientos/MovimientosSection'),
	evoluciones: () => import('./evoluciones/EvolucionesSection'),
	hcIngreso: () => import('./hc-ingreso/HCIngresoSection'),
	laboratorios: () => import('./laboratorios/LabResultsSection'),
	solicitudEstudios: () => import('./estudios/EstudiosSection'),
	protocolos: () => import('./protocolos/ProtocolosSection'),
	interconsulta: () => import('./interconsulta/InterconsultaSection'),
	epicrisis: () => import('./epicrisis/EpicrisisSection'),
	procedimientos: () => import('./procedimientos/ProcedimientosSection'),
	'balance-hidrico': () => import('./balance-hidrico/BalanceHidricoSection'),
};

/** Mismos endpoints y parámetros que usa cada sección con `useBedSectionFetch` (si no, la clave no coincide). */
function tareasPorFecha(nv: number, date: Date | null): Tarea[] {
	const fetch = (
		seccion: Parameters<typeof prefetchBedSection>[0]['section'],
		endpoint: string,
		extra?: Partial<Parameters<typeof prefetchBedSection>[0]>,
	): Tarea => ({
		seccion,
		porFecha: true,
		run: () => prefetchBedSection({ section: seccion, endpoint, date, ...extra }),
	});
	return [
		fetch('evoluciones', `/evoluciones/${nv}/byDate`, { params: { days: '0' } }),
		fetch('evolucion-enfermeria', `/evolucion-enfermeria/${nv}/byDate`, { params: { days: '0' } }),
		fetch('controles-frecuentes', `/controles-frecuentes/${nv}/byDate`),
		fetch('medicacion-suministrada', `/medicacion-control/${nv}/byDate`),
		fetch('balance-hidrico', `/balance-hidrico/${nv}/byDate`),
		fetch('insumos', `/indicaciones/${nv}/insumos/byDate`),
		fetch('epicrisis', `/epicrisis/${nv}`),
		fetch('movimientos', `/visita-movimientos/visita/${nv}`, { admissionId: nv }),
	];
}

/** Secciones que traen toda la visita (no dependen de la fecha). Claves = las de cada sección. */
function tareasPorVisita(nv: number): Tarea[] {
	return [
		{
			seccion: 'hcIngreso',
			run: () =>
				precargarVisita(visitaCacheKey('hcIngreso', nv), async () =>
					(await import('@/app/services/hcIngresoService')).obtenerHCIngresoPorVisita(nv),
				),
		},
		{
			seccion: 'interconsulta',
			run: () =>
				precargarVisita(visitaCacheKey('interconsulta', nv), async () =>
					(await import('@/app/services/interconsultasService')).interconsultasService.listarPorVisita(nv),
				),
		},
		{
			seccion: 'solicitudEstudios',
			run: () =>
				precargarVisita(visitaCacheKey('estudios', nv), async () =>
					(await import('@/app/services/estudiosService')).default.listarPorVisita(nv),
				),
		},
		{
			seccion: 'laboratorios',
			run: () =>
				precargarVisita(visitaCacheKey('laboratorios', nv), async () =>
					(await import('@/app/services/laboratoriosService')).laboratoriosService.getExamenesByVisita(nv),
				),
		},
		{
			seccion: 'protocolos',
			run: () =>
				precargarVisita(visitaCacheKey('protocolos', nv), async () =>
					(await import('@/app/services/protocolosService')).default.listarPorVisita(nv),
				),
		},
		{
			seccion: 'procedimientos',
			run: () =>
				precargarVisita(visitaCacheKey('procedimientos', nv), async () =>
					(await import('@/app/services/procedimientosService')).default.listarPorVisita(nv),
				),
		},
	];
}

async function ejecutar(tareas: Tarea[], cancelado: () => boolean) {
	let i = 0;
	const worker = async () => {
		while (i < tareas.length) {
			const t = tareas[i++];
			if (t.porFecha && cancelado()) continue;
			try {
				await t.run();
			} catch {
				/* la sección vuelve a intentar al abrirse */
			}
		}
	};
	await Promise.all(Array.from({ length: Math.min(CONCURRENCIA, tareas.length) }, worker));
}

/**
 * Cuando termina de cargar la sección con la que abre la ficha (Indicaciones), precarga en
 * segundo plano el código y los datos del resto, así al abrirlas se muestran sin loader.
 */
export default function BedSectionsPrefetcher({ numeroVisita }: Props) {
	const { selectedDate, seccionInicialLista } = useBedDetail();
	const { puedeSubmodulo, rol, loaded } = usePermiso();
	const [arrancar, setArrancar] = useState(false);
	const chunksPedidos = useRef(false);
	const visitasPrecargadas = useRef(new Set<string>());
	const puedeVerRef = useRef<(seccion: string) => boolean>(() => false);
	puedeVerRef.current = (seccion: string) => {
		const sub = SECTION_TO_PERM[seccion];
		if (!sub) return true;
		return !!rol && puedeSubmodulo('INTERNACION', sub);
	};

	useEffect(() => {
		if (seccionInicialLista) {
			setArrancar(true);
			return;
		}
		const t = setTimeout(() => setArrancar(true), ARRANQUE_FALLBACK_MS);
		return () => clearTimeout(t);
	}, [seccionInicialLista]);

	const dateISO = toISODate(selectedDate);

	useEffect(() => {
		if (!arrancar || !loaded || !numeroVisita) return;
		const nv = numeroVisita;
		const fecha = selectedDate ? new Date(selectedDate) : null;
		const puedeVer = (seccion: string) => puedeVerRef.current(seccion);

		let cancelado = false;
		const t = setTimeout(() => {
			if (!chunksPedidos.current) {
				chunksPedidos.current = true;
				for (const [seccion, load] of Object.entries(CHUNKS)) {
					if (puedeVer(seccion)) void load().catch(() => {});
				}
			}

			const claveVisita = String(nv);
			const porVisita = visitasPrecargadas.current.has(claveVisita) ? [] : tareasPorVisita(nv);
			visitasPrecargadas.current.add(claveVisita);

			// Intercaladas para que las más consultadas (evoluciones, HC) salgan primero.
			const porFecha = tareasPorFecha(nv, fecha);
			const tareas: Tarea[] = [];
			for (let i = 0; i < Math.max(porFecha.length, porVisita.length); i++) {
				if (porFecha[i]) tareas.push(porFecha[i]);
				if (porVisita[i]) tareas.push(porVisita[i]);
			}
			void ejecutar(
				tareas.filter((x) => puedeVer(x.seccion)),
				() => cancelado,
			);
		}, chunksPedidos.current ? DEBOUNCE_FECHA_MS : 0);

		return () => {
			cancelado = true;
			clearTimeout(t);
		};
		// selectedDate entra por dateISO (mismo día = misma clave de cache)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [arrancar, loaded, numeroVisita, dateISO]);

	return null;
}
