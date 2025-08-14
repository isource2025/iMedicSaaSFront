import { apiService } from './axios';
import { Patient, PatientFormData, ApiResponse } from '../types/PatientInterface';

/**
 * Servicio para gestionar los pacientes
 */
export const patientService = {
	/**
	 * Obtiene todos los pacientes
	 * @returns Promise con la lista de pacientes
	 */
	getAllPatients: async (): Promise<Patient[]> => {
		try {
			const res = await fetch('http://localhost:5006/api/patients');
			if (!res.ok) throw new Error('Error al obtener pacientes');
			const { data } = await res.json();
			return data;
		} catch (error: any) {
			console.error('Error fetching patients:', error);
			if (error.response) {
				throw new Error(error.response.data?.mensaje || 'Error al obtener pacientes');
			}
			throw error;
		}
	},

	/**
	 * Busca pacientes por nombre o documento
	 * @param searchTerm Término de búsqueda
	 * @returns Promise con la lista de pacientes filtrados
	 */
	searchPatients: async (searchTerm: string): Promise<Patient[]> => {
		try {
			const { data } = await apiService.get<ApiResponse<Patient[]>>(`/patients/search`, {
				params: { searchTerm },
			});

			if (data.success && data.data) {
				return data.data;
			}

			throw new Error(data.mensaje || 'Error al buscar pacientes');
		} catch (error: any) {
			console.error('Error searching patients:', error);

			const mensaje = error?.response?.data?.mensaje || 'Error al buscar pacientes';
			throw new Error(mensaje);
		}
	},

	/**
	 * Obtiene un paciente por su ID
	 * @param id ID del paciente
	 * @returns Promise con el paciente
	 */
	getPatientById: async (id: number): Promise<Patient> => {
		try {
			const response = await apiService.get<ApiResponse<Patient>>(`/patients/${id}`);

			if (response.data.success && response.data.data) {
				const p = response.data.data as any;
				// Debug y normalización de campos para selects
				if (p.IdiomaPrimario && !p.Idioma) p.Idioma = p.IdiomaPrimario;
				// Forzar a string IDs numéricos para que los selects (que usan comparación estricta) encuentren coincidencia
				[
					'ValorLocalidad',
					'Raza',
					'GrupoEtnico',
					'EstadoMilitar',
					'OrdenNacimiento',
				].forEach((k) => {
					if (p[k] !== undefined && p[k] !== null) p[k] = String(p[k]);
				});
				// Consistencia para IdiomaPrimario también
				if (p.IdiomaPrimario != null) p.IdiomaPrimario = String(p.IdiomaPrimario);
				// Mapear backend -> frontend nuevos alias
				if (p.TelefonoNegocio && !p.TelefonoCelular)
					p.TelefonoCelular = p.TelefonoNegocio;
				if (p.NumeroSSN && !p.nAfiliado) p.nAfiliado = p.NumeroSSN;
				if (p.NumeroCuenta && !p.Cobertura) p.Cobertura = p.NumeroCuenta; // placeholder: ajustar si hay catálogo real
				console.log('[patientService.getPatientById][debug] recibido:', p);
				return p;
			}

			throw new Error(response.data.mensaje || 'Paciente no encontrado');
		} catch (error: any) {
			console.error(`Error fetching patient with id ${id}:`, error);
			if (error.response) {
				throw new Error(
					error.response.data?.mensaje || 'Error al obtener el paciente',
				);
			}
			throw error;
		}
	},

	/**
	 * Crea un nuevo paciente
	 * @param data Datos del paciente
	 * @returns Promise con el paciente creado
	 */
	createPatient: async (data: PatientFormData, fotoFile?: File | null): Promise<Patient> => {
		try {
			// Mapear frontend -> backend (siempre sobrescribir para reflejar cambios)
			const base = { ...data } as any;
			if (base.TelefonoCelular) base.TelefonoNegocio = base.TelefonoCelular;
			if (base.nAfiliado !== undefined) base.NumeroSSN = base.nAfiliado;
			if (base.Cobertura !== undefined) base.NumeroCuenta = base.Cobertura;

			let payload: any = base;
			let config: any = {};
			if (fotoFile) {
				const formData = new FormData();
				Object.entries(base).forEach(([key, value]) => {
					if (value === undefined || value === null || key === 'Foto') return;
					if (key === 'Trabajos' && Array.isArray(value)) {
						formData.append(key, JSON.stringify(value));
					} else {
						formData.append(key, String(value));
					}
				});
				formData.append('Foto', fotoFile);
				payload = formData;
				config.headers = { 'Content-Type': 'multipart/form-data' };
			}
			const response = await apiService.post<ApiResponse<Patient>>(
				'/patients',
				payload,
				config,
			);
			if (process.env.NODE_ENV !== 'production') {
				console.log('[createPatient] Response', response.status, response.data);
			}

			if (response.data.success && response.data.data) {
				return response.data.data;
			}

			throw new Error(response.data.mensaje || 'Error al crear el paciente');
		} catch (error: any) {
			console.error('Error creating patient:', error);
			if (error.response) {
				throw new Error(error.response.data?.mensaje || 'Error al crear el paciente');
			}
			throw error;
		}
	},

	/**
	 * Actualiza un paciente
	 * @param id ID del paciente
	 * @param data Datos actualizados del paciente
	 * @returns Promise con el paciente actualizado
	 */
	updatePatient: async (id: number, data: PatientFormData | any): Promise<Patient> => {
		try {
			// Mapear alias frontend -> backend (siempre sobrescribir)
			const base = { ...data };
			if (base.TelefonoCelular) base.TelefonoNegocio = base.TelefonoCelular;
			if (base.nAfiliado !== undefined) base.NumeroSSN = base.nAfiliado;
			if (base.Cobertura !== undefined) base.NumeroCuenta = base.Cobertura;
			if (process.env.NODE_ENV !== 'production') {
				console.log('[patientService.updatePatient] mapping aliases', {
					TelefonoCelular: base.TelefonoCelular,
					TelefonoNegocio: base.TelefonoNegocio,
					nAfiliado: base.nAfiliado,
					NumeroSSN: base.NumeroSSN,
					Cobertura: base.Cobertura,
					NumeroCuenta: base.NumeroCuenta,
				});
			}
			let payload: any = base;
			let config: any = {};
			const fotoFile: File | null = data._fotoFile || null;
			if (fotoFile) {
				const formData = new FormData();
				Object.entries(base).forEach(([key, value]) => {
					if (key === '_fotoFile' || key === 'Foto') return; // campo interno / evitar duplicado
					if (value === undefined || value === null) return;
					if (key === 'Trabajos' && Array.isArray(value)) {
						formData.append(key, JSON.stringify(value));
					} else {
						formData.append(key, String(value));
					}
				});
				formData.append('Foto', fotoFile);
				payload = formData;
				config.headers = { 'Content-Type': 'multipart/form-data' };
				if (process.env.NODE_ENV !== 'production') {
					console.log('[updatePatient] Enviando multipart con foto', fotoFile.name);
				}
			}
			const response = await apiService.put<ApiResponse<Patient>>(
				`/patients/${id}`,
				payload,
				config,
			);
			if (process.env.NODE_ENV !== 'production') {
				console.log('[updatePatient] Response', response.status, response.data);
			}
			if (response.data.success && response.data.data) {
				return response.data.data;
			}
			throw new Error(response.data.mensaje || 'Error al actualizar el paciente');
		} catch (error: any) {
			console.error(`Error updating patient with id ${id}:`, error);
			if (error.response) {
				throw new Error(
					error.response.data?.mensaje || 'Error al actualizar el paciente',
				);
			}
			throw error;
		}
	},

	/**
	 * Elimina un paciente
	 * @param id ID del paciente
	 * @returns Promise con el resultado de la eliminación
	 */
	deletePatient: async (id: number): Promise<boolean> => {
		try {
			const response = await apiService.delete<ApiResponse<null>>(`/patients/${id}`);

			if (response.data.success) {
				return true;
			}

			throw new Error(response.data.mensaje || 'Error al eliminar el paciente');
		} catch (error: any) {
			console.error(`Error deleting patient with id ${id}:`, error);
			if (error.response) {
				throw new Error(
					error.response.data?.mensaje || 'Error al eliminar el paciente',
				);
			}
			throw error;
		}
	},
};
