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
	const isFormData = typeof FormData !== 'undefined' && init?.body instanceof FormData;
	if (!isFormData && !headers.has('Content-Type')) {
		headers.set('Content-Type', 'application/json');
	}
	if (typeof window !== 'undefined') {
		const token = localStorage.getItem('token');
		if (token) headers.set('Authorization', `Bearer ${token}`);
	}
	return { ...init, headers };
}

/** fetch autenticado hacia la API iMedic (path relativo o URL absoluta). */
export async function apiFetch(pathOrUrl: string, init?: RequestInit): Promise<Response> {
	const url = /^https?:\/\//i.test(pathOrUrl) ? pathOrUrl : apiPath(pathOrUrl);
	return fetch(url, withAuthHeaders(init));
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
