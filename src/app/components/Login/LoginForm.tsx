'use client';

import Link from 'next/link';
import { useLoginForm } from '../../hooks/useLoginForm';
import styles from './LoginForm.module.css';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

export default function LoginForm() {
  const {
    credentials,
    error,
    loading,
    loadingSectores,
    descubriendo,
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
  } = useLoginForm();

  const mostrarEmpresa = !esSuperAdmin && (empresaUnica || multiplesEmpresas);
  const mostrarSector =
    !esSuperAdmin &&
    requiereSector &&
    (empresaUnica || (multiplesEmpresas && !!credentials.empresa) || (!mostrarEmpresa && empresas.length === 0));

  const sectorDeshabilitado =
    loading ||
    descubriendo ||
    loadingSectores ||
    (multiplesEmpresas && !credentials.empresa);

  return (
    <div className={styles.loginContainer}>
      <div className={styles.card}>
        <h2 className={styles.title}>Iniciar Sesión</h2>

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
            <div className={styles.inputWrap}>
              <input
                id="username"
                type="text"
                className={`${styles.inputField} ${descubriendo ? styles.inputWithLoader : ''}`}
                value={credentials.username}
                onChange={handleInputChange}
                placeholder="Ingrese su nombre de usuario"
                disabled={loading}
                autoComplete="username"
              />
              {descubriendo && (
                <span className={styles.inputLoader} aria-hidden="true" title="Buscando empresa y sectores">
                  <Loader2 size={20} className={styles.spinner} />
                </span>
              )}
            </div>
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

          {mostrarEmpresa && multiplesEmpresas && (
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="empresa">
                Empresa
              </label>
              <select
                id="empresa"
                className={styles.inputField}
                value={credentials.empresa}
                onChange={handleInputChange}
                disabled={loading || descubriendo}
              >
                <option value="">Seleccione una empresa</option>
                {empresas.map((empresa) => (
                  <option
                    key={empresa.idEmpresa}
                    value={`${empresa.idEmpresa}-${empresa.descripcionEmpresa}`}
                  >
                    {empresa.descripcionEmpresa}
                  </option>
                ))}
              </select>
            </div>
          )}

          {mostrarEmpresa && empresaUnica && (
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="empresa-display">
                Empresa
              </label>
              <input
                id="empresa-display"
                type="text"
                className={`${styles.inputField} ${styles.inputReadonly}`}
                value={empresaUnicaLabel}
                readOnly
                disabled
                tabIndex={-1}
                aria-readonly="true"
              />
            </div>
          )}

          {mostrarSector && sectorUnico && (
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="sector-display">
                Sector
              </label>
              <input
                id="sector-display"
                type="text"
                className={`${styles.inputField} ${styles.inputReadonly}`}
                value={sectorUnicoLabel}
                readOnly
                disabled
                tabIndex={-1}
                aria-readonly="true"
              />
            </div>
          )}

          {mostrarSector && !sectorUnico && (
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="sector">
                Sector
              </label>
              <select
                id="sector"
                className={styles.inputField}
                value={credentials.sector}
                onChange={handleInputChange}
                disabled={sectorDeshabilitado}
              >
                <option value="">
                  {multiplesEmpresas && !credentials.empresa
                    ? 'Seleccione una empresa primero'
                    : loadingSectores || descubriendo
                      ? 'Cargando sectores...'
                      : 'Seleccione un sector'}
                </option>
                {!loadingSectores &&
                  !descubriendo &&
                  sectores?.map((sector, index) => (
                    <option
                      key={`${sector.idPersonal}-${sector.idSector}-${index}`}
                      value={`${sector.idPersonal}-${sector.idSector}-${sector.descripcionSector}`}
                    >
                      {sector.descripcionSector}
                    </option>
                  ))}
              </select>
            </div>
          )}

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
            disabled={loading || descubriendo}
            style={{
              backgroundColor: '#00B5E2',
              borderColor: '#0083A9',
              color: 'white',
            }}
          >
            {loading ? 'Procesando...' : 'Ingresar'}
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
