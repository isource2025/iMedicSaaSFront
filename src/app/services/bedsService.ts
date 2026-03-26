import { Bed } from '../types/beds';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export const bedsService = {
	getAllBeds: async (): Promise<Bed[]> => {
		const res = await fetch(`${BASE_URL}/beds`);
		const json = await res.json();

		if (!json.success) throw new Error('Error en la API de camas');

		return json.data.map(
			(item: any): Bed => ({
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
			}),
		);
	},

	getBedStates: async (): Promise<{ id: string; valor: string; descripcion: string }[]> => {
		try {
			const res = await fetch(`${BASE_URL}/beds/estados`);
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
			const res = await fetch(`${BASE_URL}/beds/sectores`);
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
			const res = await fetch(`${BASE_URL}/beds/total`);
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
