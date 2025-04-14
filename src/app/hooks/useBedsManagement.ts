'use client';

import { useState, useEffect, useCallback } from 'react';
import { bedsService } from '../services/bedsService';
import { Bed, BedEstado } from '../types/beds';

export const useBedsManagement = () => {
  const [beds, setBeds] = useState<Bed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<BedEstado | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

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
  }, [fetchBeds]);

  const filteredBeds = beds.filter(bed => {
    const estadoMatch = filter === 'all' || bed.estado === filter;
    const searchMatch = bed.numeroCama?.toLowerCase().includes(searchTerm.toLowerCase());
    return estadoMatch && searchMatch;
  });

  return {
    beds: filteredBeds,
    allBeds: beds,
    loading,
    error,
    filter,
    setFilter,
    searchTerm,
    setSearchTerm,
    refreshBeds: fetchBeds
  };
};
