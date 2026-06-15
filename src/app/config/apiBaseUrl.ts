const DEFAULT_API_BASE = 'http://localhost:5006/api';

/**
 * Asegura sufijo /api en URLs de backend (Railway, Render, local sin path).
 */
function ensureApiPathSuffix(url: string): string {
	try {
		const u = new URL(url);
		const path = u.pathname.replace(/\/+$/, '');
		if (!path || path === '/') {
			u.pathname = '/api';
		} else if (!path.endsWith('/api')) {
			u.pathname = `${path}/api`;
		}
		return u.href.replace(/\/$/, '');
	} catch {
		return url.endsWith('/api') ? url : `${url.replace(/\/+$/, '')}/api`;
	}
}

/**
 * Normaliza NEXT_PUBLIC_API_URL para producción.
 * Sin protocolo el navegador la trata como ruta relativa al dominio del front (404 en Vercel).
 */
export function normalizeApiBaseUrl(raw?: string): string {
	const trimmed = String(raw ?? '').trim().replace(/\/+$/, '');
	if (!trimmed) return DEFAULT_API_BASE;

	let resolved = trimmed;

	if (/^https?:\/\//i.test(resolved)) {
		resolved = ensureApiPathSuffix(resolved);
		return resolved;
	}

	// Host sin protocolo (ej. imedicsaasback-production.up.railway.app)
	if (!resolved.startsWith('/')) {
		return ensureApiPathSuffix(`https://${resolved}`);
	}

	if (typeof window !== 'undefined') {
		console.warn(
			'[api] NEXT_PUBLIC_API_URL parece una ruta relativa. Usá URL absoluta con https://',
			resolved,
		);
	}

	return resolved;
}

export function getEnvApiBaseUrl(): string {
	return normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_URL);
}
