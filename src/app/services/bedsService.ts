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
	const numeroVisita = Number(item.NumeroVisita ?? item.numeroVisita ?? 0);
	return {
		id:
			String(item.id || '') ||
			`${item.ValorSector ?? item.sector}-${item.ValorHabitacionCama ?? item.numeroCama}`,
		sector: String(item.ValorSector ?? item.sector ?? ''),
		numeroCama: String(item.ValorHabitacionCama ?? item.numeroCama ?? ''),
		estado: parseEstado(String(item.ValorEstadoCama ?? item.estado ?? '')),
		valorEstadoOriginal: String(item.ValorEstadoCama ?? item.valorEstadoOriginal ?? ''),
		estadoDescripcion: String(item.EstadoDescripcion || item.estadoDescripcion || ''),
		fechaIngreso: (item.FechaIngreso ?? item.fechaIngreso) as Bed['fechaIngreso'],
		fechaEgreso: (item.FechaEgreso ?? item.fechaEgreso) as Bed['fechaEgreso'],
		numeroVisita,
		NumeroVisita: numeroVisita,
		mostrarNumeroVisita: String(item.mostrarNumeroVisita || ''),
		observaciones: String(item.Observaciones || item.observaciones || ''),
		NombrePaciente: String(item.NombrePaciente || ''),
		documentoPaciente: String(item.DocumentoPaciente || item.documentoPaciente || ''),
		diagnosticoDescripcion: String(
			item.DiagnosticoDescripcion || item.diagnosticoDescripcion || '',
		),
		razonSocialCliente: String(item.RazonSocialCliente || item.razonSocialCliente || ''),
		SexoPaciente: String(item.SexoPaciente || ''),
		descripcionSexo: String(item.DescripcionSexo || item.descripcionSexo || ''),
		servicioMedicoDescripcion: String(
			item.ServicioMedicoDescripcion || item.servicioMedicoDescripcion || '',
		),
		fechaIngresoSQL: String(item.fechaIngresoSQL || ''),
		horaIngresoSQL: String(item.horaIngresoSQL || ''),
		fechaEgresoSQL: String(item.fechaEgresoSQL || ''),
		ubicacionPaciente: String(item.ubicacionPaciente || item.UbicacionPaciente || ''),
		tipoRaw: String(tipoRaw),
		tipoRecurso: normalizarTipoRecurso(tipoRaw || item.tipoRecurso),
		egresada: Boolean(item.egresada),
		indicacionesNuevasEnfermeria: Number(
			item.IndicacionesNuevasEnfermeria ?? item.indicacionesNuevasEnfermeria ?? 0,
		),
	};
}

/** Normaliza respuesta cruda de GET /beds o GET /beds/:id al tipo Bed. */
export function normalizeBedFromApi(item: Record<string, unknown> | Bed): Bed {
	if (
		item &&
		typeof item === 'object' &&
		'numeroCama' in item &&
		'sector' in item &&
		'tipoRecurso' in item &&
		(item as Bed).tipoRecurso
	) {
		const b = item as Bed;
		const nv = Number(b.NumeroVisita ?? b.numeroVisita ?? 0);
		const raw = item as Record<string, unknown>;
		return {
			...b,
			numeroVisita: nv,
			NumeroVisita: nv,
			indicacionesNuevasEnfermeria: Number(
				b.indicacionesNuevasEnfermeria ??
					raw.IndicacionesNuevasEnfermeria ??
					0,
			),
		};
	}
	return mapBedItem(item as Record<string, unknown>);
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

