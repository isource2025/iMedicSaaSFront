import axios from 'axios';
import { getEnvApiBaseUrl } from '@/app/config/apiBaseUrl';

const envApiBase = getEnvApiBaseUrl();

/**
 * En el navegador, si la app se abre por IP/LAN (p. ej. http://192.168.x.x:3000) y la env
 * apunta a localhost, reemplaza el host para que el móvil hable con la API en la misma PC.
 */
export function getResolvedApiBaseUrl(): string {
	if (typeof window === 'undefined') return envApiBase;
	const hostname = window.location.hostname;
	if (hostname === 'localhost' || hostname === '127.0.0.1') return envApiBase;
	try {
		const u = new URL(envApiBase);
		if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') {
			u.hostname = hostname;
			return u.href.replace(/\/$/, '');
		}
	} catch {
		/* URL inválida en env */
	}
	return envApiBase;
}

// Create an axios instance with custom configuration
const axiosInstance = axios.create({
	baseURL: envApiBase,
	timeout: 15000,
	headers: {
		'Content-Type': 'application/json',
	},
});

// Log base URL una sola vez para depuración
// (Evita múltiples logs en hot reload si Next.js)
if (typeof window !== 'undefined') {
	if (!(window as any).__API_BASE_LOGGED__) {
		// eslint-disable-next-line no-console
		console.log('[api] BaseURL =>', getResolvedApiBaseUrl());
		(window as any).__API_BASE_LOGGED__ = true;
	}
} else {
	// eslint-disable-next-line no-console
	console.log('[api] BaseURL (SSR) =>', envApiBase);
}

// Request interceptor for API calls
axiosInstance.interceptors.request.use(
	(config: any) => {
		config.baseURL = getResolvedApiBaseUrl();

		const token = localStorage.getItem('token');

		// If token exists, add it to the headers
		if (token && config.headers) {
			config.headers.Authorization = `Bearer ${token}`;
		}

		return config;
	},
	(error: any) => {
		return Promise.reject(error);
	},
);

// Response interceptor
axiosInstance.interceptors.response.use(
	(response: any) => {
		// Any status code that lie within the range of 2xx
		return response;
	},
	(error: any) => {
		// Handle different error scenarios
		const { response } = error;

		if (response) {
			// Handle unauthorized errors
			if (response.status === 401) {
				// Clear local storage and redirect to login
				localStorage.removeItem('token');
				localStorage.removeItem('user');

				// Only redirect if not already on login page
				if (window.location.pathname !== '/') {
					window.location.href = '/';
				}
			}

			// Handle forbidden errors
			if (response.status === 403) {
				console.error('Permission denied.');
			}

			// Handle server errors
			if (response.status >= 500) {
				console.error('Server error. Please try again later.');
			}
		} else {
			// Handle network errors
			console.error('Network error. Please check your connection.');
		}

		return Promise.reject(error);
	},
);

// Helper functions for common API calls
export const apiService = {
	get: <T>(url: string, config?: any) => axiosInstance.get<T>(url, config),

	post: <T>(url: string, data?: any, config?: any) =>
		axiosInstance.post<T>(url, data, config),

	put: <T>(url: string, data?: any, config?: any) => axiosInstance.put<T>(url, data, config),

	delete: <T>(url: string, config?: any) => axiosInstance.delete<T>(url, config),

	patch: <T>(url: string, data?: any, config?: any) =>
		axiosInstance.patch<T>(url, data, config),
};

export default axiosInstance;
