import { apiFetch } from '@/app/utils/authFetch';

export type SectorDestinoInterconsulta = {
	valor: string;
	descripcion: string;
	prefijos?: string[];
};

export type InterconsultaRow = {
	IdInterconsulta: number;
	IdPedido?: number;
	IdVisita: number;
	FechaSolicitud: string;
	HoraSolicitud?: string;
	IdTipoPedido?: number;
	TipoPedidoDescripcion?: string;
	CodigoPractica?: number;
	PracticaSolicitada?: string;
	NomencladorDescripcion?: string;
	Especialidad?: string;
	MedicoSolicitante?: number;
	MedicoSolicitanteNombre?: string;
	Motivo: string;
	Estado: string;
	EstadoUrgencia?: string;
	Respuesta?: string;
	FechaRespuesta?: string;
	IdProtocolo?: number;
	SectorSolicitante?: string;
	SectorSolicitanteNombre?: string;
	SectorReceptor?: string;
	SectorReceptorNombre?: string;
	ServicioCodigo?: string;
	ServicioDescripcion?: string;
	Tomado?: boolean;
	MatriculaToma?: number | null;
	NombreToma?: string | null;
	Cumplido?: boolean;
	EstadoWorkflow?: string;
	Origen?: 'LEGACY' | 'WEB';
};

async function parseJson<T>(res: Response): Promise<T | null> {
	try {
		return (await res.json()) as T;
	} catch {
		return null;
	}
}

export const interconsultasService = {
	async listarPorVisita(idVisita: number): Promise<InterconsultaRow[]> {
		const res = await apiFetch(`/interconsultas/${idVisita}`);
		if (!res.ok) throw new Error('Error al cargar interconsultas');
		const json = await parseJson<{ success?: boolean; data?: InterconsultaRow[] }>(res);
		return Array.isArray(json?.data) ? json.data : [];
	},

	async listarSectoresDestino(): Promise<SectorDestinoInterconsulta[]> {
		const res = await apiFetch('/interconsultas/sectores-destino');
		const json = await parseJson<{
			success?: boolean;
			data?: SectorDestinoInterconsulta[];
			mensaje?: string;
		}>(res);
		if (!res.ok || !json?.success) {
			throw new Error(json?.mensaje || 'No se pudieron cargar los servicios destino');
		}
		return Array.isArray(json.data) ? json.data : [];
	},

	async listarPendientes(sector: string, limit = 100): Promise<InterconsultaRow[]> {
		const q = new URLSearchParams({
			sector: sector.trim(),
			limit: String(limit),
		});
		const res = await apiFetch(`/interconsultas/pendientes?${q}`);
		const json = await parseJson<{
			success?: boolean;
			data?: InterconsultaRow[];
			mensaje?: string;
		}>(res);
		if (!res.ok || !json?.success) {
			throw new Error(json?.mensaje || 'No se pudieron cargar los pendientes');
		}
		return Array.isArray(json.data) ? json.data : [];
	},

	async obtenerPorId(id: number, origen: 'LEGACY' | 'WEB' = 'LEGACY'): Promise<InterconsultaRow | null> {
		const res = await apiFetch(`/interconsultas/detalle/${id}?origen=${origen}`);
		if (!res.ok) return null;
		const json = await parseJson<{ success?: boolean; data?: InterconsultaRow }>(res);
		return json?.success ? json.data || null : null;
	},

	async crear(payload: {
		idVisita: number;
		idSectorReceptor: string;
		sectorSolicitante?: string;
		motivo: string;
		estadoUrgencia?: string;
	}): Promise<InterconsultaRow> {
		const res = await apiFetch('/interconsultas', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
		});
		const json = await parseJson<{
			success?: boolean;
			data?: InterconsultaRow;
			mensaje?: string;
		}>(res);
		if (!res.ok || !json?.success) {
			throw new Error(json?.mensaje || 'Error al registrar interconsulta');
		}
		return json.data as InterconsultaRow;
	},

	async tomar(idPedido: number): Promise<InterconsultaRow> {
		const res = await apiFetch(`/interconsultas/${idPedido}/tomar`, { method: 'POST' });
		const json = await parseJson<{
			success?: boolean;
			data?: InterconsultaRow;
			mensaje?: string;
		}>(res);
		if (!res.ok || !json?.success) {
			throw new Error(json?.mensaje || 'No se pudo tomar la interconsulta');
		}
		return json.data as InterconsultaRow;
	},

	async liberar(idPedido: number): Promise<InterconsultaRow> {
		const res = await apiFetch(`/interconsultas/${idPedido}/liberar`, { method: 'POST' });
		const json = await parseJson<{
			success?: boolean;
			data?: InterconsultaRow;
			mensaje?: string;
		}>(res);
		if (!res.ok || !json?.success) {
			throw new Error(json?.mensaje || 'No se pudo liberar la interconsulta');
		}
		return json.data as InterconsultaRow;
	},

	async cumplir(idPedido: number, textoRespuesta: string): Promise<InterconsultaRow> {
		const res = await apiFetch(`/interconsultas/${idPedido}/cumplir`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ textoRespuesta }),
		});
		const json = await parseJson<{
			success?: boolean;
			data?: InterconsultaRow;
			mensaje?: string;
		}>(res);
		if (!res.ok || !json?.success) {
			throw new Error(json?.mensaje || 'No se pudo cumplir la interconsulta');
		}
		return json.data as InterconsultaRow;
	},
};
