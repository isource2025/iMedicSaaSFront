'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { bedsService } from '../services/bedsService';
import { Bed, BedState, BedTipoRecurso } from '../types/beds';
import { useAppContext } from '../contexts/AppContext';
import {
	bedsListSignature,
	getCachedBedMeta,
	getCachedBedsList,
	setCachedBedMeta,
	setCachedBedsList,
} from '../utils/bedsListCache';

const ORDEN_TIPO_RECURSO: Record<BedTipoRecurso, number> = {
	cama: 0,
	consultorio: 1,
	insumos: 2,
};

export type UseBedsManagementOptions = {
	/**
	 * Polling periódico de GET /beds.
	 * Default false: la UI ya no expone auto-refresh; se actualiza al entrar / manual.
	 */
	enableAutoRefresh?: boolean;
	/** Intervalo si enableAutoRefresh (default 60s). */
	refreshIntervalMs?: number;
};

export const useBedsManagement = (options: UseBedsManagementOptions = {}) => {
	const {
		enableAutoRefresh: enableAutoRefreshOpt = false,
		refreshIntervalMs = 60_000,
	} = options;

	const { sectorSeleccionado, idsector, isAuthenticated, empresaInfo } = useAppContext();
	const idEmpresa = empresaInfo?.id ?? null;

	const cachedBeds =
		typeof window !== 'undefined' ? getCachedBedsList(undefined, idEmpresa) : null;
	const cachedMeta =
		typeof window !== 'undefined' ? getCachedBedMeta(undefined, idEmpresa) : null;

	const [beds, setBeds] = useState<Bed[]>(() => cachedBeds || []);
	const [bedStates, setBedStates] = useState<BedState[]>(
		() => (cachedMeta?.states as BedState[]) || [],
	);
	const [loading, setLoading] = useState(() => !cachedBeds);
	const [error, setError] = useState<string | null>(null);
	const [filter, setFilter] = useState<string>('all');
	const [sectorFilter, setSectorFilter] = useState<string>('all');
	const [servicioFilter, setServicioFilter] = useState<string>('all');
	const [searchTerm, setSearchTerm] = useState('');
	const [tipoRecursoFilter, setTipoRecursoFilter] = useState<'all' | BedTipoRecurso>('all');
	const [sectors, setSectors] = useState<{ id: string; valor: string; descripcion: string }[]>(
		() => cachedMeta?.sectores || [],
	);
	const [autoRefresh, setAutoRefresh] = useState<boolean>(enableAutoRefreshOpt);
	const [refreshInterval, setRefreshInterval] = useState<number>(refreshIntervalMs);
	const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const signatureRef = useRef<string>(cachedBeds ? bedsListSignature(cachedBeds) : '');
	const inFlightRef = useRef(false);
	const lastEmpresaRef = useRef<string | null>(idEmpresa != null ? String(idEmpresa) : null);

	const fetchSectores = useCallback(async () => {
		try {
			const sectoresData = await bedsService.getSectores();
			setSectors(sectoresData);
			setCachedBedMeta({ sectores: sectoresData }, idEmpresa);
		} catch (err) {
			console.error('Error al cargar sectores:', err);
		}
	}, [idEmpresa]);

	const fetchBedStates = useCallback(async () => {
		try {
			const states = await bedsService.getBedStates();
			setBedStates(states);
			setCachedBedMeta({ states }, idEmpresa);
		} catch (err) {
			console.error('Error al cargar estados de cama:', err);
		}
	}, [idEmpresa]);

	const fetchBeds = useCallback(
		async (opts?: { silent?: boolean }) => {
			const silent = opts?.silent === true;
			if (inFlightRef.current) return;
			inFlightRef.current = true;
			if (!silent) setLoading(true);
			setError(null);
			try {
				const data = await bedsService.getAllBeds();
				signatureRef.current = bedsListSignature(data);
				setBeds(data);
				setCachedBedsList(data, undefined, idEmpresa);
			} catch (err: unknown) {
				const message = err instanceof Error ? err.message : 'Error al cargar camas';
				setError(message);
			} finally {
				inFlightRef.current = false;
				if (!silent) setLoading(false);
			}
		},
		[idEmpresa],
	);

	// Carga inicial / cambio de empresa: invalidar UI si el tenant cambió
	useEffect(() => {
		if (!isAuthenticated) {
			setLoading(false);
			return;
		}

		const empresaKey = idEmpresa != null ? String(idEmpresa) : null;
		const empresaChanged =
			lastEmpresaRef.current != null &&
			empresaKey != null &&
			lastEmpresaRef.current !== empresaKey;
		lastEmpresaRef.current = empresaKey;

		if (empresaChanged) {
			signatureRef.current = '';
			setBeds([]);
			setSectors([]);
			setBedStates([]);
			setSectorFilter('all');
			setFilter('all');
			setServicioFilter('all');
			void fetchBeds({ silent: false });
			void fetchBedStates();
			void fetchSectores();
			return;
		}

		const hasCache = Boolean(getCachedBedsList(undefined, idEmpresa));
		const meta = getCachedBedMeta(undefined, idEmpresa);
		void fetchBeds({ silent: hasCache });
		if (!meta?.states?.length) void fetchBedStates();
		if (!meta?.sectores?.length) void fetchSectores();
	}, [fetchBeds, fetchBedStates, fetchSectores, isAuthenticated, idEmpresa]);

	// Sector inicial del usuario
	useEffect(() => {
		if (sectors.length === 0) return;
		const sectorExiste = (sectorId: string) => sectors.some((s) => s.valor === sectorId);

		if (idsector && sectorExiste(idsector)) {
			setSectorFilter(idsector);
		} else if (
			sectorSeleccionado?.idSector &&
			sectorExiste(sectorSeleccionado.idSector)
		) {
			setSectorFilter(sectorSeleccionado.idSector);
		} else {
			setSectorFilter('all');
		}
	}, [sectors, sectorSeleccionado, idsector]);

	// Polling opcional: solo con pestaña visible
	useEffect(() => {
		const clear = () => {
			if (pollingIntervalRef.current) {
				clearInterval(pollingIntervalRef.current);
				pollingIntervalRef.current = null;
			}
		};

		const start = () => {
			clear();
			if (!autoRefresh || !isAuthenticated) return;
			if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
				return;
			}
			pollingIntervalRef.current = setInterval(() => {
				void fetchBeds({ silent: true });
			}, refreshInterval);
		};

		start();

		const onVisibility = () => {
			if (document.visibilityState === 'hidden') {
				clear();
			} else if (autoRefresh) {
				void fetchBeds({ silent: true });
				start();
			}
		};

		document.addEventListener('visibilitychange', onVisibility);
		return () => {
			clear();
			document.removeEventListener('visibilitychange', onVisibility);
		};
	}, [autoRefresh, refreshInterval, fetchBeds, isAuthenticated]);

	const serviciosMedicos = useMemo(() => {
		return beds
			.map((bed) => bed.servicioMedicoDescripcion)
			.filter((servicio): servicio is string => Boolean(servicio && servicio.trim()))
			.filter((servicio, index, self) => self.indexOf(servicio) === index)
			.sort();
	}, [beds]);

	const filteredBeds = useMemo(() => {
		return beds
			.filter((bed) => {
				const estadoMatch = filter === 'all' || bed.valorEstadoOriginal === filter;
				const sectorMatch = sectorFilter === 'all' || bed.sector === sectorFilter;
				const servicioMatch =
					servicioFilter === 'all' ||
					bed.servicioMedicoDescripcion === servicioFilter;
				const searchMatch =
					!searchTerm ||
					(bed.NombrePaciente &&
						bed.NombrePaciente.toLowerCase().includes(searchTerm.toLowerCase())) ||
					(bed.documentoPaciente &&
						bed.documentoPaciente.toString().includes(searchTerm)) ||
					(bed.numeroVisita && bed.numeroVisita.toString().includes(searchTerm)) ||
					(bed.mostrarNumeroVisita &&
						bed.mostrarNumeroVisita.toString().includes(searchTerm));
				const tipoMatch =
					tipoRecursoFilter === 'all' || bed.tipoRecurso === tipoRecursoFilter;
				return estadoMatch && sectorMatch && servicioMatch && searchMatch && tipoMatch;
			})
			.sort(
				(a, b) =>
					(ORDEN_TIPO_RECURSO[a.tipoRecurso] ?? 9) -
					(ORDEN_TIPO_RECURSO[b.tipoRecurso] ?? 9),
			);
	}, [beds, filter, sectorFilter, servicioFilter, searchTerm, tipoRecursoFilter]);

	return {
		beds: filteredBeds,
		allBeds: beds,
		bedStates,
		sectors,
		serviciosMedicos,
		loading,
		error,
		filter,
		setFilter,
		sectorFilter,
		setSectorFilter,
		servicioFilter,
		setServicioFilter,
		searchTerm,
		setSearchTerm,
		tipoRecursoFilter,
		setTipoRecursoFilter,
		refreshBeds: () => fetchBeds({ silent: false }),
		autoRefresh,
		setAutoRefresh,
		refreshInterval,
		setRefreshInterval,
	};
};
