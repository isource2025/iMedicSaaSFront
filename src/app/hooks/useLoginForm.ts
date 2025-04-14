import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoginCredentials, LoginResponse } from '../types/AuthInterface';
import { authService } from '../services/authService';

export function useLoginForm() {
  const [credentials, setCredentials] = useState<LoginCredentials>({
    username: '',
    password: ''
  });
  
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(false);
  const router = useRouter();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setCredentials((prev: LoginCredentials) => ({
      ...prev,
      [id]: value
    }));
  };

  const handleRememberMeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRememberMe(e.target.checked);
  };

  const validateForm = (): boolean => {
    if (!credentials.username || !credentials.password) {
      setError('Por favor, complete todos los campos');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);

    try {
      const data = await authService.login(credentials);
      
      if (data.success) {
        // Save authentication data
        localStorage.setItem('token', data.token || '');
        
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
        }
        
        if (rememberMe) {
          // If remember me is checked, we could save additional info or use a longer expiry token
          localStorage.setItem('rememberUser', 'true');
        }
        
        router.push('/dashboard');
      } else {
        setError(data.message || 'Credenciales inválidas. Por favor, intente de nuevo.');
      }
    } catch (err) {
      console.error('Error de autenticación:', err);
      // If err is an Error object, get its message property
      const errorMessage = err instanceof Error ? err.message : 'Error de conexión. Por favor, intente de nuevo más tarde.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    credentials,
    error,
    loading,
    rememberMe,
    handleInputChange,
    handleRememberMeChange,
    handleSubmit
  };
}
