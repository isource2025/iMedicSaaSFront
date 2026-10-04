'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useBedDetail, SidebarSection } from '../contexts/BedDetailContext';
import { apiFetch } from '@/app/utils/authFetch';
import { motivoDeRespuesta } from '@/app/utils/apiError';

// ===== Helpers =====
export function toISODate(d: Date | null | undefined) {
	if (!d) return undefined;
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`; // YYYY-MM-DD
}

function buildQuery(params: Record<string, unknown>) {
	const search = new URLSearchParams();
	Object.entries(params).forEach(([k, v]) => {
		if (v !== undefined && v !== '') search.set(k, String(v));
	});
	const s = search.toString();
	return s ? `?${s}` : '';
}

function stableStringify(obj: unknown) {
	if (!obj || typeof obj !== 'object') return JSON.stringify(obj);
	const ordered = Object.keys(obj as Record<string, unknown>)
		.sort()
		.reduce((acc: Record<string, unknown>, k) => {
			acc[k] = (obj as Record<string, unknown>)[k];
			return acc;
		}, {});
	return JSON.stringify(ordered);
}

// ===== Enrutamiento por sección (ajusta a tus endpoints reales) =====
const endpointBySection: Record<SidebarSection, string> = {
	hcIngreso: '/ingreso',
	indicaciones: '/indicaciones',
	evoluciones: '/evoluciones',
	interconsulta: '/interconsultas',
	solicitudEstudios: '/estudios',
	protocolos: '/protocolos',
	epicrisis: '/epicrisis',
	procedimientos: '/procedimientos',
	movimientos: '/movimientos',
	'medicacion-suministrada': '/medicacion',
	'controles-frecuentes': '/controles',
	'evolucion-enfermeria': '/evolucion',
	dieta: '/dieta',
	'balance-hidrico': '/balance-hidrico',
	insumos: '/insumos',
	informe_evo: '/informe-evo',
	control: '/control',
	adjuntos: '/adjuntos',
	laboratorios: '/laboratorios',
};

function resolveApiBase(apiBase?: string) {
	return (apiBase ?? process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/+$/, '');
}

// Si el endpoint es relativo, prefix con apiBase. Si es absoluto (http...), úsalo tal cual.
function resolveUrl(baseUrl: string | undefined, apiBase: string) {
	if (!baseUrl) return undefined;
	if (/^https?:\/\//i.test(baseUrl)) return baseUrl;
	const path = baseUrl.startsWith('/') ? baseUrl : `/${baseUrl}`;
	return `${apiBase}${path}`;
}

function buildQueryParams(input: {
	dateISO?: string;
	patientId?: string | number;
	bedId?: string | number;
	admissionId?: string | number;
	params?: Record<string, string | number | boolean | undefined>;
}): Record<string, unknown> {
	return {
		date: input.dateISO, // cambia el nombre si tu backend usa otro (ej. 'on' o 'fecha')
		patientId: input.patientId,
		bedId: input.bedId,
		admissionId: input.admissionId,
		...(input.params ?? {}),
	};
}

function buildKey(
	section: SidebarSection,
	dateISO: string | undefined,
	resolvedBaseUrl: string | undefined,
	queryParams: Record<string, unknown>,
) {
	return `bedDetail::${section}::${dateISO ?? 'null'}::${resolvedBaseUrl ?? 'no-url'}::${stableStringify(queryParams)}`;
}

// ===== Cache simple en memoria (compartida por módulo) =====
// key -> { ts, data }
const _cache = new Map<string, { ts: number; data: unknown }>();
// key -> request en curso (la comparten la precarga y la sección)
const _inflight = new Map<string, Promise<unknown>>();

/** Pasado este tiempo el cache ya no se muestra mientras se recarga: vuelve el loader. */
const STALE_MAX_MS = 10 * 60_000;

/** Logout / cambio de empresa: las claves no llevan el tenant. */
export function clearBedSectionCache(): void {
	_cache.clear();
	_inflight.clear();
}

function fetchShared(url: string, key: string, init: RequestInit | undefined, force: boolean) {
	const pending = _inflight.get(key);
	if (pending && !force) return pending;
	const request = async () => {
		const res = await apiFetch(url, { method: 'GET', ...(init ?? {}) });
		if (!res.ok) throw new Error(await motivoDeRespuesta(res));
		return res.json() as Promise<unknown>;
	};
	const job: Promise<unknown> = request()
		.then((json) => {
			if (_inflight.get(key) === job) _cache.set(key, { ts: Date.now(), data: json });
			return json;
		})
		.finally(() => {
			if (_inflight.get(key) === job) _inflight.delete(key);
		});
	_inflight.set(key, job);
	return job;
}

export type PrefetchBedSectionParams = {
	section: SidebarSection;
	endpoint: string;
	date?: Date | null;
	patientId?: string | number;
	bedId?: string | number;
	admissionId?: string | number;
	params?: Record<string, string | number | boolean | undefined>;
	/** No vuelve a pedir si el cache tiene menos de este tiempo (default 30s). */
	freshMs?: number;
	apiBase?: string;
};

/**
 * Deja en cache lo que va a pedir `useBedSectionFetch` con los mismos datos, así la sección
 * se muestra sin loader al abrirla. Los parámetros tienen que coincidir con los de la sección.
 */
export async function prefetchBedSection(p: PrefetchBedSectionParams): Promise<void> {
	const dateISO = toISODate(p.date);
	const url = resolveUrl(p.endpoint, resolveApiBase(p.apiBase));
	if (!url) return;
	const queryParams = buildQueryParams({
		dateISO,
		patientId: p.patientId,
		bedId: p.bedId,
		admissionId: p.admissionId,
		params: p.params,
	});
	const key = buildKey(p.section, dateISO, url, queryParams);
	const cached = _cache.get(key);
	if (cached && Date.now() - cached.ts < (p.freshMs ?? 30_000)) return;
	try {
		await fetchShared(url + buildQuery(queryParams), key, undefined, false);
	} catch {
		/* la sección vuelve a intentar al abrirse */
	}
}

export type UseBedSectionFetchParams = {
	// Identificadores que tu backend necesite (paciente, cama, internación, etc.)
	patientId?: string | number;
	bedId?: string | number;
	admissionId?: string | number;
	// Parámetros adicionales libremente extensibles
	params?: Record<string, string | number | boolean | undefined>;
	// Control
	enabled?: boolean; // default true
	cacheTimeMs?: number; // default 30s
	revalidateOnFocus?: boolean; // default false
	// Si quieres cambiar el endpoint por sección en runtime
	endpointOverride?: Partial<Record<SidebarSection, string>>;
	// Headers/credenciales opcionales
	fetchInit?: RequestInit;
	apiBase?: string;
};

export type UseBedSectionFetchState<T> = {
	data: T | undefined;
	isLoading: boolean;
	error: Error | undefined;
	refetch: () => Promise<void>;
	url: string | undefined; // URL final usada (para debug)
	lastUpdatedAt: number | undefined;
};

export function useBedSectionFetch<T = unknown>(
	opts?: UseBedSectionFetchParams,
): UseBedSectionFetchState<T> {
	const { activeSection, selectedDate } = useBedDetail();

	const section = activeSection;
	const dateISO = toISODate(selectedDate);

	const apiBase = resolveApiBase(opts?.apiBase);

	const endpoints = useMemo(
		() => ({
			...endpointBySection,
			...(opts?.endpointOverride ?? {}),
		}),
		[opts?.endpointOverride],
	);

	const baseUrl = endpoints[section];
	const resolvedBaseUrl = useMemo(() => resolveUrl(baseUrl, apiBase), [baseUrl, apiBase]);

	const queryParams = useMemo(
		() =>
			buildQueryParams({
				dateISO,
				patientId: opts?.patientId,
				bedId: opts?.bedId,
				admissionId: opts?.admissionId,
				params: opts?.params,
			}),
		[dateISO, opts?.patientId, opts?.bedId, opts?.admissionId, opts?.params],
	);

	const queryKey = useMemo(
		() => buildKey(section, dateISO, resolvedBaseUrl, queryParams),
		[section, dateISO, resolvedBaseUrl, queryParams],
	);

	const [initialCache] = useState(() => {
		const c = _cache.get(queryKey);
		return c && Date.now() - c.ts < STALE_MAX_MS ? c : undefined;
	});
	const [data, setData] = useState<T | undefined>(initialCache?.data as T | undefined);
	const [isLoading, setIsLoading] = useState(!initialCache);
	const [error, setError] = useState<Error | undefined>(undefined);
	const [url, setUrl] = useState<string | undefined>(undefined);
	const [lastUpdatedAt, setLastUpdatedAt] = useState<number | undefined>(initialCache?.ts);

	const enabled = (opts?.enabled ?? true) && !!baseUrl;
	const cacheTimeMs = opts?.cacheTimeMs ?? 30_000; // 30s
	const revalidateOnFocus = opts?.revalidateOnFocus ?? false;

	const queryKeyRef = useRef(queryKey);
	const queryParamsRef = useRef(queryParams);
	const resolvedBaseUrlRef = useRef(resolvedBaseUrl);
	queryKeyRef.current = queryKey;
	queryParamsRef.current = queryParams;
	resolvedBaseUrlRef.current = resolvedBaseUrl;

	const doFetch = async (optsFetch?: { soft?: boolean }) => {
		if (!enabled) {
			setIsLoading(false);
			return;
		}

		const soft = Boolean(optsFetch?.soft);
		const currentKey = queryKeyRef.current;
		const currentBase = resolvedBaseUrlRef.current;
		const currentParams = queryParamsRef.current;
		if (!currentBase) {
			setIsLoading(false);
			return;
		}

		const finalUrl = currentBase + buildQuery(currentParams);
		setUrl(finalUrl);
		setError(undefined);
		if (!soft) {
			setIsLoading(true);
		}

		// 1) Cache check (solo en carga normal; soft/refetch siempre va a red)
		const now = Date.now();
		if (!soft) {
			const cached = _cache.get(currentKey);
			if (cached && now - cached.ts < cacheTimeMs) {
				setData(cached.data as T);
				setLastUpdatedAt(cached.ts);
				setIsLoading(false);
				return;
			}
		}

		// 2) Network (reutiliza la precarga en curso; un refetch tras guardar pide de nuevo)
		try {
			const json = (await fetchShared(finalUrl, currentKey, opts?.fetchInit, soft)) as T;
			if (queryKeyRef.current !== currentKey) return; // navegación rápida
			setData(json);
			setLastUpdatedAt(Date.now());
		} catch (e: any) {
			if (queryKeyRef.current !== currentKey) return;
			setError(e);
		} finally {
			if (queryKeyRef.current === currentKey) setIsLoading(false);
		}
	};

	// Refetch en cambios de sección/fecha/params/URL (p. ej. otra visita).
	// Con cache (precargado o de una visita anterior) se muestra al instante y se refresca atrás.
	useEffect(() => {
		if (enabled) {
			const cached = _cache.get(queryKey);
			if (cached && Date.now() - cached.ts < STALE_MAX_MS) {
				setData(cached.data as T);
				setLastUpdatedAt(cached.ts);
				setError(undefined);
				setIsLoading(false);
				if (Date.now() - cached.ts >= cacheTimeMs) void doFetch({ soft: true });
				return;
			}
			setIsLoading(true);
			setData(undefined);
			setError(undefined);
		}
		void doFetch();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [queryKey, baseUrl, enabled]);

	// Revalidate on window focus (opcional)
	useEffect(() => {
		if (!revalidateOnFocus) return;
		const onFocus = () => {
			doFetch();
		};
		window.addEventListener('focus', onFocus);
		return () => window.removeEventListener('focus', onFocus);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [revalidateOnFocus, queryKey, baseUrl]);

	const refetch = async () => {
		// invalida cache del key actual y vuelve a pedir sin desmontar la UI
		_cache.delete(queryKeyRef.current);
		await doFetch({ soft: true });
	};

	const waitingFirstData = enabled && data === undefined && !error;

	return {
		data,
		isLoading: isLoading || waitingFirstData,
		error,
		refetch,
		url,
		lastUpdatedAt,
	} as UseBedSectionFetchState<T>;
}
