'use client';

import React, { useState } from 'react';
import { MetricTooltipModal } from '../modals/MetricTooltipModal';
import styles from './InsightCard.module.css';

// Componente Icon local
const Icon = ({ path, className, style }: { path: string; className?: string; style?: React.CSSProperties }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style={style}>
    <path d={path}></path>
  </svg>
);

const ICONS = {
  info: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z'
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
}

export const InsightCard: React.FC<InsightCardProps> = ({
  icon,
  iconColor = "#00B5E2",
  title,
  content,
  tooltipData
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

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
