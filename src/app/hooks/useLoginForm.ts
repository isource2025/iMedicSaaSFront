import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { EmpresaLogin, LoginCredentials, LoginResponse, Sector } from '../types/AuthInterface';
import { authService } from '../services/authService';
import { useAppContext } from '../contexts/AppContext';
import { guardarInfoEmpresaLocal, EmpresaInfo } from '../services/empresaService';
import type { ModulosEmpresa } from '../types/superAdmin';

const DEBOUNCE_MS = 2000;
const MIN_USERNAME_LENGTH = 2;

type CredentialsState = LoginCredentials & {
  sector: string;
  empresa: string;
};

function empresaToValue(e: EmpresaLogin) {
  return `${e.idEmpresa}-${e.descripcionEmpresa}`;
}

function sectorToValue(s: Sector) {
  return `${s.idPersonal}-${s.idSector}-${s.descripcionSector}`;
}

export function useLoginForm() {
  const [credentials, setCredentials] = useState<CredentialsState>({
    username: '',
    password: '',
    sector: '',
    empresa: '',
  });

  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(false);
  const [sectores, setSectores] = useState<Sector[]>([]);
  const [requiereSector, setRequiereSector] = useState<boolean>(true);
  const [empresas, setEmpresas] = useState<EmpresaLogin[]>([]);
  const [loadingSectores, setLoadingSectores] = useState<boolean>(false);
  const [descubriendo, setDescubriendo] = useState<boolean>(false);
  const [contextoListo, setContextoListo] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [esSuperAdmin, setEsSuperAdmin] = useState<boolean>(false);

  const discoverGenRef = useRef(0);

  const { setSectorSeleccionado, setEmpresaInfo, setModulosEmpresa, setUsuario } = useAppContext();
  const router = useRouter();

  const multiplesEmpresas = !esSuperAdmin && empresas.length > 1;
  const empresaUnica = !esSuperAdmin && empresas.length === 1;
  const empresaSeleccionada =
    esSuperAdmin || empresaUnica || (multiplesEmpresas && !!credentials.empresa);

  const cargarSectoresPorUsuario = useCallback(async (username: string, idEmpresa?: string) => {
    if (!username?.trim()) {
      setSectores([]);
      setRequiereSector(true);
      setCredentials((prev) => ({ ...prev, sector: '' }));
      return;
    }

    setLoadingSectores(true);
    try {
      const { sectores: data, requiereSector: req } = await authService.getSectoresPorUsuario(
        username,
        idEmpresa,
      );
      const lista = data || [];
      setSectores(lista);
      setRequiereSector(req);
      setCredentials((prev) => {
        const actualSigueDisponible = lista.some((sector) => sectorToValue(sector) === prev.sector);
        const sectorAuto =
          req && lista.length === 1
            ? sectorToValue(lista[0])
            : actualSigueDisponible
              ? prev.sector
              : '';

        if (prev.sector === sectorAuto) return prev;
        return { ...prev, sector: sectorAuto };
      });
    } catch (err) {
      console.error('Error al cargar sectores por usuario:', err);
      setSectores([]);
      setRequiereSector(true);
      setCredentials((prev) => ({ ...prev, sector: '' }));
    } finally {
      setLoadingSectores(false);
    }
  }, []);

  const descubrirContexto = useCallback(
    async (username: string) => {
      const u = username.trim();
      if (u.length < MIN_USERNAME_LENGTH) {
        setEmpresas([]);
        setSectores([]);
        setContextoListo(false);
        setDescubriendo(false);
        return;
      }

      const gen = ++discoverGenRef.current;
      setDescubriendo(true);
      setContextoListo(false);
      setEmpresas([]);
      setSectores([]);
      setEsSuperAdmin(false);
      setCredentials((prev) => ({ ...prev, empresa: '', sector: '' }));

      try {
        const { empresas: lista, esSuperAdmin: isSa, requiereSector: reqSector } =
          await authService.getEmpresasPorUsuario(u);
        if (gen !== discoverGenRef.current) return;

        setEsSuperAdmin(isSa);
        setRequiereSector(reqSector);
        setEmpresas(lista);

        if (isSa) {
          setSectores([]);
          return;
        }

        if (lista.length === 1) {
          const valor = empresaToValue(lista[0]);
          setCredentials((prev) => ({ ...prev, empresa: valor, sector: '' }));
          await cargarSectoresPorUsuario(u, String(lista[0].idEmpresa));
        } else if (lista.length > 1) {
          setSectores([]);
        } else {
          await cargarSectoresPorUsuario(u);
        }
      } catch (err) {
        if (gen !== discoverGenRef.current) return;
        console.error('Error al descubrir empresas:', err);
        setEmpresas([]);
        setSectores([]);
      } finally {
        if (gen === discoverGenRef.current) {
          setDescubriendo(false);
          setContextoListo(true);
        }
      }
    },
    [cargarSectoresPorUsuario],
  );

  useEffect(() => {
    const u = credentials.username.trim();

    if (!u) {
      discoverGenRef.current += 1;
      setDescubriendo(false);
      setContextoListo(false);
      setEmpresas([]);
      setSectores([]);
      setEsSuperAdmin(false);
      setCredentials((prev) => ({ ...prev, empresa: '', sector: '' }));
      return;
    }

    if (u.length < MIN_USERNAME_LENGTH) {
      discoverGenRef.current += 1;
      setDescubriendo(false);
      setContextoListo(false);
      setEmpresas([]);
      setSectores([]);
      setEsSuperAdmin(false);
      return;
    }

    const timer = window.setTimeout(() => {
      descubrirContexto(u);
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [credentials.username, descubrirContexto]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target;

    setCredentials((prev) => ({
      ...prev,
      [id]: value,
    }));

    if (id === 'username') {
      setError('');
      if (!value.trim()) {
        discoverGenRef.current += 1;
        setDescubriendo(false);
        setContextoListo(false);
      }
    }

    if (id === 'empresa') {
      const [idEmp] = value.split('-');
      const user = credentials.username.trim();
      if (user.length >= MIN_USERNAME_LENGTH && idEmp) {
        setCredentials((prev) => ({ ...prev, sector: '' }));
        cargarSectoresPorUsuario(user, idEmp);
      } else {
        setSectores([]);
        setCredentials((prev) => ({ ...prev, sector: '' }));
      }
    }

    if (id !== 'username') {
      setError('');
    }
  };

  const handleRememberMeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRememberMe(e.target.checked);
  };

  const validateForm = (): boolean => {
    if (!credentials.username || !credentials.password) {
      setError('Por favor, complete los campos de usuario y contraseña');
      return false;
    }

    if (descubriendo) {
      setError('Espere a que termine la búsqueda de empresa y sectores');
      return false;
    }

    if (!esSuperAdmin && multiplesEmpresas && !credentials.empresa) {
      setError('Por favor, seleccione una empresa');
      return false;
    }

    if (!esSuperAdmin && requiereSector && empresaSeleccionada && !credentials.sector) {
      setError('Por favor, seleccione un sector');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) return;

    setLoading(true);

    try {
      const loginData: LoginCredentials = {
        username: credentials.username,
        password: credentials.password,
      };

      if (requiereSector && credentials.sector) {
        const [idPersonal, idSector] = credentials.sector.split('-');
        loginData.sector = idPersonal;
        loginData.idSector = idSector;
      }

      if (!esSuperAdmin) {
        if (credentials.empresa) {
          const [idEmpresa] = credentials.empresa.split('-');
          if (idEmpresa) {
            loginData.idEmpresa = idEmpresa;
          }
        } else if (empresaUnica && empresas[0]) {
          loginData.idEmpresa = String(empresas[0].idEmpresa);
        }
      }

      const data: LoginResponse = await authService.login(loginData);

      if (data.success) {
        localStorage.setItem('token', data.token || '');

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

        if (Array.isArray(data.permisos)) {
          localStorage.setItem('permisos', JSON.stringify(data.permisos));
        } else {
          localStorage.removeItem('permisos');
        }

        if (data.sectorSeleccionado) {
          setSectorSeleccionado(data.sectorSeleccionado);
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
          localStorage.setItem(
            'empresaSeleccionada',
            JSON.stringify({ idEmpresa: data.idEmpresa }),
          );
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

        const rolNombre = data.rol?.nombre?.toUpperCase?.() || '';
        router.push(rolNombre === 'SUPER_ADMIN' ? '/dashboard/super-admin' : '/dashboard');
      } else {
        setError(data.mensaje || 'Credenciales inválidas. Por favor, intente de nuevo.');
      }
    } catch (err) {
      console.error('Error de autenticación:', err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Error de conexión. Por favor, intente de nuevo más tarde.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  const empresaUnicaLabel = empresaUnica ? empresas[0]?.descripcionEmpresa || '' : '';
  const sectorUnico = !esSuperAdmin && requiereSector && sectores.length === 1;
  const sectorUnicoLabel = sectorUnico ? sectores[0]?.descripcionSector || '' : '';

  return {
    credentials,
    error,
    loading,
    loadingSectores,
    descubriendo,
    contextoListo,
    rememberMe,
    sectores,
    requiereSector,
    empresas,
    multiplesEmpresas,
    empresaUnica,
    empresaUnicaLabel,
    empresaSeleccionada,
    esSuperAdmin,
    sectorUnico,
    sectorUnicoLabel,
    showPassword,
    handleInputChange,
    handleRememberMeChange,
    handleSubmit,
    togglePasswordVisibility,
  };
};
