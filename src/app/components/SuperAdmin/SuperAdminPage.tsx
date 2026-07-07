'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePermiso } from '@/app/hooks/usePermiso';
import { superAdminService } from '@/app/services/superAdminService';
import type {
  EmpresaAdmin,
  SuperAdminCatalogos,
  SuperAdminDashboard,
  SuperAdminTab,
  UsuarioPlataforma,
} from '@/app/types/superAdmin';
import Loader from '../Loader/Loader';
import OnboardingWizard from './OnboardingWizard';
import styles from './superAdmin.module.css';

const TABS: { id: SuperAdminTab; label: string }[] = [
  { id: 'panel', label: 'Panel' },
  { id: 'empresas', label: 'Empresas' },
  { id: 'onboarding', label: 'Onboarding' },
  { id: 'usuarios', label: 'Usuarios' },
  { id: 'configuracion', label: 'Config' },
];

const TAB_IDS = new Set(TABS.map((t) => t.id));

function estadoBadge(estado?: string) {
  const e = (estado || '').toUpperCase();
  if (e === 'ACTIVA') return styles.badgeOk;
  if (e === 'PRUEBA') return styles.badgeWarn;
  if (e === 'SUSPENDIDA' || e === 'CANCELADA') return styles.badgeDanger;
  return styles.badgeMuted;
}

export default function SuperAdminPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { rol, loaded, permisos } = usePermiso();
  const cargadoRef = useRef(false);

  const tabParam = searchParams.get('tab');
  const tab: SuperAdminTab = TAB_IDS.has(tabParam as SuperAdminTab)
    ? (tabParam as SuperAdminTab)
    : 'panel';

  const setTab = (id: SuperAdminTab) => {
    router.replace(`/dashboard/super-admin?tab=${id}`, { scroll: false });
  };

  const puedeAcceder = useMemo(() => {
    if (!loaded) return false;
    if (rol?.nombre === 'SUPER_ADMIN') return true;
    return permisos.includes('PLATAFORMA.PANEL.VER');
  }, [loaded, rol?.nombre, permisos]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<SuperAdminDashboard | null>(null);
  const [catalogos, setCatalogos] = useState<SuperAdminCatalogos | null>(null);
  const [empresas, setEmpresas] = useState<EmpresaAdmin[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioPlataforma[]>([]);
  const [usuariosLoading, setUsuariosLoading] = useState(false);
  const [selectedEmpresa, setSelectedEmpresa] = useState<EmpresaAdmin | null>(null);
  const [busqueda, setBusqueda] = useState('');

  const [nuevaEmpresa, setNuevaEmpresa] = useState({
    descripcion: '',
    cuit: '',
    email: '',
    tipoServidor: 'NUBE' as 'NUBE' | 'FISICO',
    packs: ['AGENDA'] as string[],
  });

  useEffect(() => {
    if (!loaded) return;
    if (!puedeAcceder) router.replace('/dashboard');
  }, [loaded, puedeAcceder, router]);

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [dash, cat, emps] = await Promise.all([
        superAdminService.getDashboard(),
        superAdminService.getCatalogos(),
        superAdminService.listEmpresas(),
      ]);
      setDashboard(dash);
      setCatalogos(cat);
      setEmpresas(emps);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar Super Admin');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!puedeAcceder || cargadoRef.current) return;
    cargadoRef.current = true;
    cargar();
  }, [puedeAcceder, cargar]);

  useEffect(() => () => {
    cargadoRef.current = false;
  }, []);

  const cargarUsuarios = useCallback(async (q?: string) => {
    setUsuariosLoading(true);
    try {
      setUsuarios(await superAdminService.listUsuarios(q));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar usuarios');
    } finally {
      setUsuariosLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'usuarios' && puedeAcceder && !loading) {
      cargarUsuarios();
    }
  }, [tab, puedeAcceder, loading, cargarUsuarios]);

  const abrirEmpresa = async (id: string) => {
    try {
      setError(null);
      const det = await superAdminService.getEmpresa(id);
      setSelectedEmpresa(det);
      setTab('onboarding');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al abrir empresa');
    }
  };

  const crearEmpresa = async () => {
    const desc = nuevaEmpresa.descripcion.trim();
    if (!desc) {
      setError('Ingresá la razón social de la empresa');
      return;
    }
    try {
      setError(null);
      const creada = await superAdminService.createEmpresa({ ...nuevaEmpresa, descripcion: desc });
      setNuevaEmpresa({ descripcion: '', cuit: '', email: '', tipoServidor: 'NUBE', packs: ['AGENDA'] });
      await cargar();
      setSelectedEmpresa(creada);
      setTab('onboarding');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al crear empresa');
    }
  };

  if (!loaded || loading) {
    return (
      <div className={styles.superAdmin}>
        <Loader />
      </div>
    );
  }

  return (
    <div className={styles.superAdmin}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Plataforma iMedic</h1>
          <p className={styles.subtitle}>Administración multi-empresa</p>
        </div>
      </header>

      <nav className={styles.nav} aria-label="Secciones">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`${styles.navBtn} ${tab === t.id ? styles.navBtnActive : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {error && (
        <div className={styles.error} role="alert">
          {error}
          <button type="button" className={styles.errorDismiss} onClick={() => setError(null)}>
            ×
          </button>
        </div>
      )}

      {tab === 'panel' && dashboard && (
        <section className={styles.panel}>
          <div className={styles.stats}>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Empresas</span>
              <span className={styles.statValue}>{dashboard.totalEmpresas}</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Activas</span>
              <span className={styles.statValue}>{dashboard.suscripcionesActivas}</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>En prueba</span>
              <span className={styles.statValue}>{dashboard.enPrueba}</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Onboarding</span>
              <span className={styles.statValue}>{dashboard.onboardingPendiente}</span>
            </div>
          </div>
          <h2 className={styles.sectionTitle}>Recientes</h2>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>Plan</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.empresasRecientes.map((e) => (
                  <tr key={e.id} className={styles.rowClick} onClick={() => abrirEmpresa(e.id)}>
                    <td>{e.descripcion}</td>
                    <td>{e.suscripcion?.plan || '—'}</td>
                    <td>
                      <span className={`${styles.badge} ${estadoBadge(e.suscripcion?.estado)}`}>
                        {e.suscripcion?.estado || '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'empresas' && (
        <section className={styles.panel}>
          <div className={styles.toolbar}>
            <input
              className={styles.input}
              placeholder="Buscar…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && superAdminService.listEmpresas(busqueda).then(setEmpresas)}
            />
            <button
              type="button"
              className={`${styles.btn} ${styles.btnSecondary}`}
              onClick={() => superAdminService.listEmpresas(busqueda).then(setEmpresas)}
            >
              Buscar
            </button>
          </div>

          <div className={styles.inlineForm}>
            <input
              className={styles.input}
              placeholder="Razón social *"
              value={nuevaEmpresa.descripcion}
              onChange={(e) => setNuevaEmpresa({ ...nuevaEmpresa, descripcion: e.target.value })}
            />
            <input
              className={styles.input}
              placeholder="CUIT"
              value={nuevaEmpresa.cuit}
              onChange={(e) => setNuevaEmpresa({ ...nuevaEmpresa, cuit: e.target.value })}
            />
            <select
              className={styles.select}
              value={nuevaEmpresa.tipoServidor}
              onChange={(e) =>
                setNuevaEmpresa({ ...nuevaEmpresa, tipoServidor: e.target.value as 'NUBE' | 'FISICO' })
              }
              title="Dónde viven los datos de la clínica"
            >
              <option value="NUBE">Servidor nube (Railway)</option>
              <option value="FISICO">Servidor físico (on-premise)</option>
            </select>
            <button type="button" className={styles.btn} onClick={crearEmpresa}>
              + Empresa
            </button>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Empresa</th>
                  <th>Usuarios</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {empresas.map((e) => (
                  <tr key={e.id} className={styles.rowClick} onClick={() => abrirEmpresa(e.id)}>
                    <td>{e.id}</td>
                    <td>{e.descripcion}</td>
                    <td>{e.cantUsuarios ?? '—'}</td>
                    <td>
                      <span className={`${styles.badge} ${estadoBadge(e.suscripcion?.estado)}`}>
                        {e.suscripcion?.estado || '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'onboarding' && catalogos && (
        <section className={styles.panel}>
          <div className={styles.empresaBar}>
            <label className={styles.empresaBarLabel}>Empresa</label>
            <select
              className={styles.select}
              value={selectedEmpresa?.id || ''}
              onChange={async (e) => {
                if (e.target.value) await abrirEmpresa(e.target.value);
                else setSelectedEmpresa(null);
              }}
            >
              <option value="">Elegir empresa…</option>
              {empresas.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.descripcion}
                </option>
              ))}
            </select>
          </div>

          {selectedEmpresa && catalogos ? (
            <OnboardingWizard
              empresa={selectedEmpresa}
              catalogos={catalogos}
              onEmpresaActualizada={setSelectedEmpresa}
              onRefreshCatalogos={async () => {
                const cat = await superAdminService.getCatalogos();
                setCatalogos(cat);
                return cat;
              }}
              onEmpresaEliminada={async () => {
                setSelectedEmpresa(null);
                await cargar();
              }}
              onError={setError}
            />
          ) : (
            <p className={styles.emptyHint}>Elegí una empresa para iniciar el wizard de alta.</p>
          )}
        </section>
      )}

      {tab === 'usuarios' && (
        <section className={styles.panel}>
          <div className={styles.toolbar}>
            <input
              className={styles.input}
              placeholder="Buscar usuario…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && cargarUsuarios(busqueda)}
            />
            <button
              type="button"
              className={`${styles.btn} ${styles.btnSecondary}`}
              onClick={() => cargarUsuarios(busqueda)}
              disabled={usuariosLoading}
            >
              {usuariosLoading ? 'Cargando…' : 'Buscar'}
            </button>
          </div>
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
                {usuarios.length === 0 && !usuariosLoading ? (
                  <tr>
                    <td colSpan={4} className={styles.emptyCell}>
                      Sin usuarios o error al cargar
                    </td>
                  </tr>
                ) : (
                  usuarios.map((u) => (
                    <tr key={u.idPersonal}>
                      <td>{u.usuario}</td>
                      <td>
                        {u.apellido}, {u.nombre}
                      </td>
                      <td>{u.rol || '—'}</td>
                      <td>{u.empresas || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'configuracion' && (
        <section className={styles.panel}>
          <p className={styles.wizardHint}>Parámetros globales de la plataforma.</p>
          <button
            type="button"
            className={styles.btn}
            onClick={async () => {
              try {
                const cfg = await superAdminService.getConfig();
                alert(cfg.map((c) => `${c.clave}: ${c.valor}`).join('\n') || 'Sin configuración');
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Error al leer config');
              }
            }}
          >
            Ver configuración
          </button>
        </section>
      )}
    </div>
  );
}
