'use client';

import { useLoginForm } from '../../hooks/useLoginForm';
import styles from './LoginForm.module.css';

export default function LoginForm() {
  const {
    credentials,
    error,
    loading,
    loadingSectores,
    rememberMe,
    sectores,
    handleInputChange,
    handleRememberMeChange,
    handleSubmit
  } = useLoginForm();

  return (
    <div className={styles.loginContainer}>
      <div className={styles.card}>
        <div className={styles.logoContainer}>
          <div className={styles.logo}>
            <div className={styles.logoCircle}>
              <h1 className={styles.logoText}>iMedicWS</h1>
            </div>
          </div>
        </div>
        
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
            <input
              id="password"
              type="password"
              className={styles.inputField}
              value={credentials.password}
              onChange={handleInputChange}
              placeholder="••••••••"
              disabled={loading}
            />
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
                sectores.map(sector => (
                  <option key={sector.ValorPersonalSector} value={sector.ValorPersonalSector}>
                    {sector.DescripcionPersonalSector}
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
          >
            {loading ? 'Procesando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}
