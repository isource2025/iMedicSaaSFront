'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { bedsService } from '../services/bedsService';
import { Bed, BedState, BedTipoRecurso } from '../types/beds';
import { useAppContext } from '../contexts/AppContext';
import { getIdSectorFromToken } from '../utils/jwtSession';
import {
	bedsListSignature,
	getCachedBedMeta,
	applyIndicacionesNuevasVistoLocal,
	getCachedBedsList,
	setCachedBedMeta,
	setCachedBedsList,
} from '../utils/bedsListCache';
import {
	getStoredBedsListFilters,
	setStoredBedsListFilters,
} from '../utils/bedsListFilters';

const ORDEN_TIPO_RECURSO: Record<BedTipoRecurso, number> = {
	cama: 0,
	consultorio: 1,
	insumos: 2,
};

function readSessionSector(): string {
	if (typeof window === 'undefined') return '';
	try {
		const raw = localStorage.getItem('sectorSeleccionado');
		if (raw) {
			const parsed = JSON.parse(raw) as { idSector?: string; descripcion?: string };
			const id = String(parsed?.idSector || '').trim();
			if (id) return id;
		}
	} catch {
		/* ignore */
	}
	try {
		return String(getIdSectorFromToken() || '').trim();
	} catch {
		return '';
	}
}

function readSessionSectorLabel(id: string): string {
	if (typeof window === 'undefined') return id;
	try {
		const raw = localStorage.getItem('sectorSeleccionado');
		if (raw) {
			const parsed = JSON.parse(raw) as { idSector?: string; descripcion?: string };
			const desc = String(parsed?.descripcion || '').trim();
			if (desc) return desc;
		}
	} catch {
		/* ignore */
	}
	return id;
}

function seedSectorFromSession(): { id: string; valor: string; descripcion: string }[] {
	const id = readSessionSector();
	if (!id) return [];
	return [{ id, valor: id, descripcion: readSessionSectorLabel(id) }];
}

function readPreferredSector(urlSector?: string | null): string {
	const url = String(urlSector || '').trim();
	if (url && url.toLowerCase() !== 'all') return url;
	if (typeof window === 'undefined') return 'all';
	try {
		const stored = String(getStoredBedsListFilters()?.sector || '').trim();
		if (stored && stored.toLowerCase() !== 'all') return stored;
	} catch {
		/* ignore */
	}
	const session = readSessionSector();
	return session || 'all';
}

function bedsErrorMessage(err: unknown): string {
	const raw = err instanceof Error ? err.message : 'Error al cargar camas';
	if (/timeout/i.test(raw) || /ECONNABORTED/i.test(raw)) {
		return 'El hospital tardó en responder. Reintentá en unos segundos.';
	}
	return raw;
}

export type UseBedsManagementOptions = {
	/**
	 * Polling periódico de GET /beds.
	 * Default false: la UI ya no expone auto-refresh; se actualiza al entrar / manual.
	 */
	enableAutoRefresh?: boolean;
	/** Intervalo si enableAutoRefresh (default 60s). */
	refreshIntervalMs?: number;
	/** Sector de `?sector=` en la URL de la lista. */
	urlSector?: string | null;
};

export const useBedsManagement = (options: UseBedsManagementOptions = {}) => {
	const {
		enableAutoRefresh: enableAutoRefreshOpt = false,
		refreshIntervalMs = 60_000,
		urlSector = null,
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
	const [sectorFilter, setSectorFilter] = useState<string>(() => readPreferredSector(urlSector));
	const [servicioFilter, setServicioFilter] = useState<string>('all');
	const [searchTerm, setSearchTerm] = useState('');
	const [tipoRecursoFilter, setTipoRecursoFilter] = useState<'all' | BedTipoRecurso>('all');
	const [sectors, setSectors] = useState<{ id: string; valor: string; descripcion: string }[]>(
		() => cachedMeta?.sectores?.length ? cachedMeta.sectores : seedSectorFromSession(),
	);
	const [autoRefresh, setAutoRefresh] = useState<boolean>(enableAutoRefreshOpt);
	const [refreshInterval, setRefreshInterval] = useState<number>(refreshIntervalMs);
	const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const signatureRef = useRef<string>(cachedBeds ? bedsListSignature(cachedBeds) : '');
	const fetchGenRef = useRef(0);
	const lastEmpresaRef = useRef<string | null>(idEmpresa != null ? String(idEmpresa) : null);

	const fetchSectores = useCallback(async () => {
		try {
			const sectoresData = await bedsService.getSectores();
			if (sectoresData.length) {
				setSectors(sectoresData);
				setCachedBedMeta({ sectores: sectoresData }, idEmpresa);
				return;
			}
			const seeded = seedSectorFromSession();
			if (seeded.length) setSectors(seeded);
		} catch (err) {
			console.error('Error al cargar sectores:', err);
			const seeded = seedSectorFromSession();
			if (seeded.length) setSectors(seeded);
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
		async (opts?: { silent?: boolean; sector?: string }) => {
			const silent = opts?.silent === true;
			const sector = String(opts?.sector ?? sectorFilter).trim() || 'all';
			const gen = ++fetchGenRef.current;
			if (!silent) setLoading(true);
			setError(null);
			try {
				const data = applyIndicacionesNuevasVistoLocal(
					await bedsService.getAllBeds(sector),
				);
				if (gen !== fetchGenRef.current) return;
				signatureRef.current = bedsListSignature(data);
				setBeds(data);
				setCachedBedsList(data, undefined, idEmpresa);
			} catch (err: unknown) {
				if (gen !== fetchGenRef.current) return;
				setError(bedsErrorMessage(err));
			} finally {
				if (gen === fetchGenRef.current && !silent) setLoading(false);
			}
		},
		[idEmpresa, sectorFilter],
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
			setSectors(seedSectorFromSession());
			setBedStates([]);
			setSectorFilter(readPreferredSector(urlSector));
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
		void fetchSectores();
	}, [fetchBeds, fetchBedStates, fetchSectores, isAuthenticated, idEmpresa]);

	// Sector: filtro de esta sesión > URL > sector de login (principal) > Todos.
	// El combo lista todos los I; el del personal solo preselecciona.
	useEffect(() => {
		if (sectors.length === 0) return;
		const norm = (v: string) => String(v || '').trim().toUpperCase();
		const matchCatalog = (sectorId: string) => {
			const k = norm(sectorId);
			if (!k || k === 'ALL') return null;
			return sectors.find((s) => norm(s.valor) === k)?.valor || null;
		};

		const storedRaw = String(getStoredBedsListFilters()?.sector || '').trim();
		const stored = matchCatalog(storedRaw);
		if (stored) {
			setSectorFilter(stored);
			return;
		}

		const fromUrl = matchCatalog(String(urlSector || '').trim());
		if (fromUrl) {
			setSectorFilter(fromUrl);
			setStoredBedsListFilters({ sector: fromUrl });
			return;
		}

		const fromLogin =
			matchCatalog(idsector || '') ||
			matchCatalog(sectorSeleccionado?.idSector || '') ||
			matchCatalog(readSessionSector());
		if (fromLogin) {
			setSectorFilter(fromLogin);
			setStoredBedsListFilters({ sector: fromLogin });
			return;
		}
		setSectorFilter('all');
	}, [sectors, sectorSeleccionado, idsector, idEmpresa, urlSector]);

	const setSectorFilterPersist = useCallback((value: string) => {
		const next = String(value || '').trim() || 'all';
		setSectorFilter(next);
		setStoredBedsListFilters({ sector: next });
	}, []);

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
				const sectorMatch =
					sectorFilter === 'all' ||
					String(bed.sector || '').trim().toUpperCase() ===
						String(sectorFilter || '').trim().toUpperCase();
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
		setSectorFilter: setSectorFilterPersist,
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
