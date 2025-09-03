import { apiService } from './axios';
import { Patient, PatientFormData, ApiResponse } from '../types/PatientInterface';

// Obtener pacientes con paginación
export const getPatients = async (page: number = 1, limit: number = 30, search: string = ''): Promise<{
	data: Patient[];
	pagination: {
		currentPage: number;
		totalPages: number;
		totalCount: number;
		limit: number;
	};
}> => {
	try {
		const params = new URLSearchParams({
			page: page.toString(),
			limit: limit.toString(),
			withCount: '1'
		});
		
		if (search.trim()) {
			params.append('search', search.trim());
		}
		
		const response = await apiService.get<any>(`/patients?${params.toString()}`);
		return {
			data: response.data.data || [],
			pagination: response.data.pagination || {
				currentPage: 1,
				totalPages: 1,
				totalCount: 0,
				limit: 30
			}
		};
	} catch (error) {
		console.error('Error fetching patients:', error);
		throw error;
	}
};

// Buscar pacientes (ahora integrado en getPatients)
export const searchPatients = async (searchTerm: string): Promise<Patient[]> => {
	try {
		if (!searchTerm.trim()) {
			return [];
		}
		// Usar la búsqueda integrada en el endpoint principal
		const result = await getPatients(1, 100, searchTerm);
		return result.data;
	} catch (error) {
		console.error('Error searching patients:', error);
		throw error;
	}
};

// Obtener un paciente por su ID
export const getPatientById = async (id: number): Promise<Patient> => {
	try {
		const response = await apiService.get<ApiResponse<Patient>>(`/patients/${id}`);
		
		if (response.data.success && response.data.data) {
			const p = response.data.data as any;
			// Debug y normalización de campos para selects
			if (p.IdiomaPrimario && !p.Idioma) p.Idioma = p.IdiomaPrimario;
			if (p.Idioma) p.Idioma = String(p.Idioma).toUpperCase();
			if (p.IdiomaPrimario) p.IdiomaPrimario = String(p.IdiomaPrimario).toUpperCase();
			if (p.NivelDeEstudios && !p.NivelEstudios) p.NivelEstudios = p.NivelDeEstudios;
			
			// Forzar a string IDs numéricos para que los selects encuentren coincidencia
			['ValorLocalidad', 'Raza', 'GrupoEtnico', 'EstadoMilitar', 'OrdenNacimiento'].forEach((k) => {
				if (p[k] !== undefined && p[k] !== null) p[k] = String(p[k]);
			});
			
			// Mapear backend -> frontend nuevos alias
			if (p.TelefonoNegocio && !p.TelefonoCelular) p.TelefonoCelular = p.TelefonoNegocio;
			if (p.NumeroSSN && !p.nAfiliado) p.nAfiliado = p.NumeroSSN;
			if (p.NumeroCuenta && !p.Cobertura) p.Cobertura = p.NumeroCuenta;
			
			return p;
		}
		
		throw new Error(response.data.mensaje || 'Paciente no encontrado');
	} catch (error: any) {
		console.error(`Error fetching patient with id ${id}:`, error);
		if (error.response) {
			throw new Error(error.response.data?.mensaje || 'Error al obtener el paciente');
		}
		throw error;
	}
};

// Crear un nuevo paciente
export const createPatient = async (data: PatientFormData, fotoFile?: File | null): Promise<Patient> => {
	try {
		// Mapear frontend -> backend
		const base = { ...data } as any;
		if (base.Idioma === undefined || base.Idioma === null || base.Idioma === '' || /^undefined$/i.test(String(base.Idioma))) {
			delete base.Idioma;
			delete base.IdiomaPrimario;
		} else {
			base.Idioma = String(base.Idioma).toUpperCase();
			if (!base.IdiomaPrimario) base.IdiomaPrimario = base.Idioma;
		}
		
		if (base.GrupoEtnico === '' || base.GrupoEtnico === null || base.GrupoEtnico === undefined || /^undefined$/i.test(String(base.GrupoEtnico))) {
			delete base.GrupoEtnico;
		}
		
		// Campos laborales
		if (base.NivelEstudios && !base.NivelDeEstudios) base.NivelDeEstudios = base.NivelEstudios;
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
		
		const response = await apiService.post<ApiResponse<Patient>>('/patients', payload, config);
		
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
};

// Actualizar un paciente
export const updatePatient = async (id: number, data: PatientFormData | any): Promise<Patient> => {
	try {
		// Mapear alias frontend -> backend
		const base = { ...data };
		if (base.Idioma === undefined || base.Idioma === null || base.Idioma === '' || /^undefined$/i.test(String(base.Idioma))) {
			delete base.Idioma;
			delete base.IdiomaPrimario;
		} else {
			base.Idioma = String(base.Idioma).toUpperCase();
			if (!base.IdiomaPrimario) base.IdiomaPrimario = base.Idioma;
			else base.IdiomaPrimario = String(base.IdiomaPrimario).toUpperCase();
		}
		
		if (base.GrupoEtnico === '' || base.GrupoEtnico === null || base.GrupoEtnico === undefined || /^undefined$/i.test(String(base.GrupoEtnico))) {
			delete base.GrupoEtnico;
		}
		
		if (base.NivelEstudios && !base.NivelDeEstudios) base.NivelDeEstudios = base.NivelEstudios;
		if (base.TelefonoCelular) base.TelefonoNegocio = base.TelefonoCelular;
		if (base.nAfiliado !== undefined) base.NumeroSSN = base.nAfiliado;
		if (base.Cobertura !== undefined) base.NumeroCuenta = base.Cobertura;
		
		let payload: any = base;
		let config: any = {};
		const fotoFile: File | null = data._fotoFile || null;
		
		if (fotoFile) {
			const formData = new FormData();
			Object.entries(base).forEach(([key, value]) => {
				if (key === '_fotoFile' || key === 'Foto') return;
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
		}
		
		const response = await apiService.put<ApiResponse<Patient>>(`/patients/${id}`, payload, config);
		
		if (response.data.success && response.data.data) {
			return response.data.data;
		}
		
		throw new Error(response.data.mensaje || 'Error al actualizar el paciente');
	} catch (error: any) {
		console.error(`Error updating patient with id ${id}:`, error);
		if (error.response) {
			throw new Error(error.response.data?.mensaje || 'Error al actualizar el paciente');
		}
		throw error;
	}
};

// Eliminar un paciente
export const deletePatient = async (id: number): Promise<void> => {
	try {
		const response = await apiService.delete<ApiResponse<any>>(`/patients/${id}`);
		
		if (!response.data.success) {
			throw new Error(response.data.mensaje || 'Error al eliminar el paciente');
		}
	} catch (error: any) {
		console.error(`Error deleting patient with id ${id}:`, error);
		if (error.response) {
			throw new Error(error.response.data?.mensaje || 'Error al eliminar el paciente');
		}
		throw error;
	}
};

// Servicio principal con todas las funciones
export const patientService = {
	getAllPatients: getPatients,
	searchPatients,
	getPatientById,
	createPatient,
	updatePatient,
	deletePatient
};
