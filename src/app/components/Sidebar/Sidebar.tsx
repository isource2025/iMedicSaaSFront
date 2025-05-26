'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Sidebar.module.css';
import {
  Home,
  Calendar,
  BarChart,
  Settings,
  CreditCard,
  ClipboardList,
  Activity,
  ChevronDown,
  ChevronRight,
  LogOut
} from 'lucide-react';

type SidebarProps = {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
};

export default function Sidebar({ sidebarOpen, setSidebarOpen }: SidebarProps) {
  const pathname = usePathname();
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});
  const [user, setUser] = useState<{ nombre?: string }>({});

  useEffect(() => {
    try {
      const userJSON = localStorage.getItem("user");
      if (userJSON) {
        setUser(JSON.parse(userJSON));
      }
    } catch {
      setUser({});
    }
  }, []);

  const handleLogOut = () => {
    localStorage.setItem('user', JSON.stringify({}));
    localStorage.setItem('token', JSON.stringify(""));
    localStorage.setItem('sectorSeleccionado', JSON.stringify({}));
  };

  const toggleSubmenu = (menuName: string) => {
    setExpandedMenus(prev => ({
      ...Object.fromEntries(Object.keys(prev).map(k => [k, false])),
      [menuName]: !prev[menuName],
    }));
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    {
      name: 'Turnos', icon: Calendar, hasSubmenu: true, submenuName: 'appointments', submenuItems: [
        { name: 'Agenda', href: '/dashboard/appointments/schedule' },
        { name: 'Administrador de turnos', href: '/dashboard/appointments/manager' },
        { name: 'Excepciones', href: '/dashboard/appointments/exceptions' },
        { name: 'Configuración', href: '/dashboard/appointments/config' },
        { name: 'Tablas de turnos', href: '/dashboard/appointments/tables' },
      ]
    },
    {
      name: 'Admisión', icon: ClipboardList, hasSubmenu: true, submenuName: 'admission', submenuItems: [
        { name: 'Pacientes', href: '/dashboard/patients' },
        { name: 'Nueva admisión', href: '/dashboard/admission/new' },
        { name: 'Admisiones vigentes', href: '/dashboard/admission/current' },
        { name: 'Tablas de admisión', href: '/dashboard/admission/tables' },
      ]
    },
    {
      name: 'Internación', icon: Activity, hasSubmenu: true, submenuName: 'inpatient', submenuItems: [
        { name: 'Gestión de Camas', href: '/dashboard/beds' },
        { name: 'Ocupación de camas', href: '/dashboard/beds/occupation' },
        { name: 'Tablas de internación', href: '/dashboard/beds/tables' },
      ]
    },
    {
      name: 'Facturación', icon: CreditCard, hasSubmenu: true, submenuName: 'billing', submenuItems: [
        { name: 'Convenios', href: '/dashboard/billing/convenios' },
        { name: 'Rendiciones', href: '/dashboard/billing/rendiciones' },
        { name: 'Liquidaciones', href: '/dashboard/billing/liquidaciones' },
        { name: 'Tablas de facturación', href: '/dashboard/billing/tables' },
      ]
    },
    {
      name: 'Reportes', icon: BarChart, hasSubmenu: true, submenuName: 'reports', submenuItems: [
        { name: 'Estadísticas', href: '/dashboard/reports/stats' },
        { name: 'Facturación', href: '/dashboard/reports/billing' },
        { name: 'Ocupación', href: '/dashboard/reports/occupation' },
      ]
    },
    {
      name: 'Configuración', icon: Settings, hasSubmenu: true, submenuName: 'settings', submenuItems: [
        { name: 'General', href: '/dashboard/settings/general' },
        { name: 'Usuarios', href: '/dashboard/settings/users' },
        { name: 'Permisos', href: '/dashboard/settings/permissions' },
        { name: 'Sectores', href: '/dashboard/settings/sectors' },
      ]
    },
  ];

  return (
    <>
      {/* Backdrop solo para mobile */}
      <div className={`${styles.backdrop} ${sidebarOpen ? styles.backdropVisible : ''}`} onClick={() => setSidebarOpen(false)} />
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarVisible : styles.sidebarHidden}`}>
        <div className={styles.sidebarHeader}>
          <div className={styles.logoContainer}>
            <span className={styles.logoIcon}>i</span>
            MedicWS
          </div>
          <button onClick={() => setSidebarOpen(false)} className={styles.closeButton}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <nav className={styles.navigation}>
          <ul className={styles.navList}>
            {navigation.map((item) => {
              const cleanPath = pathname.split('?')[0].split('#')[0];
              const isActive = item.href
                ? cleanPath === item.href
                : item.submenuItems?.some(sub => cleanPath.startsWith(sub.href));

              return (
                <li key={item.name}>
                  {item.hasSubmenu ? (
                    <>
                      <button
                        onClick={() => toggleSubmenu(item.submenuName)}
                        className={`${styles.navItem} ${isActive ? styles.navItemActive : styles.navItemInactive}`}
                      >
                        <span className={styles.navIcon}><item.icon size={20} /></span>
                        {item.name}
                        <span className={styles.submenuArrow} style={expandedMenus[item.submenuName] ? { transform: 'rotate(180deg)' } : {}}>
                          <ChevronDown size={16} />
                        </span>
                      </button>
                      {expandedMenus[item.submenuName] && (
                        <ul className={styles.submenuList}>
                          {item.submenuItems.map((subitem) => {
                            const isSubitemActive = pathname === subitem.href || pathname.startsWith(`${subitem.href}/`);
                            return (
                              <li key={subitem.name}>
                                <Link
                                  href={subitem.href}
                                  className={`${styles.submenuItem} ${isSubitemActive ? styles.submenuItemActive : styles.submenuItemInactive}`}
                                >
                                  {subitem.name}
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </>
                  ) : (
                    <Link
                      href={item.href || '#'}
                      className={`${styles.navItem} ${isActive ? styles.navItemActive : styles.navItemInactive}`}
                    >
                      <span className={styles.navIcon}><item.icon size={20} /></span>
                      {item.name}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.userSection}>
            <div className={styles.userAvatar}>
              {user?.nombre ? user.nombre.charAt(0).toUpperCase() : 'A'}
            </div>
            <div className={styles.userInfo}>
              <p className={styles.userName}>{user?.nombre || 'Usuario'}</p>
              <p className={styles.userRole}>Administrador</p>
            </div>
            <button className={styles.userMenu}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="1"></circle>
                <circle cx="12" cy="5" r="1"></circle>
                <circle cx="12" cy="19" r="1"></circle>
              </svg>
            </button>
          </div>
          <Link onClick={handleLogOut} href="/" className={styles.logoutLink}>
            <LogOut size={16} /> Cerrar Sesión
          </Link>
        </div>
      </aside>
    </>
  );
}
