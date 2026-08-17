'use client';

import { useEffect, useState } from 'react';
import { superAdminService } from '@/app/services/superAdminService';
import type { EmpresaAdmin, TipoServidor } from '@/app/types/superAdmin';
import styles from '../superAdmin.module.css';

type Props = {
  empresa: EmpresaAdmin;
  onUpdated: (empresa: EmpresaAdmin) => void;
  onError: (msg: string | null) => void;
};

export default function SeccionDatos({ empresa, onUpdated, onError }: Props) {
  const [form, setForm] = useState({
    descripcion: empresa.descripcion,
    cuit: empresa.cuit || '',
    email: empresa.email || '',
    telefono: empresa.telefono || '',
    calle: empresa.calle || '',
    calle_nro: empresa.calle_nro || '',
    localidad: empresa.localidad || '',
    tipoServidor: (empresa.tipoServidor || 'FISICO') as TipoServidor,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      descripcion: empresa.descripcion,
      cuit: empresa.cuit || '',
      email: empresa.email || '',
      telefono: empresa.telefono || '',
      calle: empresa.calle || '',
      calle_nro: empresa.calle_nro || '',
      localidad: empresa.localidad || '',
      tipoServidor: (empresa.tipoServidor || 'FISICO') as TipoServidor,
    });
  }, [empresa.id]);

  const guardar = async () => {
    if (!form.descripcion.trim()) {
      onError('La razón social es obligatoria');
      return;
    }
    setSaving(true);
    onError(null);
    try {
      const det = await superAdminService.updateEmpresa(empresa.id, form);
      onUpdated(det);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Error al guardar datos');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={styles.panel}>
      <div className={styles.stepToolbar}>
        <span className={styles.stepTitle}>Datos de la empresa</span>
        <button type="button" className={styles.btn} onClick={() => void guardar()} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
      <div className={styles.grid2}>
        <div className={styles.formGroup}>
          <label>Razón social</label>
          <input className={styles.input} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
        </div>
        <div className={styles.formGroup}>
          <label>CUIT</label>
          <input className={styles.input} value={form.cuit} onChange={(e) => setForm({ ...form, cuit: e.target.value })} />
        </div>
        <div className={styles.formGroup}>
          <label>Email</label>
          <input className={styles.input} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className={styles.formGroup}>
          <label>Teléfono</label>
          <input className={styles.input} value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
        </div>
        <div className={styles.formGroup}>
          <label>Calle</label>
          <input className={styles.input} value={form.calle} onChange={(e) => setForm({ ...form, calle: e.target.value })} />
        </div>
        <div className={styles.formGroup}>
          <label>N°</label>
          <input className={styles.input} value={form.calle_nro} onChange={(e) => setForm({ ...form, calle_nro: e.target.value })} />
        </div>
        <div className={styles.formGroup}>
          <label>Localidad</label>
          <input className={styles.input} value={form.localidad} onChange={(e) => setForm({ ...form, localidad: e.target.value })} />
        </div>
        <div className={styles.formGroup}>
          <label>Infraestructura</label>
          <select
            className={styles.select}
            value={form.tipoServidor}
            onChange={(e) => setForm({ ...form, tipoServidor: e.target.value as TipoServidor })}
          >
            <option value="NUBE">Nube</option>
            <option value="FISICO">Servidor físico</option>
          </select>
        </div>
      </div>
    </section>
  );
}
