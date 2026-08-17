'use client';

import Link from 'next/link';
import type { EmpresaAdmin, EmpresaChecklist } from '@/app/types/superAdmin';
import { tipoServidorLabel } from '../ui/status';
import styles from '../superAdmin.module.css';

type Props = {
  empresa: EmpresaAdmin;
  checklist: EmpresaChecklist | null;
};

export default function EmpresaResumen({ empresa, checklist }: Props) {
  const items = checklist?.items || [];
  return (
    <div className={styles.altaGrid}>
      <section className={styles.panel}>
        <h2 className={styles.sectionTitle}>Checklist operativo</h2>
        {items.length === 0 ? (
          <p className={styles.emptyHint}>Sin checklist disponible.</p>
        ) : (
          <div className={styles.checklist}>
            {items.map((item) => (
              <Link
                key={item.id}
                href={`/dashboard/super-admin/empresas/${empresa.id}?seccion=${item.seccion}`}
                className={styles.checklistItem}
              >
                <span>
                  {item.label}
                  {item.opcional ? <span className={styles.muted}> · opcional</span> : null}
                </span>
                <span className={item.ok ? styles.checkOk : styles.checkPend}>
                  {item.ok ? 'Listo' : 'Pendiente'}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className={styles.panel}>
        <h2 className={styles.sectionTitle}>Resumen</h2>
        <dl className={styles.dlGrid}>
          <div>
            <dt>CUIT</dt>
            <dd>{empresa.cuit || '—'}</dd>
          </div>
          <div>
            <dt>Contacto</dt>
            <dd>{empresa.email || empresa.telefono || '—'}</dd>
          </div>
          <div>
            <dt>Infraestructura</dt>
            <dd>{tipoServidorLabel(empresa.tipoServidor)}</dd>
          </div>
          <div>
            <dt>Usuarios</dt>
            <dd>{empresa.usuarios?.length ?? empresa.cantUsuarios ?? '—'}</dd>
          </div>
          <div>
            <dt>Túnel</dt>
            <dd>{empresa.conexion?.fileServerUrl || '—'}</dd>
          </div>
          <div>
            <dt>SQL</dt>
            <dd>
              {empresa.tipoServidor === 'NUBE'
                ? 'Nube'
                : empresa.conexion?.dbServer
                  ? `${empresa.conexion.dbServer} / ${empresa.conexion.dbName || '—'}`
                  : 'Sin conectar'}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
