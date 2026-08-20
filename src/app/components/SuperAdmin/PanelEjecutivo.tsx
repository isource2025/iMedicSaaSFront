'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { superAdminService } from '@/app/services/superAdminService';
import type { SuperAdminDashboard } from '@/app/types/superAdmin';
import Loader from '../Loader/Loader';
import SuperAdminShell from './SuperAdminShell';
import { estadoBadgeClass, tipoServidorLabel } from './ui/status';
import styles from './superAdmin.module.css';

export default function PanelEjecutivo() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<SuperAdminDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setDashboard(await superAdminService.getDashboard());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar el panel');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  if (loading && !dashboard) {
    return (
      <div className={styles.superAdmin}>
        <Loader />
      </div>
    );
  }

  const atencion = dashboard?.empresasAtencion || [];

  return (
    <SuperAdminShell
      title="Plataforma iMedic"
      subtitle="Consola de operación multi-empresa"
      crumbs={[{ label: 'Plataforma' }]}
      error={error}
      onDismissError={() => setError(null)}
      actions={
        <>
          <Link href="/dashboard/super-admin/alta" className={styles.btn}>
            Nueva empresa
          </Link>
          <Link href="/dashboard/super-admin/analitica" className={`${styles.btn} ${styles.btnSecondary}`}>
            Analítica
          </Link>
          <Link href="/dashboard/super-admin/empresas" className={`${styles.btn} ${styles.btnSecondary}`}>
            Ver portafolio
          </Link>
        </>
      }
    >
      {dashboard && (
        <>
          <section className={styles.kpiGrid}>
            <div className={styles.kpiCard}>
              <span className={styles.statLabel}>Empresas</span>
              <span className={styles.statValue}>{dashboard.totalEmpresas}</span>
            </div>
            <div className={styles.kpiCard}>
              <span className={styles.statLabel}>Activas</span>
              <span className={styles.statValue}>{dashboard.suscripcionesActivas}</span>
            </div>
            <div className={styles.kpiCard}>
              <span className={styles.statLabel}>En prueba</span>
              <span className={styles.statValue}>{dashboard.enPrueba}</span>
            </div>
            <div className={styles.kpiCard}>
              <span className={styles.statLabel}>Suspendidas</span>
              <span className={styles.statValue}>{dashboard.suspendidas}</span>
            </div>
            <div className={styles.kpiCard}>
              <span className={styles.statLabel}>Requieren atención</span>
              <span className={styles.statValue}>{dashboard.pendientesAtencion ?? atencion.length}</span>
              <span className={styles.kpiHint}>SQL, alta o activación</span>
            </div>
            <div className={styles.kpiCard}>
              <span className={styles.statLabel}>Usuarios</span>
              <span className={styles.statValue}>{dashboard.totalUsuarios}</span>
            </div>
          </section>

          <section className={styles.panel} style={{ marginTop: '1rem' }}>
            <h2 className={styles.sectionTitle}>Cola de atención</h2>
            {atencion.length === 0 ? (
              <p className={styles.emptyHint}>No hay empresas que requieran acción ahora.</p>
            ) : (
              <div className={styles.attentionList}>
                {atencion.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    className={styles.attentionRow}
                    onClick={() => router.push(`/dashboard/super-admin/empresas/${e.id}`)}
                  >
                    <div>
                      <strong>{e.descripcion}</strong>
                      <div className={styles.attentionMeta}>
                        <span className={`${styles.badge} ${styles.badgeMuted}`}>
                          {tipoServidorLabel(e.tipoServidor)}
                        </span>
                        {e.plan && <span className={`${styles.badge} ${styles.badgeMuted}`}>{e.plan}</span>}
                        <span className={`${styles.badge} ${estadoBadgeClass(e.estado || undefined)}`}>
                          {e.estado || '—'}
                        </span>
                      </div>
                    </div>
                    <span className={`${styles.badge} ${styles.badgeWarn}`}>{e.motivoAtencion}</span>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className={styles.panel} style={{ marginTop: '1rem' }}>
            <h2 className={styles.sectionTitle}>Recientes</h2>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Empresa</th>
                    <th>Tipo</th>
                    <th>Plan</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.empresasRecientes.map((e) => (
                    <tr
                      key={e.id}
                      className={styles.rowClick}
                      onClick={() => router.push(`/dashboard/super-admin/empresas/${e.id}`)}
                    >
                      <td>{e.descripcion}</td>
                      <td>{tipoServidorLabel(e.tipoServidor)}</td>
                      <td>{e.suscripcion?.plan || '—'}</td>
                      <td>
                        <span className={`${styles.badge} ${estadoBadgeClass(e.suscripcion?.estado)}`}>
                          {e.suscripcion?.estado || '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </SuperAdminShell>
  );
}
