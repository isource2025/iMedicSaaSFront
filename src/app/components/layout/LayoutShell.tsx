'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '../Sidebar/Sidebar';
import NotificationsFab from './NotificationsFab';
import styles from './LayoutShell.module.css';

function isBedDetailPath(pathname: string | null) {
  return !!pathname && /^\/dashboard\/beds\/[^/]+/.test(pathname);
}

function isChatsPath(pathname: string | null) {
  return !!pathname && pathname.startsWith('/dashboard/turnos/chats');
}

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const hideGlobalNotificationsFab = isBedDetailPath(pathname);
  const lockMainScroll = isChatsPath(pathname);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);


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
      <main
        className={`${styles.main} ${sidebarExpanded ? styles.mainShifted : ''} ${lockMainScroll ? styles.mainLocked : ''}`}
      >
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
            <img
              className={styles.logoMark}
              src="/logo-isource.png"
              alt="iSource"
              width={34}
              height={34}
            />
          </button>
        )}

        <div className={styles.content}>
          {children}
        </div>
      </main>

      {!hideGlobalNotificationsFab ? <NotificationsFab /> : null}
    </div>
  );
}
