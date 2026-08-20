'use client';

import { apiService } from '@/app/services/axios';
import { isSessionIdleOpen, notifySessionIdle } from '@/app/utils/sessionIdle';

let activityTimer: ReturnType<typeof setInterval> | null = null;
let idleWatchTimer: ReturnType<typeof setInterval> | null = null;
let pingInFlight: Promise<void> | null = null;
let lastActivityAt = 0;
let idleTimeoutMs = 30 * 60_000;

const PING_THROTTLE_MS = 60_000;
const WATCH_MS = 15_000;

function applyIdleMinutes(mins: unknown) {
	const n = Number(mins);
	if (Number.isFinite(n) && n >= 5 && n <= 480) {
		idleTimeoutMs = n * 60_000;
	}
}

function expireIfIdle() {
	if (typeof window === 'undefined') return;
	if (isSessionIdleOpen()) return;
	if (!localStorage.getItem('token')) return;
	if (!lastActivityAt) return;
	if (Date.now() - lastActivityAt < idleTimeoutMs) return;
	stopSessionActivityMonitor();
	notifySessionIdle();
}

/**
 * Marca actividad de sesión (idle timeout en AuthSessions).
 * Usa GET /auth/me (Bearer + cookies) — NO rota el refresh token.
 * Rotar en cada ping cruzaba pestañas y, con SameSite mal configurado, tiraba 401 en loop.
 */
export function startSessionActivityMonitor() {
	if (typeof window === 'undefined') return;
	stopSessionActivityMonitor();
	lastActivityAt = Date.now();

	const ping = () => {
		if (!localStorage.getItem('token')) return;
		if (isSessionIdleOpen()) return;
		if (pingInFlight) return;
		pingInFlight = (async () => {
			try {
				const res = await apiService.get<{ idleTimeoutMinutes?: number }>('/auth/me');
				applyIdleMinutes(res.data?.idleTimeoutMinutes);
			} catch {
				/* 401 por inactividad: el interceptor muestra el modal */
			} finally {
				pingInFlight = null;
			}
		})();
	};

	const events = ['mousedown', 'keydown', 'scroll', 'touchstart'] as const;
	let lastPing = 0;
	const onActivity = () => {
		if (isSessionIdleOpen()) return;
		lastActivityAt = Date.now();
		const now = Date.now();
		if (now - lastPing < PING_THROTTLE_MS) return;
		lastPing = now;
		ping();
	};

	for (const ev of events) {
		window.addEventListener(ev, onActivity, { passive: true });
	}

	activityTimer = setInterval(ping, 5 * 60_000);
	idleWatchTimer = setInterval(expireIfIdle, WATCH_MS);
	(window as unknown as { __imedicActivityCleanup?: () => void }).__imedicActivityCleanup = () => {
		for (const ev of events) window.removeEventListener(ev, onActivity);
	};
	void ping();
}

export function stopSessionActivityMonitor() {
	if (activityTimer) {
		clearInterval(activityTimer);
		activityTimer = null;
	}
	if (idleWatchTimer) {
		clearInterval(idleWatchTimer);
		idleWatchTimer = null;
	}
	const cleanup = (window as unknown as { __imedicActivityCleanup?: () => void }).__imedicActivityCleanup;
	cleanup?.();
}

/** Dispara el mismo flujo que el timeout real: 401 de inactividad → modal + analytics. */
export async function simulateIdleLogout() {
	if (typeof window === 'undefined') return;
	if (isSessionIdleOpen()) return;
	stopSessionActivityMonitor();
	try {
		await apiService.post('/auth/simulate-idle', {});
	} catch {
		/* el interceptor 401 muestra el modal */
	}
	if (!isSessionIdleOpen()) notifySessionIdle();
}
