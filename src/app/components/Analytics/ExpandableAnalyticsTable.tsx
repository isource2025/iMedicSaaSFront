'use client';

import { useState } from 'react';
import styles from './ExpandableAnalyticsTable.module.css';

export type AnalyticsTableColumn<T> = {
  id: string;
  header: React.ReactNode;
  align?: 'left' | 'right' | 'center';
  className?: string | ((row: T) => string);
  render: (row: T, index: number) => React.ReactNode;
};

export type ExpandableAnalyticsTableProps<T> = {
  rows: T[];
  columns: AnalyticsTableColumn<T>[];
  getRowKey: (row: T) => string;
  emptyMessage?: string;
  initialLimit?: number;
  showRank?: boolean;
};

const DEFAULT_LIMIT = 10;

function alignClass(align?: 'left' | 'right' | 'center') {
  if (align === 'right') return styles.alignRight;
  if (align === 'center') return styles.alignCenter;
  return styles.alignLeft;
}

function cellClass<T>(column: AnalyticsTableColumn<T>, row: T) {
  const extra =
    typeof column.className === 'function' ? column.className(row) : column.className ?? '';
  return [alignClass(column.align), extra].filter(Boolean).join(' ');
}

export function ExpandableAnalyticsTable<T>({
  rows,
  columns,
  getRowKey,
  emptyMessage = 'Sin datos en el período seleccionado.',
  initialLimit = DEFAULT_LIMIT,
  showRank = true,
}: ExpandableAnalyticsTableProps<T>) {
  const [expanded, setExpanded] = useState(false);

  if (rows.length === 0) {
    return <p className={styles.emptyState}>{emptyMessage}</p>;
  }

  const hasMore = rows.length > initialLimit;
  const visibleRows = expanded ? rows : rows.slice(0, initialLimit);
  const hiddenCount = rows.length - initialLimit;

  return (
    <div className={styles.wrap}>
      <div className={styles.scroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              {showRank && <th className={styles.alignCenter}>#</th>}
              {columns.map((column) => (
                <th key={column.id} className={alignClass(column.align)}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, index) => (
              <tr key={getRowKey(row)}>
                {showRank && (
                  <td className={`${styles.rank} ${styles.alignCenter}`}>{index + 1}</td>
                )}
                {columns.map((column) => (
                  <td key={column.id} className={cellClass(column, row)}>
                    {column.render(row, index)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <div className={styles.footer}>
          <button
            type="button"
            className={styles.toggleLink}
            onClick={() => setExpanded((prev) => !prev)}
            aria-expanded={expanded}
          >
            {expanded ? 'Mostrar menos' : `Mostrar más (${hiddenCount} restantes)`}
          </button>
          <span className={styles.rowCount}>
            {expanded
              ? `${rows.length} registros`
              : `Mostrando ${Math.min(initialLimit, rows.length)} de ${rows.length}`}
          </span>
        </div>
      )}
    </div>
  );
}
