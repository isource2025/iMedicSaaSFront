import { getResolvedApiBaseUrl } from '@/app/services/axios';

/** Ruta relativa → URL absoluta del backend local/remoto configurado. */
export function apiPath(path: string): string {
	if (/^https?:\/\//i.test(path)) return path;
	const base = getResolvedApiBaseUrl().replace(/\/+$/, '');
	const p = path.startsWith('/') ? path : `/${path}`;
	return `${base}${p}`;
}

/** Headers con JWT del login (requerido en todas las rutas /api/*). */
export function withAuthHeaders(init?: RequestInit): RequestInit {
	const headers = new Headers(init?.headers);
	const method = String(init?.method || 'GET').toUpperCase();
	const isFormData = typeof FormData !== 'undefined' && init?.body instanceof FormData;
	const hasBody = init?.body != null && init.body !== '';
	if (!isFormData && hasBody && method !== 'GET' && method !== 'HEAD' && !headers.has('Content-Type')) {
		headers.set('Content-Type', 'application/json');
	}
	if (typeof window !== 'undefined') {
		const token = localStorage.getItem('token');
		if (token) headers.set('Authorization', `Bearer ${token}`);
	}
	return { ...init, headers };
}

function getStoredToken(): string | null {
	if (typeof window === 'undefined') return null;
	const token = localStorage.getItem('token');
	return token && token.trim() ? token.trim() : null;
}

/** fetch autenticado hacia la API iMedic (path relativo o URL absoluta). */
export async function apiFetch(pathOrUrl: string, init?: RequestInit): Promise<Response> {
	const url = /^https?:\/\//i.test(pathOrUrl) ? pathOrUrl : apiPath(pathOrUrl);
	return fetch(url, withAuthHeaders(init));
}

async function readFetchErrorMessage(response: Response, fallback: string): Promise<string> {
	try {
		const payload = await response.clone().json();
		return payload?.mensaje || payload?.error || fallback;
	} catch {
		try {
			const text = await response.clone().text();
			return text || fallback;
		} catch {
			return fallback;
		}
	}
}

/** Descarga binaria autenticada (adjuntos, exports, etc.). */
export async function apiFetchBlob(pathOrUrl: string, init?: RequestInit): Promise<Blob> {
	const response = await apiFetch(pathOrUrl, init);
	if (!response.ok) {
		throw new Error(await readFetchErrorMessage(response, 'Error al obtener el archivo'));
	}
	return response.blob();
}

/**
 * Abre un recurso autenticado en pestaña nueva.
 * Abre la ventana de forma síncrona (click del usuario) para evitar bloqueo de pop-ups.
 */
export async function openAuthenticatedBlob(pathOrUrl: string, init?: RequestInit): Promise<void> {
	const popup = window.open('', '_blank', 'noopener,noreferrer');
	if (!popup) {
		const token = getStoredToken();
		if (token) {
			const sep = pathOrUrl.includes('?') ? '&' : '?';
			const rel = /^https?:\/\//i.test(pathOrUrl) ? pathOrUrl : apiPath(pathOrUrl);
			window.open(`${rel}${sep}access_token=${encodeURIComponent(token)}`, '_blank', 'noopener,noreferrer');
			return;
		}
		throw new Error('El navegador bloqueó la ventana emergente. Permití pop-ups para este sitio.');
	}
	try {
		popup.document.title = 'Cargando…';
		popup.document.body.innerHTML =
			'<p style="font-family:sans-serif;padding:2rem;color:#334155">Cargando archivo…</p>';
		const blob = await apiFetchBlob(pathOrUrl, init);
		const blobUrl = URL.createObjectURL(blob);
		popup.location.replace(blobUrl);
		window.setTimeout(() => URL.revokeObjectURL(blobUrl), 120_000);
	} catch (err) {
		popup.close();
		throw err;
	}
}

/** Convierte URL absoluta legacy (NEXT_PUBLIC_API_URL + path) a path relativo. */
export function toApiPath(url: string): string {
	const base = (process.env.NEXT_PUBLIC_API_URL || getResolvedApiBaseUrl())
		.replace(/\/+$/, '');
	if (url.startsWith(base)) return url.slice(base.length) || '/';
	if (/^https?:\/\//i.test(url)) {
		try {
			const u = new URL(url);
			return u.pathname.replace(/^\/api/, '') + u.search;
		} catch {
			return url;
		}
	}
	return url.startsWith('/') ? url : `/${url}`;
}
