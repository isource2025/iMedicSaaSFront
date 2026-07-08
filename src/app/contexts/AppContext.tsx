'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { SectorInfo, UserData } from '../types/AuthInterface';
import {
  EmpresaInfo,
  obtenerInfoEmpresaLocal,
  guardarInfoEmpresaLocal,
  obtenerInfoEmpresa,
} from '../services/empresaService';
import { getIdEmpresaFromToken } from '../utils/jwtSession';
import type { ModulosEmpresa } from '../types/superAdmin';

interface AppContextState {
  sectorSeleccionado: SectorInfo | null;
  idsector: string;
  setSectorSeleccionado: (sector: SectorInfo | null) => void;

  empresaInfo: EmpresaInfo | null;
  setEmpresaInfo: (empresa: EmpresaInfo | null) => void;
  modulosEmpresa: ModulosEmpresa | null;
  setModulosEmpresa: (modulos: ModulosEmpresa | null) => void;

  usuario: UserData | null;
  setUsuario: (usuario: UserData | null) => void;
  isAuthenticated: boolean;
  logout: () => void;
}

const AppContext = createContext<AppContextState>({
  sectorSeleccionado: null,
  idsector: '',
  setSectorSeleccionado: () => {},
  empresaInfo: null,
  setEmpresaInfo: () => {},
  modulosEmpresa: null,
  setModulosEmpresa: () => {},
  usuario: null,
  setUsuario: () => {},
  isAuthenticated: false,
  logout: () => {},
});

export const useAppContext = () => useContext(AppContext);

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider = ({ children }: AppProviderProps) => {
  const [sectorSeleccionado, setSectorSeleccionado] = useState<SectorInfo | null>(null);
  const [idsector, setIdsector] = useState<string>('');
  const [empresaInfo, setEmpresaInfoState] = useState<EmpresaInfo | null>(null);
  const [modulosEmpresa, setModulosEmpresaState] = useState<ModulosEmpresa | null>(null);
  const [usuario, setUsuarioState] = useState<UserData | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    try {
      const storedSector = localStorage.getItem('sectorSeleccionado');
      if (storedSector) {
        const parsedSector = JSON.parse(storedSector);
        setSectorSeleccionado(parsedSector);
        setIdsector(parsedSector.idSector || '');
      }
    } catch (err) {
      console.error('Error al cargar sector desde localStorage:', err);
    }
  }, []);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      if (storedUser && token) {
        const parsedUser = JSON.parse(storedUser);
        setUsuarioState(parsedUser);
        setIsAuthenticated(true);
      } else if (storedUser && !token) {
        localStorage.removeItem('user');
        setIsAuthenticated(false);
      }
    } catch (err) {
      console.error('Error al cargar usuario desde localStorage:', err);
    }
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('empresaModulos');
      if (stored) setModulosEmpresaState(JSON.parse(stored));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const localEmpresaInfo = obtenerInfoEmpresaLocal();
    if (localEmpresaInfo?.id) {
      setEmpresaInfoState(localEmpresaInfo);
    }

    const fetchEmpresaInfo = async () => {
      try {
        const stored = localStorage.getItem('empresaSeleccionada');
        const idFromLogin = stored
          ? (JSON.parse(stored) as { idEmpresa?: string | number })?.idEmpresa
          : undefined;
        const idGuardado =
          getIdEmpresaFromToken() ?? idFromLogin ?? localEmpresaInfo?.id;
        if (!idGuardado) return;
        const empresaData = await obtenerInfoEmpresa(idGuardado);
        setEmpresaInfoState(empresaData);
        guardarInfoEmpresaLocal(empresaData);
      } catch (err) {
        console.error('Error al obtener información de la empresa:', err);
      }
    };

    fetchEmpresaInfo();
  }, [isAuthenticated]);

  const setModulosEmpresa = (modulos: ModulosEmpresa | null) => {
    setModulosEmpresaState(modulos);
    if (modulos) {
      localStorage.setItem('empresaModulos', JSON.stringify(modulos));
    } else {
      localStorage.removeItem('empresaModulos');
    }
  };

  useEffect(() => {
    if (sectorSeleccionado) {
      setIdsector(sectorSeleccionado.idSector || '');
    } else {
      setIdsector('');
    }
  }, [sectorSeleccionado]);

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

  const setEmpresaInfo = (empresa: EmpresaInfo | null) => {
    setEmpresaInfoState(empresa);
    if (empresa) {
      guardarInfoEmpresaLocal(empresa);
      localStorage.setItem(
        'empresaSeleccionada',
        JSON.stringify({
          idEmpresa: empresa.id,
          descripcion: empresa.descripcion,
        })
      );
    } else {
      localStorage.removeItem('empresaInfo');
      localStorage.removeItem('empresaSeleccionada');
    }
  };

  const setUsuario = (user: UserData | null) => {
    setUsuarioState(user);

    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  };

  const logout = () => {
    setUsuarioState(null);
    setSectorSeleccionado(null);
    setIdsector('');
    setEmpresaInfoState(null);
    setModulosEmpresaState(null);
    setIsAuthenticated(false);

    localStorage.removeItem('user');
    localStorage.removeItem('userData');
    localStorage.removeItem('token');
    localStorage.removeItem('rol');
    localStorage.removeItem('permisos');
    localStorage.removeItem('sectorSeleccionado');
    localStorage.removeItem('empresaInfo');
    localStorage.removeItem('empresaSeleccionada');
    localStorage.removeItem('empresaModulos');
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
        modulosEmpresa,
        setModulosEmpresa,
        usuario,
        setUsuario,
        isAuthenticated,
        logout,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
