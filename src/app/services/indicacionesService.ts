import {
	Indicacion,
	IndicacionResponse,
	IndicacionesResponse,
	FormularioDatosResponse,
	NuevaIndicacionPayload,
} from '../types/indicaciones';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export const indicacionesService = {
	/**
	 * Obtener la última indicación por visita desde el backend
	 */
	getUltimaIndicacionByVisita: async (numeroVisita: number): Promise<Indicacion | null> => {
		try {
			const res = await fetch(`${BASE_URL}/indicaciones/ultima/${numeroVisita}`, {
				method: 'GET',
				headers: { 'Content-Type': 'application/json' },
			});

			if (!res.ok) {
				if (res.status === 404) return null;
				throw new Error(`HTTP error! status: ${res.status}`);
			}

			const json: IndicacionResponse = await res.json();
			if (!json.success)
				throw new Error(json.mensaje || 'Error al obtener última indicación');
			return json.data ?? null;
		} catch (error) {
			console.error('Error fetching última indicación por visita:', error);
			return null;
		}
	},

	/**
	 * Compat: devolver "todas" las indicaciones por visita.
	 * Mientras no exista un endpoint de "todas", pedimos un tope alto con /ultimas.
	 */
	getIndicacionesByVisita: async (numeroVisita: number): Promise<Indicacion[]> => {
		try {
			const res = await fetch(
				`${BASE_URL}/indicaciones/ultimas/${numeroVisita}?limit=50`,
				{
					method: 'GET',
					headers: { 'Content-Type': 'application/json' },
				},
			);
			if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
			const json: IndicacionesResponse = await res.json();
			if (!json.success)
				throw new Error(json.mensaje || 'Error al obtener indicaciones');
			return Array.isArray(json.data) ? json.data : [];
		} catch (error) {
			console.error('Error fetching indicaciones por visita:', error);
			return [];
		}
	},

	/**
	 * Últimas indicaciones: usa el endpoint /ultimas con ?limit
	 */
	getLastIndicacionesByVisita: async (
		numeroVisita: number,
		limit: number = 5,
	): Promise<Indicacion[]> => {
		// Si limit es 1, aprovechamos el endpoint optimizado de última
		if (limit === 1) {
			const ultima = await indicacionesService.getUltimaIndicacionByVisita(numeroVisita);
			return ultima ? [ultima] : [];
		}
		try {
			const res = await fetch(
				`${BASE_URL}/indicaciones/ultimas/${numeroVisita}?limit=${encodeURIComponent(
					limit,
				)}`,
				{
					method: 'GET',
					headers: { 'Content-Type': 'application/json' },
				},
			);
			if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
			const json: IndicacionesResponse = await res.json();
			if (!json.success)
				throw new Error(json.mensaje || 'Error al obtener últimas indicaciones');
			return Array.isArray(json.data) ? json.data : [];
		} catch (error) {
			console.error('Error fetching últimas indicaciones por visita:', error);
			return [];
		}
	},

	/**
	 * Obtener datos para el formulario de nueva indicación
	 */
	getFormularioDatos: async (): Promise<FormularioDatosResponse | null> => {
		try {
			const res = await fetch(`${BASE_URL}/indicaciones/formulario/datos`, {
				method: 'GET',
				headers: { 'Content-Type': 'application/json' },
			});
			if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
			const json = await res.json();
			if (!json.success)
				throw new Error(json.mensaje || 'Error al obtener datos del formulario');
			return json.data;
		} catch (error) {
			console.error('Error fetching formulario datos:', error);
			return null;
		}
	},

	postNuevaIndicacion: async (payload: NuevaIndicacionPayload) => {
		const resp = await fetch(`${BASE_URL}/indicaciones`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
		});
		const json = await resp.json();
		if (!resp.ok || json?.success === false) {
			const msg = json?.message || 'No se pudo crear la indicación';
			const detail = json?.invalidFields
				? `\nDetalles: ${JSON.stringify(json.invalidFields)}`
				: '';
			throw new Error(msg + detail);
		}
		return json?.data;
	},
};
