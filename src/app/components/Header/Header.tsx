'use client';

import React from 'react';
import Link from 'next/link';
import styles from './Header.module.css';

type HeaderProps = {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
};

export default function Header({ sidebarOpen, setSidebarOpen }: HeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.headerContent}>
          {/* Left side - Menu icon for mobile */}
          <div className={styles.leftSection}>
            <button
              type="button"
              className={styles.menuButton}
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <span className="sr-only">Open sidebar</span>
              <span className="text-2xl">☰</span>
            </button>
            
            {/* Page title */}
            <h1 className={styles.pageTitle}>
              Dashboard
            </h1>
          </div>

          {/* Right side - User options */}
          <div className={styles.rightSection}>
            {/* Notifications */}
            <button className={styles.notificationButton}>
              <span className="sr-only">Ver notificaciones</span>
              <span className="text-xl">🔔</span>
            </button>
            
            {/* User profile dropdown */}
            <div className={styles.userSection}>
              <div className="flex items-center">
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
