import { Bed, BedTipoRecurso } from '../types/beds';
import { apiService } from './axios';

interface ApiResp<T> {
	success: boolean;
	data: T;
	mensaje?: string;
}

/** Normaliza imHabitacionCamas.Tipo (texto plano en BD) */
export function normalizarTipoRecurso(raw: unknown): BedTipoRecurso {
	const t = String(raw ?? '')
		.trim()
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '');
	if (!t || t === 'cama') return 'cama';
	if (t === 'consultorio') return 'consultorio';
	if (t === 'insumo' || t === 'insumos') return 'insumos';
	return 'cama';
}

function mapBedItem(item: Record<string, unknown>): Bed {
	const tipoRaw = item.Tipo ?? item.tipo ?? item.TIPO ?? '';
	return {
		id: `${item.ValorSector}-${item.ValorHabitacionCama}`,
		sector: String(item.ValorSector ?? ''),
		numeroCama: String(item.ValorHabitacionCama ?? ''),
		estado: parseEstado(String(item.ValorEstadoCama ?? '')),
		valorEstadoOriginal: String(item.ValorEstadoCama ?? ''),
		estadoDescripcion: String(item.EstadoDescripcion || ''),
		fechaIngreso: item.FechaIngreso as Bed['fechaIngreso'],
		fechaEgreso: item.FechaEgreso as Bed['fechaEgreso'],
		numeroVisita: item.NumeroVisita as Bed['numeroVisita'],
		mostrarNumeroVisita: String(item.mostrarNumeroVisita || ''),
		observaciones: String(item.Observaciones || ''),
		NombrePaciente: String(item.NombrePaciente || ''),
		documentoPaciente: String(item.DocumentoPaciente || ''),
		diagnosticoDescripcion: String(item.DiagnosticoDescripcion || ''),
		razonSocialCliente: String(item.RazonSocialCliente || ''),
		SexoPaciente: String(item.SexoPaciente || ''),
		descripcionSexo: String(item.DescripcionSexo || ''),
		servicioMedicoDescripcion: String(item.ServicioMedicoDescripcion || ''),
		fechaIngresoSQL: String(item.fechaIngresoSQL || ''),
		horaIngresoSQL: String(item.horaIngresoSQL || ''),
		tipoRaw: String(tipoRaw),
		tipoRecurso: normalizarTipoRecurso(tipoRaw),
	};
}

export const bedsService = {
	getAllBeds: async (): Promise<Bed[]> => {
		const { data: json } = await apiService.get<ApiResp<Record<string, unknown>[]>>(
			'/beds',
		);

		if (!json.success) throw new Error(json.mensaje || 'Error en la API de camas');

		return (json.data || []).map(mapBedItem);
	},

	getBedStates: async (): Promise<{ id: string; valor: string; descripcion: string }[]> => {
		try {
			const { data: json } = await apiService.get<
				ApiResp<{ valor: string; descripcion: string }[]>
			>('/beds/estados');

			if (!json.success) throw new Error(json.mensaje || 'Error al obtener estados de cama');

			return (json.data || []).map((item) => ({
				id: item.valor,
				valor: item.valor,
				descripcion: item.descripcion,
			}));
		} catch (error) {
			console.error('Error fetching bed states:', error);
			return [];
		}
	},

	getSectores: async (): Promise<{ id: string; valor: string; descripcion: string }[]> => {
		try {
			const { data: json } = await apiService.get<
				ApiResp<{ valor: string; descripcion: string }[]>
			>('/beds/sectores');

			if (!json.success) throw new Error(json.mensaje || 'Error al obtener sectores');

			return (json.data || []).map((item) => ({
				id: item.valor,
				valor: item.valor,
				descripcion: item.descripcion,
			}));
		} catch (error) {
			console.error('Error fetching sectores:', error);
			return [];
		}
	},

	getTotalBeds: async (): Promise<{
		totalCamas: number;
		camasDisponibles: number;
		camasOcupadas: number;
		camasNoDisponibles: number;
	}> => {
		try {
			const { data: json } = await apiService.get<
				ApiResp<{
					totalCamas?: number;
					camasDisponibles?: number;
					camasOcupadas?: number;
					camasNoDisponibles?: number;
				}>
			>('/beds/total');

			if (!json.success) throw new Error(json.mensaje || 'Error al obtener total de camas');

			return {
				totalCamas: json.data?.totalCamas || 0,
				camasDisponibles: json.data?.camasDisponibles || 0,
				camasOcupadas: json.data?.camasOcupadas || 0,
				camasNoDisponibles: json.data?.camasNoDisponibles || 0,
			};
		} catch (error) {
			console.error('Error fetching total beds:', error);
			return {
				totalCamas: 0,
				camasDisponibles: 0,
				camasOcupadas: 0,
				camasNoDisponibles: 0,
			};
		}
	},
};

const parseEstado = (
	valor: string,
):
	| 'acompañante'
	| 'aislada'
	| 'cerrada'
	| 'desocupada'
	| 'ocupada'
	| 'Que haceres domésticos'
	| 'reparacion'
	| 'disponible' => {
	switch (valor) {
		case 'A':
			return 'acompañante';
		case 'I':
			return 'aislada';
		case 'C':
			return 'cerrada';
		case 'U':
			return 'desocupada';
		case 'O':
			return 'ocupada';
		case 'H':
			return 'Que haceres domésticos';
		case 'R':
			return 'reparacion';
		default:
			return 'disponible';
	}
};
