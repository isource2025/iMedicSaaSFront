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
      const response = await apiService.get<ApiResponse<Patient[]>>('/patients');
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error(response.data.mensaje || 'Error al obtener pacientes');
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
      const { data } = await apiService.get<ApiResponse<Patient[]>>(
        `/patients/search`,
        { params: { searchTerm } }
      );

      if (data.success && data.data) {
        return data.data;
      }

      throw new Error(data.mensaje || 'Error al buscar pacientes');
    } catch (error: any) {
      console.error('Error searching patients:', error);

      const mensaje =
        error?.response?.data?.mensaje || 'Error al buscar pacientes';
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
        return response.data.data;
      }
      
      throw new Error(response.data.mensaje || 'Paciente no encontrado');
    } catch (error: any) {
      console.error(`Error fetching patient with id ${id}:`, error);
      if (error.response) {
        throw new Error(error.response.data?.mensaje || 'Error al obtener el paciente');
      }
      throw error;
    }
  },
  
  /**
   * Crea un nuevo paciente
   * @param data Datos del paciente
   * @returns Promise con el paciente creado
   */
  createPatient: async (data: PatientFormData): Promise<Patient> => {
    try {
      const response = await apiService.post<ApiResponse<Patient>>('/patients', data);
      
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
  updatePatient: async (id: number, data: PatientFormData): Promise<Patient> => {
    try {
      const response = await apiService.put<ApiResponse<Patient>>(`/patients/${id}`, data);
      console.log(data);
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
        throw new Error(error.response.data?.mensaje || 'Error al eliminar el paciente');
      }
      throw error;
    }
  }
};
