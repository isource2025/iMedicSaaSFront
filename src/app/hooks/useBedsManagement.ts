'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [sectors, setSectors] = useState<{id: string, valor: string, descripcion: string}[]>([]);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [refreshInterval, setRefreshInterval] = useState<number>(30000); // 30 segundos por defecto
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateTimeRef = useRef<number>(Date.now());

  // Cargar el sector del usuario desde el contexto global
  useEffect(() => {
    // Usar el idsector del contexto directamente si está disponible
    if (idsector) {
      console.log('Estableciendo sector inicial desde contexto:', idsector);
      setSectorFilter(idsector);
    } 
    // Alternativamente, usar el sectorSeleccionado si está disponible
    else if (sectorSeleccionado && sectorSeleccionado.idSector) {
      console.log('Estableciendo sector inicial desde sectorSeleccionado:', sectorSeleccionado.idSector);
      setSectorFilter(sectorSeleccionado.idSector);
    }
  }, [sectorSeleccionado, idsector]);

  const fetchBedStates = useCallback(async () => {
    try {
      const states = await bedsService.getBedStates();
      setBedStates(states);
    } catch (err: any) {
      console.error('Error al cargar estados de cama:', err);
    }
  }, []);

  const fetchSectores = useCallback(async () => {
    try {
      const sectoresData = await bedsService.getSectores();
      setSectors(sectoresData);
    } catch (err: any) {
      console.error('Error al cargar sectores:', err);
    }
  }, []);

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

  const filteredBeds = beds.filter(bed => {
    // Filtrar por estado de cama
    const estadoMatch = 
      filter === 'all' || 
      bed.valorEstadoOriginal === filter;
    
    // Filtrar por sector
    const sectorMatch = 
      sectorFilter === 'all' || 
      bed.sector === sectorFilter;
    
    // Filtrar por nombre de paciente (nuevo)
    const searchMatch = 
      !searchTerm || 
      (bed.nombrePaciente && bed.nombrePaciente.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return estadoMatch && sectorMatch && searchMatch;
  });

  return {
    beds: filteredBeds,
    allBeds: beds,
    bedStates,
    sectors,
    loading,
    error,
    filter,
    setFilter,
    sectorFilter,
    setSectorFilter,
    searchTerm,
    setSearchTerm,
    refreshBeds: fetchBeds,
    autoRefresh,
    setAutoRefresh,
    refreshInterval,
    setRefreshInterval
  };
};
