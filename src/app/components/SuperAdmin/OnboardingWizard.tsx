'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { superAdminService } from '@/app/services/superAdminService';
import type {
  CatalogoRol,
  CatalogoSector,
  EmpresaAdmin,
  EmpresaUsuario,
  PreviewTabla,
  ResultadoImport,
  SuperAdminCatalogos,
  TablaImportable,
  TipoServidor,
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

const emptyUsuarioForm = (idRol: number, sectores: string[] = []) => ({
  nombreRed: '',
  password: '',
  apellido: '',
  nombres: '',
  numeroDocumento: '',
  idRol,
  sectores,
});

type UsuarioForm = ReturnType<typeof emptyUsuarioForm>;
type UsuarioModal =
  | null
  | { mode: 'create'; form: UsuarioForm }
  | { mode: 'edit'; idPersonal: number; form: UsuarioForm };

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

  const [sectoresCatalogo, setSectoresCatalogo] = useState<CatalogoSector[]>(catalogos.sectores || []);
  const [rolesCatalogo, setRolesCatalogo] = useState<CatalogoRol[]>(catalogos.roles || []);
  const idRolDefault = rolesCatalogo[0]?.idRol ?? 0;

  const [datosForm, setDatosForm] = useState({
    descripcion: empresa.descripcion,
    cuit: empresa.cuit || '',
    email: empresa.email || '',
    telefono: empresa.telefono || '',
    calle: empresa.calle || '',
    calle_nro: empresa.calle_nro || '',
    localidad: empresa.localidad || '',
    tipoServidor: (empresa.tipoServidor || 'FISICO') as TipoServidor,
  });

  const esNube = datosForm.tipoServidor === 'NUBE';

  const [testConexion, setTestConexion] = useState<{ ok: boolean; msg: string } | null>(null);
  const [tablasImport, setTablasImport] = useState<TablaImportable[]>([]);
  const [tablasImportSel, setTablasImportSel] = useState<Set<string>>(new Set());
  const [importResult, setImportResult] = useState<ResultadoImport | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [preview, setPreview] = useState<PreviewTabla | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [conexionForm, setConexionForm] = useState({
    dbServer: empresa.conexion?.dbServer || '',
    dbPort: empresa.conexion?.dbPort != null ? String(empresa.conexion.dbPort) : '1433',
    dbInstance: empresa.conexion?.dbInstance || '',
    dbName: empresa.conexion?.dbName || '',
    dbUser: empresa.conexion?.dbUser || '',
    dbPassword: '',
  });

  const [sectoresSel, setSectoresSel] = useState<Set<string>>(
    () => new Set(empresa.onboarding?.sectoresDefecto || []),
  );

  const [nuevoSector, setNuevoSector] = useState({ valor: '', descripcion: '', ambInt: 'A' });
  const [editSector, setEditSector] = useState<string | null>(null);
  const [editSectorForm, setEditSectorForm] = useState({ descripcion: '', ambInt: 'A' });

  const [usuarioModal, setUsuarioModal] = useState<UsuarioModal>(null);

  useEffect(() => {
    setDatosForm({
      descripcion: empresa.descripcion,
      cuit: empresa.cuit || '',
      email: empresa.email || '',
      telefono: empresa.telefono || '',
      calle: empresa.calle || '',
      calle_nro: empresa.calle_nro || '',
      localidad: empresa.localidad || '',
      tipoServidor: (empresa.tipoServidor || 'FISICO') as TipoServidor,
    });
    setTestConexion(null);
    setTablasImport([]);
    setTablasImportSel(new Set());
    setImportResult(null);
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
    void superAdminService.getCatalogosEmpresa(Number(empresa.id)).then((cat) => {
      setSectoresCatalogo(cat.sectores || []);
      setRolesCatalogo(cat.roles || []);
    });
  }, [empresa.id]);

  useEffect(() => {
    if (pasoActual !== 'USUARIOS') return;
    void superAdminService.getCatalogosEmpresa(Number(empresa.id)).then((cat) => {
      setRolesCatalogo(cat.roles || []);
      setSectoresCatalogo(cat.sectores || []);
    });
  }, [pasoActual, empresa.id]);

  useEffect(() => {
    setAvisoActivacion(null);
  }, [pasoIdx]);

  useEffect(() => {
    setSectoresCatalogo(catalogos.sectores || []);
    if ((catalogos.roles || []).length) setRolesCatalogo(catalogos.roles || []);
  }, [catalogos.sectores, catalogos.roles]);

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
			const ax = e as { response?: { data?: { mensaje?: string }; status?: number }; message?: string };
			const msg =
				ax.response?.data?.mensaje ||
				(e instanceof Error ? e.message : 'Error en la operación');
			onError(msg);
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

  const probarConexionSinGuardar = () =>
    run(async () => {
      setTestConexion(null);
      const r = await superAdminService.probarConexionDatos({
        idEmpresa: Number(empresa.id) || undefined,
        dbServer: conexionForm.dbServer,
        dbPort: conexionForm.dbPort ? Number(conexionForm.dbPort) : null,
        dbInstance: conexionForm.dbInstance,
        dbName: conexionForm.dbName,
        dbUser: conexionForm.dbUser,
        dbPassword: conexionForm.dbPassword || undefined,
      });
      setTestConexion(
        r.ok
          ? { ok: true, msg: 'Conexión exitosa al servidor físico.' }
          : { ok: false, msg: r.error || 'No se pudo conectar.' },
      );
    });

  const cargarTablasImport = () =>
    run(async () => {
      setImportResult(null);
      // Guardar la conexión antes de detectar: la lectura de tablas usa la conexión
      // persistida de la empresa (no las credenciales tipeadas del test).
      await superAdminService.updateConexion(empresa.id, {
        dbServer: conexionForm.dbServer,
        dbPort: conexionForm.dbPort ? Number(conexionForm.dbPort) : null,
        dbInstance: conexionForm.dbInstance,
        dbName: conexionForm.dbName,
        dbUser: conexionForm.dbUser,
        dbPassword: conexionForm.dbPassword || undefined,
      });
      await refrescarEmpresa();
      setConexionForm((f) => ({ ...f, dbPassword: '' }));
      const tablas = await superAdminService.getTablasImportables(empresa.id);
      setTablasImport(tablas);
      setTablasImportSel(
        new Set(tablas.filter((t) => t.existeOrigen && t.existeDestino).map((t) => t.tabla)),
      );
    });

  const toggleTablaImport = (tabla: string) => {
    const next = new Set(tablasImportSel);
    if (next.has(tabla)) next.delete(tabla);
    else next.add(tabla);
    setTablasImportSel(next);
  };

  const abrirPreview = async (tabla: string) => {
    setPreviewLoading(true);
    onError(null);
    try {
      const data = await superAdminService.getPreviewTabla(empresa.id, tabla);
      setPreview(data);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Error al obtener la vista previa');
    } finally {
      setPreviewLoading(false);
    }
  };

  const ejecutarImport = async () => {
    if (tablasImportSel.size === 0) {
      onError('Seleccioná al menos una tabla para importar');
      return;
    }
    if (!confirm(`¿Importar ${tablasImportSel.size} tabla(s) del servidor físico a la nube? Se sobreescriben registros con la misma clave.`)) {
      return;
    }
    setImportLoading(true);
    onError(null);
    try {
      const res = await superAdminService.importarTablas(empresa.id, Array.from(tablasImportSel));
      setImportResult(res);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Error al importar');
    } finally {
      setImportLoading(false);
    }
  };

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
        sectoresDefecto: Array.from(sectoresSel),
        completado: false,
      });
      await refrescarEmpresa();
    });

  const refreshSectoresCatalogo = async () => {
    const cat = await superAdminService.getCatalogosEmpresa(Number(empresa.id));
    setSectoresCatalogo(cat.sectores || []);
    return cat;
  };

  const crearSector = () =>
    run(async () => {
      await superAdminService.crearSector({ ...nuevoSector, idEmpresa: Number(empresa.id) });
      setNuevoSector({ valor: '', descripcion: '', ambInt: 'A' });
      await refreshSectoresCatalogo();
    });

  const guardarSectorEdit = () =>
    run(async () => {
      if (!editSector) return;
      await superAdminService.actualizarSector(editSector, {
        ...editSectorForm,
        idEmpresa: Number(empresa.id),
      });
      setEditSector(null);
      await refreshSectoresCatalogo();
    });

  const eliminarSector = (id: string) =>
    run(async () => {
      if (!confirm(`¿Eliminar el sector ${id}?`)) return;
      await superAdminService.eliminarSector(id, Number(empresa.id));
      sectoresSel.delete(id);
      setSectoresSel(new Set(sectoresSel));
      await refreshSectoresCatalogo();
    });

  const abrirModalCrearUsuario = () => {
    setUsuarioModal({
      mode: 'create',
      form: emptyUsuarioForm(idRolDefault, Array.from(sectoresSel)),
    });
  };

  const abrirModalEditarUsuario = (u: EmpresaUsuario) => {
    setUsuarioModal({
      mode: 'edit',
      idPersonal: u.idPersonal,
      form: {
        nombreRed: u.usuario,
        apellido: u.apellido,
        nombres: u.nombre,
        numeroDocumento: u.numeroDocumento || '',
        password: '',
        idRol: u.idRol ?? idRolDefault,
        sectores: (u.sectores || []).map((s) => s.id),
      },
    });
  };

  const actualizarUsuarioModal = (patch: Partial<UsuarioForm>) => {
    setUsuarioModal((prev) => (prev ? { ...prev, form: { ...prev.form, ...patch } } : prev));
  };

  const toggleSectorUsuarioModal = (id: string) => {
    setUsuarioModal((prev) => {
      if (!prev) return prev;
      const next = new Set(prev.form.sectores);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ...prev, form: { ...prev.form, sectores: Array.from(next) } };
    });
  };

  const guardarUsuarioModal = () =>
    run(async () => {
      if (!usuarioModal) return;
      const { form } = usuarioModal;
      const idRol = form.idRol > 0 ? form.idRol : undefined;

      if (usuarioModal.mode === 'create') {
        if (!form.nombreRed.trim() || !form.password.trim()) {
          throw new Error('Usuario y contraseña son obligatorios');
        }
        if (!form.apellido.trim() || !form.nombres.trim()) {
          throw new Error('Apellido y nombres son obligatorios');
        }
        await superAdminService.crearUsuarioEmpresa(Number(empresa.id), {
          nombreRed: form.nombreRed.trim(),
          password: form.password,
          apellido: form.apellido.trim(),
          nombres: form.nombres.trim(),
          numeroDocumento: form.numeroDocumento,
          idRol: idRol && idRol > 0 ? idRol : undefined,
          sectores: form.sectores,
        });
      } else {
        await superAdminService.actualizarUsuarioEmpresa(Number(empresa.id), usuarioModal.idPersonal, {
          nombreRed: form.nombreRed,
          apellido: form.apellido,
          nombres: form.nombres,
          numeroDocumento: form.numeroDocumento,
          password: form.password || undefined,
          idRol,
          sectores: form.sectores,
        });
      }
      setUsuarioModal(null);
      await refrescarEmpresa();
    });

  const quitarUsuario = (idPersonal: number, usuario: string) =>
    run(async () => {
      if (!confirm(`¿Desvincular a "${usuario}" de esta empresa?`)) return;
      await superAdminService.desvincularUsuarioEmpresa(Number(empresa.id), idPersonal);
      if (usuarioModal?.mode === 'edit' && usuarioModal.idPersonal === idPersonal) {
        setUsuarioModal(null);
      }
      await refrescarEmpresa();
    });

  const guardarCobranza = () =>
    run(async () => {
      if (!empresa.suscripcion) return;
      await superAdminService.updateSuscripcion(empresa.id, { ...empresa.suscripcion });
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
        sectoresDefecto: Array.from(sectoresSel),
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
        sectoresDefecto: Array.from(sectoresSel),
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
          sectoresDefecto: Array.from(sectoresSel),
          completado: false,
        });
        await refrescarEmpresa();
        break;
      case 'COBRANZA':
        if (empresa.suscripcion) {
          await superAdminService.updateSuscripcion(empresa.id, { ...empresa.suscripcion });
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
          sectoresDefecto: Array.from(sectoresSel),
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
    onEmpresaActualizada({ ...empresa, packs: Array.from(packs) });
  };

  const toggleSectorSel = (id: string) => {
    const next = new Set(sectoresSel);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSectoresSel(next);
  };

  const usuarios = empresa.usuarios || [];

  const renderUsuarioFormFields = (form: UsuarioForm, mode: 'create' | 'edit') => (
    <>
      <div className={styles.grid2}>
        <div className={styles.formGroup}>
          <label>Usuario de red {mode === 'create' ? '*' : ''}</label>
          <input
            className={styles.input}
            value={form.nombreRed}
            onChange={(e) => actualizarUsuarioModal({ nombreRed: e.target.value })}
          />
        </div>
        <div className={styles.formGroup}>
          <label>{mode === 'create' ? 'Contraseña *' : 'Nueva contraseña (opcional)'}</label>
          <input
            className={styles.input}
            type="password"
            value={form.password}
            onChange={(e) => actualizarUsuarioModal({ password: e.target.value })}
          />
        </div>
        <div className={styles.formGroup}>
          <label>Apellido {mode === 'create' ? '*' : ''}</label>
          <input
            className={styles.input}
            value={form.apellido}
            onChange={(e) => actualizarUsuarioModal({ apellido: e.target.value })}
          />
        </div>
        <div className={styles.formGroup}>
          <label>Nombres {mode === 'create' ? '*' : ''}</label>
          <input
            className={styles.input}
            value={form.nombres}
            onChange={(e) => actualizarUsuarioModal({ nombres: e.target.value })}
          />
        </div>
        <div className={styles.formGroup}>
          <label>DNI / documento</label>
          <input
            className={styles.input}
            value={form.numeroDocumento}
            onChange={(e) => actualizarUsuarioModal({ numeroDocumento: e.target.value })}
          />
        </div>
        <div className={styles.formGroup}>
          <label>Rol</label>
          <select
            className={styles.select}
            value={form.idRol}
            onChange={(e) => {
              const idRol = Number(e.target.value);
              setUsuarioModal((prev) => {
                if (!prev) return prev;
                const rol = rolesCatalogo.find((r) => r.idRol === idRol);
                const esAdmin =
                  idRol === 1 || String(rol?.nombre || '').toUpperCase() === 'ADMIN';
                return {
                  ...prev,
                  form: {
                    ...prev.form,
                    idRol,
                    sectores: esAdmin ? sectoresCatalogo.map((s) => s.id) : prev.form.sectores,
                  },
                };
              });
            }}
            disabled={rolesCatalogo.length === 0}
          >
            <option value={0}>— Sin rol (asignar después) —</option>
            {rolesCatalogo.map((r) => (
              <option key={r.idRol} value={r.idRol}>
                {r.nombre}
              </option>
            ))}
          </select>
          {rolesCatalogo.length === 0 && (
            <p className={styles.packDesc} style={{ marginTop: '0.35rem' }}>
              No se cargaron roles. Volvé a este paso o recargá la página.
            </p>
          )}
        </div>
      </div>
      <p className={styles.wizardHint}>Sectores del usuario:</p>
      <div className={styles.sectorGrid}>
        {sectoresCatalogo.length === 0 ? (
          <p className={styles.packDesc}>No hay sectores. Creálos en el paso anterior.</p>
        ) : (
          sectoresCatalogo.map((s) => (
            <label key={s.id} className={styles.sectorChip}>
              <input
                type="checkbox"
                checked={form.sectores.includes(s.id)}
                onChange={() => toggleSectorUsuarioModal(s.id)}
              />
              <span>{s.descripcion}</span>
            </label>
          ))
        )}
      </div>
    </>
  );

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
              <span className={styles.stepTitle}>Tipo de infraestructura</span>
            </div>
            <div className={styles.packGrid}>
              <button
                type="button"
                className={`${styles.packCard} ${esNube ? styles.packCardActive : ''}`}
                onClick={() => setDatosForm({ ...datosForm, tipoServidor: 'NUBE' })}
              >
                <span className={styles.packTitle}>☁ Servidor nube (Railway)</span>
                <span className={styles.packDesc}>
                  Todos los datos de la clínica viven en la nube. No requiere conexión externa.
                </span>
              </button>
              <button
                type="button"
                className={`${styles.packCard} ${!esNube ? styles.packCardActive : ''}`}
                onClick={() => setDatosForm({ ...datosForm, tipoServidor: 'FISICO' })}
              >
                <span className={styles.packTitle}>🖥 Servidor físico (on-premise)</span>
                <span className={styles.packDesc}>
                  La clínica corre sobre su propio SQL Server. Podés probar la conexión e importar sus tablas a la nube.
                </span>
              </button>
            </div>
            <p className={styles.wizardHint} style={{ marginTop: '0.5rem' }}>
              Guardá los datos para aplicar el tipo de infraestructura elegido.
            </p>

            {esNube ? (
              <div className={styles.wizardAlert} style={{ marginTop: '1.25rem' }}>
                <span>
                  Esta empresa usa la infraestructura en la nube (Railway). Sectores, usuarios y catálogos se
                  administran directamente en la nube; no hay servidor físico que configurar.
                </span>
              </div>
            ) : (
              <>
                <div className={styles.stepToolbar} style={{ marginTop: '1.25rem' }}>
                  <span className={styles.stepTitle}>Conexión SQL (servidor físico)</span>
                  <div className={styles.stepActions}>
                    <button type="button" className={styles.btn} disabled={guardando} onClick={guardarConexion}>
                      Guardar conexión
                    </button>
                    <button type="button" className={styles.btnSecondary} disabled={guardando} onClick={probarConexionSinGuardar}>
                      Probar (sin guardar)
                    </button>
                    <button type="button" className={styles.btnSecondary} disabled={guardando} onClick={probarConexion}>
                      Guardar y probar
                    </button>
                  </div>
                </div>
                <p className={styles.packDesc} style={{ marginBottom: '0.75rem' }}>
                  La contraseña se guarda cifrada. Para &quot;Probar (sin guardar)&quot; ingresá la contraseña
                  o usá una ya guardada (dejar en blanco reutiliza la guardada). &quot;Guardar y probar&quot;
                  persiste primero y después prueba.
                </p>
                {testConexion && (
                  <div
                    className={`${styles.wizardAlert} ${testConexion.ok ? styles.wizardAlertOk : styles.wizardAlertError}`}
                    role="alert"
                  >
                    <span>{testConexion.msg}</span>
                    <button
                      type="button"
                      className={styles.wizardAlertDismiss}
                      aria-label="Cerrar aviso"
                      onClick={() => setTestConexion(null)}
                    >
                      ×
                    </button>
                  </div>
                )}
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

                <div className={styles.stepToolbar} style={{ marginTop: '1.25rem' }}>
                  <span className={styles.stepTitle}>Importar tablas a la nube</span>
                  <button
                    type="button"
                    className={styles.btnSecondary}
                    disabled={guardando || importLoading}
                    onClick={cargarTablasImport}
                  >
                    Detectar tablas
                  </button>
                </div>
                <p className={styles.packDesc} style={{ marginBottom: '0.75rem' }}>
                  &quot;Detectar tablas&quot; guarda la conexión y lista los datos del servidor físico que se pueden copiar a
                  la nube. Los catálogos de plataforma (roles y permisos) se toman de Railway. Los IDs de personal se
                  conservan iguales al servidor físico (aislados por empresa). La importación puede tardar 1–2 minutos.
                </p>
                {importLoading && (
                  <p className={styles.packDesc} style={{ marginBottom: '0.75rem', color: 'var(--color-primary, #2563eb)' }}>
                    Importando… no cierres esta ventana. Al finalizar verás el detalle por tabla.
                  </p>
                )}

                {tablasImport.length > 0 && (
                  <>
                    <div className={styles.tableWrap}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>Importar</th>
                            <th>Tabla</th>
                            <th>Filas en origen</th>
                            <th>Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tablasImport.map((t) => {
                            const copiable = t.estrategia !== 'nube' && t.existeOrigen && t.existeDestino;
                            const estado =
                              t.estrategia === 'nube'
                                ? 'Provista por la nube'
                                : !t.existeOrigen
                                  ? t.existeDestino
                                    ? 'Se toma de la nube'
                                    : 'No existe en el físico'
                                  : !t.existeDestino
                                    ? 'No existe en la nube'
                                    : 'Lista para importar';
                            return (
                              <tr
                                key={t.tabla}
                                onClick={() => abrirPreview(t.tabla)}
                                style={{ cursor: 'pointer' }}
                                title="Ver datos del servidor"
                              >
                                <td onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="checkbox"
                                    checked={tablasImportSel.has(t.tabla)}
                                    disabled={!copiable}
                                    onChange={() => toggleTablaImport(t.tabla)}
                                  />
                                </td>
                                <td>
                                  {t.label}
                                  <br />
                                  <span className={styles.packDesc}>{t.tabla}</span>
                                </td>
                                <td>{t.estrategia === 'nube' ? '—' : (t.filasOrigen ?? '—')}</td>
                                <td>{estado}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className={styles.stepActions} style={{ marginTop: '0.75rem' }}>
                      <button
                        type="button"
                        className={styles.btn}
                        disabled={importLoading || tablasImportSel.size === 0}
                        onClick={ejecutarImport}
                      >
                        {importLoading ? 'Importando…' : `Importar ${tablasImportSel.size} tabla(s)`}
                      </button>
                    </div>
                  </>
                )}

                {importResult && (
                  <div className={styles.tableWrap} style={{ marginTop: '0.75rem' }}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Tabla</th>
                          <th>Leídas</th>
                          <th>Escritas</th>
                          <th>Resultado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importResult.resultados.map((r) => (
                          <tr key={r.tabla}>
                            <td>{r.tabla}</td>
                            <td>{r.leidas}</td>
                            <td>{r.escritas}</td>
                            <td>
                              {r.error
                                ? `✗ ${r.error}`
                                : r.omitida
                                  ? `↷ ${r.nota || 'Se usa la nube'}`
                                  : '✓ OK'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
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
              <button type="button" className={styles.btn} disabled={guardando} onClick={abrirModalCrearUsuario}>
                + Nuevo usuario
              </button>
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
                            onClick={() => abrirModalEditarUsuario(u)}
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

      {usuarioModal && (
        <div
          role="dialog"
          aria-modal="true"
          className={styles.modalOverlay}
          onClick={() => setUsuarioModal(null)}
        >
          <div className={styles.modalPanel} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <strong>
                {usuarioModal.mode === 'create' ? 'Nuevo usuario' : 'Editar usuario'}
              </strong>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setUsuarioModal(null)}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              {renderUsuarioFormFields(usuarioModal.form, usuarioModal.mode)}
            </div>
            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.btnSecondary}
                disabled={guardando}
                onClick={() => setUsuarioModal(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={styles.btn}
                disabled={guardando}
                onClick={guardarUsuarioModal}
              >
                {guardando
                  ? 'Guardando…'
                  : usuarioModal.mode === 'create'
                    ? 'Crear y vincular'
                    : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {(preview || previewLoading) && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setPreview(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: 12,
              width: 'min(1100px, 96vw)',
              maxHeight: '86vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.9rem 1.1rem',
                borderBottom: '1px solid #e5e7eb',
              }}
            >
              <div>
                <strong>{preview ? preview.label : 'Cargando…'}</strong>
                {preview && (
                  <span className={styles.packDesc} style={{ marginLeft: 8 }}>
                    {preview.tabla}
                    {preview.total != null ? ` · ${preview.total} fila(s) en el servidor` : ''}
                    {preview.filas.length ? ` · mostrando ${preview.filas.length}` : ''}
                  </span>
                )}
              </div>
              <button
                type="button"
                className={styles.wizardAlertDismiss}
                aria-label="Cerrar"
                onClick={() => setPreview(null)}
              >
                ×
              </button>
            </div>

            <div style={{ padding: '1rem', overflow: 'auto' }}>
              {previewLoading && <p className={styles.wizardHint}>Consultando el servidor físico…</p>}
              {!previewLoading && preview && preview.nota && (
                <p className={styles.wizardHint}>{preview.nota}</p>
              )}
              {!previewLoading && preview && !preview.nota && preview.filas.length === 0 && (
                <p className={styles.wizardHint}>La tabla no tiene filas en el servidor.</p>
              )}
              {!previewLoading && preview && preview.filas.length > 0 && (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        {preview.columnas.map((c) => (
                          <th key={c}>{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.filas.map((fila, i) => (
                        <tr key={i}>
                          {preview.columnas.map((c) => {
                            const v = fila[c];
                            return (
                              <td key={c}>
                                {v == null ? (
                                  <span className={styles.packDesc}>—</span>
                                ) : (
                                  String(v)
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
