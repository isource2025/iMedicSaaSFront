'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { superAdminService } from '@/app/services/superAdminService';
import type { EmpresaAdmin } from '@/app/types/superAdmin';
import Loader from '../Loader/Loader';
import SuperAdminShell from './SuperAdminShell';
import { estadoBadgeClass, tipoServidorLabel } from './ui/status';
import styles from './superAdmin.module.css';

function formatImporte(n: number | null | undefined, moneda?: string) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return `${moneda || 'ARS'} ${Number(n).toLocaleString('es-AR')}`;
}

export default function CobranzaPortfolio() {
  const router = useRouter();
  const [empresas, setEmpresas] = useState<EmpresaAdmin[]>([]);
  const [estado, setEstado] = useState('');
  const [plan, setPlan] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setEmpresas(await superAdminService.listEmpresas());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar cobranza');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const planes = useMemo(() => {
    const set = new Set<string>();
    for (const e of empresas) {
      if (e.suscripcion?.plan) set.add(e.suscripcion.plan);
    }
    return Array.from(set).sort();
  }, [empresas]);

  const filtradas = useMemo(() => {
    return empresas.filter((e) => {
      if (estado && String(e.suscripcion?.estado || '').toUpperCase() !== estado) return false;
      if (plan && String(e.suscripcion?.plan || '') !== plan) return false;
      return true;
    });
  }, [empresas, estado, plan]);

  const mrr = filtradas.reduce((acc, e) => acc + (Number(e.suscripcion?.importeMensual) || 0), 0);

  return (
    <SuperAdminShell
      title="Cobranza"
      subtitle="Portafolio comercial. El detalle se edita en la ficha de cada empresa."
      crumbs={[
        { label: 'Plataforma', href: '/dashboard/super-admin' },
        { label: 'Cobranza' },
      ]}
      error={error}
      onDismissError={() => setError(null)}
    >
      <section className={styles.kpiGrid} style={{ marginBottom: '1rem' }}>
        <div className={styles.kpiCard}>
          <span className={styles.statLabel}>Cuentas</span>
          <span className={styles.statValue}>{filtradas.length}</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.statLabel}>Importe mensual (filtro)</span>
          <span className={styles.statValue}>{mrr.toLocaleString('es-AR')}</span>
        </div>
      </section>
      <section className={styles.panel}>
        <div className={styles.filtersBar}>
          <select className={styles.select} value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            <option value="ACTIVA">Activa</option>
            <option value="PRUEBA">Prueba</option>
            <option value="SUSPENDIDA">Suspendida</option>
            <option value="CANCELADA">Cancelada</option>
          </select>
          <select className={styles.select} value={plan} onChange={(e) => setPlan(e.target.value)}>
            <option value="">Todos los planes</option>
            {planes.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        {loading ? (
          <Loader />
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>Tipo</th>
                  <th>Plan</th>
                  <th>Estado</th>
                  <th>Importe</th>
                  <th>Método</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((e) => (
                  <tr
                    key={e.id}
                    className={styles.rowClick}
                    onClick={() => router.push(`/dashboard/super-admin/empresas/${e.id}?seccion=cobranza`)}
                  >
                    <td>{e.descripcion}</td>
                    <td>{tipoServidorLabel(e.tipoServidor)}</td>
                    <td>{e.suscripcion?.plan || '—'}</td>
                    <td>
                      <span className={`${styles.badge} ${estadoBadgeClass(e.suscripcion?.estado)}`}>
                        {e.suscripcion?.estado || '—'}
                      </span>
                    </td>
                    <td>{formatImporte(e.suscripcion?.importeMensual, e.suscripcion?.moneda)}</td>
                    <td>{e.suscripcion?.metodoPago || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </SuperAdminShell>
  );
}
