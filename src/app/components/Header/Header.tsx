'use client';
import styles from './Header.module.css';
import { useAppContext } from '../../contexts/AppContext';

type HeaderProps = {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
};

export default function Header({ sidebarOpen, setSidebarOpen }: HeaderProps) {
  // Obtener el sector seleccionado y la información de empresa del contexto
  const { sectorSeleccionado, empresaInfo,usuario } = useAppContext();

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.headerContent}>
          {/* Left side - Menu icon for mobile, Empresa info and Sector info */}
          <div className={styles.leftSection}>
            <button
              type="button"
              className={styles.menuButton}
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <span className={styles.srOnly}>Abrir menú</span>
              <span className={styles.menuIcon}>☰</span>
            </button>
            <div className={`${styles.infoScroller} notranslate`} translate="no">
              {/* Mostrar la información de la empresa */}
              {empresaInfo && (
                <div className={styles.empresaInfo}>
                  <span className={styles.empresaLabel}></span>
                  <span className={styles.empresaDescription}>{empresaInfo.descripcion}</span>
                </div>
              )}

              {/* Mostrar el sector seleccionado */}
              {sectorSeleccionado && (
                <div className={styles.sectorInfo}>
                  <span className={styles.sectorLabel}>Sector:</span>
                  <span className={styles.sectorDescription}>{sectorSeleccionado.descripcion}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right side - User options */}
          <div className={styles.rightSection}>
            {/* Notifications */}
            <button className={styles.notificationButton}>
              <span className={styles.srOnly}>Ver notificaciones</span>
              <span className={styles.notificationIcon}>🔔</span>
            </button>
            
            {/* User profile dropdown */}
            <div className={styles.userSection}>
              <div className={styles.userContainer}>
                <button className={styles.userButton}>
                  <div className={styles.userAvatar}>
                    {usuario?.nombre?.charAt(0).toUpperCase()}
                  </div>
                  <span className={`${styles.userName} notranslate`} translate="no">
                    {usuario?.nombre}
                  </span>
                  <span className={styles.dropdownArrow}>▼</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

