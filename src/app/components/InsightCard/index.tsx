'use client';

import React, { useState, useEffect } from 'react';
import { MetricTooltipModal } from '../modals/MetricTooltipModal';
import styles from './InsightCard.module.css';

// Componente Icon local
const Icon = ({ path, className, style }: { path: string; className?: string; style?: React.CSSProperties }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style={style}>
    <path d={path}></path>
  </svg>
);

const ICONS = {
  info: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z',
  analyze: 'M9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4zm2.5 2.25l1.5-1.5L15.5 12 14 13.5l-1.5-1.5L11 13.5 9.5 12 8 13.5l-1.5-1.5L5 13.5l1.5 1.5L8 16.5l1.5-1.5L11 16.5l1.5-1.5L14 16.5l1.5-1.5z'
};

interface InsightCardProps {
  icon: string;
  iconColor?: string;
  title: string;
  content: React.ReactNode;
  tooltipData: {
    description: string;
    formula?: string;
    example?: string;
    importance: string;
  };
  onAnalyze?: () => void;
  analysisData?: {
    title: string;
    insights: string[];
    recommendations: string[];
    metrics?: { label: string; value: string; trend?: 'up' | 'down' | 'stable' }[];
  } | null;
}

export const InsightCard: React.FC<InsightCardProps> = ({
  icon,
  iconColor = "#00B5E2",
  title,
  content,
  tooltipData,
  onAnalyze,
  analysisData
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);

  return (
    <>
      <div className={styles.insightCard}>
        <div className={styles.headerContainer}>
          <Icon path={icon} className={styles.insightIcon} style={{ color: iconColor }} />
          <button 
            className={styles.infoButton}
            onClick={() => setIsModalOpen(true)}
            aria-label={`Información sobre ${title}`}
          >
            <Icon path={ICONS.info} className={styles.infoIcon} />
          </button>
        </div>
        <h4>{title}</h4>
        <div className={styles.content}>
          {content}
        </div>
        {onAnalyze && (
          <button 
            className={styles.analyzeButton}
            onClick={() => {
              onAnalyze();
              setIsAnalysisModalOpen(true);
            }}
            aria-label={`Análisis profundo de ${title}`}
          >
            <Icon path={ICONS.analyze} className={styles.analyzeIcon} />
            Análisis Profundo
          </button>
        )}
      </div>

      <MetricTooltipModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={title}
        description={tooltipData.description}
        formula={tooltipData.formula}
        example={tooltipData.example}
        importance={tooltipData.importance}
      />

      {analysisData && (
        <div className={`${styles.analysisModal} ${isAnalysisModalOpen ? styles.analysisModalOpen : ''}`}>
          <div className={styles.analysisModalContent}>
            <div className={styles.analysisModalHeader}>
              <h3>{analysisData.title}</h3>
              <button 
                className={styles.closeButton}
                onClick={() => setIsAnalysisModalOpen(false)}
                aria-label="Cerrar análisis"
              >
                ×
              </button>
            </div>
            <div className={styles.analysisModalBody}>
              {analysisData.metrics && (
                <div className={styles.metricsSection}>
                  <h4>Métricas Clave</h4>
                  <div className={styles.metricsList}>
                    {analysisData.metrics.map((metric, index) => (
                      <div key={index} className={styles.metricItem}>
                        <span className={styles.metricLabel}>{metric.label}:</span>
                        <span className={styles.metricValue}>
                          {metric.value}
                          {metric.trend && (
                            <span className={`${styles.trendIcon} ${styles[`trend${metric.trend.charAt(0).toUpperCase() + metric.trend.slice(1)}`]}`}>
                              {metric.trend === 'up' ? '↗' : metric.trend === 'down' ? '↘' : '→'}
                            </span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className={styles.insightsSection}>
                <h4>Insights Detectados</h4>
                <ul className={styles.insightsList}>
                  {analysisData.insights.map((insight, index) => (
                    <li key={index}>{insight}</li>
                  ))}
                </ul>
              </div>
              <div className={styles.recommendationsSection}>
                <h4>Recomendaciones</h4>
                <ul className={styles.recommendationsList}>
                  {analysisData.recommendations.map((recommendation, index) => (
                    <li key={index}>{recommendation}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
