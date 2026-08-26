'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { SectorInfo, UserData } from '../types/AuthInterface';
import {
  EmpresaInfo,
  obtenerInfoEmpresaLocal,
  guardarInfoEmpresaLocal,
  obtenerInfoEmpresa,
} from '../services/empresaService';
import { getIdEmpresaFromToken, getIdSectorFromToken } from '../utils/jwtSession';
import { clearTenantUiCaches } from '../utils/sessionCaches';
import { authService } from '../services/authService';
import { startSessionActivityMonitor, simulateIdleLogout } from '../utils/sessionActivity';
import SessionIdleModal from '../components/layout/SessionIdleModal';
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

/**
 * El código de sector vive en columnas CHAR, así que puede llegar como "UTI ".
 * Se recorta al entrar al contexto para que los filtros de camas y los ids
 * compuestos "sector-cama" no arrastren el espacio.
 */
const normalizarSector = (sector: SectorInfo | null): SectorInfo | null =>
  sector ? { ...sector, idSector: String(sector.idSector ?? '').trim() } : null;

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
        const parsedSector = normalizarSector(JSON.parse(storedSector));
        setSectorSeleccionado(parsedSector);
        setIdsector(parsedSector?.idSector || '');
      } else {
        const fromJwt = getIdSectorFromToken();
        if (fromJwt) setIdsector(fromJwt);
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

  useEffect(() => {
    if (!isAuthenticated) return;
    const refreshModulos = async () => {
      try {
        const me = await authService.me();
        if (me.modulosEmpresa) {
          setModulosEmpresaState(me.modulosEmpresa);
          localStorage.setItem('empresaModulos', JSON.stringify(me.modulosEmpresa));
          window.dispatchEvent(new Event('imedic:permisos-refresh'));
        }
      } catch {
        /* sesión sin /me o Super Admin */
      }
    };
    void refreshModulos();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    startSessionActivityMonitor();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey && e.shiftKey && (e.key === 'E' || e.key === 'e'))) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      e.preventDefault();
      void simulateIdleLogout();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isAuthenticated]);

  const setModulosEmpresa = (modulos: ModulosEmpresa | null) => {
    setModulosEmpresaState(modulos);
    if (modulos) {
      localStorage.setItem('empresaModulos', JSON.stringify(modulos));
    } else {
      localStorage.removeItem('empresaModulos');
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('imedic:permisos-refresh'));
    }
  };

  useEffect(() => {
    if (sectorSeleccionado) {
      setIdsector(sectorSeleccionado.idSector || '');
    } else {
      setIdsector('');
    }
  }, [sectorSeleccionado]);

  const handleSetSectorSeleccionado = (sectorEntrante: SectorInfo | null) => {
    const sector = normalizarSector(sectorEntrante);
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
    localStorage.removeItem('roles');
    localStorage.removeItem('permisos');
    localStorage.removeItem('sectorSeleccionado');
    localStorage.removeItem('sectoresAsignados');
    localStorage.removeItem('empresaInfo');
    localStorage.removeItem('empresaSeleccionada');
    localStorage.removeItem('empresaModulos');
    localStorage.removeItem('rememberUser');
    clearTenantUiCaches();
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
      <SessionIdleModal />
    </AppContext.Provider>
  );
};
