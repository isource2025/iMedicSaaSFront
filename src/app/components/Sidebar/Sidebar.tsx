'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Sidebar.module.css';
import { 
  Home, 
  Bed, 
  Users, 
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
  const [isMobile, setIsMobile] = useState(false);

  // Detectar si estamos en una pantalla móvil
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    // Verificar al cargar
    checkMobile();
    
    // Verificar al cambiar el tamaño de pantalla
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);
  
  // Cerrar menú al cambiar de ruta en móvil
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [pathname, isMobile, setSidebarOpen]);

  const handleLogOut = () => {
    localStorage.setItem('user', JSON.stringify({}));
    localStorage.setItem('token', JSON.stringify(""));
    localStorage.setItem('sectorSeleccionado', JSON.stringify({}));
  }
  
  // Maneja la expansión/contracción de menús desplegables
  const toggleSubmenu = (menuName: string) => {
    setExpandedMenus(prev => {
      // Si el menú ya está expandido, lo cerramos
      if (prev[menuName]) {
        return {
          ...prev,
          [menuName]: false
        };
      }
      
      // Si el menú está cerrado, lo abrimos y cerramos todos los demás
      const newState: Record<string, boolean> = {};
      
      // Cerramos todos los menús
      Object.keys(prev).forEach(key => {
        newState[key] = false;
      });
      
      // Abrimos solo el menú seleccionado
      newState[menuName] = true;
      
      return newState;
    });
  };
  
  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    {
      name: 'Turnos',
      icon: Calendar,
      hasSubmenu: true,
      submenuName: 'appointments',
      submenuItems: [
        { name: 'Agenda', href: '/dashboard/appointments/schedule' },
        { name: 'Administrador de turnos', href: '/dashboard/appointments/manager' },
        { name: 'Excepciones', href: '/dashboard/appointments/exceptions' },
        { name: 'Configuración', href: '/dashboard/appointments/config' },
        { name: 'Tablas de turnos', href: '/dashboard/appointments/tables' },
      ]
    },
    {
      name: 'Admisión',
      icon: ClipboardList,
      hasSubmenu: true,
      submenuName: 'admission',
      submenuItems: [
        { name: 'Pacientes', href: '/dashboard/patients' },
        { name: 'Nueva admisión', href: '/dashboard/admission/new' },
        { name: 'Admisiones vigentes', href: '/dashboard/admission/current' },
        { name: 'Tablas de admisión', href: '/dashboard/admission/tables' },
      ]
    },
    {
      name: 'Internación',
      icon: Activity,
      hasSubmenu: true,
      submenuName: 'inpatient',
      submenuItems: [
        { name: 'Gestión de Camas', href: '/dashboard/beds' },
        { name: 'Ocupación de camas', href: '/dashboard/inpatient/occupation' },
        { name: 'Evolucion pacientes', href: '/dashboard/inpatient/progress' },
        { name: 'Alta/Traslado', href: '/dashboard/inpatient/discharge' },
      ]
    },
    {
      name: 'Reportes',
      icon: BarChart,
      hasSubmenu: true,
      submenuName: 'reports',
      submenuItems: [
        { name: 'Estadísticas', href: '/dashboard/reports/stats' },
        { name: 'Facturación', href: '/dashboard/reports/billing' },
        { name: 'Ocupación', href: '/dashboard/reports/occupation' },
      ]
    },
    {
      name: 'Facturación',
      icon: CreditCard,
      hasSubmenu: true,
      submenuName: 'billing',
      submenuItems: [
        { name: 'Facturas', href: '/dashboard/billing/invoices' },
        { name: 'Pagos', href: '/dashboard/billing/payments' },
        { name: 'Coberturas', href: '/dashboard/billing/coverage' },
      ]
    },
    {
      name: 'Configuración',
      icon: Settings,
      hasSubmenu: true,
      submenuName: 'settings',
      submenuItems: [
        { name: 'General', href: '/dashboard/settings/general' },
        { name: 'Usuarios', href: '/dashboard/settings/users' },
        { name: 'Permisos', href: '/dashboard/settings/permissions' },
        { name: 'Sectores', href: '/dashboard/settings/sectors' },
      ]
    },
  ];

  return (
    <>
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div 
          className={styles.backdrop}
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
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
            aria-label="Cerrar menú"
          >
            <span className="text-xl">×</span>
          </button>
        </div>

        {/* Navigation */}
        <nav className={styles.navigation}>
          <ul className={styles.navList}>
            {navigation.map((item) => {
              const isActive = item.href ? (pathname === item.href || pathname.startsWith(`${item.href}/`)) : 
                (item.submenuItems && item.submenuItems.some(subitem => 
                  pathname === subitem.href || pathname.startsWith(`${subitem.href}/`)));
              
              return (
                <li key={item.name}>
                  {item.hasSubmenu ? (
                    <div>
                      <button
                        onClick={() => toggleSubmenu(item.submenuName)}
                        className={`${styles.navItem} ${styles.navItemSubmenu} ${isActive ? styles.navItemActive : styles.navItemInactive}`}
                      >
                        <span className={styles.navIcon}>
                          {<item.icon size={20} color={isActive ? "#00B5E2" : "#64748b"} />}
                        </span>
                        {item.name}
                        <span className={styles.submenuArrow}>
                          {expandedMenus[item.submenuName] ? 
                            <ChevronDown size={16} /> : 
                            <ChevronRight size={16} />
                          }
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
                    </div>
                  ) : (
                    <Link
                      href={item.href || '#'}
                      className={`${styles.navItem} ${isActive ? styles.navItemActive : styles.navItemInactive}`}
                    >
                      <span className={styles.navIcon}>
                        {<item.icon size={20} color={isActive ? "#00B5E2" : "#64748b"} />}
                      </span>
                      {item.name}
                    </Link>
                  )}
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
              <Link onClick={handleLogOut} href="/" className={styles.logoutLink}>
                <LogOut size={14} className={styles.logoutIcon} /> Cerrar Sesión
              </Link>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
