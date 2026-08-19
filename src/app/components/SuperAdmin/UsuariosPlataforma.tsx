'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { superAdminService } from '@/app/services/superAdminService';
import type { EmpresaAdmin, UsuarioPlataforma } from '@/app/types/superAdmin';
import Loader from '../Loader/Loader';
import SuperAdminShell from './SuperAdminShell';
import styles from './superAdmin.module.css';
import { etiquetaRol } from '@/app/utils/permisos';

export default function UsuariosPlataforma() {
  const router = useRouter();
  const [usuarios, setUsuarios] = useState<UsuarioPlataforma[]>([]);
  const [empresas, setEmpresas] = useState<EmpresaAdmin[]>([]);
  const [q, setQ] = useState('');
  const [rol, setRol] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async (busqueda?: string) => {
    setLoading(true);
    setError(null);
    try {
      const [users, emps] = await Promise.all([
        superAdminService.listUsuarios(busqueda),
        superAdminService.listEmpresas(),
      ]);
      setUsuarios(users);
      setEmpresas(emps);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const roles = useMemo(() => {
    const set = new Set<string>();
    for (const u of usuarios) {
      if (u.rol) set.add(u.rol);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
  }, [usuarios]);

  const filtrados = useMemo(() => {
    return usuarios.filter((u) => {
      if (rol && String(u.rol || '') !== rol) return false;
      if (empresa && !String(u.empresas || '').toLowerCase().includes(empresa.toLowerCase())) return false;
      return true;
    });
  }, [usuarios, rol, empresa]);

  const irEmpresa = (nombre: string) => {
    const match = empresas.find((e) => e.descripcion === nombre.trim());
    if (match) router.push(`/dashboard/super-admin/empresas/${match.id}?seccion=usuarios`);
  };

  return (
    <SuperAdminShell
      title="Usuarios de plataforma"
      subtitle="Directorio. La alta y edición se hacen en la ficha de cada empresa."
      crumbs={[
        { label: 'Plataforma', href: '/dashboard/super-admin' },
        { label: 'Usuarios' },
      ]}
      error={error}
      onDismissError={() => setError(null)}
    >
      <section className={styles.panel}>
        <div className={styles.filtersBar}>
          <input
            className={styles.input}
            placeholder="Buscar por usuario o nombre…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void cargar(q)}
          />
          <select className={styles.select} value={rol} onChange={(e) => setRol(e.target.value)}>
            <option value="">Todos los roles</option>
            {roles.map((r) => (
              <option key={r} value={r}>
                {etiquetaRol(r)}
              </option>
            ))}
          </select>
          <select className={styles.select} value={empresa} onChange={(e) => setEmpresa(e.target.value)}>
            <option value="">Todas las empresas</option>
            {empresas.map((e) => (
              <option key={e.id} value={e.descripcion}>
                {e.descripcion}
              </option>
            ))}
          </select>
          <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => void cargar(q)}>
            Buscar
          </button>
        </div>
        <p className={styles.filterMeta}>
          {filtrados.length} de {usuarios.length} usuario{usuarios.length === 1 ? '' : 's'}
        </p>
        {loading ? (
          <Loader />
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Nombre</th>
                  <th>Rol</th>
                  <th>Empresas</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.length === 0 ? (
                  <tr>
                    <td colSpan={4} className={styles.emptyCell}>
                      Sin usuarios con esos filtros
                    </td>
                  </tr>
                ) : (
                  filtrados.map((u) => (
                    <tr key={u.idPersonal}>
                      <td>{u.usuario}</td>
                      <td>
                        {u.apellido}, {u.nombre}
                      </td>
                      <td>{etiquetaRol(u.rol) || '—'}</td>
                      <td>
                        {(u.empresas || '')
                          .split(',')
                          .map((n) => n.trim())
                          .filter(Boolean)
                          .map((n, i) => (
                            <span key={`${u.idPersonal}-${n}-${i}`}>
                              {i > 0 && ', '}
                              <button type="button" className={styles.linkBtn} onClick={() => irEmpresa(n)}>
                                {n}
                              </button>
                            </span>
                          ))}
                        {!u.empresas && <span className={styles.muted}>—</span>}
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
