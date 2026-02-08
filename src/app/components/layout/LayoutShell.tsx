'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, Settings, HelpCircle, ChevronDown, LogOut } from 'lucide-react';
import Sidebar from '../Sidebar/Sidebar';
import { useAppContext } from '../../contexts/AppContext';
import styles from './LayoutShell.module.css';

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { logout, usuario } = useAppContext();
  const router = useRouter();
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userMenuOpen]);

  const handleLogOut = async () => {
    if (isLoggingOut) return;
    
    try {
      setIsLoggingOut(true);
      
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('sectorSeleccionado');
      localStorage.removeItem('empresaInfo');
      
      setUserMenuOpen(false);
      
      if (logout) {
        await logout();
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      router.push('/');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      router.push('/');
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className={styles.layout}>
      <Sidebar 
        expanded={sidebarExpanded} 
        onExpandedChange={setSidebarExpanded} 
      />
      
      {/* Overlay clickeable para cerrar el sidebar */}
      <div 
        className={`${styles.overlay} ${sidebarExpanded ? styles.overlayVisible : ''}`}
        onClick={() => setSidebarExpanded(false)}
      />
      
      {/* Contenido principal con efectos de blur y desplazamiento */}
      <main className={`${styles.main} ${sidebarExpanded ? styles.mainShifted : ''}`}>
        {/* Botón de menú hamburguesa/logo para mobile */}
        {isMobile && (
          <button 
            className={`${styles.menuButton} ${sidebarExpanded ? styles.menuButtonOpen : ''}`}
            onClick={() => setSidebarExpanded(!sidebarExpanded)}
            aria-label={sidebarExpanded ? "Cerrar menú" : "Abrir menú"}
          >
            <span className={styles.menuIcon}>
              <span className={styles.menuLine}></span>
              <span className={styles.menuLine}></span>
              <span className={styles.menuLine}></span>
            </span>
            <span className={styles.logoText}>iM</span>
          </button>
        )}

        {/* Menú de usuario */}
        <div className={styles.userMenuContainer} ref={userMenuRef}>
          <button 
            className={styles.userMenuButton}
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            aria-label="Menú de usuario"
          >
            <div className={styles.userAvatar}>
              {usuario?.nombre?.charAt(0).toUpperCase() || 'U'}
            </div>
            <ChevronDown 
              className={`${styles.chevronIcon} ${userMenuOpen ? styles.chevronOpen : ''}`} 
              size={16} 
            />
          </button>
          {userMenuOpen && (
            <div className={styles.userDropdown}>
              <div className={styles.userDropdownHeader}>
                <span className={styles.userDropdownName}>{usuario?.nombre || 'Usuario'}</span>
                <span className={styles.userDropdownRole}>Administrador</span>
              </div>
              <div className={styles.userDropdownDivider}></div>
              <Link href="/profile" className={styles.userDropdownItem}>
                <User size={16} />
                <span>Mi Perfil</span>
              </Link>
              <Link href="/settings" className={styles.userDropdownItem}>
                <Settings size={16} />
                <span>Configuración</span>
              </Link>
              <Link href="/help" className={styles.userDropdownItem}>
                <HelpCircle size={16} />
                <span>Ayuda</span>
              </Link>
              <div className={styles.userDropdownDivider}></div>
              <button 
                onClick={handleLogOut} 
                className={`${styles.userDropdownItem} ${isLoggingOut ? styles.userDropdownItemLoading : ''}`}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? (
                  <>
                    <div className={styles.spinner}></div>
                    <span>Cerrando sesión...</span>
                  </>
                ) : (
                  <>
                    <LogOut size={16} />
                    <span>Cerrar Sesión</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        <div className={styles.content}>
          {children}
        </div>
      </main>
    </div>
  );
}
