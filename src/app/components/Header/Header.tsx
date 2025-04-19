'use client';

import React from 'react';
import Link from 'next/link';
import styles from './Header.module.css';
import { useAppContext } from '../../contexts/AppContext';

type HeaderProps = {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
};

export default function Header({ sidebarOpen, setSidebarOpen }: HeaderProps) {
  // Obtener el sector seleccionado del contexto
  const { sectorSeleccionado } = useAppContext();

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.headerContent}>
          {/* Left side - Menu icon for mobile and Sector info */}
          <div className={styles.leftSection}>
            <button
              type="button"
              className={styles.menuButton}
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <span className={styles.srOnly}>Open sidebar</span>
              <span className={styles.menuIcon}>☰</span>
            </button>
            
            {/* Mostrar el sector seleccionado */}
            {sectorSeleccionado && (
              <div className={styles.sectorInfo}>
                <span className={styles.sectorLabel}>Sector:</span>
                <span className={styles.sectorDescription}>{sectorSeleccionado.descripcion}</span>
              </div>
            )}
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
                    A
                  </div>
                  <span className={styles.userName}>
                    Admin
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
