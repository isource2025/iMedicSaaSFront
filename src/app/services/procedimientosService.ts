import { apiFetch } from '@/app/utils/authFetch';
import type { FacPracticaVisita } from '@/app/types/procedimientos';

async function parseJson<T>(res: Response): Promise<T | null> {
	try {
		return (await res.json()) as T;
	} catch {
		return null;
	}
}

const procedimientosService = {
	async listarPorVisita(numeroVisita: number): Promise<FacPracticaVisita[]> {
		const res = await apiFetch(`/procedimientos/visita/${numeroVisita}`, {
			method: 'GET',
			headers: { 'Content-Type': 'application/json' },
		});
		const json = await parseJson<{ success?: boolean; data?: FacPracticaVisita[]; mensaje?: string }>(
			res,
		);
		if (!res.ok || !json?.success) {
			throw new Error(json?.mensaje || 'No se pudieron cargar las prácticas');
		}
		return Array.isArray(json.data) ? json.data : [];
	},
};

export default procedimientosService;
