import { Bed, BedTipoRecurso } from '../types/beds';
import { getResolvedApiBaseUrl } from './axios';

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

export const bedsService = {
	getAllBeds: async (): Promise<Bed[]> => {
		const res = await fetch(`${getResolvedApiBaseUrl()}/beds`);
		const json = await res.json();

		if (!json.success) throw new Error('Error en la API de camas');

		return json.data.map(
			(item: any): Bed => {
				const tipoRaw =
					item.Tipo ?? item.tipo ?? item.TIPO ?? '';
				return {
				id: `${item.ValorSector}-${item.ValorHabitacionCama}`,
				sector: item.ValorSector,
				numeroCama: item.ValorHabitacionCama,
				estado: parseEstado(item.ValorEstadoCama),
				valorEstadoOriginal: item.ValorEstadoCama,
				estadoDescripcion: item.EstadoDescripcion || '',
				fechaIngreso: item.FechaIngreso,
				fechaEgreso: item.FechaEgreso,
				numeroVisita: item.NumeroVisita,
				mostrarNumeroVisita: item.mostrarNumeroVisita || '',
				observaciones: item.Observaciones,
				NombrePaciente: item.NombrePaciente || '',
				documentoPaciente: item.DocumentoPaciente || '',
				diagnosticoDescripcion: item.DiagnosticoDescripcion || '',
				razonSocialCliente: item.RazonSocialCliente || '',
				SexoPaciente: item.SexoPaciente || '',
				descripcionSexo: item.DescripcionSexo || '',
				servicioMedicoDescripcion: item.ServicioMedicoDescripcion || '',
				fechaIngresoSQL: item.fechaIngresoSQL || '',
				horaIngresoSQL: item.horaIngresoSQL || '',
				tipoRaw: String(tipoRaw),
				tipoRecurso: normalizarTipoRecurso(tipoRaw),
				};
			},
		);
	},

	getBedStates: async (): Promise<{ id: string; valor: string; descripcion: string }[]> => {
		try {
			const res = await fetch(`${getResolvedApiBaseUrl()}/beds/estados`);
			const json = await res.json();

			if (!json.success) throw new Error('Error al obtener estados de cama');

			return json.data.map((item: any) => ({
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
			const res = await fetch(`${getResolvedApiBaseUrl()}/beds/sectores`);
			const json = await res.json();

			if (!json.success) throw new Error('Error al obtener sectores');

			return json.data.map((item: any) => ({
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
			const res = await fetch(`${getResolvedApiBaseUrl()}/beds/total`);
			const json = await res.json();

			if (!json.success) throw new Error('Error al obtener total de camas');

			return {
				totalCamas: json.data.totalCamas || 0,
				camasDisponibles: json.data.camasDisponibles || 0,
				camasOcupadas: json.data.camasOcupadas || 0,
				camasNoDisponibles: json.data.camasNoDisponibles || 0,
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
