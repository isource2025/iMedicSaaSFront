import { apiFetch } from '@/app/utils/authFetch';

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
	Origen?: 'LEGACY' | 'WEB';
};

export const interconsultasService = {
	async listarPorVisita(idVisita: number): Promise<InterconsultaRow[]> {
		const res = await apiFetch(`/interconsultas/${idVisita}`);
		if (!res.ok) throw new Error('Error al cargar interconsultas');
		const json = await res.json();
		return json.data || [];
	},

	async obtenerPorId(id: number, origen: 'LEGACY' | 'WEB' = 'LEGACY'): Promise<InterconsultaRow | null> {
		const res = await apiFetch(`/interconsultas/detalle/${id}?origen=${origen}`);
		if (!res.ok) return null;
		const json = await res.json();
		return json?.success ? json.data : null;
	},

	async crear(payload: {
		IdVisita: number;
		FechaSolicitud: string;
		HoraSolicitud?: string;
		Especialidad?: string;
		MedicoSolicitante?: number;
		Motivo: string;
	}): Promise<void> {
		const res = await apiFetch('/interconsultas', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
		});
		if (!res.ok) {
			const err = await res.json().catch(() => ({}));
			throw new Error(err.mensaje || 'Error al registrar interconsulta');
		}
	},
};
