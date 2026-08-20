'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { analyticsService, type SessionExpirationKpis } from '@/app/services/analyticsService';
import { superAdminService } from '@/app/services/superAdminService';
import type { EmpresaAdmin } from '@/app/types/superAdmin';
import { etiquetaRol } from '@/app/utils/permisos';
import Loader from '../Loader/Loader';
import SuperAdminShell from './SuperAdminShell';
import styles from './superAdmin.module.css';

const ROLES = ['ADMIN', 'ADMINISTRATIVO', 'MEDICO', 'ENFERMERO', 'CARGA_HC', 'SUPER_ADMIN'];

function isoDate(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayIso() {
  return isoDate();
}

function daysAgoIso(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return isoDate(d);
}

function fmt(n: number) {
  return new Intl.NumberFormat('es-AR').format(n || 0);
}

function fmtPct(n: number) {
  return `${Number(n || 0).toFixed(2)}%`;
}

function fmtDuration(ms: number) {
  if (!ms) return '—';
  if (ms < 1000) return `${ms} ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)} s`;
  return `${Math.floor(s / 60)} m ${Math.round(s % 60)} s`;
}

function deviceLabel(device: string) {
  const d = String(device || '').toLowerCase();
  if (d === 'desktop') return 'Escritorio';
  if (d === 'mobile') return 'Móvil';
  if (d === 'tablet') return 'Tablet';
  return 'Desconocido';
}

function roleLabel(role: string) {
  return etiquetaRol(role) || role || 'Otros';
}

export default function AnaliticaSesiones() {
  const [from, setFrom] = useState(daysAgoIso(29));
  const [to, setTo] = useState(todayIso());
  const [idEmpresa, setIdEmpresa] = useState('');
  const [role, setRole] = useState('');
  const [empresas, setEmpresas] = useState<EmpresaAdmin[]>([]);
  const [data, setData] = useState<SessionExpirationKpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const stats = await analyticsService.getSessionExpiration({
        from,
        to,
        idEmpresa: idEmpresa || undefined,
        role: role || undefined,
      });
      setData(stats);
    } catch (e) {
      const ax = e as { response?: { data?: { mensaje?: string } }; message?: string };
      setError(ax.response?.data?.mensaje || ax.message || 'Error al cargar analítica');
    } finally {
      setLoading(false);
    }
  }, [from, to, idEmpresa, role]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  useEffect(() => {
    void superAdminService
      .listEmpresas()
      .then(setEmpresas)
      .catch(() => setEmpresas([]));
  }, []);

  const chartDays = useMemo(() => {
    const rows = data?.byDay || [];
    if (!from || !to) return rows;
    const map = new Map(rows.map((r) => [r.date, r]));
    const out: typeof rows = [];
    const cursor = new Date(`${from}T00:00:00`);
    const end = new Date(`${to}T00:00:00`);
    while (cursor <= end) {
      const key = isoDate(cursor);
      out.push(map.get(key) || { date: key, expirations: 0, loginClicks: 0, logins: 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
    return out;
  }, [data, from, to]);

  const maxRole = useMemo(
    () => Math.max(1, ...(data?.byRole || []).map((r) => r.count)),
    [data],
  );

  return (
    <SuperAdminShell
      title="Análisis de sesiones"
      subtitle="Timeout por inactividad, reingreso y personal activo. Base para medir el espacio de patrocinio."
      crumbs={[
        { label: 'Plataforma', href: '/dashboard/super-admin' },
        { label: 'Analítica' },
      ]}
      error={error}
      onDismissError={() => setError(null)}
      actions={
        <button type="button" className={styles.btn} onClick={() => void cargar()} disabled={loading}>
          Actualizar
        </button>
      }
    >
      <section className={styles.panel}>
        <div className={styles.filtersBar}>
          <label className={styles.filterField}>
            <span>Desde</span>
            <input className={styles.input} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className={styles.filterField}>
            <span>Hasta</span>
            <input className={styles.input} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          <label className={styles.filterField}>
            <span>Empresa</span>
            <select className={styles.select} value={idEmpresa} onChange={(e) => setIdEmpresa(e.target.value)}>
              <option value="">Todas</option>
              {empresas.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.descripcion}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.filterField}>
            <span>Rol</span>
            <select className={styles.select} value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="">Todos</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {roleLabel(r)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className={styles.filterMeta}>
          El frontend solo emite eventos. Las métricas se agregan en el servidor. No se guarda
          información clínica ni el id de usuario, solo un hash.
        </p>
      </section>

      {loading && !data ? (
        <Loader />
      ) : data ? (
        <>
          <section className={styles.kpiGrid} style={{ marginTop: '1rem' }}>
            <div className={styles.kpiCard}>
              <span className={styles.statLabel}>Expiraciones</span>
              <span className={styles.statValue}>{fmt(data.totalExpirations)}</span>
              <span className={styles.kpiHint}>SESSION_EXPIRED</span>
            </div>
            <div className={styles.kpiCard}>
              <span className={styles.statLabel}>Usuarios</span>
              <span className={styles.statValue}>{fmt(data.uniqueUsers)}</span>
              <span className={styles.kpiHint}>únicos afectados</span>
            </div>
            <div className={styles.kpiCard}>
              <span className={styles.statLabel}>Empresas</span>
              <span className={styles.statValue}>{fmt(data.uniqueEmpresas)}</span>
              <span className={styles.kpiHint}>alcanzadas</span>
            </div>
            <div className={styles.kpiCard}>
              <span className={styles.statLabel}>Login clicks</span>
              <span className={styles.statValue}>{fmt(data.loginClicks)}</span>
              <span className={styles.kpiHint}>CTA del modal</span>
            </div>
            <div className={styles.kpiCard}>
              <span className={styles.statLabel}>Conversión</span>
              <span className={styles.statValue}>{fmtPct(data.conversionRate)}</span>
              <span className={styles.kpiHint}>clicks / expiraciones</span>
            </div>
            <div className={styles.kpiCard}>
              <span className={styles.statLabel}>Impresiones potenciales</span>
              <span className={styles.statValue}>{fmt(data.potentialImpressions)}</span>
              <span className={styles.kpiHint}>espacio de patrocinio</span>
            </div>
          </section>

          <section className={styles.kpiGrid} style={{ marginTop: '0.7rem' }}>
            <div className={styles.kpiCard}>
              <span className={styles.statLabel}>Personal activo ahora</span>
              <span className={styles.statValue}>{fmt(data.activeNow.users)}</span>
              <span className={styles.kpiHint}>
                {fmt(data.activeNow.sessions)} sesiones · {fmt(data.activeNow.empresas)} empresas
              </span>
            </div>
            <div className={styles.kpiCard}>
              <span className={styles.statLabel}>Inicios de sesión</span>
              <span className={styles.statValue}>{fmt(data.logins)}</span>
              <span className={styles.kpiHint}>LOGIN en el período</span>
            </div>
            <div className={styles.kpiCard}>
              <span className={styles.statLabel}>Cierres manuales</span>
              <span className={styles.statValue}>{fmt(data.logouts)}</span>
              <span className={styles.kpiHint}>LOGOUT</span>
            </div>
            <div className={styles.kpiCard}>
              <span className={styles.statLabel}>Volvieron a entrar</span>
              <span className={styles.statValue}>{fmt(data.reauthCount)}</span>
              <span className={styles.kpiHint}>{fmtPct(data.reauthRate)} de expiraciones</span>
            </div>
            <div className={styles.kpiCard}>
              <span className={styles.statLabel}>Cerraron el modal</span>
              <span className={styles.statValue}>{fmt(data.modalDismissals)}</span>
              <span className={styles.kpiHint}>Escape o fondo</span>
            </div>
            <div className={styles.kpiCard}>
              <span className={styles.statLabel}>Tiempo en el modal</span>
              <span className={styles.statValue}>{fmtDuration(data.avgModalDwellMs)}</span>
              <span className={styles.kpiHint}>promedio</span>
            </div>
          </section>

          <section className={styles.panel} style={{ marginTop: '1rem' }}>
            <h2 className={styles.sectionTitle}>Expiraciones por día</h2>
            {chartDays.every((d) => !d.expirations && !d.loginClicks) ? (
              <p className={styles.emptyHint}>Todavía no hay eventos de timeout en este rango.</p>
            ) : (
              <div className={styles.chartBox}>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartDays} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        fmt(Number(value)),
                        name === 'expirations' ? 'Expiraciones' : name === 'loginClicks' ? 'Login clicks' : 'Logins',
                      ]}
                    />
                    <Bar dataKey="expirations" fill="#0083a9" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="loginClicks" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          <div className={styles.analyticsSplit}>
            <section className={styles.panel}>
              <h2 className={styles.sectionTitle}>Por rol</h2>
              {data.byRole.length === 0 ? (
                <p className={styles.emptyHint}>Sin datos por rol.</p>
              ) : (
                <ul className={styles.roleList}>
                  {data.byRole.map((r) => (
                    <li key={r.role}>
                      <div className={styles.roleHead}>
                        <button
                          type="button"
                          className={styles.linkBtn}
                          onClick={() => setRole(r.role === 'OTROS' ? '' : r.role)}
                        >
                          {roleLabel(r.role)}
                        </button>
                        <span>
                          {fmt(r.count)} · {fmtPct(r.pct)}
                        </span>
                      </div>
                      <div className={styles.roleTrack}>
                        <div
                          className={styles.roleFill}
                          style={{ width: `${Math.max(4, (r.count / maxRole) * 100)}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className={styles.panel}>
              <h2 className={styles.sectionTitle}>Dispositivo</h2>
              {data.byDevice.length === 0 ? (
                <p className={styles.emptyHint}>Sin datos de dispositivo.</p>
              ) : (
                <ul className={styles.roleList}>
                  {data.byDevice.map((d) => (
                    <li key={d.device} className={styles.roleHead}>
                      <span>{deviceLabel(d.device)}</span>
                      <strong>{fmt(d.count)}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <section className={styles.panel} style={{ marginTop: '1rem' }}>
            <h2 className={styles.sectionTitle}>Por empresa</h2>
            {data.byEmpresa.length === 0 ? (
              <p className={styles.emptyHint}>Sin expiraciones asociadas a una empresa.</p>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Empresa</th>
                      <th>Expiraciones</th>
                      <th>Usuarios únicos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byEmpresa.map((e) => (
                      <tr
                        key={e.idEmpresa}
                        className={styles.rowClick}
                        onClick={() => setIdEmpresa(String(e.idEmpresa))}
                      >
                        <td>{e.nombre}</td>
                        <td>{fmt(e.expirations)}</td>
                        <td>{fmt(e.uniqueUsers)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : null}
    </SuperAdminShell>
  );
}
