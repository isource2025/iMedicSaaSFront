import React, { useState } from 'react';
import styles from './MetricTooltip.module.css';

interface MetricTooltipProps {
  label: string;
  value: string | number;
  description: string;
  formula?: string;
  interpretation?: string;
  className?: string;
}

export const MetricTooltip: React.FC<MetricTooltipProps> = ({
  label,
  value,
  description,
  formula,
  interpretation,
  className = ''
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className={`${styles.metricContainer} ${className}`}>
      <div className={styles.metricItem}>
        <span className={styles.statLabel}>
          {label}:
          <button
            className={styles.infoButton}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onClick={() => setShowTooltip(!showTooltip)}
            type="button"
            aria-label={`Información sobre ${label}`}
          >
            ℹ
          </button>
        </span>
        <span className={styles.statValue}>{value}</span>
      </div>
      
      {showTooltip && (
        <div className={styles.tooltip}>
          <div className={styles.tooltipContent}>
            <h4>{label}</h4>
            <p className={styles.description}>{description}</p>
            
            {formula && (
              <div className={styles.formulaSection}>
                <strong>Cálculo:</strong>
                <code className={styles.formula}>{formula}</code>
              </div>
            )}
            
            {interpretation && (
              <div className={styles.interpretationSection}>
                <strong>Interpretación:</strong>
                <p>{interpretation}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
