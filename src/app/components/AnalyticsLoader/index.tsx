import React from 'react';
import styles from './AnalyticsLoader.module.css';

interface AnalyticsLoaderProps {
  message?: string;
  subMessage?: string;
  progress?: number;
  showProgress?: boolean;
}

export const AnalyticsLoader: React.FC<AnalyticsLoaderProps> = ({
  message = "Cargando análisis...",
  subMessage = "Procesando datos estadísticos",
  progress = 0,
  showProgress = false
}) => {
  return (
    <div className={styles.loaderContainer}>
      <div className={styles.loaderContent}>
        {/* Animación principal */}
        <div className={styles.loaderAnimation}>
          <div className={styles.pulseRing}></div>
          <div className={styles.pulseRing}></div>
          <div className={styles.pulseRing}></div>
          <div className={styles.centerIcon}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path 
                d="M3 3v18h18" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
              <path 
                d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* Texto principal */}
        <div className={styles.loaderText}>
          <h3 className={styles.mainMessage}>{message}</h3>
          <p className={styles.subMessage}>{subMessage}</p>
        </div>

        {/* Barra de progreso opcional */}
        {showProgress && (
          <div className={styles.progressContainer}>
            <div className={styles.progressBar}>
              <div 
                className={styles.progressFill}
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              ></div>
            </div>
            <span className={styles.progressText}>{Math.round(progress)}%</span>
          </div>
        )}

        {/* Indicadores de datos */}
        <div className={styles.dataIndicators}>
          <div className={styles.indicator}>
            <div className={styles.indicatorDot}></div>
            <span>Métricas</span>
          </div>
          <div className={styles.indicator}>
            <div className={styles.indicatorDot}></div>
            <span>Gráficos</span>
          </div>
          <div className={styles.indicator}>
            <div className={styles.indicatorDot}></div>
            <span>Insights</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsLoader;
