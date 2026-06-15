import { getResolvedApiBaseUrl } from '@/app/services/axios';
import { getEnvApiBaseUrl, normalizeApiRequestPath } from '@/app/config/apiBaseUrl';

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
	const normalized = normalizeApiRequestPath(pathOrUrl);
	const url = /^https?:\/\//i.test(normalized) ? normalized : apiPath(normalized);
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
 * Abre blob en pestaña nueva (sin noopener para poder asignar la URL tras el fetch).
 * Preferir visor en página (AdjuntoFileViewer) cuando sea posible.
 */
export async function openAuthenticatedBlob(pathOrUrl: string, init?: RequestInit): Promise<void> {
	const popup = window.open('about:blank', '_blank');
	if (!popup) {
		const token = getStoredToken();
		if (token) {
			const rel = /^https?:\/\//i.test(pathOrUrl) ? pathOrUrl : apiPath(pathOrUrl);
			const sep = rel.includes('?') ? '&' : '?';
			window.open(`${rel}${sep}access_token=${encodeURIComponent(token)}`, '_blank');
			return;
		}
		throw new Error('El navegador bloqueó la ventana emergente. Permití pop-ups para este sitio.');
	}
	try {
		const blob = await apiFetchBlob(pathOrUrl, init);
		const blobUrl = URL.createObjectURL(blob);
		popup.location.href = blobUrl;
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'No se pudo abrir el archivo';
		popup.document.open();
		popup.document.write(
			`<!DOCTYPE html><html><body style="font-family:sans-serif;padding:2rem;color:#991b1b"><p>${msg}</p></body></html>`,
		);
		popup.document.close();
		throw err;
	}
}

/** Convierte URL absoluta legacy (NEXT_PUBLIC_API_URL + path) a path relativo. */
export function toApiPath(url: string): string {
	const base = getEnvApiBaseUrl().replace(/\/+$/, '');
	if (url.startsWith(base)) return url.slice(base.length) || '/';
	if (/^https?:\/\//i.test(url)) {
		try {
			const u = new URL(url);
			return u.pathname.replace(/^\/api/, '') + u.search;
		} catch {
			return url;
		}
	}
	return normalizeApiRequestPath(url);
}
