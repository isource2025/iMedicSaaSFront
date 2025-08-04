import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { LoginCredentials, LoginResponse, Sector } from '../types/AuthInterface';
import { authService } from '../services/authService';
import { useAppContext } from '../contexts/AppContext';

export function useLoginForm() {
  const [credentials, setCredentials] = useState<LoginCredentials & { sector: string }>({
    username: '',
    password: '',
    sector: ''
  });


  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(false);
  const [sectores, setSectores] = useState<Sector[] | undefined>([]);
  const [loadingSectores, setLoadingSectores] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  
  // Obtener la función para establecer el sector seleccionado desde el contexto global
  const { setSectorSeleccionado } = useAppContext();
  
  const router = useRouter();

  // Función para cargar sectores filtrados por usuario
  const cargarSectoresPorUsuario = useCallback(async (username: string) => {
    if (!username || username.trim() === '') {
      setSectores([]); // Vaciar la lista de sectores si el usuario está vacío
      return;
    }
    
    setLoadingSectores(true);
    try {
      let data;
      try {
        // Intentar obtener los sectores filtrados por usuario
        data = await authService.getSectoresPorUsuario(username);
        console.log(`Sectores para usuario ${username}:`, data);
        
        // Si no hay resultados, usar datos de prueba
        if (!data || data.length === 0) {
          console.log("No se encontraron sectores para el usuario, usando datos de prueba");
          
        }
      } catch (apiError) {
        console.error(`Error al obtener sectores para usuario ${username}:`, apiError);
        
      }
      
      setSectores(data);
    } catch (error) {
      console.error('Error al cargar sectores por usuario:', error);
    } finally {
      setLoadingSectores(false);
    }
  }, []);

  // No cargamos sectores inicialmente, esperamos a que el usuario ingrese su nombre
  // La función useEffect original que cargaba todos los sectores ha sido eliminada

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    
    setCredentials((prev) => ({
      ...prev,
      [id]: value
    }));
    
    // Si el campo es username, cargar sectores solo si tiene contenido
    if (id === 'username') {
      // Si el usuario está vacío, limpiar la lista de sectores
      if (!value || value.trim() === '') {
        setSectores([]);
        // También limpiar el sector seleccionado
        setCredentials(prev => ({
          ...prev,
          sector: ''
        }));
      } 
      // Si tiene al menos 3 caracteres, cargar los sectores correspondientes
      else if (value.length > 2) {
        cargarSectoresPorUsuario(value);
      }
    }
    
    // Limpiar error al cambiar cualquier campo
    setError('');
  };

  const handleRememberMeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRememberMe(e.target.checked);
  };

  const validateForm = (): boolean => {
    if (!credentials.username || !credentials.password) {
      setError('Por favor, complete los campos de usuario y contraseña');
      return false;
    }
    
    if (!credentials.sector) {
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
    const [idPersonal, idSector, sectorDescripcion] = credentials.sector.split('-');

    const loginData = {
      username: credentials.username,
      password: credentials.password,
      sector: idPersonal, // Enviamos el idPersonal como sector (para compatibilidad)
      idSector: idSector  // Enviamos el idSector directamente
    };

    console.log('Datos de login:', loginData);

    const data: LoginResponse = await authService.login(loginData);

    console.log('Datos de respuesta LOGIN:', data);
    
    if (data.success) {
      localStorage.setItem('token', data.token || '');
      
      if (data.usuario) {
        localStorage.setItem('user', JSON.stringify(data.usuario));
      }

      if (data.sectorSeleccionado) {
        setSectorSeleccionado(data.sectorSeleccionado);
        console.log('Sector seleccionado guardado globalmente:', data.sectorSeleccionado);
      }

      if (rememberMe) {
        localStorage.setItem('rememberUser', 'true');
      }

      router.push('/dashboard');
    } else {
      setError(data.mensaje || 'Credenciales inválidas. Por favor, intente de nuevo.');
    }
  } catch (err) {
    console.error('Error de autenticación:', err);
    const errorMessage = err instanceof Error
      ? err.message
      : 'Error de conexión. Por favor, intente de nuevo más tarde.';
    setError(errorMessage);
  } finally {
    setLoading(false);
  }
};


  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };

  return {
    credentials,
    error,
    loading,
    loadingSectores,
    rememberMe,
    sectores,
    showPassword,
    handleInputChange,
    handleRememberMeChange,
    handleSubmit,
    togglePasswordVisibility
  };
}
