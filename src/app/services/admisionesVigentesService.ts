import { apiService } from './axios';

export interface AdmisionVigente {
	numeroVisita: number;
	idPaciente: number | null;
	paciente: string;
	documento: string | null;
	numeroHC: string | null;
	edad: number | null;
	sexo: string | null;
	/** yyyy-mm-dd */
	fechaIngreso: string | null;
	horaIngreso: string | null;
	diasInternacion: number | null;
	diagnostico: string | null;
	cobertura: string | null;
	medico: string | null;
	sector: string | null;
	sectorDescripcion: string | null;
	cama: string | null;
}

export const admisionesVigentesService = {
	async listar(): Promise<AdmisionVigente[]> {
		const { data } = await apiService.get<{ success: boolean; data: AdmisionVigente[] }>(
			'/admisiones-vigentes',
		);
		return data.data ?? [];
	},
};

export default admisionesVigentesService;
