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

/** Cierra la sesión en el cliente y muestra el aviso. No redirige hasta que el usuario acepte. */
export function notifySessionIdle() {
	if (typeof window === 'undefined') return;
	if (idleOpen) return;
	if (isPublicAuthPath()) return;
	idleOpen = true;
	clearClientAuth();
	window.dispatchEvent(new Event(SESSION_IDLE_EVENT));
}

export function goToLoginFromIdle() {
	idleOpen = false;
	if (typeof window === 'undefined') return;
	window.location.href = '/';
}
