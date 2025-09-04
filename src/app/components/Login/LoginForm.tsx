'use client';

import { useLoginForm } from '../../hooks/useLoginForm';
import styles from './LoginForm.module.css';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginForm() {
  const {
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
  } = useLoginForm();

  return (
    <div className={styles.loginContainer}>
      <div className={styles.card}>
        
        <h2 className={styles.title}>
          Iniciar Sesión
        </h2>
        
        {error && (
          <div className={styles.errorAlert} role="alert">
            <span>{error}</span>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="username">
              Usuario
            </label>
            <input
              id="username"
              type="text"
              className={styles.inputField}
              value={credentials.username}
              onChange={handleInputChange}
              placeholder="Ingrese su nombre de usuario"
              disabled={loading}
            />
          </div>
          
          <div className={styles.formGroupPassword}>
            <label className={styles.label} htmlFor="password">
              Contraseña
            </label>
            <div className={styles.passwordInputContainer}>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                className={`${styles.inputField} ${styles.passwordInput}`}
                value={credentials.password}
                onChange={handleInputChange}
                placeholder="••••••••"
                disabled={loading}
              />
              <button 
                type="button" 
                className={styles.passwordToggle} 
                onClick={togglePasswordVisibility}
                tabIndex={-1}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? 
                  <EyeOff size={20} color="#0083A9" /> : 
                  <Eye size={20} color="#0083A9" />}
              </button>
            </div>
          </div>
          
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="sector">
              Sector
            </label>
            <select
              id="sector"
              className={styles.inputField}
              value={credentials.sector}
              onChange={handleInputChange}
              disabled={loading || loadingSectores}
            >
              <option value="">Seleccione un sector</option>
              {loadingSectores ? (
                <option value="" disabled>Cargando sectores...</option>
              ) : (
                sectores?.map((sector, index) => (
                  <option key={index} value={`${sector.idPersonal}-${sector.idSector}-${sector.descripcionSector}`}>
                    {sector.descripcionSector}
                  </option>
                ))
              )}
            </select>
          </div>
          
          <div className={styles.formOptions}>
            <div className={styles.rememberContainer}>
              <input
                id="remember"
                type="checkbox"
                className={styles.checkbox}
                checked={rememberMe}
                onChange={handleRememberMeChange}
              />
              <label htmlFor="remember" className={styles.rememberLabel}>
                Recordarme
              </label>
            </div>
            
            <a href="#" className={styles.forgotPassword}>
              ¿Olvidó su contraseña?
            </a>
          </div>
          
          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading}
            style={{ 
              backgroundColor: '#00B5E2', // Pantone 313U
              borderColor: '#0083A9',    // Pantone 314C
              color: 'white'
            }}
          >
            {loading ? 'Procesando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}
