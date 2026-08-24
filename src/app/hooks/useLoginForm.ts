'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  EmpresaLogin,
  LoginCredentials,
  LoginResponse,
  SectorLoginOption,
} from '../types/AuthInterface';
import { authService } from '../services/authService';
import { useAppContext } from '../contexts/AppContext';
import { guardarInfoEmpresaLocal, EmpresaInfo } from '../services/empresaService';
import type { ModulosEmpresa } from '../types/superAdmin';
import { startSessionActivityMonitor } from '../utils/sessionActivity';
import { clearTenantUiCaches } from '../utils/sessionCaches';
import { setCachedSectoresReceptor } from '../utils/serviciosReceptorCache';

type LoginStep = 'CREDENTIALS' | 'SELECT_EMPRESA' | 'SELECT_SECTOR';

type CredentialsState = {
  username: string;
  password: string;
  empresa: string;
  sector: string;
};

function empresaToValue(e: EmpresaLogin) {
  return `${e.idEmpresa}-${e.descripcionEmpresa}`;
}

function uniqueEmpresasPorId(list: EmpresaLogin[]): EmpresaLogin[] {
  const map = new Map<number, EmpresaLogin>();
  for (const e of list || []) {
    const id = Number(e.idEmpresa);
    if (!Number.isFinite(id) || id <= 0) continue;
    if (!map.has(id)) map.set(id, e);
  }
  return Array.from(map.values());
}

function uniqueSectoresPorId(list: SectorLoginOption[]): SectorLoginOption[] {
  const map = new Map<string, SectorLoginOption>();
  for (const s of list || []) {
    const id = String(s.idSector || '').trim();
    if (!id) continue;
    const k = id.toUpperCase();
    if (!map.has(k)) map.set(k, { ...s, idSector: id });
  }
  return Array.from(map.values());
}

function parseIdEmpresa(empresaValue: string, pendiente: number | null): string | undefined {
  if (empresaValue) {
    const [idEmpresa] = empresaValue.split('-');
    if (idEmpresa) return idEmpresa;
  }
  if (pendiente != null && Number.isFinite(pendiente) && pendiente > 0) {
    return String(pendiente);
  }
  return undefined;
}

function seedSectoresCache(data: LoginResponse) {
  const assigned = Array.isArray(data.sectoresAsignados) ? data.sectoresAsignados : [];
  const list = assigned
    .map((s) => ({
      valor: String(s.idSector || '').trim(),
      descripcion: String(s.descripcion || s.idSector || '').trim(),
      valorServicio: String(s.valorServicio || '').trim(),
      descripcionServicio: '',
      prefijos: [] as string[],
    }))
    .filter((s) => s.valor);
  if (!list.length && data.sectorSeleccionado?.idSector) {
    list.push({
      valor: String(data.sectorSeleccionado.idSector).trim(),
      descripcion: String(data.sectorSeleccionado.descripcion || data.sectorSeleccionado.idSector).trim(),
      valorServicio: '',
      descripcionServicio: '',
      prefijos: [],
    });
  }
  if (!list.length) return;
  setCachedSectoresReceptor(list, { soloMios: true });
}

export function useLoginForm() {
  const [credentials, setCredentials] = useState<CredentialsState>({
    username: '',
    password: '',
    empresa: '',
    sector: '',
  });

  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const [loginStep, setLoginStep] = useState<LoginStep>('CREDENTIALS');
  const [empresas, setEmpresas] = useState<EmpresaLogin[]>([]);
  const [sectores, setSectores] = useState<SectorLoginOption[]>([]);
  const [tempToken, setTempToken] = useState<string>('');
  const [idEmpresaPendiente, setIdEmpresaPendiente] = useState<number | null>(null);

  const { setSectorSeleccionado, setEmpresaInfo, setModulosEmpresa, setUsuario } = useAppContext();
  const router = useRouter();

  const persistLoginSuccess = useCallback(
    (data: LoginResponse) => {
      // Evitar sectores/camas de otra empresa al reingresar
      clearTenantUiCaches();

      if (data.token) {
        localStorage.setItem('token', data.token);
      } else {
        localStorage.removeItem('token');
      }

      if (data.usuario) {
        localStorage.setItem('user', JSON.stringify(data.usuario));
        localStorage.removeItem('userData');
        setUsuario(data.usuario);
      }

      if (data.rol) {
        localStorage.setItem('rol', JSON.stringify(data.rol));
      } else {
        localStorage.removeItem('rol');
      }

      if (Array.isArray(data.roles)) {
        localStorage.setItem('roles', JSON.stringify(data.roles));
      } else {
        localStorage.removeItem('roles');
      }

      if (Array.isArray(data.permisos)) {
        localStorage.setItem('permisos', JSON.stringify(data.permisos));
      } else {
        localStorage.removeItem('permisos');
      }

      if (data.empresaSeleccionada) {
        const empresa = data.empresaSeleccionada as EmpresaInfo;
        setEmpresaInfo(empresa);
        guardarInfoEmpresaLocal(empresa);
        localStorage.setItem(
          'empresaSeleccionada',
          JSON.stringify({
            idEmpresa: data.idEmpresa ?? empresa.id,
            descripcion: empresa.descripcion,
          }),
        );
      } else if (data.idEmpresa != null) {
        localStorage.setItem('empresaSeleccionada', JSON.stringify({ idEmpresa: data.idEmpresa }));
      }

      if (data.modulosEmpresa) {
        setModulosEmpresa(data.modulosEmpresa as ModulosEmpresa);
        localStorage.setItem('empresaModulos', JSON.stringify(data.modulosEmpresa));
      } else {
        localStorage.removeItem('empresaModulos');
        setModulosEmpresa(null);
      }

      if (data.sectorSeleccionado) {
        setSectorSeleccionado(data.sectorSeleccionado);
      } else {
        setSectorSeleccionado(null);
      }

      seedSectoresCache(data);

      if (rememberMe) {
        localStorage.setItem('rememberUser', 'true');
      }

      startSessionActivityMonitor();
    },
    [rememberMe, setEmpresaInfo, setModulosEmpresa, setSectorSeleccionado, setUsuario],
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setCredentials((prev) => ({ ...prev, [id]: value }));
    setError('');
  };

  const handleRememberMeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRememberMe(e.target.checked);
  };

  const buildLoginPayload = (overrides?: Partial<LoginCredentials>): LoginCredentials => {
    const payload: LoginCredentials = {
      username: credentials.username.trim(),
      password: credentials.password,
    };
    const idEmpresa = parseIdEmpresa(credentials.empresa, idEmpresaPendiente);
    const needsEmpresa =
      loginStep === 'SELECT_EMPRESA' || loginStep === 'SELECT_SECTOR' || Boolean(idEmpresa);
    if (needsEmpresa && idEmpresa) {
      payload.idEmpresa = idEmpresa;
    }
    if ((loginStep === 'SELECT_EMPRESA' || loginStep === 'SELECT_SECTOR') && tempToken) {
      payload.tempToken = tempToken;
    }
    if (loginStep === 'SELECT_SECTOR' && credentials.sector) {
      payload.idSector = credentials.sector;
    }
    return { ...payload, ...overrides };
  };

  const enterSectorStep = (data: LoginResponse, unique: SectorLoginOption[]) => {
    setSectores(unique);
    setTempToken(data.tempToken || tempToken || '');
    if (data.idEmpresa != null && Number.isFinite(Number(data.idEmpresa))) {
      setIdEmpresaPendiente(Number(data.idEmpresa));
    }
    setLoginStep('SELECT_SECTOR');
    setCredentials((prev) => ({ ...prev, sector: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!credentials.username.trim() || !credentials.password) {
      setError('Por favor, complete los campos de usuario y contraseña');
      return;
    }

    if (loginStep === 'SELECT_EMPRESA' && !credentials.empresa) {
      setError('Por favor, seleccione una empresa');
      return;
    }

    if (loginStep === 'SELECT_SECTOR' && !credentials.sector) {
      setError('Por favor, seleccione un sector');
      return;
    }

    setLoading(true);
    try {
      let data = await authService.login(buildLoginPayload());

      if (data.step === 'SELECT_EMPRESA' && Array.isArray(data.empresas)) {
        const unique = uniqueEmpresasPorId(data.empresas);
        if (unique.length === 1) {
          setIdEmpresaPendiente(unique[0].idEmpresa);
          setTempToken(data.tempToken || tempToken || '');
          setCredentials((prev) => ({ ...prev, empresa: empresaToValue(unique[0]) }));
          data = await authService.login(
            buildLoginPayload({
              idEmpresa: String(unique[0].idEmpresa),
              tempToken: data.tempToken || tempToken || undefined,
            }),
          );
        } else if (unique.length > 1) {
          setEmpresas(unique);
          setTempToken(data.tempToken || '');
          setLoginStep('SELECT_EMPRESA');
          setCredentials((prev) => ({ ...prev, empresa: '', sector: '' }));
          return;
        }
      }

      if (data.step === 'SELECT_SECTOR' && Array.isArray(data.sectores)) {
        const unique = uniqueSectoresPorId(data.sectores);
        if (unique.length === 1) {
          data = await authService.login(
            buildLoginPayload({
              idSector: unique[0].idSector,
              tempToken: data.tempToken || tempToken || undefined,
              idEmpresa:
                parseIdEmpresa(credentials.empresa, idEmpresaPendiente) ||
                (data.idEmpresa != null ? String(data.idEmpresa) : undefined),
            }),
          );
        } else if (unique.length > 1) {
          enterSectorStep(data, unique);
          return;
        }
      }

      if (data.success && (data.step === 'COMPLETE' || !data.step)) {
        persistLoginSuccess(data);
        const rolNombre = data.rol?.nombre?.toUpperCase?.() || '';
        router.push(rolNombre === 'SUPER_ADMIN' ? '/dashboard/super-admin' : '/dashboard');
        return;
      }

      setError(data.mensaje || 'Usuario o contraseña incorrectos');
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Error de conexión. Por favor, intente de nuevo más tarde.';
      setError(errorMessage);
      if (loginStep === 'SELECT_EMPRESA') {
        setLoginStep('CREDENTIALS');
        setTempToken('');
        setEmpresas([]);
        setSectores([]);
        setIdEmpresaPendiente(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => setShowPassword((prev) => !prev);

  const volverAtras = () => {
    setError('');
    if (loginStep === 'SELECT_SECTOR' && empresas.length > 1) {
      setLoginStep('SELECT_EMPRESA');
      setSectores([]);
      setCredentials((prev) => ({ ...prev, sector: '' }));
      return;
    }
    setLoginStep('CREDENTIALS');
    setTempToken('');
    setEmpresas([]);
    setSectores([]);
    setIdEmpresaPendiente(null);
    setCredentials((prev) => ({ ...prev, empresa: '', sector: '' }));
  };

  return {
    credentials,
    error,
    loading,
    rememberMe,
    showPassword,
    loginStep,
    empresas,
    sectores,
    handleInputChange,
    handleRememberMeChange,
    handleSubmit,
    togglePasswordVisibility,
    volverAtras,
  };
}
