'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, Settings, HelpCircle, ChevronDown, LogOut } from 'lucide-react';
import Sidebar from '../Sidebar/Sidebar';
import { useAppContext } from '../../contexts/AppContext';
import styles from './LayoutShell.module.css';

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { logout, usuario } = useAppContext();
  const router = useRouter();
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Cerrar menú al hacer click fuera
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
    if (isLoggingOut) return; // Prevenir múltiples clicks
    
    try {
      setIsLoggingOut(true);
      
      // Limpiar localStorage
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('sectorSeleccionado');
      localStorage.removeItem('empresaInfo');
      
      // Cerrar el menú de usuario
      setUserMenuOpen(false);
      
      // Llamar al logout del contexto si existe
      if (logout) {
        await logout();
      }
      
      // Pequeña pausa para mostrar el estado de loading
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Redireccionar a la página de login
      router.push('/');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      // Aún así redirigir en caso de error
      router.push('/');
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className={styles.container}>
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} isDesktop={isDesktop} />

      <div className={`${styles.content} ${isDesktop ? styles.contentWithSidebarDesktop : (sidebarOpen ? styles.contentWithSidebar : styles.contentWithoutSidebar)}`}>
        {/* Botón de menú hamburguesa solo para mobile */}
        {!isDesktop && (
          <button 
            className={`${styles.menuButton} ${sidebarOpen ? styles.menuButtonOpen : styles.menuButtonClosed}`}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Abrir menú"
            style={{ display: sidebarOpen ? 'none' : 'flex' }}
          >
            <span className={styles.menuIcon}>
              ☰
            </span>
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

        <main className={styles.main}>
          {children}
        </main>
      </div>
    </div>
  );
}
