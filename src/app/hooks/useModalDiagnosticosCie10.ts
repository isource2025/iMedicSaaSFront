'use client';

import { useState, useEffect, useCallback } from 'react';
import { DiagnosticoCie10 } from '../types/diagnosticos';
import diagnosticosService from '../services/diagnosticosService';

const PAGE_SIZE = 10; // 10 resultados por página

/**
 * Hook personalizado para gestionar la lógica del modal de diagnósticos CIE10
 * @param onSelect Callback que se ejecuta al seleccionar un diagnóstico
 * @returns Estado y manejadores para el modal
 */
export const useModalDiagnosticosCie10 = (onSelect: (diagnostico: DiagnosticoCie10) => void) => {
  const [isOpen, setIsOpen] = useState(false);
  const [allDiagnosticos, setAllDiagnosticos] = useState<DiagnosticoCie10[]>([]);
  const [filteredDiagnosticos, setFilteredDiagnosticos] = useState<DiagnosticoCie10[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Cargar todos los diagnósticos al montar el componente
  useEffect(() => {
    const fetchDiagnosticos = async () => {
      try {
        setLoading(true);
        const data = await diagnosticosService.getDiagnosticosCie10();
        setAllDiagnosticos(data);
        setFilteredDiagnosticos(data);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Error al cargar los diagnósticos');
      } finally {
        setLoading(false);
      }
    };

    fetchDiagnosticos();
  }, []);

  // Filtrar diagnósticos cuando cambia el término de búsqueda
  useEffect(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    const filteredData = allDiagnosticos.filter(item =>
      item.descripcion.toLowerCase().includes(lowercasedFilter) ||
      item.CodigoOMS.toLowerCase().includes(lowercasedFilter)
    );
    setFilteredDiagnosticos(filteredData);
    setCurrentPage(1); // Resetear a la primera página en cada nueva búsqueda
  }, [searchTerm, allDiagnosticos]);

  // Lógica de paginación
  const totalResults = filteredDiagnosticos.length;
  const totalPages = Math.ceil(totalResults / PAGE_SIZE);
  const paginatedDiagnosticos = filteredDiagnosticos.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const openModal = () => setIsOpen(true);
  const closeModal = () => {
    setIsOpen(false);
    setSearchTerm(''); // Limpiar búsqueda al cerrar
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  const handleSelect = (diagnostico: DiagnosticoCie10) => {
    onSelect(diagnostico);
    closeModal();
  };

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return {
    isOpen,
    diagnosticos: paginatedDiagnosticos,
    allDiagnosticos,
    loading,
    error,
    searchTerm,
    currentPage,
    totalPages,
    totalResults,
    openModal,
    closeModal,
    handleSearch,
    handleSelect,
    nextPage,
    prevPage,
    goToPage,
  };
};

export default useModalDiagnosticosCie10;