'use client';

import { useCallback, useEffect, useState } from 'react';
import { superAdminService } from '@/app/services/superAdminService';
import type { ConfigPlataforma as ConfigRow } from '@/app/types/superAdmin';
import Loader from '../Loader/Loader';
import SuperAdminShell from './SuperAdminShell';
import styles from './superAdmin.module.css';

export default function ConfigPlataforma() {
  const [rows, setRows] = useState<ConfigRow[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [nuevaClave, setNuevaClave] = useState('');
  const [nuevoValor, setNuevoValor] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await superAdminService.getConfig();
      setRows(data);
      const next: Record<string, string> = {};
      for (const r of data) next[r.clave] = r.valor;
      setDraft(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar configuración');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const guardar = async (clave: string, valor: string) => {
    setSaving(clave);
    setError(null);
    setOk(null);
    try {
      const data = await superAdminService.saveConfig(clave, valor);
      setRows(data);
      const next: Record<string, string> = {};
      for (const r of data) next[r.clave] = r.valor;
      setDraft(next);
      setOk(`Guardado: ${clave}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(null);
    }
  };

  return (
    <SuperAdminShell
      title="Configuración de plataforma"
      subtitle="Parámetros globales (clave / valor)"
      crumbs={[
        { label: 'Plataforma', href: '/dashboard/super-admin' },
        { label: 'Configuración' },
      ]}
      error={error}
      onDismissError={() => setError(null)}
    >
      {ok && <p className={styles.wizardOk}>{ok}</p>}
      <section className={styles.panel}>
        {loading ? (
          <Loader />
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Clave</th>
                    <th>Valor</th>
                    <th>Descripción</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className={styles.emptyCell}>
                        Sin claves cargadas
                      </td>
                    </tr>
                  ) : (
                    rows.map((r) => (
                      <tr key={r.clave}>
                        <td>{r.clave}</td>
                        <td>
                          <input
                            className={styles.input}
                            value={draft[r.clave] ?? r.valor}
                            onChange={(e) => setDraft((d) => ({ ...d, [r.clave]: e.target.value }))}
                          />
                        </td>
                        <td className={styles.muted}>{r.descripcion || '—'}</td>
                        <td>
                          <button
                            type="button"
                            className={styles.btnSm}
                            disabled={saving === r.clave}
                            onClick={() => void guardar(r.clave, draft[r.clave] ?? r.valor)}
                          >
                            {saving === r.clave ? '…' : 'Guardar'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className={styles.inlineForm} style={{ marginTop: '1rem' }}>
              <input
                className={styles.input}
                placeholder="Nueva clave"
                value={nuevaClave}
                onChange={(e) => setNuevaClave(e.target.value)}
              />
              <input
                className={styles.input}
                placeholder="Valor"
                value={nuevoValor}
                onChange={(e) => setNuevoValor(e.target.value)}
              />
              <button
                type="button"
                className={styles.btn}
                disabled={!nuevaClave.trim()}
                onClick={() => {
                  void guardar(nuevaClave.trim(), nuevoValor).then(() => {
                    setNuevaClave('');
                    setNuevoValor('');
                  });
                }}
              >
                Agregar
              </button>
            </div>
          </>
        )}
      </section>
    </SuperAdminShell>
  );
}
