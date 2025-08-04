import { useState, useEffect } from 'react';
import estadoAmbulatorioService from '../services/estadoAmbulatorioService';
import { EstadoAmbulatorio } from '../types/estadoAmbulatorio';

/**
 * Hook personalizado para manejar los estados ambulatorios
 * @returns Objeto con los estados ambulatorios y funciones relacionadas
 */
export const useEstadoAmbulatorio = () => {
  const [estadosAmbulatorios, setEstadosAmbulatorios] = useState<EstadoAmbulatorio[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Carga los estados ambulatorios desde el servicio
   */
  const cargarEstadosAmbulatorios = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await estadoAmbulatorioService.getEstadosAmbulatorios();
      setEstadosAmbulatorios(data);
    } catch (err: any) {
      console.error('Error al cargar estados ambulatorios:', err);
      setError(err.message || 'Error al cargar los estados ambulatorios');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Obtiene un estado ambulatorio por su valor
   * @param valor Valor del estado ambulatorio
   * @returns El estado ambulatorio o null si no se encuentra
   */
  const obtenerEstadoAmbulatorio = (valor: string): EstadoAmbulatorio | undefined => {
    return estadosAmbulatorios.find(estado => estado.valor === valor);
  };

  // Cargar estados ambulatorios al montar el componente
  useEffect(() => {
    cargarEstadosAmbulatorios();
  }, []);

  return {
    estadosAmbulatorios,
    loading,
    error,
    cargarEstadosAmbulatorios,
    obtenerEstadoAmbulatorio
  };
};
