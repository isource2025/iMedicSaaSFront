'use client';

import Link from 'next/link';
import { useLoginForm } from '../../hooks/useLoginForm';
import { ImedicWordmark } from './ImedicBrand';
import styles from './LoginForm.module.css';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginForm() {
  const {
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
  } = useLoginForm();

  return (
    <div className={styles.loginContainer}>
      <ImedicWordmark size="lg" />

      {loginStep === 'SELECT_EMPRESA' && (
        <h2 className={styles.title}>Seleccionar empresa</h2>
      )}
      {loginStep === 'SELECT_SECTOR' && (
        <h2 className={styles.title}>Seleccionar sector</h2>
      )}

      {error && (
        <div className={styles.errorAlert} role="alert">
          <span>{error}</span>
        </div>
      )}

      <form className={styles.form} onSubmit={handleSubmit}>
        {loginStep === 'CREDENTIALS' && (
          <>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="username">
                Usuario
              </label>
              <input
                id="username"
                type="text"
                className={`${styles.inputField} notranslate`}
                translate="no"
                value={credentials.username}
                onChange={handleInputChange}
                disabled={loading}
                autoComplete="username"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="password">
                Contraseña
              </label>
              <div className={styles.passwordInputContainer}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className={`${styles.inputField} ${styles.passwordInput}`}
                  value={credentials.password}
                  onChange={handleInputChange}
                  disabled={loading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={togglePasswordVisibility}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? (
                    <EyeOff size={18} color="#9aa6b0" />
                  ) : (
                    <Eye size={18} color="#9aa6b0" />
                  )}
                </button>
              </div>
            </div>
          </>
        )}

        {loginStep === 'SELECT_EMPRESA' && (
          <div className={styles.formGroup}>
            <p className={styles.stepHint}>
              Credenciales verificadas. Elija la empresa con la que desea ingresar.
            </p>
            <label className={styles.label} htmlFor="empresa">
              Empresa
            </label>
            <select
              id="empresa"
              className={styles.inputField}
              value={credentials.empresa}
              onChange={handleInputChange}
              disabled={loading}
            >
              <option value="">Seleccione una empresa</option>
              {empresas.map((empresa) => (
                <option
                  key={empresa.idEmpresa}
                  value={empresaToValue(empresa)}
                >
                  {empresa.descripcionEmpresa}
                </option>
              ))}
            </select>
            <button
              type="button"
              className={styles.backLink}
              onClick={volverAtras}
              disabled={loading}
            >
              ← Volver a credenciales
            </button>
          </div>
        )}

        {loginStep === 'SELECT_SECTOR' && (
          <div className={styles.formGroup}>
            <p className={styles.stepHint}>
              Credenciales verificadas. Elija el sector con el que desea ingresar.
            </p>
            <label className={styles.label} htmlFor="sector">
              Sector
            </label>
            <select
              id="sector"
              className={styles.inputField}
              value={credentials.sector}
              onChange={handleInputChange}
              disabled={loading}
            >
              <option value="">Seleccione un sector</option>
              {sectores.map((sector) => (
                <option key={sector.idSector} value={sector.idSector}>
                  {sectorLabel(sector)}
                </option>
              ))}
            </select>
            <button
              type="button"
              className={styles.backLink}
              onClick={volverAtras}
              disabled={loading}
            >
              {empresas.length > 1 ? '← Volver a empresa' : '← Volver a credenciales'}
            </button>
          </div>
        )}

        {loginStep === 'CREDENTIALS' && (
          <div className={styles.formOptions}>
            <label htmlFor="remember" className={styles.rememberContainer}>
              <input
                id="remember"
                type="checkbox"
                className={styles.checkbox}
                checked={rememberMe}
                onChange={handleRememberMeChange}
              />
              <span className={styles.rememberLabel}>Recordarme</span>
            </label>

            <a href="#" className={styles.forgotPassword}>
              ¿Olvidó su contraseña?
            </a>
          </div>
        )}

        <button
          type="submit"
          className={styles.submitButton}
          disabled={loading}
        >
          {loading
            ? 'Procesando...'
            : loginStep === 'SELECT_EMPRESA' || loginStep === 'SELECT_SECTOR'
              ? 'Continuar'
              : 'Ingresar'}
        </button>
      </form>

      <p className={styles.privacyNote}>
        <Link href="/politica-de-privacidad" className={styles.privacyLink}>
          Política de privacidad
        </Link>
      </p>
    </div>
  );
}

function empresaToValue(e: { idEmpresa: number; descripcionEmpresa: string }) {
  return `${e.idEmpresa}-${e.descripcionEmpresa}`;
}

function sectorLabel(s: { idSector: string; descripcion: string; valorServicio?: string }) {
  const desc = String(s.descripcion || '').trim() || s.idSector;
  const svc = String(s.valorServicio || '').trim();
  if (svc && desc.toUpperCase() !== svc.toUpperCase()) {
    return `${desc} (${s.idSector}) · ${svc}`;
  }
  if (desc.toUpperCase() !== String(s.idSector).toUpperCase()) {
    return `${desc} (${s.idSector})`;
  }
  return desc;
}
