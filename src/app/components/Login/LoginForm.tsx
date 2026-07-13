'use client';

import Link from 'next/link';
import { useLoginForm } from '../../hooks/useLoginForm';
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
    handleInputChange,
    handleRememberMeChange,
    handleSubmit,
    togglePasswordVisibility,
    volverACredenciales,
  } = useLoginForm();

  return (
    <div className={styles.loginContainer}>
      <div className={styles.card}>
        <h2 className={styles.title}>
          {loginStep === 'SELECT_EMPRESA' ? 'Seleccionar empresa' : 'Iniciar Sesión'}
        </h2>

        {error && (
          <div className={styles.errorAlert} role="alert">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {loginStep === 'CREDENTIALS' && (
            <>
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
                  autoComplete="username"
                />
              </div>

              <div className={styles.formGroupPassword}>
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
                    placeholder="••••••••"
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
                      <EyeOff size={20} color="#0083A9" />
                    ) : (
                      <Eye size={20} color="#0083A9" />
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
                onClick={volverACredenciales}
                disabled={loading}
              >
                ← Volver a credenciales
              </button>
            </div>
          )}

          {loginStep === 'CREDENTIALS' && (
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
          )}

          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading}
            style={{
              backgroundColor: '#00B5E2',
              borderColor: '#0083A9',
              color: 'white',
            }}
          >
            {loading
              ? 'Procesando...'
              : loginStep === 'SELECT_EMPRESA'
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
    </div>
  );
}

function empresaToValue(e: { idEmpresa: number; descripcionEmpresa: string }) {
  return `${e.idEmpresa}-${e.descripcionEmpresa}`;
}
