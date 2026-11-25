import { clearTenantUiCaches } from './sessionCaches';

export const SESSION_IDLE_EVENT = 'imedic:session-idle';

/** Persiste el aviso de inactividad entre F5 / recargas (idleOpen solo vive en memoria). */
const IDLE_PENDING_KEY = 'imedic_idle_pending';
const IDLE_TRACK_KEY = 'imedic_idle_track';

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

function markIdlePending() {
	try {
		sessionStorage.setItem(IDLE_PENDING_KEY, '1');
	} catch {
		/* ignore */
	}
}

export function clearIdlePending() {
	if (typeof window === 'undefined') return;
	try {
		sessionStorage.removeItem(IDLE_PENDING_KEY);
		sessionStorage.removeItem(IDLE_TRACK_KEY);
	} catch {
		/* ignore */
	}
}

export function hasIdlePending() {
	if (typeof window === 'undefined') return false;
	try {
		return sessionStorage.getItem(IDLE_PENDING_KEY) === '1';
	} catch {
		return false;
	}
}

/** Revoca sesión en servidor y limpia cookies httpOnly (localStorage solo no alcanza). */
function revokeServerSession() {
	if (typeof window === 'undefined') return;
	void import('@/app/services/axios')
		.then(({ apiService }) => apiService.post('/auth/logout', {}))
		.catch(() => {
			/* igual limpiamos el cliente */
		});
}

/**
 * Tras F5 el flag en memoria se pierde: si quedó el pending en sessionStorage,
 * reabre el aviso y vuelve a limpiar auth/caches (sin PHI en snapshot).
 */
export function restoreIdleIfPending() {
	if (typeof window === 'undefined') return false;
	if (isPublicAuthPath()) return false;
	if (!hasIdlePending()) return false;
	if (idleOpen) return true;
	idleOpen = true;
	clearClientAuth();
	window.dispatchEvent(new Event(SESSION_IDLE_EVENT));
	return true;
}

/** Cierra la sesión en el cliente y muestra el aviso. No redirige hasta que el usuario acepte. */
export function notifySessionIdle() {
	if (typeof window === 'undefined') return;
	if (idleOpen) return;
	if (isPublicAuthPath()) return;
	idleOpen = true;
	markIdlePending();
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
	revokeServerSession();
	clearClientAuth();
	window.dispatchEvent(new Event(SESSION_IDLE_EVENT));
}

export function goToLoginFromIdle() {
	idleOpen = false;
	clearIdlePending();
	if (typeof window === 'undefined') return;
	window.location.href = '/';
}
