'use client';

import { useState, useEffect } from 'react';
import Sidebar from '../Sidebar/Sidebar';
import styles from './LayoutShell.module.css';

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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

        <div className={styles.content}>
          {children}
        </div>
      </main>
    </div>
  );
}
