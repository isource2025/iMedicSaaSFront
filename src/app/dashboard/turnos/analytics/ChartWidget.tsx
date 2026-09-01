'use client';

import { useState, type ReactNode } from 'react';
import { MetricTooltipModal } from '@/app/components/modals/MetricTooltipModal';
import styles from './AmbulatorioAnalytics.module.css';

const InfoIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
  </svg>
);

export interface ChartWidgetTooltip {
  description: string;
  formula?: string;
  example?: string;
  importance: string;
}

interface ChartWidgetProps {
  title: string;
  hint?: string;
  /** Tamaño en la grilla de 12 columnas. */
  span?: 4 | 5 | 6 | 7 | 8 | 12;
  tooltipData?: ChartWidgetTooltip;
  emptyMessage?: string;
  isEmpty?: boolean;
  legend?: ReactNode;
  children: ReactNode;
}

export function ChartWidget({
  title,
  hint,
  span = 6,
  tooltipData,
  emptyMessage = 'Sin datos en el período.',
  isEmpty = false,
  legend,
  children,
}: ChartWidgetProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <article
        className={styles.chartWidget}
        style={{ gridColumn: `span ${span}` }}
      >
        <header className={styles.chartWidgetHeader}>
          <div>
            <div className={styles.chartWidgetTitleRow}>
              <h3 className={styles.chartWidgetTitle}>{title}</h3>
              {tooltipData && (
                <button
                  type="button"
                  className={styles.chartWidgetInfo}
                  onClick={() => setModalOpen(true)}
                  aria-label={`Información sobre ${title}`}
                >
                  <InfoIcon />
                </button>
              )}
            </div>
            {hint && <p className={styles.chartWidgetHint}>{hint}</p>}
          </div>
        </header>

        {isEmpty ? (
          <p className={styles.chartWidgetEmpty}>{emptyMessage}</p>
        ) : (
          <div className={styles.chartWidgetBody}>
            {legend && <div className={styles.chartWidgetLegend}>{legend}</div>}
            <div className={styles.chartWidgetCanvas}>{children}</div>
          </div>
        )}
      </article>

      {tooltipData && (
        <MetricTooltipModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={title}
          description={tooltipData.description}
          formula={tooltipData.formula}
          example={tooltipData.example}
          importance={tooltipData.importance}
        />
      )}
    </>
  );
}

interface ChartLegendItem {
  label: string;
  value: number;
  color: string;
}

export function ChartLegend({ items }: { items: ChartLegendItem[] }) {
  return (
    <ul className={styles.chartLegendList}>
      {items.map((item) => (
        <li key={item.label} className={styles.chartLegendItem}>
          <span className={styles.chartLegendInfo}>
            <span className={styles.chartLegendSwatch} style={{ backgroundColor: item.color }} />
            <span className={styles.chartLegendLabel}>{item.label}</span>
          </span>
          <span className={styles.chartLegendValue}>{item.value.toLocaleString('es-AR')}</span>
        </li>
      ))}
    </ul>
  );
}
