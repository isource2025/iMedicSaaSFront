import { apiFetch } from '@/app/utils/authFetch';
import type {
	CrearProtocoloPayload,
	PracticaProtocolo,
	ProfesionalBusqueda,
	ProtocoloClinico,
	TipoProtocolo,
} from '@/app/types/protocolos';

async function parseJson<T>(res: Response): Promise<T | null> {
	try {
		return (await res.json()) as T;
	} catch {
		return null;
	}
}

const protocolosService = {
	async listarPorVisita(numeroVisita: number): Promise<ProtocoloClinico[]> {
		try {
			const res = await apiFetch(`/protocolos/visita/${numeroVisita}`, {
				method: 'GET',
				headers: { 'Content-Type': 'application/json' },
			});
			if (!res.ok) return [];
			const json = await parseJson<{ success?: boolean; data?: ProtocoloClinico[] }>(res);
			if (!json?.success) return [];
			return Array.isArray(json.data) ? json.data : [];
		} catch (e) {
			console.error('Error obteniendo protocolos:', e);
			return [];
		}
	},

	async listarTipos(): Promise<TipoProtocolo[]> {
		const res = await apiFetch('/protocolos/tipos', {
			method: 'GET',
			headers: { 'Content-Type': 'application/json' },
		});
		const json = await parseJson<{ success?: boolean; data?: TipoProtocolo[]; mensaje?: string }>(
			res,
		);
		if (!res.ok || !json?.success) {
			throw new Error(json?.mensaje || 'No se pudieron cargar los tipos de protocolo');
		}
		return Array.isArray(json.data) ? json.data : [];
	},

	async obtenerProForma(tipoProtocolo: string): Promise<{ proForma: string; descripcion: string | null }> {
		const q = new URLSearchParams({ tipo: tipoProtocolo });
		const res = await apiFetch(`/protocolos/proforma?${q}`, {
			method: 'GET',
			headers: { 'Content-Type': 'application/json' },
		});
		const json = await parseJson<{
			success?: boolean;
			data?: { proForma: string; descripcion: string | null };
			mensaje?: string;
		}>(res);
		if (!res.ok || !json?.success) {
			throw new Error(json?.mensaje || 'No se pudo cargar la proforma');
		}
		return json.data || { proForma: '', descripcion: null };
	},

	async buscarPracticas(q: string, limit = 30): Promise<PracticaProtocolo[]> {
		const params = new URLSearchParams({ q, limit: String(limit) });
		const res = await apiFetch(`/protocolos/practicas/buscar?${params}`, {
			method: 'GET',
			headers: { 'Content-Type': 'application/json' },
		});
		const json = await parseJson<{ success?: boolean; data?: PracticaProtocolo[]; mensaje?: string }>(
			res,
		);
		if (!res.ok || !json?.success) {
			throw new Error(json?.mensaje || 'No se pudieron buscar prácticas');
		}
		return Array.isArray(json.data) ? json.data : [];
	},

	async buscarProfesionales(q: string, limit = 25): Promise<ProfesionalBusqueda[]> {
		const params = new URLSearchParams({ q, limit: String(limit) });
		const res = await apiFetch(`/protocolos/profesionales/buscar?${params}`, {
			method: 'GET',
			headers: { 'Content-Type': 'application/json' },
		});
		const json = await parseJson<{
			success?: boolean;
			data?: ProfesionalBusqueda[];
			mensaje?: string;
		}>(res);
		if (!res.ok || !json?.success) {
			throw new Error(json?.mensaje || 'No se pudieron buscar profesionales');
		}
		return Array.isArray(json.data) ? json.data : [];
	},

	async crear(payload: CrearProtocoloPayload): Promise<ProtocoloClinico> {
		const res = await apiFetch('/protocolos', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
		});
		const json = await parseJson<{
			success?: boolean;
			data?: ProtocoloClinico;
			mensaje?: string;
		}>(res);
		if (!res.ok || !json?.success || !json.data) {
			throw new Error(json?.mensaje || 'No se pudo crear el protocolo');
		}
		return json.data;
	},
};

export default protocolosService;
