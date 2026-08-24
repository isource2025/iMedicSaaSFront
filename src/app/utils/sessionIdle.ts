import { clearTenantUiCaches } from './sessionCaches';

export const SESSION_IDLE_EVENT = 'imedic:session-idle';

let idleOpen = false;

const AUTH_KEYS = [
	'token',
	'user',
	'userData',
	'rol',
	'roles',
	'permisos',
	'empresaSeleccionada',
	'empresaInfo',
	'empresaModulos',
	'rememberUser',
	'sectorSeleccionado',
	'sectoresAsignados',
] as const;

export function isSessionIdleOpen() {
	return idleOpen;
}

export function isPublicAuthPath(pathname?: string) {
	const p = pathname ?? (typeof window !== 'undefined' ? window.location.pathname : '');
	if (!p || p === '/') return true;
	return p.startsWith('/display') || p.startsWith('/politica');
}

export function clearClientAuth() {
	if (typeof window === 'undefined') return;
	for (const key of AUTH_KEYS) {
		try {
			localStorage.removeItem(key);
		} catch {
			/* ignore */
		}
	}
	clearTenantUiCaches();
}

const IDLE_TRACK_KEY = 'imedic_idle_track';

function peekSessionId(token: string | null) {
	if (!token || token.split('.').length < 2) return null;
	try {
		const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
		const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
		const payload = JSON.parse(atob(padded)) as { sessionId?: string };
		return payload?.sessionId ? String(payload.sessionId) : null;
	} catch {
		return null;
	}
}

function rememberIdleSession(sessionId: string) {
	try {
		sessionStorage.setItem(IDLE_TRACK_KEY, JSON.stringify({ sessionId, at: Date.now() }));
	} catch {
		/* ignore */
	}
}

/** Cierra la sesión en el cliente y muestra el aviso. No redirige hasta que el usuario acepte. */
export function notifySessionIdle() {
	if (typeof window === 'undefined') return;
	if (idleOpen) return;
	if (isPublicAuthPath()) return;
	idleOpen = true;
	let token: string | null = null;
	try {
		token = localStorage.getItem('token');
	} catch {
		token = null;
	}
	const sessionId = peekSessionId(token);
	if (sessionId) rememberIdleSession(sessionId);
	try {
		void import('@/app/services/analyticsService').then((mod) => {
			mod.trackProductEvent(mod.ANALYTICS_EVENTS.SESSION_EXPIRED, { sessionId, token });
		});
	} catch {
		/* analytics no debe bloquear el modal */
	}
	clearClientAuth();
	window.dispatchEvent(new Event(SESSION_IDLE_EVENT));
}

export function goToLoginFromIdle() {
	idleOpen = false;
	if (typeof window === 'undefined') return;
	window.location.href = '/';
}
