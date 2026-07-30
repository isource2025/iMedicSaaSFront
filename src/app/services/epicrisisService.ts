import { apiFetch } from '@/app/utils/authFetch';
import {
	Epicrisis,
	EpicrisisIaDraft,
	EpicrisisIaResponse,
	EpicrisisListResponse,
	EpicrisisResponse,
	NuevaEpicrisisPayload,
} from '../types/epicrisis';

function normalizeRow(raw: any): Epicrisis {
	return {
		idHCEpicrisis: raw.IdHCEpicrisis ?? raw.idHCEpicrisis,
		idVisita: raw.IdVisita ?? raw.idVisita,
		nroHC: raw.NroHC ?? raw.nroHC,
		fecha: raw.Fecha ?? raw.fecha,
		hora: raw.Hora ?? raw.hora,
		idSector: raw.IdSector ?? raw.idSector,
		sectorDescripcion: raw.SectorDescripcion ?? raw.sectorDescripcion,
		profesional: raw.Profecional ?? raw.profesional,
		profesionalNombreCompleto:
			raw.ProfesionalNombreCompleto ?? raw.profesionalNombreCompleto,
		epicrisis: raw.Epicrisis ?? raw.epicrisis ?? '',
		numeroDocumento: raw.NumeroDocumento ?? raw.numeroDocumento,
		diagnostico: raw.Diagnostico ?? raw.diagnostico ?? '',
		diagnosticoText: raw.DiagnosticoText ?? raw.diagnosticoText ?? '',
	};
}

export const epicrisisService = {
	listarPorVisita: async (idVisita: number): Promise<Epicrisis[]> => {
		const res = await apiFetch(`/epicrisis/${idVisita}`, {
			method: 'GET',
			headers: { 'Content-Type': 'application/json' },
		});
		if (!res.ok) {
			if (res.status === 404) return [];
			throw new Error(`HTTP error! status: ${res.status}`);
		}
		const json: EpicrisisListResponse = await res.json();
		if (!json.success) throw new Error(json.mensaje || 'Error al listar epicrisis');
		return (json.data ?? []).map(normalizeRow);
	},

	obtenerPorId: async (id: number): Promise<Epicrisis | null> => {
		const res = await apiFetch(`/epicrisis/item/${id}`, {
			method: 'GET',
			headers: { 'Content-Type': 'application/json' },
		});
		if (!res.ok) {
			if (res.status === 404) return null;
			throw new Error(`HTTP error! status: ${res.status}`);
		}
		const json: EpicrisisResponse = await res.json();
		if (!json.success) throw new Error(json.mensaje || 'Error al obtener epicrisis');
		return json.data ? normalizeRow(json.data) : null;
	},

	crear: async (data: NuevaEpicrisisPayload): Promise<Epicrisis> => {
		const res = await apiFetch('/epicrisis', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data),
		});
		if (!res.ok) {
			const errorData = await res.json().catch(() => ({}));
			throw new Error(errorData.mensaje || `HTTP error! status: ${res.status}`);
		}
		const json: EpicrisisResponse = await res.json();
		if (!json.success) throw new Error(json.mensaje || 'Error al crear epicrisis');
		return normalizeRow(json.data as any);
	},

	actualizar: async (id: number, data: Partial<NuevaEpicrisisPayload>): Promise<boolean> => {
		const res = await apiFetch(`/epicrisis/${id}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data),
		});
		if (!res.ok) {
			const errorData = await res.json().catch(() => ({}));
			throw new Error(errorData.mensaje || `HTTP error! status: ${res.status}`);
		}
		const json = await res.json();
		return json.success ?? false;
	},

	eliminar: async (id: number): Promise<boolean> => {
		const res = await apiFetch(`/epicrisis/${id}`, {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
		});
		if (!res.ok) {
			const errorData = await res.json().catch(() => ({}));
			throw new Error(errorData.mensaje || `HTTP error! status: ${res.status}`);
		}
		const json = await res.json();
		return json.success ?? false;
	},

	generarConIA: async (idVisita: number): Promise<EpicrisisIaDraft> => {
		const res = await apiFetch(`/epicrisis/${idVisita}/generar-ia`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ IdVisita: idVisita }),
		});
		if (!res.ok) {
			const errorData = await res.json().catch(() => ({}));
			throw new Error(errorData.mensaje || `HTTP error! status: ${res.status}`);
		}
		const json: EpicrisisIaResponse = await res.json();
		if (!json.success) throw new Error(json.mensaje || 'Error al generar con IA');
		return json.data;
	},
};
