'use client';

import Link from 'next/link';
import styles from './superAdmin.module.css';

export type SuperAdminCrumb = { label: string; href?: string };

type Props = {
  title: string;
  subtitle?: string;
  crumbs?: SuperAdminCrumb[];
  actions?: React.ReactNode;
  error?: string | null;
  onDismissError?: () => void;
  children: React.ReactNode;
};

export default function SuperAdminShell({
  title,
  subtitle,
  crumbs,
  actions,
  error,
  onDismissError,
  children,
}: Props) {
  return (
    <div className={styles.superAdmin}>
      {crumbs && crumbs.length > 0 && (
        <nav className={styles.crumbs} aria-label="Migas de pan">
          {crumbs.map((c, i) => (
            <span key={`${c.label}-${i}`} className={styles.crumbItem}>
              {i > 0 && <span className={styles.crumbSep}>/</span>}
              {c.href ? (
                <Link href={c.href} className={styles.crumbLink}>
                  {c.label}
                </Link>
              ) : (
                <span className={styles.crumbCurrent}>{c.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}

      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{title}</h1>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
        {actions && <div className={styles.headerActions}>{actions}</div>}
      </header>

      {error && (
        <div className={styles.error} role="alert">
          {error}
          {onDismissError && (
            <button type="button" className={styles.errorDismiss} onClick={onDismissError}>
              ×
            </button>
          )}
        </div>
      )}

      {children}
    </div>
  );
}
