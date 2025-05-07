'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { SectorInfo, UserData } from '../types/AuthInterface';
import { EmpresaInfo, obtenerInfoEmpresaLocal, guardarInfoEmpresaLocal, obtenerInfoEmpresa } from '../services/empresaService';

// Definir la interfaz para el estado del contexto
interface AppContextState {
  // Sector context
  sectorSeleccionado: SectorInfo | null;
  idsector: string;
  setSectorSeleccionado: (sector: SectorInfo | null) => void;
  
  // Empresa context
  empresaInfo: EmpresaInfo | null;
  setEmpresaInfo: (empresa: EmpresaInfo | null) => void;
  
  // User context
  usuario: UserData | null;
  setUsuario: (usuario: UserData | null) => void;
  isAuthenticated: boolean;
  logout: () => void;
}

// Crear el contexto con un valor inicial
const AppContext = createContext<AppContextState>({
  sectorSeleccionado: null,
  idsector: '',
  setSectorSeleccionado: () => {},
  empresaInfo: null,
  setEmpresaInfo: () => {},
  usuario: null,
  setUsuario: () => {},
  isAuthenticated: false,
  logout: () => {}
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
  // Estado para almacenar la información de la empresa
  const [empresaInfo, setEmpresaInfo] = useState<EmpresaInfo | null>(null);
  // Estado para almacenar la información del usuario
  const [usuario, setUsuarioState] = useState<UserData | null>(null);
  // Estado para controlar si el usuario está autenticado
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // Cargar el sector seleccionado desde localStorage al iniciar
  useEffect(() => {
    try {
      const storedSector = localStorage.getItem('sectorSeleccionado');
      if (storedSector) {
        const parsedSector = JSON.parse(storedSector);
        setSectorSeleccionado(parsedSector);
        setIdsector(parsedSector.idSector || '');
      }
    } catch (error) {
      console.error('Error al cargar sector desde localStorage:', error);
    }
  }, []);

  // Cargar la información del usuario desde localStorage al iniciar
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUsuarioState(parsedUser);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Error al cargar usuario desde localStorage:', error);
    }
  }, []);

  // Cargar la información de la empresa al iniciar
  useEffect(() => {
    // Primero cargamos desde localStorage para tener algo inmediatamente
    const localEmpresaInfo = obtenerInfoEmpresaLocal();
    setEmpresaInfo(localEmpresaInfo);
    
    // Luego intentamos obtener la información actualizada del backend
    const fetchEmpresaInfo = async () => {
      try {
        const empresaData = await obtenerInfoEmpresa();
        setEmpresaInfo(empresaData);
        guardarInfoEmpresaLocal(empresaData);
      } catch (error) {
        console.error('Error al obtener información de la empresa:', error);
      }
    };
    
    fetchEmpresaInfo();
  }, []);

  // Actualizar idsector cuando cambia sectorSeleccionado
  useEffect(() => {
    if (sectorSeleccionado) {
      setIdsector(sectorSeleccionado.idSector || '');
    } else {
      setIdsector('');
    }
  }, [sectorSeleccionado]);

  // Actualizar el localStorage y el idsector cuando cambie sectorSeleccionado
  const handleSetSectorSeleccionado = (sector: SectorInfo | null) => {
    setSectorSeleccionado(sector);
    
    if (sector) {
      setIdsector(sector.idSector || '');
      localStorage.setItem('sectorSeleccionado', JSON.stringify(sector));
    } else {
      setIdsector('');
      localStorage.removeItem('sectorSeleccionado');
    }
  };

  // Manejar la actualización del usuario
  const setUsuario = (user: UserData | null) => {
    setUsuarioState(user);
    
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  };

  // Función para cerrar sesión
  const logout = () => {
    setUsuarioState(null);
    setSectorSeleccionado(null);
    setIdsector('');
    setIsAuthenticated(false);
    
    // Limpiar localStorage
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('sectorSeleccionado');
    localStorage.removeItem('rememberUser');
  };

  return (
    <AppContext.Provider
      value={{
        sectorSeleccionado,
        idsector,
        setSectorSeleccionado: handleSetSectorSeleccionado,
        empresaInfo,
        setEmpresaInfo,
        usuario,
        setUsuario,
        isAuthenticated,
        logout
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
