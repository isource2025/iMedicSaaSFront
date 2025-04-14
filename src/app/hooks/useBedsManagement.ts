'use client';

import { useState, useEffect, useCallback } from 'react';
import { bedsService } from '../services/bedsService';
import { Bed, BedEstado } from '../types/beds';

interface BedState {
  id: string;
  valor: string;
  descripcion: string;
}

export const useBedsManagement = () => {
  const [beds, setBeds] = useState<Bed[]>([]);
  const [bedStates, setBedStates] = useState<BedState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

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
    // Si el filtro es 'all', mostramos todas las camas
    const estadoMatch = 
      filter === 'all' || 
      // Ahora comparamos con el valor original del estado
      bed.valorEstadoOriginal === filter;
    
    const searchMatch = bed.numeroCama?.toLowerCase().includes(searchTerm.toLowerCase());
    return estadoMatch && searchMatch;
  });

  return {
    beds: filteredBeds,
    allBeds: beds,
    bedStates,
    loading,
    error,
    filter,
    setFilter,
    searchTerm,
    setSearchTerm,
    refreshBeds: fetchBeds
  };
};
