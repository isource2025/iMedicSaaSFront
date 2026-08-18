'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { superAdminService } from '@/app/services/superAdminService';
import type {
  CatalogoRol,
  CatalogoSector,
  CatalogoServicio,
  EmpresaAdmin,
  EmpresaChecklist,
  EmpresaSeccion,
  SuperAdminCatalogos,
} from '@/app/types/superAdmin';
import Loader from '../../Loader/Loader';
import SuperAdminShell from '../SuperAdminShell';
import ConfirmDialog from '../ui/ConfirmDialog';
import EmpresaHeader from './EmpresaHeader';
import EmpresaResumen from './EmpresaResumen';
import SeccionDatos from './SeccionDatos';
import SeccionInfra from './SeccionInfra';
import SeccionModulos from './SeccionModulos';
import SeccionSectores from './SeccionSectores';
import SeccionServicios from './SeccionServicios';
import SeccionUsuarios from './SeccionUsuarios';
import SeccionCobranza from './SeccionCobranza';
import styles from '../superAdmin.module.css';

const SECCIONES: { id: EmpresaSeccion; label: string }[] = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'datos', label: 'Datos' },
  { id: 'infra', label: 'Infra' },
  { id: 'modulos', label: 'Módulos' },
  { id: 'sectores', label: 'Sectores' },
  { id: 'servicios', label: 'Servicios' },
  { id: 'usuarios', label: 'Usuarios' },
  { id: 'cobranza', label: 'Cobranza' },
];

const SECCION_IDS = new Set(SECCIONES.map((s) => s.id));

type Props = { id: string };

export default function EmpresaWorkspace({ id }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const seccionParam = searchParams.get('seccion');
  const seccion: EmpresaSeccion = SECCION_IDS.has(seccionParam as EmpresaSeccion)
    ? (seccionParam as EmpresaSeccion)
    : 'resumen';

  const [empresa, setEmpresa] = useState<EmpresaAdmin | null>(null);
  const [catalogos, setCatalogos] = useState<SuperAdminCatalogos | null>(null);
  const [checklist, setChecklist] = useState<EmpresaChecklist | null>(null);
  const [sectores, setSectores] = useState<CatalogoSector[]>([]);
  const [servicios, setServicios] = useState<CatalogoServicio[]>([]);
  const [roles, setRoles] = useState<CatalogoRol[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<null | 'activar' | 'suspender' | 'eliminar'>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [det, cat, check] = await Promise.all([
        superAdminService.getEmpresa(id),
        superAdminService.getCatalogosEmpresa(id),
        superAdminService.getChecklist(id),
      ]);
      setEmpresa(det);
      setCatalogos(cat);
      setChecklist(check);
      setSectores(cat.sectores || []);
      setServicios(cat.servicios || []);
      setRoles(cat.roles || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al abrir la empresa');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const onUpdated = async (fresh: EmpresaAdmin) => {
    setEmpresa(fresh);
    try {
      setChecklist(await superAdminService.getChecklist(fresh.id));
    } catch {
      /* ignore */
    }
  };

  const refreshCatalogos = async () => {
    const cat = await superAdminService.getCatalogosEmpresa(id);
    setCatalogos(cat);
    setSectores(cat.sectores || []);
    setServicios(cat.servicios || []);
    setRoles(cat.roles || []);
  };

  const setEstado = async (estado: string) => {
    if (!empresa) return;
    setBusy(true);
    setError(null);
    try {
      await superAdminService.updateSuscripcion(empresa.id, {
        ...(empresa.suscripcion || { plan: 'STARTER', importeMensual: null, moneda: 'ARS' }),
        estado,
      });
      if (estado === 'ACTIVA') {
        await superAdminService.updateOnboarding(empresa.id, {
          completado: true,
          altaCompletada: true,
          sectoresDefecto: empresa.onboarding?.sectoresDefecto,
        });
      }
      await onUpdated(await superAdminService.getEmpresa(empresa.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cambiar el estado');
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const eliminar = async () => {
    if (!empresa) return;
    setBusy(true);
    setError(null);
    try {
      await superAdminService.deleteEmpresa(empresa.id);
      router.replace('/dashboard/super-admin/empresas');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al eliminar');
      setBusy(false);
      setConfirm(null);
    }
  };

  if (loading || !empresa || !catalogos) {
    return (
      <div className={styles.superAdmin}>
        <Loader />
      </div>
    );
  }

  return (
    <SuperAdminShell
      title={empresa.descripcion}
      subtitle="Ficha operativa · configuración posterior al alta"
      crumbs={[
        { label: 'Plataforma', href: '/dashboard/super-admin' },
        { label: 'Empresas', href: '/dashboard/super-admin/empresas' },
        { label: empresa.descripcion },
      ]}
      error={error}
      onDismissError={() => setError(null)}
    >
      <EmpresaHeader
        empresa={empresa}
        checklist={checklist}
        busy={busy}
        onActivar={() => setConfirm('activar')}
        onSuspender={() => setConfirm('suspender')}
        onEliminar={() => setConfirm('eliminar')}
      />

      <nav className={styles.sectionNav} aria-label="Secciones de la empresa">
        {SECCIONES.map((s) => (
          <Link
            key={s.id}
            href={`/dashboard/super-admin/empresas/${empresa.id}?seccion=${s.id}`}
            className={`${styles.sectionNavBtn} ${seccion === s.id ? styles.sectionNavBtnActive : ''}`}
          >
            {s.label}
          </Link>
        ))}
      </nav>

      {seccion === 'resumen' && <EmpresaResumen empresa={empresa} checklist={checklist} />}
      {seccion === 'datos' && <SeccionDatos empresa={empresa} onUpdated={(e) => void onUpdated(e)} onError={setError} />}
      {seccion === 'infra' && <SeccionInfra empresa={empresa} onUpdated={(e) => void onUpdated(e)} onError={setError} />}
      {seccion === 'modulos' && (
        <SeccionModulos empresa={empresa} catalogos={catalogos} onUpdated={(e) => void onUpdated(e)} onError={setError} />
      )}
      {seccion === 'sectores' && (
        <SeccionSectores
          empresa={empresa}
          sectores={sectores}
          onRefresh={refreshCatalogos}
          onUpdated={(e) => void onUpdated(e)}
          onError={setError}
        />
      )}
      {seccion === 'servicios' && (
        <SeccionServicios
          empresa={empresa}
          servicios={servicios}
          onRefresh={refreshCatalogos}
          onUpdated={(e) => void onUpdated(e)}
          onError={setError}
        />
      )}
      {seccion === 'usuarios' && (
        <SeccionUsuarios
          empresa={empresa}
          roles={roles}
          sectores={sectores}
          servicios={servicios}
          onUpdated={(e) => void onUpdated(e)}
          onError={setError}
        />
      )}
      {seccion === 'cobranza' && (
        <SeccionCobranza empresa={empresa} catalogos={catalogos} onUpdated={(e) => void onUpdated(e)} onError={setError} />
      )}

      <ConfirmDialog
        open={confirm === 'activar'}
        title="Activar empresa"
        message={`¿Activar "${empresa.descripcion}"? La suscripción pasará a ACTIVA.`}
        confirmLabel="Activar"
        busy={busy}
        onConfirm={() => void setEstado('ACTIVA')}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === 'suspender'}
        title="Suspender empresa"
        message={`¿Suspender "${empresa.descripcion}"?`}
        confirmLabel="Suspender"
        danger
        busy={busy}
        onConfirm={() => void setEstado('SUSPENDIDA')}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === 'eliminar'}
        title="Eliminar empresa"
        message={`¿Eliminar "${empresa.descripcion}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        danger
        busy={busy}
        onConfirm={() => void eliminar()}
        onCancel={() => setConfirm(null)}
      />
    </SuperAdminShell>
  );
}
