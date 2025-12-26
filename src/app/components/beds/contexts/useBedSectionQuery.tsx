'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useBedDetail, SidebarSection } from '../contexts/BedDetailContext';

// ===== Helpers =====
function toISODate(d: Date | null | undefined) {
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
	solicitudEstudios: '/estudios',
	protocolos: '/protocolos',
	epicrisis: '/epicrisis',
	procedimientos: '/procedimientos',
	movimientos: '/movimientos',
	'medicacion-suministrada': '/medicacion',
	'controles-frecuentes': '/controles',
	'evolucion-enfermeria': '/evolucion',
	dieta: '/dieta',
	'balance-hidrico': '/balance',
	insumos: '/insumos',
	informe_evo: '/informe-evo',
	control: '/control',
	adjuntos: '/adjuntos',
};

// ===== Cache simple en memoria (compartida por módulo) =====
// key -> { ts, data }
const _cache = new Map<string, { ts: number; data: unknown }>();

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

	const apiBase = (opts?.apiBase ?? process.env.NEXT_PUBLIC_API_URL ?? '').replace(
		/\/+$/,
		'',
	);

	const endpoints = useMemo(
		() => ({
			...endpointBySection,
			...(opts?.endpointOverride ?? {}),
		}),
		[opts?.endpointOverride],
	);

	// Si el endpoint es relativo, prefix con apiBase. Si es absoluto (http...), úsalo tal cual.
	const baseUrl = endpoints[section];
	const resolvedBaseUrl = useMemo(() => {
		if (!baseUrl) return undefined;
		if (/^https?:\/\//i.test(baseUrl)) return baseUrl; // absoluto
		const path = baseUrl.startsWith('/') ? baseUrl : `/${baseUrl}`;
		return `${apiBase}${path}`; // relativo -> prefix apiBase
	}, [baseUrl, apiBase]);

	const queryParams = useMemo(() => {
		return {
			date: dateISO, // cambia el nombre si tu backend usa otro (ej. 'on' o 'fecha')
			patientId: opts?.patientId,
			bedId: opts?.bedId,
			admissionId: opts?.admissionId,
			...(opts?.params ?? {}),
		} as Record<string, unknown>;
	}, [dateISO, opts?.patientId, opts?.bedId, opts?.admissionId, opts?.params]);

	const queryKey = useMemo(
		() => `bedDetail::${section}::${dateISO ?? 'null'}::${stableStringify(queryParams)}`,
		[section, dateISO, queryParams],
	);

	const [data, setData] = useState<T | undefined>(undefined);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<Error | undefined>(undefined);
	const [url, setUrl] = useState<string | undefined>(undefined);
	const [lastUpdatedAt, setLastUpdatedAt] = useState<number | undefined>(undefined);

	const enabled = (opts?.enabled ?? true) && !!baseUrl;
	const cacheTimeMs = opts?.cacheTimeMs ?? 30_000; // 30s
	const revalidateOnFocus = opts?.revalidateOnFocus ?? false;

	const abortRef = useRef<AbortController | null>(null);

	const doFetch = async () => {
		if (!enabled) return;

		const finalUrl = resolvedBaseUrl + buildQuery(queryParams);
		setUrl(finalUrl);
		setError(undefined);

		// 1) Cache check
		const now = Date.now();
		const cached = _cache.get(queryKey);
		if (cached && now - cached.ts < cacheTimeMs) {
			setData(cached.data as T);
			setLastUpdatedAt(cached.ts);
			return; // servir desde cache
		}

		// 2) Network
		abortRef.current?.abort();
		const controller = new AbortController();
		abortRef.current = controller;

		setIsLoading(true);
		try {
			const res = await fetch(finalUrl, {
				method: 'GET',
				...(opts?.fetchInit ?? {}),
				signal: controller.signal,
			});
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const json = (await res.json()) as T;
			setData(json);
			setLastUpdatedAt(now);
			_cache.set(queryKey, { ts: now, data: json });
		} catch (e: any) {
			if (e?.name === 'AbortError') return; // navegación rápida
			setError(e);
		} finally {
			setIsLoading(false);
		}
	};

	// Refetch en cambios de sección/fecha/params/baseUrl
	useEffect(() => {
		doFetch();
		return () => abortRef.current?.abort();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [queryKey, baseUrl]);

	// Revalidate on window focus (opcional)
	useEffect(() => {
		if (!revalidateOnFocus) return;
		const onFocus = () => {
			// si hay cache aún válido no hace nada; si quieres forzar, pasa cacheTimeMs=0
			doFetch();
		};
		window.addEventListener('focus', onFocus);
		return () => window.removeEventListener('focus', onFocus);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [revalidateOnFocus, queryKey, baseUrl]);

	const refetch = async () => {
		// invalida cache para este key y vuelve a pedir
		_cache.delete(queryKey);
		await doFetch();
	};

	return {
		data,
		isLoading,
		error,
		refetch,
		url,
		lastUpdatedAt,
	} as UseBedSectionFetchState<T>;
}
