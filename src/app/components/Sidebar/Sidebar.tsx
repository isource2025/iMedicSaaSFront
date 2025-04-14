'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Sidebar.module.css';

// Iconos simulados con caracteres
const Icons = {
  Home: () => <span className="text-lg">🏠</span>,
  Beds: () => <span className="text-lg">🛏️</span>,
  Patients: () => <span className="text-lg">👤</span>,
  Appointments: () => <span className="text-lg">📅</span>,
  Reports: () => <span className="text-lg">📊</span>,
  Settings: () => <span className="text-lg">⚙️</span>,
};

type SidebarProps = {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
};

export default function Sidebar({ sidebarOpen, setSidebarOpen }: SidebarProps) {
  const pathname = usePathname();
  
  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Icons.Home },
    { name: 'Gestión de Camas', href: '/dashboard/beds', icon: Icons.Beds },
    { name: 'Pacientes', href: '/dashboard/patients', icon: Icons.Patients },
    { name: 'Citas', href: '/dashboard/appointments', icon: Icons.Appointments },
    { name: 'Reportes', href: '/dashboard/reports', icon: Icons.Reports },
    { name: 'Configuración', href: '/dashboard/settings', icon: Icons.Settings },
  ];

  return (
    <>
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div 
          className={styles.backdrop}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarVisible : styles.sidebarHidden}`}
      >
        {/* Sidebar Header */}
        <div className={styles.sidebarHeader}>
          <div className={styles.logoContainer}>
            <span className={styles.logoIcon}>
              i
            </span>
            MedicWS
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className={styles.closeButton}
          >
            <span className="text-xl">✕</span>
          </button>
        </div>

        {/* Navigation */}
        <nav className={styles.navigation}>
          <ul className={styles.navList}>
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={`${styles.navItem} ${isActive ? styles.navItemActive : styles.navItemInactive}`}
                  >
                    <span className={styles.navIcon}>{<item.icon />}</span>
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        
        {/* Sidebar Footer */}
        <div className={styles.sidebarFooter}>
          <div className={styles.userInfo}>
            <div className={styles.userAvatar}>
              A
            </div>
            <div className={styles.userDetails}>
              <p className={styles.userName}>Admin</p>
              <Link href="/" className={styles.logoutLink}>
                Cerrar Sesión
              </Link>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
