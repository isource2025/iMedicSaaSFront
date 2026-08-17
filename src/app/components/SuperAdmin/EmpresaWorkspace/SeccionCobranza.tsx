'use client';

import { useEffect, useState } from 'react';
import { superAdminService } from '@/app/services/superAdminService';
import type { EmpresaAdmin, SuperAdminCatalogos } from '@/app/types/superAdmin';
import styles from '../superAdmin.module.css';

type Props = {
  empresa: EmpresaAdmin;
  catalogos: SuperAdminCatalogos;
  onUpdated: (empresa: EmpresaAdmin) => void;
  onError: (msg: string | null) => void;
};

export default function SeccionCobranza({ empresa, catalogos, onUpdated, onError }: Props) {
  const [form, setForm] = useState({
    plan: empresa.suscripcion?.plan || 'STARTER',
    estado: empresa.suscripcion?.estado || 'PRUEBA',
    importeMensual: empresa.suscripcion?.importeMensual != null ? String(empresa.suscripcion.importeMensual) : '',
    moneda: empresa.suscripcion?.moneda || 'ARS',
    metodoPago: empresa.suscripcion?.metodoPago || '',
    notas: empresa.suscripcion?.notas || '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      plan: empresa.suscripcion?.plan || 'STARTER',
      estado: empresa.suscripcion?.estado || 'PRUEBA',
      importeMensual: empresa.suscripcion?.importeMensual != null ? String(empresa.suscripcion.importeMensual) : '',
      moneda: empresa.suscripcion?.moneda || 'ARS',
      metodoPago: empresa.suscripcion?.metodoPago || '',
      notas: empresa.suscripcion?.notas || '',
    });
  }, [empresa.id, empresa.suscripcion]);

  const guardar = async () => {
    setSaving(true);
    onError(null);
    try {
      await superAdminService.updateSuscripcion(empresa.id, {
        plan: form.plan,
        estado: form.estado,
        importeMensual: form.importeMensual === '' ? null : Number(form.importeMensual),
        moneda: form.moneda,
        metodoPago: form.metodoPago,
        notas: form.notas,
      });
      onUpdated(await superAdminService.getEmpresa(empresa.id));
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Error al guardar cobranza');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={styles.panel}>
      <div className={styles.stepToolbar}>
        <span className={styles.stepTitle}>Plan y cobranza</span>
        <button type="button" className={styles.btn} onClick={() => void guardar()} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
      <div className={styles.grid2}>
        <div className={styles.formGroup}>
          <label>Plan</label>
          <select className={styles.select} value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })}>
            {catalogos.planes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.formGroup}>
          <label>Estado</label>
          <select className={styles.select} value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
            {catalogos.estadosSuscripcion.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.formGroup}>
          <label>Importe mensual</label>
          <input
            className={styles.input}
            value={form.importeMensual}
            onChange={(e) => setForm({ ...form, importeMensual: e.target.value })}
          />
        </div>
        <div className={styles.formGroup}>
          <label>Moneda</label>
          <input className={styles.input} value={form.moneda} onChange={(e) => setForm({ ...form, moneda: e.target.value })} />
        </div>
        <div className={styles.formGroup}>
          <label>Método de pago</label>
          <input
            className={styles.input}
            value={form.metodoPago}
            onChange={(e) => setForm({ ...form, metodoPago: e.target.value })}
          />
        </div>
        <div className={styles.formGroup}>
          <label>Notas</label>
          <input className={styles.input} value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} />
        </div>
      </div>
    </section>
  );
}
