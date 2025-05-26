'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { OpcGrd, OpcGrdGroup } from '../types/opcGrd.types';
import { opcGrdService } from '../services/opcGrdService';

interface UseOpcGrdManagerProps {
  initialSearch?: string;
}

interface UseOpcGrdManagerReturn {
  opciones: OpcGrd[];
  opcionesAgrupadas: OpcGrdGroup[];
  filteredOpciones: OpcGrd[];
  filteredOpcionesAgrupadas: OpcGrdGroup[];
  loading: boolean;
  error: string | null;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  fetchOpciones: () => Promise<void>;
  getOpcionesByRubro: (rubro: string) => OpcGrd[];
  createOpcGrd: (opcGrd: { descripcion: string, rubro: string, icono?: string, orden?: number }) => Promise<OpcGrd | null>;
  updateOpcGrd: (rubro: string, descripcion: string, nuevaDescripcion: string) => Promise<OpcGrd | null>;
  deleteOpcGrd: (rubro: string, descripcion: string) => Promise<boolean>;
}

/**
 * Hook personalizado para gestionar las operaciones de opciones de grilla
 * @param initialSearch Término de búsqueda inicial (opcional)
 * @returns Funciones y estados para gestionar opciones de grilla
 */
export function useOpcGrdManager({ initialSearch = '' }: UseOpcGrdManagerProps = {}): UseOpcGrdManagerReturn {
  const [opciones, setOpciones] = useState<OpcGrd[]>([]);
  const [opcionesAgrupadas, setOpcionesAgrupadas] = useState<OpcGrdGroup[]>([]);
  const [filteredOpciones, setFilteredOpciones] = useState<OpcGrd[]>([]);
  const [filteredOpcionesAgrupadas, setFilteredOpcionesAgrupadas] = useState<OpcGrdGroup[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>(initialSearch);
  
  // Registro de iconos que han fallado para evitar solicitudes repetidas
  const failedIconsRef = useRef<Set<string>>(new Set());

  // Función para cargar todas las opciones de grilla
  const fetchOpciones = useCallback(async () => {
    try {
      setLoading(true);
      const data = await opcGrdService.getAllOpcGrd();
      const groupedData = await opcGrdService.getGroupedOpcGrd();
      
      setOpciones(data);
      setOpcionesAgrupadas(groupedData);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Error al cargar las opciones de grilla');
      console.error('Error fetching opciones:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Filtrar opciones cuando cambia el término de búsqueda o las opciones
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredOpciones(opciones);
      setFilteredOpcionesAgrupadas(opcionesAgrupadas);
    } else {
      const filtered = opciones.filter(opcion => 
        opcion.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        opcion.rubro.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredOpciones(filtered);
      
      // Filtrar también las opciones agrupadas
      const filteredGroups: OpcGrdGroup[] = [];
      
      opcionesAgrupadas.forEach(group => {
        const filteredOpciones = group.opciones.filter(opcion => 
          opcion.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        if (filteredOpciones.length > 0 || 
            group.rubro.toLowerCase().includes(searchTerm.toLowerCase())) {
          filteredGroups.push({
            rubro: group.rubro,
            opciones: filteredOpciones
          });
        }
      });
      
      setFilteredOpcionesAgrupadas(filteredGroups);
    }
  }, []);

  // Cargar opciones al montar el componente
  useEffect(() => {
    fetchOpciones();
  }, [fetchOpciones]);

  // Función para obtener opciones por rubro
  const getOpcionesByRubro = (rubro: string): OpcGrd[] => {
    return opciones.filter(opcion => opcion.rubro.trim() === rubro.trim())
                   .sort((a, b) => a.orden - b.orden);
  };
  
  

  // Función para crear una nueva opción de grilla
  const createOpcGrd = async (opcGrd: { descripcion: string, rubro: string, icono?: string, orden?: number }): Promise<OpcGrd | null> => {
    try {
      const result = await opcGrdService.createOpcGrd(opcGrd);
      if (result) {
        await fetchOpciones(); // Recargar la lista después de crear
      }
      return result;
    } catch (err: any) {
      console.error('Error creating opcGrd:', err);
      setError(err.message || 'Error al crear la opción de grilla');
      return null;
    }
  };

  // Función para actualizar una opción de grilla existente
  const updateOpcGrd = async (rubro: string, descripcion: string, nuevaDescripcion: string): Promise<OpcGrd | null> => {
    try {
      const result = await opcGrdService.updateOpcGrd(rubro, descripcion, { descripcion: nuevaDescripcion });
      if (result) {
        await fetchOpciones(); // Recargar la lista después de actualizar
      }
      return result;
    } catch (err: any) {
      console.error(`Error updating opcGrd:`, err);
      setError(err.message || 'Error al actualizar la opción de grilla');
      return null;
    }
  };

  // Función para eliminar (borrado lógico) una opción de grilla
  const deleteOpcGrd = async (rubro: string, descripcion: string): Promise<boolean> => {
    try {
      const result = await opcGrdService.deleteOpcGrd(rubro, descripcion);
      if (result) {
        await fetchOpciones(); // Recargar la lista después de eliminar
      }
      return result;
    } catch (err: any) {
      console.error(`Error deleting opcGrd:`, err);
      setError(err.message || 'Error al eliminar la opción de grilla');
      return false;
    }
  };

  return {
    opciones,
    opcionesAgrupadas,
    filteredOpciones,
    filteredOpcionesAgrupadas,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    fetchOpciones,
    getOpcionesByRubro,
    createOpcGrd,
    updateOpcGrd,
    deleteOpcGrd
  };
}
