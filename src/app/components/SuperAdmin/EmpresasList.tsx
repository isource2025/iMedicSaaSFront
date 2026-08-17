'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { superAdminService } from '@/app/services/superAdminService';
import type { EmpresaAdmin } from '@/app/types/superAdmin';
import Loader from '../Loader/Loader';
import SuperAdminShell from './SuperAdminShell';
import { estadoBadgeClass, tipoServidorLabel } from './ui/status';
import styles from './superAdmin.module.css';

export default function EmpresasList() {
  const router = useRouter();
  const [empresas, setEmpresas] = useState<EmpresaAdmin[]>([]);
  const [q, setQ] = useState('');
  const [estado, setEstado] = useState('');
  const [plan, setPlan] = useState('');
  const [tipo, setTipo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async (busqueda?: string) => {
    try {
      setLoading(true);
      setError(null);
      setEmpresas(await superAdminService.listEmpresas(busqueda));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al listar empresas');
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
      if (tipo && String(e.tipoServidor || '') !== tipo) return false;
      return true;
    });
  }, [empresas, estado, plan, tipo]);

  return (
    <SuperAdminShell
      title="Empresas"
      subtitle="Portafolio de clínicas y estado operativo"
      crumbs={[
        { label: 'Plataforma', href: '/dashboard/super-admin' },
        { label: 'Empresas' },
      ]}
      error={error}
      onDismissError={() => setError(null)}
      actions={
        <Link href="/dashboard/super-admin/alta" className={styles.btn}>
          Nueva empresa
        </Link>
      }
    >
      <section className={styles.panel}>
        <div className={styles.filtersBar}>
          <input
            className={styles.input}
            placeholder="Buscar por nombre o ID…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void cargar(q)}
          />
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
          <select className={styles.select} value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="">Todos los tipos</option>
            <option value="NUBE">Nube</option>
            <option value="FISICO">Físico</option>
          </select>
          <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => void cargar(q)}>
            Buscar
          </button>
        </div>
        <p className={styles.filterMeta}>
          {filtradas.length} de {empresas.length} empresa{empresas.length === 1 ? '' : 's'}
        </p>
        {loading ? (
          <Loader />
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Empresa</th>
                  <th>Tipo</th>
                  <th>Plan</th>
                  <th>Estado</th>
                  <th>Usuarios</th>
                  <th>Atención</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className={styles.emptyCell}>
                      Sin empresas con esos filtros
                    </td>
                  </tr>
                ) : (
                  filtradas.map((e) => (
                    <tr
                      key={e.id}
                      className={styles.rowClick}
                      onClick={() => router.push(`/dashboard/super-admin/empresas/${e.id}`)}
                    >
                      <td>{e.id}</td>
                      <td>{e.descripcion}</td>
                      <td>{tipoServidorLabel(e.tipoServidor)}</td>
                      <td>{e.suscripcion?.plan || '—'}</td>
                      <td>
                        <span className={`${styles.badge} ${estadoBadgeClass(e.suscripcion?.estado)}`}>
                          {e.suscripcion?.estado || '—'}
                        </span>
                      </td>
                      <td>{e.cantUsuarios ?? '—'}</td>
                      <td>
                        {e.motivoAtencion ? (
                          <span className={`${styles.badge} ${styles.badgeWarn}`}>{e.motivoAtencion}</span>
                        ) : (
                          <span className={styles.muted}>—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </SuperAdminShell>
  );
}
