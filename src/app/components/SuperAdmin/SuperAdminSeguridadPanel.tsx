'use client';

import { useCallback, useEffect, useState } from 'react';
import { superAdminService } from '@/app/services/superAdminService';
import styles from './superAdmin.module.css';

type Pais = { CodigoISO: string; Nombre: string; Activo: number | boolean };

export default function SuperAdminSeguridadPanel() {
  const [idleMinutes, setIdleMinutes] = useState(30);
  const [paises, setPaises] = useState<Pais[]>([]);
  const [nuevoCodigo, setNuevoCodigo] = useState('');
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const cfg = await superAdminService.getSeguridadConfig();
      setIdleMinutes(cfg.idleTimeoutMinutes ?? 30);
      setPaises(cfg.paises || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar seguridad');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const guardarIdle = async () => {
    setSaving(true);
    setError('');
    try {
      await superAdminService.saveSeguridadConfig({ idleTimeoutMinutes: idleMinutes });
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const agregarPais = async () => {
    if (!nuevoCodigo.trim() || !nuevoNombre.trim()) return;
    setSaving(true);
    setError('');
    try {
      const data = await superAdminService.agregarPaisPermitido(nuevoCodigo, nuevoNombre);
      setPaises(data);
      setNuevoCodigo('');
      setNuevoNombre('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al agregar país');
    } finally {
      setSaving(false);
    }
  };

  const togglePais = async (codigo: string, activo: boolean) => {
    setSaving(true);
    try {
      const data = await superAdminService.togglePaisPermitido(codigo, activo);
      setPaises(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al actualizar país');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className={styles.wizardHint}>Cargando configuración de seguridad…</p>;

  return (
    <section className={styles.panel}>
      <h3 className={styles.sectionTitle}>Seguridad de acceso</h3>
      {error && <p style={{ color: '#b91c1c' }}>{error}</p>}

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
        <label htmlFor="idleMinutes">Timeout por inactividad (minutos)</label>
        <input
          id="idleMinutes"
          type="number"
          min={5}
          max={480}
          value={idleMinutes}
          onChange={(e) => setIdleMinutes(Number(e.target.value))}
          className={styles.input}
        />
        <button type="button" className={styles.btn} disabled={saving} onClick={guardarIdle}>
          Guardar
        </button>
      </div>
      <p className={styles.wizardHint}>
        La sesión expira tras este período sin actividad. Por defecto: 30 minutos.
      </p>

      <h4 className={styles.sectionTitle} style={{ marginTop: '1.5rem' }}>
        Países permitidos (geo-blocking)
      </h4>
      <p className={styles.wizardHint}>
        Solo usuarios desde países activos pueden iniciar sesión. Por defecto: Argentina (AR).
      </p>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>ISO</th>
            <th>País</th>
            <th>Activo</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {paises.map((p) => (
            <tr key={p.CodigoISO}>
              <td>{p.CodigoISO}</td>
              <td>{p.Nombre}</td>
              <td>{p.Activo ? 'Sí' : 'No'}</td>
              <td>
                <button
                  type="button"
                  className={styles.btnSm}
                  disabled={saving}
                  onClick={() => togglePais(p.CodigoISO, !p.Activo)}
                >
                  {p.Activo ? 'Desactivar' : 'Activar'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem' }}>
        <input
          placeholder="ISO (ej. PY)"
          maxLength={2}
          value={nuevoCodigo}
          onChange={(e) => setNuevoCodigo(e.target.value.toUpperCase())}
          className={styles.input}
          style={{ maxWidth: '5rem' }}
        />
        <input
          placeholder="Nombre del país"
          value={nuevoNombre}
          onChange={(e) => setNuevoNombre(e.target.value)}
          className={styles.input}
        />
        <button type="button" className={styles.btn} disabled={saving} onClick={agregarPais}>
          Agregar país
        </button>
      </div>
    </section>
  );
}
