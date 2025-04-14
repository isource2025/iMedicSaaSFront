'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    if (!username || !password) {
      setError('Por favor, complete todos los campos');
      setLoading(false);
      return;
    }
    
    try {
      // Conectar con el backend para validar contra la tabla impassword
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        console.log('Login successful', data);
        // Guardar token en localStorage o cookies para mantener la sesión
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        router.push('/dashboard');
      } else {
        setError(data.message || 'Credenciales inválidas. Por favor, intente de nuevo.');
      }
    } catch (err) {
      console.error('Error de autenticación:', err);
      setError('Error de conexión. Por favor, intente de nuevo más tarde.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="card">
        <div className="flex justify-center mb-6">
          <div className="relative w-32 h-32">
            {/* Logo placeholder */}
            <div className="w-32 h-32 rounded-full bg-gradient-to-r from-pantone-313u to-pantone-314c flex items-center justify-center">
              <h1 className="text-white text-2xl font-bold">iMedicWS</h1>
            </div>
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-center text-pantone-314c mb-6">
          Iniciar Sesión
        </h2>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="username">
              Usuario
            </label>
            <input
              id="username"
              type="text"
              className="input-field"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ingrese su nombre de usuario"
              disabled={loading}
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
            />
          </div>
          
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <input
                id="remember"
                type="checkbox"
                className="h-4 w-4 text-pantone-311c focus:ring-pantone-311u border-gray-300 rounded"
              />
              <label htmlFor="remember" className="ml-2 block text-sm text-gray-700">
                Recordarme
              </label>
            </div>
            
            <a href="#" className="inline-block align-baseline font-bold text-sm text-pantone-311c hover:text-pantone-313u">
              ¿Olvidó su contraseña?
            </a>
          </div>
          
          <button
            type="submit"
            className="btn-primary w-full"
            disabled={loading}
          >
            {loading ? 'Procesando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}
