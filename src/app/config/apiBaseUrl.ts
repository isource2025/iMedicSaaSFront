const DEFAULT_API_BASE = 'http://localhost:5006/api';

/**
 * Normaliza NEXT_PUBLIC_API_URL para producción.
 * Sin protocolo el navegador la trata como ruta relativa al dominio del front (404 en Vercel).
 */
export function normalizeApiBaseUrl(raw?: string): string {
	const trimmed = String(raw ?? '').trim().replace(/\/+$/, '');
	if (!trimmed) return DEFAULT_API_BASE;

	if (/^https?:\/\//i.test(trimmed)) {
		return trimmed;
	}

	// Host sin protocolo (ej. imedicwsback-production.up.railway.app/api)
	if (!trimmed.startsWith('/')) {
		return `https://${trimmed}`;
	}

	if (typeof window !== 'undefined') {
		console.warn(
			'[api] NEXT_PUBLIC_API_URL parece una ruta relativa. Usá URL absoluta con https://',
			trimmed,
		);
	}

	return trimmed;
}

export function getEnvApiBaseUrl(): string {
	return normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_URL);
}
