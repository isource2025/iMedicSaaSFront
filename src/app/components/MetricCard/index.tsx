'use client';

import React, { useState } from 'react';
import styles from './MetricCard.module.css';
// Componente Icon local
const Icon = ({ path, className, style }: { path: string; className?: string; style?: React.CSSProperties }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style={style}>
    <path d={path}></path>
  </svg>
);

const ICONS = {
  info: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z'
};
import { MetricTooltipModal } from '../modals/MetricTooltipModal';

interface MetricCardProps {
  title: string;
  value: string | number;
  detail: string;
  icon: string;
  iconColor: string;
  backgroundColor: string;
  tooltipData: {
    description: string;
    formula?: string;
    example?: string;
    importance: string;
  };
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  detail,
  icon,
  iconColor,
  backgroundColor,
  tooltipData
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className={styles.summaryCard}>
        <div className={styles.summaryIconContainer} style={{ backgroundColor }}>
          <Icon path={icon} className={styles.summaryIcon} style={{ color: iconColor }} />
        </div>
        <div className={styles.summaryText}>
          <div className={styles.titleContainer}>
            <h3>{title}</h3>
            <button 
              className={styles.infoButton}
              onClick={() => setIsModalOpen(true)}
              aria-label={`Información sobre ${title}`}
            >
              <Icon path={ICONS.info} className={styles.infoIcon} />
            </button>
          </div>
          <p className={styles.summaryValue}>{value}</p>
          <span className={styles.summaryDetail}>{detail}</span>
        </div>
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
    </>
  );
};
