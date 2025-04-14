'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { SectorInfo } from '../types/AuthInterface';

// Definir la interfaz para el estado del contexto
interface AppContextState {
  sectorSeleccionado: SectorInfo | null;
  idsector: string;
  setSectorSeleccionado: (sector: SectorInfo | null) => void;
}

// Crear el contexto con un valor inicial
const AppContext = createContext<AppContextState>({
  sectorSeleccionado: null,
  idsector: '',
  setSectorSeleccionado: () => {}
});

// Hook personalizado para usar el contexto
export const useAppContext = () => useContext(AppContext);

// Proveedor del contexto que envolverá la aplicación
interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider = ({ children }: AppProviderProps) => {
  // Estado para almacenar la información del sector seleccionado
  const [sectorSeleccionado, setSectorSeleccionado] = useState<SectorInfo | null>(null);
  // Estado específico para idsector, derivado de sectorSeleccionado
  const [idsector, setIdsector] = useState<string>('');

  // Cargar el sector seleccionado desde localStorage al iniciar
  useEffect(() => {
    try {
      const storedSector = localStorage.getItem('sectorSeleccionado');
      if (storedSector) {
        const parsedSector = JSON.parse(storedSector);
        setSectorSeleccionado(parsedSector);
        setIdsector(parsedSector.idsector || '');
      }
    } catch (error) {
      console.error('Error al cargar el sector seleccionado desde localStorage:', error);
    }
  }, []);

  // Actualizar el localStorage y el idsector cuando cambie sectorSeleccionado
  const handleSetSectorSeleccionado = (sector: SectorInfo | null) => {
    setSectorSeleccionado(sector);
    
    if (sector) {
      setIdsector(sector.idsector || '');
      localStorage.setItem('sectorSeleccionado', JSON.stringify(sector));
    } else {
      setIdsector('');
      localStorage.removeItem('sectorSeleccionado');
    }
  };

  return (
    <AppContext.Provider
      value={{
        sectorSeleccionado,
        idsector,
        setSectorSeleccionado: handleSetSectorSeleccionado
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
