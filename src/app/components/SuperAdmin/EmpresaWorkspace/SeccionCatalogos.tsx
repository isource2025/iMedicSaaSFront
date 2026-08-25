'use client';

import { useState } from 'react';
import { superAdminService } from '@/app/services/superAdminService';
import type { CatalogoSector, CatalogoServicio, EmpresaAdmin, ResultadoSyncCatalogos } from '@/app/types/superAdmin';
import ConfirmDialog from '../ui/ConfirmDialog';
import SeccionSectores from './SeccionSectores';
import SeccionServicios from './SeccionServicios';
import styles from '../superAdmin.module.css';

type Props = {
  empresa: EmpresaAdmin;
  sectores: CatalogoSector[];
  servicios: CatalogoServicio[];
  onRefresh: () => Promise<void>;
  onUpdated: (empresa: EmpresaAdmin) => void;
  onError: (msg: string | null) => void;
};

export default function SeccionCatalogos({
  empresa,
  sectores,
  servicios,
  onRefresh,
  onUpdated,
  onError,
}: Props) {
  const puedeSync = Boolean(empresa.conexion?.dbServer && empresa.conexion?.dbName);
  const [confirm, setConfirm] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [resultado, setResultado] = useState<ResultadoSyncCatalogos | null>(null);

  const traer = async () => {
    setSyncing(true);
    onError(null);
    try {
      const res = await superAdminService.syncCatalogosDesdeFisico(empresa.id);
      setResultado(res);
      await onRefresh();
      onUpdated(await superAdminService.getEmpresa(empresa.id));
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Error al traer la configuración del servidor físico');
    } finally {
      setSyncing(false);
      setConfirm(false);
    }
  };

  return (
    <div className={styles.catalogStack}>
      <section className={styles.panel}>
        <div className={styles.stepToolbar}>
          <div>
            <span className={styles.stepTitle}>Sectores y servicios</span>
            <p className={styles.wizardHint} style={{ margin: '0.35rem 0 0' }}>
              Catálogos de la empresa en la nube. Podés cargarlos a mano o traerlos del servidor físico.
            </p>
          </div>
          <div className={styles.stepActions}>
            <button
              type="button"
              className={styles.btn}
              disabled={!puedeSync || syncing}
              title={
                puedeSync
                  ? 'Copia sectores y servicios del SQL físico a Railway'
                  : 'Configurá la conexión SQL en Infra para habilitar este botón'
              }
              onClick={() => setConfirm(true)}
            >
              {syncing ? 'Trayendo…' : 'Traer desde servidor físico'}
            </button>
          </div>
        </div>
        {!puedeSync ? (
          <p className={styles.muted}>
            Para traer la configuración hace falta la conexión SQL del servidor físico (pestaña Infra).
          </p>
        ) : null}
        {resultado ? (
          <p className={resultado.sinCambios ? styles.muted : styles.saveStatusOk}>
            {resultado.mensaje} Sectores: {resultado.sectores.catalogo} leídos, {resultado.sectores.cambios}{' '}
            cambios. Servicios: {resultado.servicios.catalogo} leídos, {resultado.servicios.cambios} cambios.
          </p>
        ) : null}
      </section>

      <SeccionSectores
        empresa={empresa}
        sectores={sectores}
        onRefresh={onRefresh}
        onUpdated={onUpdated}
        onError={onError}
      />
      <SeccionServicios
        empresa={empresa}
        servicios={servicios}
        onRefresh={onRefresh}
        onUpdated={onUpdated}
        onError={onError}
      />

      <ConfirmDialog
        open={confirm}
        title="Traer configuración del físico"
        message="Se van a copiar sectores y servicios (y sus asignaciones al personal) del servidor físico a la nube. Los códigos existentes se actualizan; no se borran filas de la nube que no estén en el físico."
        confirmLabel="Traer a la nube"
        busy={syncing}
        onConfirm={() => void traer()}
        onCancel={() => setConfirm(false)}
      />
    </div>
  );
}
