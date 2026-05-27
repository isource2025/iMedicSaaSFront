'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { superAdminService } from '@/app/services/superAdminService';
import type {
  CatalogoSector,
  EmpresaAdmin,
  EmpresaUsuario,
  SuperAdminCatalogos,
} from '@/app/types/superAdmin';
import styles from './superAdmin.module.css';

const PASO_IDS = ['DATOS', 'MODULOS', 'SECTORES', 'USUARIOS', 'COBRANZA', 'ACTIVACION'] as const;
type PasoId = (typeof PASO_IDS)[number];

const PASO_LABELS: Record<PasoId, string> = {
  DATOS: 'Datos',
  MODULOS: 'Módulos',
  SECTORES: 'Sectores',
  USUARIOS: 'Usuarios',
  COBRANZA: 'Cobranza',
  ACTIVACION: 'Activar',
};

type Props = {
  empresa: EmpresaAdmin;
  catalogos: SuperAdminCatalogos;
  onEmpresaActualizada: (empresa: EmpresaAdmin) => void;
  onRefreshCatalogos: () => Promise<SuperAdminCatalogos>;
  onEmpresaEliminada?: () => void | Promise<void>;
  onError: (msg: string | null) => void;
};

const emptyUsuario = (idRol: number) => ({
  nombreRed: '',
  password: '',
  apellido: '',
  nombres: '',
  numeroDocumento: '',
  idRol,
});

export default function OnboardingWizard({
  empresa,
  catalogos,
  onEmpresaActualizada,
  onRefreshCatalogos,
  onEmpresaEliminada,
  onError,
}: Props) {
  const router = useRouter();
  const idxInicial = Math.max(0, PASO_IDS.indexOf((empresa.onboarding?.pasoActual || 'DATOS') as PasoId));
  const [pasoIdx, setPasoIdx] = useState(idxInicial >= 0 ? idxInicial : 0);
  const [guardando, setGuardando] = useState(false);
  const [avisoActivacion, setAvisoActivacion] = useState<{
    tipo: 'ok' | 'error';
    texto: string;
  } | null>(null);

  const pasoActual = PASO_IDS[pasoIdx] ?? 'DATOS';
  const idRolDefault = catalogos.roles?.[0]?.idRol ?? 1;

  const [datosForm, setDatosForm] = useState({
    descripcion: empresa.descripcion,
    cuit: empresa.cuit || '',
    email: empresa.email || '',
    telefono: empresa.telefono || '',
    calle: empresa.calle || '',
    calle_nro: empresa.calle_nro || '',
    localidad: empresa.localidad || '',
  });

  const [conexionForm, setConexionForm] = useState({
    dbServer: empresa.conexion?.dbServer || '',
    dbPort: empresa.conexion?.dbPort != null ? String(empresa.conexion.dbPort) : '1433',
    dbInstance: empresa.conexion?.dbInstance || '',
    dbName: empresa.conexion?.dbName || '',
    dbUser: empresa.conexion?.dbUser || '',
    dbPassword: '',
  });

  const [sectoresCatalogo, setSectoresCatalogo] = useState<CatalogoSector[]>(catalogos.sectores || []);
  const [sectoresSel, setSectoresSel] = useState<Set<string>>(
    () => new Set(empresa.onboarding?.sectoresDefecto || []),
  );

  const [nuevoSector, setNuevoSector] = useState({ valor: '', descripcion: '', ambInt: 'A' });
  const [editSector, setEditSector] = useState<string | null>(null);
  const [editSectorForm, setEditSectorForm] = useState({ descripcion: '', ambInt: 'A' });

  const [nuevoUsuario, setNuevoUsuario] = useState(emptyUsuario(idRolDefault));
  const [editUserId, setEditUserId] = useState<number | null>(null);
  const [editUserForm, setEditUserForm] = useState({
    nombreRed: '',
    apellido: '',
    nombres: '',
    numeroDocumento: '',
    password: '',
    idRol: idRolDefault,
    sectores: [] as string[],
  });

  useEffect(() => {
    setDatosForm({
      descripcion: empresa.descripcion,
      cuit: empresa.cuit || '',
      email: empresa.email || '',
      telefono: empresa.telefono || '',
      calle: empresa.calle || '',
      calle_nro: empresa.calle_nro || '',
      localidad: empresa.localidad || '',
    });
    setConexionForm({
      dbServer: empresa.conexion?.dbServer || '',
      dbPort: empresa.conexion?.dbPort != null ? String(empresa.conexion.dbPort) : '1433',
      dbInstance: empresa.conexion?.dbInstance || '',
      dbName: empresa.conexion?.dbName || '',
      dbUser: empresa.conexion?.dbUser || '',
      dbPassword: '',
    });
    setSectoresSel(new Set(empresa.onboarding?.sectoresDefecto || []));
    setAvisoActivacion(null);
  }, [empresa.id]);

  useEffect(() => {
    setAvisoActivacion(null);
  }, [pasoIdx]);

  useEffect(() => {
    setSectoresCatalogo(catalogos.sectores || []);
  }, [catalogos.sectores]);

  const refrescarEmpresa = useCallback(async () => {
    const det = await superAdminService.getEmpresa(empresa.id);
    onEmpresaActualizada(det);
    return det;
  }, [empresa.id, onEmpresaActualizada]);

  const run = async (fn: () => Promise<void>) => {
    setGuardando(true);
    try {
      onError(null);
      await fn();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Error en la operación');
    } finally {
      setGuardando(false);
    }
  };

  const guardarDatos = () =>
    run(async () => {
      if (!datosForm.descripcion.trim()) throw new Error('Razón social obligatoria');
      const det = await superAdminService.updateEmpresa(empresa.id, datosForm);
      onEmpresaActualizada(det);
    });

  const guardarConexion = () =>
    run(async () => {
      const det = await superAdminService.updateConexion(empresa.id, {
        dbServer: conexionForm.dbServer,
        dbPort: conexionForm.dbPort ? Number(conexionForm.dbPort) : null,
        dbInstance: conexionForm.dbInstance,
        dbName: conexionForm.dbName,
        dbUser: conexionForm.dbUser,
        dbPassword: conexionForm.dbPassword || undefined,
      });
      onEmpresaActualizada(det);
      setConexionForm((f) => ({ ...f, dbPassword: '' }));
    });

  const probarConexion = () =>
    run(async () => {
      await superAdminService.updateConexion(empresa.id, {
        dbServer: conexionForm.dbServer,
        dbPort: conexionForm.dbPort ? Number(conexionForm.dbPort) : null,
        dbInstance: conexionForm.dbInstance,
        dbName: conexionForm.dbName,
        dbUser: conexionForm.dbUser,
        dbPassword: conexionForm.dbPassword || undefined,
      });
      const r = await superAdminService.probarConexion(empresa.id);
      if (!r.ok) throw new Error('No se pudo conectar a la base de datos');
      await refrescarEmpresa();
    });

  const eliminarEmpresa = () =>
    run(async () => {
      if (!confirm(`¿Eliminar la empresa "${empresa.descripcion}"? Esta acción no se puede deshacer.`)) return;
      await superAdminService.deleteEmpresa(empresa.id);
      onEmpresaEliminada?.();
      router.replace('/dashboard/super-admin?tab=empresas');
    });

  const guardarModulos = () =>
    run(async () => {
      await superAdminService.updatePacks(empresa.id, empresa.packs || []);
      await refrescarEmpresa();
    });

  const guardarSectoresEmpresa = () =>
    run(async () => {
      await superAdminService.updateOnboarding(empresa.id, {
        pasoActual: 'SECTORES',
        sectoresDefecto: [...sectoresSel],
        completado: false,
      });
      await refrescarEmpresa();
    });

  const crearSector = () =>
    run(async () => {
      await superAdminService.crearSector(nuevoSector);
      setNuevoSector({ valor: '', descripcion: '', ambInt: 'A' });
      const cat = await onRefreshCatalogos();
      setSectoresCatalogo(cat.sectores || []);
    });

  const guardarSectorEdit = () =>
    run(async () => {
      if (!editSector) return;
      await superAdminService.actualizarSector(editSector, editSectorForm);
      setEditSector(null);
      const cat = await onRefreshCatalogos();
      setSectoresCatalogo(cat.sectores || []);
    });

  const eliminarSector = (id: string) =>
    run(async () => {
      if (!confirm(`¿Eliminar el sector ${id}?`)) return;
      await superAdminService.eliminarSector(id);
      sectoresSel.delete(id);
      setSectoresSel(new Set(sectoresSel));
      const cat = await onRefreshCatalogos();
      setSectoresCatalogo(cat.sectores || []);
    });

  const crearUsuario = () =>
    run(async () => {
      if (!nuevoUsuario.nombreRed.trim() || !nuevoUsuario.password.trim()) {
        throw new Error('Usuario y contraseña son obligatorios');
      }
      if (!nuevoUsuario.apellido.trim() || !nuevoUsuario.nombres.trim()) {
        throw new Error('Apellido y nombres son obligatorios');
      }
      await superAdminService.crearUsuarioEmpresa(Number(empresa.id), {
        ...nuevoUsuario,
        sectores: [...sectoresSel],
        idRol: Number(nuevoUsuario.idRol),
      });
      setNuevoUsuario(emptyUsuario(idRolDefault));
      await refrescarEmpresa();
    });

  const iniciarEditarUsuario = (u: EmpresaUsuario) => {
    setEditUserId(u.idPersonal);
    setEditUserForm({
      nombreRed: u.usuario,
      apellido: u.apellido,
      nombres: u.nombre,
      numeroDocumento: u.numeroDocumento || '',
      password: '',
      idRol: u.idRol ?? idRolDefault,
      sectores: (u.sectores || []).map((s) => s.id),
    });
  };

  const guardarUsuarioEdit = () =>
    run(async () => {
      if (editUserId == null) return;
      await superAdminService.actualizarUsuarioEmpresa(Number(empresa.id), editUserId, {
        nombreRed: editUserForm.nombreRed,
        apellido: editUserForm.apellido,
        nombres: editUserForm.nombres,
        numeroDocumento: editUserForm.numeroDocumento,
        password: editUserForm.password || undefined,
        idRol: Number(editUserForm.idRol),
        sectores: editUserForm.sectores,
      });
      setEditUserId(null);
      await refrescarEmpresa();
    });

  const quitarUsuario = (idPersonal: number, usuario: string) =>
    run(async () => {
      if (!confirm(`¿Desvincular a "${usuario}" de esta empresa?`)) return;
      await superAdminService.desvincularUsuarioEmpresa(Number(empresa.id), idPersonal);
      if (editUserId === idPersonal) setEditUserId(null);
      await refrescarEmpresa();
    });

  const guardarCobranza = () =>
    run(async () => {
      if (!empresa.suscripcion) return;
      await superAdminService.updateSuscripcion(empresa.id, empresa.suscripcion);
      await refrescarEmpresa();
    });

  const ejecutarActivacion = async () => {
    setAvisoActivacion(null);
    onError(null);
    try {
      await superAdminService.updateSuscripcion(empresa.id, {
        ...(empresa.suscripcion || { plan: 'STARTER', estado: 'PRUEBA', importeMensual: null, moneda: 'ARS' }),
        estado: 'ACTIVA',
      });
      await superAdminService.updateOnboarding(empresa.id, {
        pasoActual: 'ACTIVACION',
        completado: true,
        sectoresDefecto: [...sectoresSel],
      });
      const det = await refrescarEmpresa();
      const ok =
        !!det.onboarding?.completado &&
        String(det.suscripcion?.estado || '').toUpperCase() === 'ACTIVA';

      if (ok) {
        setAvisoActivacion({
          tipo: 'ok',
          texto: `La empresa "${det.descripcion}" fue activada correctamente. Suscripción en estado ACTIVA.`,
        });
      } else {
        setAvisoActivacion({
          tipo: 'error',
          texto:
            'No se pudo confirmar la activación. Revise suscripción y estado del onboarding en el servidor.',
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al activar la empresa';
      setAvisoActivacion({ tipo: 'error', texto: msg });
      onError(msg);
      throw e;
    }
  };

  const activarEmpresa = () =>
    run(async () => {
      await ejecutarActivacion();
    });

  const desactivarOnboarding = () =>
    run(async () => {
      await superAdminService.updateOnboarding(empresa.id, {
        pasoActual: empresa.onboarding?.pasoActual || 'ACTIVACION',
        completado: false,
        sectoresDefecto: [...sectoresSel],
      });
      await refrescarEmpresa();
    });

  const guardarPasoActual = async () => {
    switch (pasoActual) {
      case 'DATOS':
        if (!datosForm.descripcion.trim()) throw new Error('Razón social obligatoria');
        await superAdminService.updateEmpresa(empresa.id, datosForm);
        await refrescarEmpresa();
        break;
      case 'MODULOS':
        await superAdminService.updatePacks(empresa.id, empresa.packs || []);
        await refrescarEmpresa();
        break;
      case 'SECTORES':
        await superAdminService.updateOnboarding(empresa.id, {
          pasoActual: 'SECTORES',
          sectoresDefecto: [...sectoresSel],
          completado: false,
        });
        await refrescarEmpresa();
        break;
      case 'COBRANZA':
        if (empresa.suscripcion) {
          await superAdminService.updateSuscripcion(empresa.id, empresa.suscripcion);
          await refrescarEmpresa();
        }
        break;
      default:
        break;
    }
  };

  const irSiguiente = async () => {
    if (pasoIdx >= PASO_IDS.length - 1) return;
    setGuardando(true);
    try {
      onError(null);
      if (pasoActual === 'ACTIVACION' && !empresa.onboarding?.completado) {
        await ejecutarActivacion();
      } else {
        await guardarPasoActual();
        await superAdminService.updateOnboarding(empresa.id, {
          pasoActual: PASO_IDS[pasoIdx + 1],
          completado: empresa.onboarding?.completado ?? false,
          sectoresDefecto: [...sectoresSel],
        });
        await refrescarEmpresa();
      }
      setPasoIdx(pasoIdx + 1);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  const togglePack = (codigo: string) => {
    const packs = new Set(empresa.packs || []);
    if (packs.has(codigo)) packs.delete(codigo);
    else packs.add(codigo);
    onEmpresaActualizada({ ...empresa, packs: [...packs] });
  };

  const toggleSectorSel = (id: string) => {
    const next = new Set(sectoresSel);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSectoresSel(next);
  };

  const toggleSectorUsuario = (id: string) => {
    const next = new Set(editUserForm.sectores);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setEditUserForm({ ...editUserForm, sectores: [...next] });
  };

  const usuarios = empresa.usuarios || [];

  return (
    <div className={styles.wizard}>
      <div className={styles.wizardStepper}>
        {PASO_IDS.map((id, i) => (
          <button
            key={id}
            type="button"
            className={`${styles.wizardPill} ${i === pasoIdx ? styles.wizardPillActive : ''} ${i < pasoIdx ? styles.wizardPillDone : ''}`}
            onClick={() => setPasoIdx(i)}
            disabled={guardando}
          >
            <span className={styles.wizardPillNum}>{i + 1}</span>
            <span>{PASO_LABELS[id]}</span>
          </button>
        ))}
      </div>

      <div className={styles.wizardCard}>
        {pasoActual === 'DATOS' && (
          <div className={styles.wizardContent}>
            <div className={styles.stepToolbar}>
              <span className={styles.stepTitle}>Datos de la empresa</span>
              <div className={styles.stepActions}>
                <button type="button" className={styles.btn} disabled={guardando} onClick={guardarDatos}>
                  Guardar
                </button>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnDanger}`}
                  disabled={guardando}
                  onClick={eliminarEmpresa}
                >
                  Eliminar empresa
                </button>
              </div>
            </div>
            <div className={styles.grid2}>
              <div className={styles.formGroup}>
                <label>Razón social *</label>
                <input
                  className={styles.input}
                  value={datosForm.descripcion}
                  onChange={(e) => setDatosForm({ ...datosForm, descripcion: e.target.value })}
                />
              </div>
              <div className={styles.formGroup}>
                <label>CUIT</label>
                <input
                  className={styles.input}
                  value={datosForm.cuit}
                  onChange={(e) => setDatosForm({ ...datosForm, cuit: e.target.value })}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Email</label>
                <input
                  className={styles.input}
                  value={datosForm.email}
                  onChange={(e) => setDatosForm({ ...datosForm, email: e.target.value })}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Teléfono</label>
                <input
                  className={styles.input}
                  value={datosForm.telefono}
                  onChange={(e) => setDatosForm({ ...datosForm, telefono: e.target.value })}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Calle</label>
                <input
                  className={styles.input}
                  value={datosForm.calle}
                  onChange={(e) => setDatosForm({ ...datosForm, calle: e.target.value })}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Número</label>
                <input
                  className={styles.input}
                  value={datosForm.calle_nro}
                  onChange={(e) => setDatosForm({ ...datosForm, calle_nro: e.target.value })}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Localidad</label>
                <input
                  className={styles.input}
                  value={datosForm.localidad}
                  onChange={(e) => setDatosForm({ ...datosForm, localidad: e.target.value })}
                />
              </div>
            </div>

            <div className={styles.stepToolbar} style={{ marginTop: '1.25rem' }}>
              <span className={styles.stepTitle}>Conexión SQL (tenant)</span>
              <div className={styles.stepActions}>
                <button type="button" className={styles.btn} disabled={guardando} onClick={guardarConexion}>
                  Guardar conexión
                </button>
                <button type="button" className={styles.btnSecondary} disabled={guardando} onClick={probarConexion}>
                  Probar conexión
                </button>
              </div>
            </div>
            <p className={styles.packDesc} style={{ marginBottom: '0.75rem' }}>
              Vacío = misma BD que el servidor (.env). La contraseña se guarda cifrada; dejar en blanco para no cambiarla.
            </p>
            <div className={styles.grid2}>
              <div className={styles.formGroup}>
                <label>Servidor</label>
                <input
                  className={styles.input}
                  value={conexionForm.dbServer}
                  onChange={(e) => setConexionForm({ ...conexionForm, dbServer: e.target.value })}
                  placeholder="190.227.150.183"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Puerto</label>
                <input
                  className={styles.input}
                  value={conexionForm.dbPort}
                  onChange={(e) => setConexionForm({ ...conexionForm, dbPort: e.target.value })}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Instancia</label>
                <input
                  className={styles.input}
                  value={conexionForm.dbInstance}
                  onChange={(e) => setConexionForm({ ...conexionForm, dbInstance: e.target.value })}
                  placeholder="SQLEXPRESS"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Base de datos</label>
                <input
                  className={styles.input}
                  value={conexionForm.dbName}
                  onChange={(e) => setConexionForm({ ...conexionForm, dbName: e.target.value })}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Usuario SQL</label>
                <input
                  className={styles.input}
                  value={conexionForm.dbUser}
                  onChange={(e) => setConexionForm({ ...conexionForm, dbUser: e.target.value })}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Contraseña SQL</label>
                <input
                  type="password"
                  className={styles.input}
                  value={conexionForm.dbPassword}
                  onChange={(e) => setConexionForm({ ...conexionForm, dbPassword: e.target.value })}
                  placeholder={empresa.conexion?.tienePassword ? '•••• (sin cambiar)' : ''}
                />
              </div>
            </div>
          </div>
        )}

        {pasoActual === 'MODULOS' && (
          <div className={styles.wizardContent}>
            <div className={styles.stepToolbar}>
              <span className={styles.stepTitle}>Módulos contratados</span>
              <button type="button" className={styles.btn} disabled={guardando} onClick={guardarModulos}>
                Guardar
              </button>
            </div>
            <p className={styles.wizardHint}>Clic para activar o desactivar cada pack.</p>
            <div className={styles.packGrid}>
              {catalogos.packs.map((pack) => {
                const active = (empresa.packs || []).includes(pack.codigo);
                return (
                  <button
                    key={pack.codigo}
                    type="button"
                    className={`${styles.packCard} ${active ? styles.packCardActive : ''}`}
                    onClick={() => togglePack(pack.codigo)}
                  >
                    <span className={styles.packTitle}>{pack.label}</span>
                    <span className={styles.packDesc}>{pack.descripcion}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {pasoActual === 'SECTORES' && (
          <div className={styles.wizardContent}>
            <div className={styles.stepToolbar}>
              <span className={styles.stepTitle}>Catálogo de sectores</span>
              <button type="button" className={styles.btn} disabled={guardando} onClick={guardarSectoresEmpresa}>
                Guardar selección ({sectoresSel.size})
              </button>
            </div>

            <div className={styles.crudBlock}>
              <p className={styles.crudBlockTitle}>Nuevo sector</p>
              <div className={styles.inlineForm}>
                <input
                  className={styles.input}
                  placeholder="Código (ej. LAB)"
                  maxLength={3}
                  value={nuevoSector.valor}
                  onChange={(e) =>
                    setNuevoSector({ ...nuevoSector, valor: e.target.value.toUpperCase() })
                  }
                />
                <input
                  className={styles.input}
                  placeholder="Descripción"
                  value={nuevoSector.descripcion}
                  onChange={(e) => setNuevoSector({ ...nuevoSector, descripcion: e.target.value })}
                />
                <select
                  className={styles.select}
                  value={nuevoSector.ambInt}
                  onChange={(e) => setNuevoSector({ ...nuevoSector, ambInt: e.target.value })}
                >
                  <option value="A">Ambulatorio</option>
                  <option value="I">Internación</option>
                </select>
                <button type="button" className={styles.btn} disabled={guardando} onClick={crearSector}>
                  + Agregar
                </button>
              </div>
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Usar</th>
                    <th>Código</th>
                    <th>Descripción</th>
                    <th>Amb.</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {sectoresCatalogo.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={sectoresSel.has(s.id)}
                          onChange={() => toggleSectorSel(s.id)}
                        />
                      </td>
                      <td>{s.id}</td>
                      <td>
                        {editSector === s.id ? (
                          <input
                            className={styles.input}
                            value={editSectorForm.descripcion}
                            onChange={(e) =>
                              setEditSectorForm({ ...editSectorForm, descripcion: e.target.value })
                            }
                          />
                        ) : (
                          s.descripcion
                        )}
                      </td>
                      <td>
                        {editSector === s.id ? (
                          <select
                            className={styles.select}
                            value={editSectorForm.ambInt}
                            onChange={(e) =>
                              setEditSectorForm({ ...editSectorForm, ambInt: e.target.value })
                            }
                          >
                            <option value="A">A</option>
                            <option value="I">I</option>
                          </select>
                        ) : (
                          s.ambInt || '—'
                        )}
                      </td>
                      <td className={styles.actionsCell}>
                        {editSector === s.id ? (
                          <>
                            <button type="button" className={styles.btnSm} onClick={guardarSectorEdit}>
                              OK
                            </button>
                            <button
                              type="button"
                              className={styles.btnSmSecondary}
                              onClick={() => setEditSector(null)}
                            >
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              className={styles.btnSmSecondary}
                              onClick={() => {
                                setEditSector(s.id);
                                setEditSectorForm({
                                  descripcion: s.descripcion,
                                  ambInt: s.ambInt || 'A',
                                });
                              }}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              className={`${styles.btnSm} ${styles.btnDanger}`}
                              onClick={() => eliminarSector(s.id)}
                            >
                              Eliminar
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {pasoActual === 'USUARIOS' && (
          <div className={styles.wizardContent}>
            <div className={styles.stepToolbar}>
              <span className={styles.stepTitle}>Usuarios de la empresa</span>
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Nombre</th>
                    <th>Rol</th>
                    <th>Sectores</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.length === 0 ? (
                    <tr>
                      <td colSpan={5} className={styles.emptyCell}>
                        Sin usuarios vinculados
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
                        <td>{(u.sectores || []).map((s) => s.id).join(', ') || '—'}</td>
                        <td className={styles.actionsCell}>
                          <button
                            type="button"
                            className={styles.btnSmSecondary}
                            onClick={() => iniciarEditarUsuario(u)}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className={`${styles.btnSm} ${styles.btnDanger}`}
                            onClick={() => quitarUsuario(u.idPersonal, u.usuario)}
                          >
                            Quitar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {editUserId != null && (
              <div className={styles.crudBlock}>
                <p className={styles.crudBlockTitle}>Editar usuario</p>
                <div className={styles.grid2}>
                  <div className={styles.formGroup}>
                    <label>Usuario de red</label>
                    <input
                      className={styles.input}
                      value={editUserForm.nombreRed}
                      onChange={(e) => setEditUserForm({ ...editUserForm, nombreRed: e.target.value })}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Nueva contraseña (opcional)</label>
                    <input
                      className={styles.input}
                      type="password"
                      value={editUserForm.password}
                      onChange={(e) => setEditUserForm({ ...editUserForm, password: e.target.value })}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Apellido</label>
                    <input
                      className={styles.input}
                      value={editUserForm.apellido}
                      onChange={(e) => setEditUserForm({ ...editUserForm, apellido: e.target.value })}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Nombres</label>
                    <input
                      className={styles.input}
                      value={editUserForm.nombres}
                      onChange={(e) => setEditUserForm({ ...editUserForm, nombres: e.target.value })}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Rol</label>
                    <select
                      className={styles.select}
                      value={editUserForm.idRol}
                      onChange={(e) =>
                        setEditUserForm({ ...editUserForm, idRol: Number(e.target.value) })
                      }
                    >
                      {(catalogos.roles || []).map((r) => (
                        <option key={r.idRol} value={r.idRol}>
                          {r.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className={styles.wizardHint}>Sectores del usuario:</p>
                <div className={styles.sectorGrid}>
                  {sectoresCatalogo.map((s) => (
                    <label key={s.id} className={styles.sectorChip}>
                      <input
                        type="checkbox"
                        checked={editUserForm.sectores.includes(s.id)}
                        onChange={() => toggleSectorUsuario(s.id)}
                      />
                      <span>{s.descripcion}</span>
                    </label>
                  ))}
                </div>
                <div className={styles.stepActions}>
                  <button type="button" className={styles.btn} onClick={guardarUsuarioEdit}>
                    Guardar cambios
                  </button>
                  <button
                    type="button"
                    className={styles.btnSecondary}
                    onClick={() => setEditUserId(null)}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            <div className={styles.crudBlock}>
              <p className={styles.crudBlockTitle}>Nuevo usuario</p>
              <div className={styles.grid2}>
                <div className={styles.formGroup}>
                  <label>Usuario de red *</label>
                  <input
                    className={styles.input}
                    value={nuevoUsuario.nombreRed}
                    onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, nombreRed: e.target.value })}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Contraseña *</label>
                  <input
                    className={styles.input}
                    type="password"
                    value={nuevoUsuario.password}
                    onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, password: e.target.value })}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Apellido *</label>
                  <input
                    className={styles.input}
                    value={nuevoUsuario.apellido}
                    onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, apellido: e.target.value })}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Nombres *</label>
                  <input
                    className={styles.input}
                    value={nuevoUsuario.nombres}
                    onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, nombres: e.target.value })}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Rol</label>
                  <select
                    className={styles.select}
                    value={nuevoUsuario.idRol}
                    onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, idRol: Number(e.target.value) })}
                  >
                    {(catalogos.roles || []).map((r) => (
                      <option key={r.idRol} value={r.idRol}>
                        {r.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button type="button" className={styles.btn} disabled={guardando} onClick={crearUsuario}>
                + Crear y vincular
              </button>
            </div>
          </div>
        )}

        {pasoActual === 'COBRANZA' && empresa.suscripcion && (
          <div className={styles.wizardContent}>
            <div className={styles.stepToolbar}>
              <span className={styles.stepTitle}>Plan y cobranza</span>
              <button type="button" className={styles.btn} disabled={guardando} onClick={guardarCobranza}>
                Guardar
              </button>
            </div>
            <div className={styles.grid2}>
              <div className={styles.formGroup}>
                <label>Plan</label>
                <select
                  className={styles.select}
                  value={empresa.suscripcion.plan}
                  onChange={(e) =>
                    onEmpresaActualizada({
                      ...empresa,
                      suscripcion: { ...empresa.suscripcion!, plan: e.target.value },
                    })
                  }
                >
                  {catalogos.planes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Estado</label>
                <select
                  className={styles.select}
                  value={empresa.suscripcion.estado}
                  onChange={(e) =>
                    onEmpresaActualizada({
                      ...empresa,
                      suscripcion: { ...empresa.suscripcion!, estado: e.target.value },
                    })
                  }
                >
                  {catalogos.estadosSuscripcion.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Importe mensual</label>
                <input
                  className={styles.input}
                  type="number"
                  value={empresa.suscripcion.importeMensual ?? ''}
                  onChange={(e) =>
                    onEmpresaActualizada({
                      ...empresa,
                      suscripcion: {
                        ...empresa.suscripcion!,
                        importeMensual: e.target.value ? Number(e.target.value) : null,
                      },
                    })
                  }
                />
              </div>
              <div className={styles.formGroup}>
                <label>Método de pago</label>
                <input
                  className={styles.input}
                  value={empresa.suscripcion.metodoPago || ''}
                  onChange={(e) =>
                    onEmpresaActualizada({
                      ...empresa,
                      suscripcion: { ...empresa.suscripcion!, metodoPago: e.target.value },
                    })
                  }
                />
              </div>
              <div className={styles.formGroup}>
                <label>Notas</label>
                <input
                  className={styles.input}
                  value={empresa.suscripcion.notas || ''}
                  onChange={(e) =>
                    onEmpresaActualizada({
                      ...empresa,
                      suscripcion: { ...empresa.suscripcion!, notas: e.target.value },
                    })
                  }
                />
              </div>
            </div>
          </div>
        )}

        {pasoActual === 'ACTIVACION' && (
          <div className={styles.wizardContent}>
            <div className={styles.stepToolbar}>
              <span className={styles.stepTitle}>Activación</span>
            </div>

            {avisoActivacion && (
              <div
                className={`${styles.wizardAlert} ${
                  avisoActivacion.tipo === 'ok' ? styles.wizardAlertOk : styles.wizardAlertError
                }`}
                role="alert"
              >
                <span>{avisoActivacion.texto}</span>
                <button
                  type="button"
                  className={styles.wizardAlertDismiss}
                  aria-label="Cerrar aviso"
                  onClick={() => setAvisoActivacion(null)}
                >
                  ×
                </button>
              </div>
            )}

            {empresa.onboarding?.completado ? (
              <>
                <p className={styles.wizardOk}>
                  Onboarding completado — suscripción{' '}
                  {String(empresa.suscripcion?.estado || '').toUpperCase() === 'ACTIVA'
                    ? 'activa'
                    : empresa.suscripcion?.estado || 'sin estado'}
                  .
                </p>
                <button type="button" className={styles.btnSecondary} onClick={desactivarOnboarding}>
                  Reabrir onboarding
                </button>
              </>
            ) : (
              <p className={styles.wizardHint}>
                Al pulsar &quot;Activar empresa&quot; se guarda el estado ACTIVA y se marca el onboarding como
                completado. Verá un mensaje de confirmación o de error según el resultado.
              </p>
            )}
          </div>
        )}
      </div>

      <div className={styles.wizardFooter}>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnSecondary}`}
          disabled={pasoIdx === 0 || guardando}
          onClick={() => setPasoIdx(pasoIdx - 1)}
        >
          Anterior
        </button>
        {pasoIdx < PASO_IDS.length - 1 && (
          <button type="button" className={styles.btn} disabled={guardando} onClick={irSiguiente}>
            {guardando
              ? 'Guardando…'
              : pasoActual === 'ACTIVACION' && !empresa.onboarding?.completado
                ? 'Activar y continuar'
                : 'Guardar y continuar'}
          </button>
        )}
        {pasoActual === 'ACTIVACION' && !empresa.onboarding?.completado && (
          <button type="button" className={styles.btn} disabled={guardando} onClick={activarEmpresa}>
            Activar empresa
          </button>
        )}
      </div>
    </div>
  );
}
