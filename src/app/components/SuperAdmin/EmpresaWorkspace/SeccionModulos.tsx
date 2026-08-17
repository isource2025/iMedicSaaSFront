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

export default function SeccionModulos({ empresa, catalogos, onUpdated, onError }: Props) {
  const [packs, setPacks] = useState<string[]>(empresa.packs || []);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPacks(empresa.packs || []);
  }, [empresa.id, empresa.packs]);

  const toggle = (codigo: string) => {
    setPacks((prev) => (prev.includes(codigo) ? prev.filter((p) => p !== codigo) : [...prev, codigo]));
  };

  const guardar = async () => {
    setSaving(true);
    onError(null);
    try {
      await superAdminService.updatePacks(empresa.id, packs);
      onUpdated(await superAdminService.getEmpresa(empresa.id));
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Error al guardar módulos');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={styles.panel}>
      <div className={styles.stepToolbar}>
        <span className={styles.stepTitle}>Módulos contratados</span>
        <button type="button" className={styles.btn} onClick={() => void guardar()} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
      <div className={styles.packGrid}>
        {catalogos.packs.map((pack) => (
          <button
            key={pack.codigo}
            type="button"
            className={`${styles.packCard} ${packs.includes(pack.codigo) ? styles.packCardActive : ''}`}
            onClick={() => toggle(pack.codigo)}
          >
            <span className={styles.packTitle}>{pack.label}</span>
            <span className={styles.packDesc}>{pack.descripcion}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
