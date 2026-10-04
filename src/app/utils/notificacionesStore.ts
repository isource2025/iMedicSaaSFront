'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { notificacionesService, type NotificacionItem } from '@/app/services/notificacionesService';
import estudiosService from '@/app/services/estudiosService';
import { peekCachedBandejaCount } from '@/app/utils/serviciosReceptorCache';
import { getIdEmpresaFromToken } from '@/app/utils/jwtSession';
import { apiFetch } from '@/app/utils/authFetch';
import { INBOX_UNREAD_EVENT } from '@/app/hooks/useWhatsAppInboxUnread';

/**
 * Estado de la campanita compartido por toda la sesión del navegador.
 * Una sola conexión SSE por pestaña avisa cambios; la UI lee de acá sin volver a pedir
 * datos al navegar entre pantallas.
 */

export type NotificacionesState = {
	userKey: string | null;
	userId: number | null;
	count: number;
	countLoaded: boolean;
	estudios: number;
	interconsultas: number;
	bandejaLoaded: boolean;
	items: NotificacionItem[];
	itemsLoaded: boolean;
	loadingList: boolean;
	listError: string | null;
	firstLoadTimedOut: boolean;
	entranceShown: boolean;
	live: boolean;
};

type Persisted = Pick<
	NotificacionesState,
	'userKey' | 'count' | 'estudios' | 'interconsultas' | 'items' | 'itemsLoaded' | 'entranceShown'
>;

const STORAGE_KEY = 'imedic:notificaciones:v1';
const LIST_LIMIT = 40;
/** Si el backend no responde, el botón aparece igual para no dejar al usuario sin acceso. */
const FIRST_LOAD_TIMEOUT_MS = 8000;
const POLL_TICK_MS = 45_000;
/** Con el stream vivo, el polling queda solo como red de seguridad (multi-instancia, proxies). */
const POLL_WHEN_LIVE_MS = 5 * 60_000;
const EVENT_DEBOUNCE_MS = 400;
/** Si falla el conteo de la bandeja se reintenta pronto, sin esperar al próximo polling. */
const BANDEJA_RETRY_MIN_MS = 3_000;
const BANDEJA_RETRY_MAX_MS = 60_000;
/** El backend manda ping cada 25 s; si no llega nada, la conexión quedó colgada. */
const STREAM_IDLE_MS = 70_000;
const RECONNECT_MIN_MS = 2_000;
const RECONNECT_MAX_MS = 60_000;
/** Pestañas ocultas sueltan la conexión para no agotar el límite de conexiones del navegador. */
const HIDDEN_DISCONNECT_MS = 60_000;

const initialState: NotificacionesState = {
	userKey: null,
	userId: null,
	count: 0,
	countLoaded: false,
	estudios: 0,
	interconsultas: 0,
	bandejaLoaded: false,
	items: [],
	itemsLoaded: false,
	loadingList: false,
	listError: null,
	firstLoadTimedOut: false,
	entranceShown: false,
	live: false,
};

let state: NotificacionesState = initialState;
const listeners = new Set<() => void>();

function emit() {
	listeners.forEach((l) => l());
}

function setState(patch: Partial<NotificacionesState>) {
	state = { ...state, ...patch };
	persist();
	emit();
}

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

function getSnapshot() {
	return state;
}

function getServerSnapshot() {
	return initialState;
}

function persist() {
	if (typeof window === 'undefined' || !state.userKey) return;
	const data: Persisted = {
		userKey: state.userKey,
		count: state.count,
		estudios: state.estudios,
		interconsultas: state.interconsultas,
		items: state.items,
		itemsLoaded: state.itemsLoaded,
		entranceShown: state.entranceShown,
	};
	try {
		sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
	} catch {
		/* quota / private mode */
	}
}

function readPersisted(userKey: string): Persisted | null {
	try {
		const raw = sessionStorage.getItem(STORAGE_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as Persisted;
		return parsed?.userKey === userKey ? parsed : null;
	} catch {
		return null;
	}
}

export function valorPersonalFromUser(user: Record<string, unknown> | null): number | null {
	if (!user) return null;
	const raw = user.idValorpersonal ?? user.valorPersonal ?? user.ValorPersonal ?? user.id;
	const n = parseInt(String(raw ?? ''), 10);
	return Number.isFinite(n) && n > 0 ? n : null;
}

function currentUser(): { userId: number; userKey: string } | null {
	if (typeof window === 'undefined') return null;
	try {
		if (!localStorage.getItem('token')) return null;
		const raw = localStorage.getItem('user');
		const userId = valorPersonalFromUser(raw ? (JSON.parse(raw) as Record<string, unknown>) : null);
		if (!userId) return null;
		return { userId, userKey: `${getIdEmpresaFromToken() ?? 0}:${userId}` };
	} catch {
		return null;
	}
}

/* ─────────────────────────── carga de datos ─────────────────────────── */

let countJob: Promise<void> | null = null;
let bandejaJob: Promise<void> | null = null;
let bandejaRetryTimer: number | null = null;
let bandejaRetryDelay = BANDEJA_RETRY_MIN_MS;
let listJob: Promise<void> | null = null;
let lastFullRefresh = 0;

function sameUser(userKey: string | null) {
	return userKey != null && state.userKey === userKey;
}

export function refreshCount(): Promise<void> {
	if (countJob) return countJob;
	const { userId, userKey } = state;
	if (!userId) return Promise.resolve();
	countJob = (async () => {
		try {
			const c = await notificacionesService.getUnreadCount(userId);
			if (sameUser(userKey)) setState({ count: c });
		} catch {
			/* silencioso */
		} finally {
			if (sameUser(userKey) && !state.countLoaded) setState({ countLoaded: true });
			countJob = null;
		}
	})();
	return countJob;
}

function clearBandejaRetry() {
	if (bandejaRetryTimer != null) {
		window.clearTimeout(bandejaRetryTimer);
		bandejaRetryTimer = null;
	}
}

function scheduleBandejaRetry(userKey: string) {
	clearBandejaRetry();
	const delay = bandejaRetryDelay;
	bandejaRetryDelay = Math.min(bandejaRetryDelay * 2, BANDEJA_RETRY_MAX_MS);
	bandejaRetryTimer = window.setTimeout(() => {
		bandejaRetryTimer = null;
		if (sameUser(userKey)) void refreshBandeja();
	}, delay);
}

export function refreshBandeja(): Promise<void> {
	if (bandejaJob) return bandejaJob;
	const { userKey } = state;
	if (!userKey) return Promise.resolve();
	bandejaJob = (async () => {
		try {
			const data = await estudiosService.contarLibres({ soloMios: true, lanzarError: true });
			if (sameUser(userKey)) {
				clearBandejaRetry();
				bandejaRetryDelay = BANDEJA_RETRY_MIN_MS;
				setState({ estudios: data.estudios, interconsultas: data.interconsultas, bandejaLoaded: true });
			}
		} catch {
			if (!sameUser(userKey)) return;
			const fallback = peekCachedBandejaCount();
			if (fallback) {
				setState({ estudios: fallback.estudios, interconsultas: fallback.interconsultas, bandejaLoaded: true });
			}
			scheduleBandejaRetry(userKey);
		} finally {
			bandejaJob = null;
		}
	})();
	return bandejaJob;
}

export function refreshList(): Promise<void> {
	if (listJob) return listJob;
	const { userId, userKey } = state;
	if (!userId) return Promise.resolve();
	listJob = (async () => {
		setState({ loadingList: true, listError: null });
		try {
			const { data } = await notificacionesService.listar(userId, { limit: LIST_LIMIT, soloNoLeidas: false });
			if (sameUser(userKey)) setState({ items: data, itemsLoaded: true });
		} catch (e) {
			if (sameUser(userKey)) {
				setState({ listError: e instanceof Error ? e.message : 'No se pudieron cargar las notificaciones' });
			}
		} finally {
			if (sameUser(userKey)) setState({ loadingList: false });
			listJob = null;
		}
	})();
	return listJob;
}

function refreshAll({ list = true }: { list?: boolean } = {}) {
	lastFullRefresh = Date.now();
	void refreshCount();
	void refreshBandeja();
	if (list && state.itemsLoaded) void refreshList();
}

let pendingFlags = { notificaciones: false, bandeja: false };
let debounceTimer: number | null = null;

function scheduleRefresh(flags: { notificaciones?: boolean; bandeja?: boolean }) {
	pendingFlags = {
		notificaciones: pendingFlags.notificaciones || Boolean(flags.notificaciones),
		bandeja: pendingFlags.bandeja || Boolean(flags.bandeja),
	};
	if (debounceTimer != null) return;
	debounceTimer = window.setTimeout(() => {
		debounceTimer = null;
		const f = pendingFlags;
		pendingFlags = { notificaciones: false, bandeja: false };
		if (f.notificaciones) {
			void refreshCount();
			if (state.itemsLoaded) void refreshList();
		}
		if (f.bandeja) void refreshBandeja();
	}, EVENT_DEBOUNCE_MS);
}

/* ─────────────────────────── conexión SSE ─────────────────────────── */

let streamAbort: AbortController | null = null;
let reconnectTimer: number | null = null;
let reconnectDelay = RECONNECT_MIN_MS;
let streamBlocked = false;
let connectedOnce = false;
let hiddenTimer: number | null = null;

function clearReconnect() {
	if (reconnectTimer != null) {
		window.clearTimeout(reconnectTimer);
		reconnectTimer = null;
	}
}

function scheduleReconnect() {
	clearReconnect();
	if (streamBlocked || !state.userKey || document.visibilityState === 'hidden') return;
	const delay = reconnectDelay;
	reconnectDelay = Math.min(reconnectDelay * 2, RECONNECT_MAX_MS);
	reconnectTimer = window.setTimeout(() => {
		reconnectTimer = null;
		void connectStream();
	}, delay);
}

function disconnectStream() {
	clearReconnect();
	streamAbort?.abort();
	streamAbort = null;
	if (state.live) setState({ live: false });
}

function handleStreamEvent(event: string, data: string) {
	if (event === 'ready') {
		reconnectDelay = RECONNECT_MIN_MS;
		if (!state.live) setState({ live: true });
		if (connectedOnce) refreshAll();
		connectedOnce = true;
		return;
	}
	if (event === 'cambio') {
		let flags: { notificaciones?: boolean; bandeja?: boolean } = { notificaciones: true };
		try {
			flags = JSON.parse(data || '{}');
		} catch {
			/* payload inválido: refrescar igual */
		}
		scheduleRefresh(flags);
	}
}

async function connectStream() {
	if (streamAbort || streamBlocked || !state.userKey) return;
	const userKey = state.userKey;
	const ctrl = new AbortController();
	streamAbort = ctrl;
	let idleTimer: number | null = null;
	const armIdle = () => {
		if (idleTimer != null) window.clearTimeout(idleTimer);
		idleTimer = window.setTimeout(() => ctrl.abort(), STREAM_IDLE_MS);
	};

	try {
		const res = await apiFetch('/notificaciones/stream', {
			headers: { Accept: 'text/event-stream' },
			cache: 'no-store',
			signal: ctrl.signal,
		});
		if (res.status === 401 || res.status === 403 || res.status === 404) {
			streamBlocked = true;
			return;
		}
		if (!res.ok || !res.body) throw new Error(`stream ${res.status}`);

		const reader = res.body.getReader();
		const decoder = new TextDecoder();
		let buffer = '';
		armIdle();
		for (;;) {
			const { value, done } = await reader.read();
			if (done) break;
			armIdle();
			buffer += decoder.decode(value, { stream: true });
			let sep = /\r?\n\r?\n/.exec(buffer);
			while (sep) {
				const block = buffer.slice(0, sep.index);
				buffer = buffer.slice(sep.index + sep[0].length);
				let event = 'message';
				const dataLines: string[] = [];
				for (const line of block.split(/\r?\n/)) {
					if (!line || line.startsWith(':')) continue;
					const idx = line.indexOf(':');
					const field = idx === -1 ? line : line.slice(0, idx);
					const val = idx === -1 ? '' : line.slice(idx + 1).replace(/^ /, '');
					if (field === 'event') event = val;
					else if (field === 'data') dataLines.push(val);
				}
				if (sameUser(userKey)) handleStreamEvent(event, dataLines.join('\n'));
				sep = /\r?\n\r?\n/.exec(buffer);
			}
		}
	} catch {
		/* red caída, abort por inactividad o cierre del servidor */
	} finally {
		if (idleTimer != null) window.clearTimeout(idleTimer);
		const stillCurrent = streamAbort === ctrl;
		if (stillCurrent) streamAbort = null;
		if (stillCurrent && sameUser(userKey)) {
			if (state.live) setState({ live: false });
			scheduleReconnect();
		}
	}
}

/* ─────────────────────────── ciclo de vida ─────────────────────────── */

let pollTimer: number | null = null;
let firstLoadTimer: number | null = null;
let lastPoll = 0;
let windowListenersBound = false;

function onVisibility() {
	if (!state.userKey) return;
	if (document.visibilityState === 'hidden') {
		if (hiddenTimer == null) {
			hiddenTimer = window.setTimeout(() => {
				hiddenTimer = null;
				disconnectStream();
			}, HIDDEN_DISCONNECT_MS);
		}
		return;
	}
	if (hiddenTimer != null) {
		window.clearTimeout(hiddenTimer);
		hiddenTimer = null;
	}
	if (!streamAbort && !streamBlocked) {
		reconnectDelay = RECONNECT_MIN_MS;
		clearReconnect();
		void connectStream();
	}
	if (Date.now() - lastFullRefresh > 15_000) refreshAll();
}

function onInboxUnread() {
	void refreshCount();
}

function onStorage(e: StorageEvent) {
	if (e.key === null || e.key === 'token' || e.key === 'user') ensureNotificacionesStarted();
}

function bindWindowListeners() {
	if (windowListenersBound) return;
	windowListenersBound = true;
	document.addEventListener('visibilitychange', onVisibility);
	window.addEventListener(INBOX_UNREAD_EVENT, onInboxUnread);
	window.addEventListener('storage', onStorage);
}

function stopTimers() {
	clearBandejaRetry();
	bandejaRetryDelay = BANDEJA_RETRY_MIN_MS;
	if (pollTimer != null) window.clearInterval(pollTimer);
	if (firstLoadTimer != null) window.clearTimeout(firstLoadTimer);
	if (hiddenTimer != null) window.clearTimeout(hiddenTimer);
	if (debounceTimer != null) window.clearTimeout(debounceTimer);
	pollTimer = null;
	firstLoadTimer = null;
	hiddenTimer = null;
	debounceTimer = null;
	pendingFlags = { notificaciones: false, bandeja: false };
}

function stop() {
	stopTimers();
	disconnectStream();
	streamBlocked = false;
	connectedOnce = false;
	reconnectDelay = RECONNECT_MIN_MS;
}

function start(userId: number, userKey: string) {
	stop();
	const saved = readPersisted(userKey);
	const localBandeja = saved ? null : peekCachedBandejaCount();
	state = {
		...initialState,
		userId,
		userKey,
		count: saved?.count ?? 0,
		countLoaded: Boolean(saved),
		estudios: saved?.estudios ?? localBandeja?.estudios ?? 0,
		interconsultas: saved?.interconsultas ?? localBandeja?.interconsultas ?? 0,
		bandejaLoaded: Boolean(saved),
		items: saved?.items ?? [],
		itemsLoaded: saved?.itemsLoaded ?? false,
		entranceShown: saved?.entranceShown ?? false,
	};
	persist();
	emit();

	bindWindowListeners();
	if (!saved) {
		firstLoadTimer = window.setTimeout(() => {
			firstLoadTimer = null;
			if (sameUser(userKey)) setState({ firstLoadTimedOut: true });
		}, FIRST_LOAD_TIMEOUT_MS);
	}

	refreshAll();
	lastPoll = Date.now();
	pollTimer = window.setInterval(() => {
		if (document.visibilityState !== 'visible') return;
		const every = state.live ? POLL_WHEN_LIVE_MS : POLL_TICK_MS;
		if (Date.now() - lastPoll < every - 1000) return;
		lastPoll = Date.now();
		refreshAll({ list: false });
	}, POLL_TICK_MS);
	if (document.visibilityState !== 'hidden') void connectStream();
}

/** Arranca (o reinicia si cambió el usuario/empresa) el estado compartido. Idempotente. */
export function ensureNotificacionesStarted() {
	if (typeof window === 'undefined') return;
	const u = currentUser();
	if (!u) {
		if (state.userKey) resetNotificacionesStore();
		return;
	}
	if (state.userKey === u.userKey) return;
	start(u.userId, u.userKey);
}

/** Logout / 401 / cambio de empresa. */
export function resetNotificacionesStore() {
	if (typeof window === 'undefined') return;
	stop();
	try {
		sessionStorage.removeItem(STORAGE_KEY);
	} catch {
		/* ignore */
	}
	state = initialState;
	emit();
}

/* ─────────────────────────── acciones ─────────────────────────── */

export function markEntranceShown() {
	if (!state.entranceShown) setState({ entranceShown: true });
}

function esNotifPedido(n: NotificacionItem): boolean {
	const tipo = String(n.TipoNotificacion || '').toUpperCase();
	const ent = String(n.EntidadTipo || '').toUpperCase();
	return tipo === 'PEDIDO_ESTUDIO' || tipo === 'INTERCONSULTA' || ent === 'PEDIDO_ESTUDIO' || ent === 'INTERCONSULTA';
}

function noLeida(n: NotificacionItem) {
	return !(n.Leida === 1 || n.Leida === true);
}

export async function marcarNotificacionLeida(n: NotificacionItem) {
	const { userId } = state;
	if (!userId || !noLeida(n)) return;
	setState({
		items: state.items.map((x) => (x.IdNotificacion === n.IdNotificacion ? { ...x, Leida: 1 } : x)),
		count: Math.max(0, state.count - 1),
	});
	try {
		await notificacionesService.marcarLeida(userId, n.IdNotificacion);
	} catch {
		/* refreshCount corrige el contador */
	} finally {
		void refreshCount();
	}
}

export async function marcarTodasNotificacionesLeidas() {
	const { userId } = state;
	if (!userId) return;
	await notificacionesService.marcarTodasLeidas(userId);
	setState({
		items: state.items.filter((n) => !esNotifPedido(n)).map((x) => ({ ...x, Leida: 1 })),
		count: 0,
	});
}

/** Al cerrar la campanita los avisos de pedido dejan de listarse (la bandeja sigue contando libres). */
export async function descartarAvisosPedido() {
	const { userId } = state;
	if (!userId) return;
	try {
		await notificacionesService.marcarPedidosLeidas(userId);
		setState({ items: state.items.filter((n) => !esNotifPedido(n)) });
		await refreshCount();
	} catch {
		/* silencioso */
	}
}

/* ─────────────────────────── hook ─────────────────────────── */

export function useNotificacionesStore(enabled = true): NotificacionesState {
	useEffect(() => {
		if (enabled) ensureNotificacionesStarted();
	}, [enabled]);
	return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
