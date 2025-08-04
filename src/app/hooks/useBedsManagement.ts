'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { bedsService } from '../services/bedsService';
import { Bed, BedState } from '../types/beds';
import { useAppContext } from '../contexts/AppContext';

export const useBedsManagement = () => {
  const { sectorSeleccionado, idsector } = useAppContext();
  const [beds, setBeds] = useState<Bed[]>([]);
  const [bedStates, setBedStates] = useState<BedState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [sectorFilter, setSectorFilter] = useState<string>('all');
  const [servicioFilter, setServicioFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sectors, setSectors] = useState<{id: string, valor: string, descripcion: string}[]>([]);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [refreshInterval, setRefreshInterval] = useState<number>(30000); // 30 segundos por defecto
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateTimeRef = useRef<number>(Date.now());

  // Definir fetchSectores antes de usarlo
  const fetchSectores = useCallback(async () => {
    try {
      const sectoresData = await bedsService.getSectores();
      setSectors(sectoresData);
    } catch (err: any) {
      console.error('Error al cargar sectores:', err);
    }
  }, []);

  const fetchBedStates = useCallback(async () => {
    try {
      const states = await bedsService.getBedStates();
      setBedStates(states);
    } catch (err: any) {
      console.error('Error al cargar estados de cama:', err);
    }
  }, []);

  // Cargar sectores al iniciar
  useEffect(() => {
    fetchSectores();
  }, [fetchSectores]);

  // Cargar el sector del usuario desde el contexto global
  useEffect(() => {
    if (sectors.length === 0) return; // Esperar a que los sectores estén cargados
    
    // Función para verificar si un sector existe en la lista de sectores
    const sectorExiste = (sectorId: string) => sectors.some(s => s.valor === sectorId);
    
    // Usar el idsector del contexto si está disponible Y existe
    if (idsector && sectorExiste(idsector)) {
      console.log('Estableciendo sector inicial desde contexto:', idsector);
      setSectorFilter(idsector);
    } 
    // Alternativamente, usar el sectorSeleccionado si está disponible Y existe
    else if (sectorSeleccionado && sectorSeleccionado.idSector && sectorExiste(sectorSeleccionado.idSector)) {
      console.log('Estableciendo sector inicial desde sectorSeleccionado:', sectorSeleccionado.idSector);
      setSectorFilter(sectorSeleccionado.idSector);
    } else {
      // Si el sector no existe o no hay sector asignado, mostrar todas las camas
      console.log('El sector del usuario no existe en la lista de sectores o no tiene sector asignado, mostrando todas las camas');
      setSectorFilter('all');
    }
  }, [sectors, sectorSeleccionado, idsector]);

  const fetchBeds = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await bedsService.getAllBeds();
      setBeds(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar camas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBeds();
    fetchBedStates();
    fetchSectores();
  }, [fetchBeds, fetchBedStates, fetchSectores]);

  useEffect(() => {
    if (autoRefresh) {
      pollingIntervalRef.current = setInterval(fetchBeds, refreshInterval);
      lastUpdateTimeRef.current = Date.now();
    } else if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, fetchBeds]);

  // Obtener la lista de servicios médicos únicos
  const serviciosMedicos = useMemo(() => {
    const servicios = beds
      .map(bed => bed.servicioMedicoDescripcion)
      .filter(servicio => servicio && servicio.trim() !== '') // Filtrar valores vacíos
      .filter((servicio, index, self) => self.indexOf(servicio) === index) // Eliminar duplicados
      .sort(); // Ordenar alfabéticamente
    
    return servicios;
  }, [beds]);

  const filteredBeds = beds.filter(bed => {
    // Filtrar por estado de cama
    const estadoMatch = 
      filter === 'all' || 
      bed.valorEstadoOriginal === filter;
    
    // Filtrar por sector
    const sectorMatch = 
      sectorFilter === 'all' || 
      bed.sector === sectorFilter;
    
    // Filtrar por servicio médico
    const servicioMatch = 
      servicioFilter === 'all' || 
      bed.servicioMedicoDescripcion === servicioFilter;
    
    // Filtrar por término de búsqueda (nombre, DNI o número de visita)
    const searchMatch = !searchTerm || (
      // Nombre del paciente
      (bed.nombrePaciente && bed.nombrePaciente.toLowerCase().includes(searchTerm.toLowerCase())) ||
      // Número de documento (DNI)
      (bed.documentoPaciente && bed.documentoPaciente.toString().includes(searchTerm)) ||
      // Número de visita (admisión)
      (bed.numeroVisita && bed.numeroVisita.toString().includes(searchTerm)) ||
      // Número de visita mostrado (puede incluir formato adicional)
      (bed.mostrarNumeroVisita && bed.mostrarNumeroVisita.toString().includes(searchTerm))
    );
    
    return estadoMatch && sectorMatch && servicioMatch && searchMatch;
  });

  return {
    beds: filteredBeds,
    allBeds: beds,
    bedStates,
    sectors,
    serviciosMedicos,
    loading,
    error,
    filter,
    setFilter,
    sectorFilter,
    setSectorFilter,
    servicioFilter,
    setServicioFilter,
    searchTerm,
    setSearchTerm,
    refreshBeds: fetchBeds,
    autoRefresh,
    setAutoRefresh,
    refreshInterval,
    setRefreshInterval
  };
};
