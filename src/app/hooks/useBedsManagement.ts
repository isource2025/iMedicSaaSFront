'use client';

import { useState, useEffect, useCallback } from 'react';
import { bedsService } from '../services/bedsService';
import { Bed, BedState } from '../types/beds';
import { useAppContext } from '../contexts/AppContext';

export const useBedsManagement = () => {
  const { sectorSeleccionado } = useAppContext();
  const [beds, setBeds] = useState<Bed[]>([]);
  const [bedStates, setBedStates] = useState<BedState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [sectorFilter, setSectorFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sectors, setSectors] = useState<{id: string, valor: string, descripcion: string}[]>([]);

  // Cargar el sector del usuario desde el contexto global
  useEffect(() => {
    if (sectorSeleccionado && sectorSeleccionado.idsector) {
      setSectorFilter(sectorSeleccionado.idsector);
    }
  }, [sectorSeleccionado]);

  const fetchBedStates = useCallback(async () => {
    try {
      const states = await bedsService.getBedStates();
      setBedStates(states);
    } catch (err: any) {
      console.error('Error al cargar estados de cama:', err);
    }
  }, []);

  const fetchBeds = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await bedsService.getAllBeds();
      setBeds(data);
      
      // Extraer sectores únicos de las camas
      const uniqueSectors = Array.from(new Set(data.map(bed => bed.sector)))
        .map(sector => ({
          id: sector,
          valor: sector,
          descripcion: sector
        }));
      
      setSectors(uniqueSectors);
    } catch (err: any) {
      setError(err.message || 'Error al cargar camas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBeds();
    fetchBedStates();
  }, [fetchBeds, fetchBedStates]);

  const filteredBeds = beds.filter(bed => {
    // Filtrar por estado de cama
    const estadoMatch = 
      filter === 'all' || 
      bed.valorEstadoOriginal === filter;
    
    // Filtrar por sector
    const sectorMatch = 
      sectorFilter === 'all' || 
      bed.sector === sectorFilter;
    
    // Filtrar por término de búsqueda
    const searchMatch = bed.numeroCama?.toLowerCase().includes(searchTerm.toLowerCase());
    
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
    refreshBeds: fetchBeds
  };
};
