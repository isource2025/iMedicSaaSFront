import { apiFetch } from '@/app/utils/authFetch';

export type InterconsultaRow = {
	IdInterconsulta: number;
	IdVisita: number;
	FechaSolicitud: string;
	HoraSolicitud?: string;
	Especialidad?: string;
	MedicoSolicitante?: number;
	MedicoSolicitanteNombre?: string;
	Motivo: string;
	Estado: string;
	Respuesta?: string;
	FechaRespuesta?: string;
};

export const interconsultasService = {
	async listarPorVisita(idVisita: number): Promise<InterconsultaRow[]> {
		const res = await apiFetch(`/interconsultas/${idVisita}`);
		if (!res.ok) throw new Error('Error al cargar interconsultas');
		const json = await res.json();
		return json.data || [];
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
