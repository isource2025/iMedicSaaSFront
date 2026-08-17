'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { EmpresaLogin, LoginCredentials, LoginResponse } from '../types/AuthInterface';
import { authService } from '../services/authService';
import { useAppContext } from '../contexts/AppContext';
import { guardarInfoEmpresaLocal, EmpresaInfo } from '../services/empresaService';
import type { ModulosEmpresa } from '../types/superAdmin';
import { startSessionActivityMonitor } from '../utils/sessionActivity';
import { clearTenantUiCaches } from '../utils/sessionCaches';

type CredentialsState = {
  username: string;
  password: string;
  empresa: string;
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
  return [...map.values()];
}

export function useLoginForm() {
  const [credentials, setCredentials] = useState<CredentialsState>({
    username: '',
    password: '',
    empresa: '',
  });

  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  /** Paso 2: solo tras validar usuario+contraseña */
  const [loginStep, setLoginStep] = useState<'CREDENTIALS' | 'SELECT_EMPRESA'>('CREDENTIALS');
  const [empresas, setEmpresas] = useState<EmpresaLogin[]>([]);
  const [tempToken, setTempToken] = useState<string>('');

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

      if (data.sectorSeleccionado) {
        setSectorSeleccionado(data.sectorSeleccionado);
      } else {
        setSectorSeleccionado(null);
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

  const buildLoginPayload = (): LoginCredentials & { tempToken?: string } => {
    const payload: LoginCredentials & { tempToken?: string } = {
      username: credentials.username.trim(),
      password: credentials.password,
    };
    if (loginStep === 'SELECT_EMPRESA' && credentials.empresa) {
      const [idEmpresa] = credentials.empresa.split('-');
      if (idEmpresa) payload.idEmpresa = idEmpresa;
      if (tempToken) payload.tempToken = tempToken;
    }
    return payload;
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

    setLoading(true);
    try {
      let data = await authService.login(buildLoginPayload());

      if (data.step === 'SELECT_EMPRESA' && Array.isArray(data.empresas)) {
        const unique = uniqueEmpresasPorId(data.empresas);
        if (unique.length === 1) {
          data = await authService.login({
            username: credentials.username.trim(),
            password: credentials.password,
            idEmpresa: String(unique[0].idEmpresa),
            tempToken: data.tempToken || tempToken || undefined,
          });
        } else if (unique.length > 1) {
          setEmpresas(unique);
          setTempToken(data.tempToken || '');
          setLoginStep('SELECT_EMPRESA');
          setCredentials((prev) => ({ ...prev, empresa: '' }));
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
      }
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => setShowPassword((prev) => !prev);

  const volverACredenciales = () => {
    setLoginStep('CREDENTIALS');
    setTempToken('');
    setEmpresas([]);
    setCredentials((prev) => ({ ...prev, empresa: '' }));
    setError('');
  };

  return {
    credentials,
    error,
    loading,
    rememberMe,
    showPassword,
    loginStep,
    empresas,
    handleInputChange,
    handleRememberMeChange,
    handleSubmit,
    togglePasswordVisibility,
    volverACredenciales,
  };
};
