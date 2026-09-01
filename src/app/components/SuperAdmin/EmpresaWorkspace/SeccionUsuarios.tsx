'use client';

import { useMemo, useState } from 'react';
import { superAdminService } from '@/app/services/superAdminService';
import type { CatalogoRol, CatalogoSector, CatalogoServicio, EmpresaAdmin, EmpresaUsuario } from '@/app/types/superAdmin';
import ConfirmDialog from '../ui/ConfirmDialog';
import PasswordInput from '../ui/PasswordInput';
import styles from '../superAdmin.module.css';
import { etiquetaRol } from '@/app/utils/permisos';

const MAX_APELLIDO = 80;
const MAX_NOMBRES = 80;
const MAX_USUARIO = 80;
const MAX_DNI = 20;

type Form = {
  nombreRed: string;
  password: string;
  apellido: string;
  nombres: string;
  numeroDocumento: string;
  idRol: number;
  sectores: string[];
  servicios: string[];
};

type Modal =
  | null
  | { mode: 'create'; form: Form }
  | { mode: 'edit'; idPersonal: number; form: Form };

type Props = {
  empresa: EmpresaAdmin;
  roles: CatalogoRol[];
  sectores: CatalogoSector[];
  servicios: CatalogoServicio[];
  onUpdated: (empresa: EmpresaAdmin) => void;
  onError: (msg: string | null) => void;
  onRefreshCatalogos?: () => Promise<void>;
};

const emptyForm = (idRol: number, sectores: string[] = [], servicios: string[] = []): Form => ({
  nombreRed: '',
  password: '',
  apellido: '',
  nombres: '',
  numeroDocumento: '',
  idRol,
  sectores,
  servicios,
});

function toggleId(list: string[], id: string) {
  const next = new Set(list);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return Array.from(next);
}

export default function SeccionUsuarios({
  empresa,
  roles,
  sectores,
  servicios,
  onUpdated,
  onError,
  onRefreshCatalogos,
}: Props) {
  const idRolDefault = roles[0]?.idRol ?? 0;
  const [q, setQ] = useState('');
  const [modal, setModal] = useState<Modal>(null);
  const [saving, setSaving] = useState(false);
  const [quitar, setQuitar] = useState<EmpresaUsuario | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [sectorQ, setSectorQ] = useState('');
  const [servicioQ, setServicioQ] = useState('');
  const [nuevoServicio, setNuevoServicio] = useState({ valor: '', descripcion: '' });

  const usuarios = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = empresa.usuarios || [];
    if (!term) return list;
    return list.filter(
      (u) =>
        u.usuario.toLowerCase().includes(term) ||
        u.apellido.toLowerCase().includes(term) ||
        u.nombre.toLowerCase().includes(term),
    );
  }, [empresa.usuarios, q]);

  const sectoresFiltrados = useMemo(() => {
    const term = sectorQ.trim().toLowerCase();
    if (!term) return sectores;
    return sectores.filter(
      (s) => s.id.toLowerCase().includes(term) || s.descripcion.toLowerCase().includes(term),
    );
  }, [sectores, sectorQ]);

  const serviciosFiltrados = useMemo(() => {
    const term = servicioQ.trim().toLowerCase();
    if (!term) return servicios;
    return servicios.filter(
      (s) => s.id.toLowerCase().includes(term) || s.descripcion.toLowerCase().includes(term),
    );
  }, [servicios, servicioQ]);

  const patch = (p: Partial<Form>) => {
    setModal((prev) => (prev ? { ...prev, form: { ...prev.form, ...p } } : prev));
  };

  const abrirCrear = async () => {
    setModalError(null);
    setSectorQ('');
    setServicioQ('');
    setNuevoServicio({ valor: '', descripcion: '' });
    try {
      await onRefreshCatalogos?.();
    } catch {
      /* el modal igual se abre con lo que haya */
    }
    setModal({
      mode: 'create',
      form: emptyForm(
        idRolDefault,
        empresa.onboarding?.sectoresDefecto || [],
        empresa.onboarding?.serviciosDefecto || [],
      ),
    });
  };

  const abrirEditar = async (u: EmpresaUsuario) => {
    setModalError(null);
    setSectorQ('');
    setServicioQ('');
    setNuevoServicio({ valor: '', descripcion: '' });
    try {
      await onRefreshCatalogos?.();
    } catch {
      /* el modal igual se abre con lo que haya */
    }
    setModal({
      mode: 'edit',
      idPersonal: u.idPersonal,
      form: {
        nombreRed: u.usuario,
        password: '',
        apellido: u.apellido,
        nombres: u.nombre,
        numeroDocumento: u.numeroDocumento || '',
        idRol: u.idRol ?? idRolDefault,
        sectores: (u.sectores || []).map((s) => s.id),
        servicios: (u.servicios || []).map((s) => s.id),
      },
    });
  };

  const guardar = async () => {
    if (!modal) return;
    const { form } = modal;
    setSaving(true);
    setModalError(null);
    onError(null);
    try {
      if (modal.mode === 'create') {
        if (!form.nombreRed.trim() || !form.password.trim()) throw new Error('Usuario y contraseña son obligatorios');
        if (form.password.trim().length < 4) throw new Error('La contraseña debe tener al menos 4 caracteres');
        if (!form.apellido.trim() || !form.nombres.trim()) throw new Error('Apellido y nombres son obligatorios');
        await superAdminService.crearUsuarioEmpresa(Number(empresa.id), {
          nombreRed: form.nombreRed.trim().slice(0, MAX_USUARIO),
          password: form.password,
          apellido: form.apellido.trim().slice(0, MAX_APELLIDO),
          nombres: form.nombres.trim().slice(0, MAX_NOMBRES),
          numeroDocumento: form.numeroDocumento.replace(/\D/g, '').slice(0, MAX_DNI) || undefined,
          idRol: form.idRol || undefined,
          sectores: form.sectores.map((s) => String(s).trim()).filter(Boolean),
          servicios: form.servicios.map((s) => String(s).trim()).filter(Boolean),
        });
      } else {
        if (!form.nombreRed.trim()) throw new Error('El usuario es obligatorio');
        if (!form.apellido.trim() || !form.nombres.trim()) throw new Error('Apellido y nombres son obligatorios');
        if (form.password.trim() && form.password.trim().length < 4) {
          throw new Error('La contraseña debe tener al menos 4 caracteres');
        }
        await superAdminService.actualizarUsuarioEmpresa(Number(empresa.id), modal.idPersonal, {
          nombreRed: form.nombreRed.trim().slice(0, MAX_USUARIO),
          apellido: form.apellido.trim().slice(0, MAX_APELLIDO),
          nombres: form.nombres.trim().slice(0, MAX_NOMBRES),
          numeroDocumento: form.numeroDocumento.replace(/\D/g, '').slice(0, MAX_DNI),
          password: form.password.trim() || undefined,
          idRol: form.idRol || undefined,
          sectores: form.sectores.map((s) => String(s).trim()).filter(Boolean),
          servicios: form.servicios.map((s) => String(s).trim()).filter(Boolean),
        });
      }
      setModal(null);
      try {
        onUpdated(await superAdminService.getEmpresa(empresa.id));
      } catch (refreshErr) {
        console.warn('[usuarios] refresh post-guardar', refreshErr);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al guardar usuario';
      setModalError(msg);
      onError(msg);
    } finally {
      setSaving(false);
    }
  };

  const crearServicioInline = async () => {
    const valor = nuevoServicio.valor.trim().toUpperCase();
    const descripcion = nuevoServicio.descripcion.trim();
    if (!valor || !descripcion) {
      setModalError('Código y descripción del servicio son obligatorios');
      return;
    }
    setSaving(true);
    setModalError(null);
    try {
      const creado = await superAdminService.crearServicio({
        valor,
        descripcion,
        idEmpresa: Number(empresa.id),
      });
      setNuevoServicio({ valor: '', descripcion: '' });
      patch({ servicios: Array.from(new Set([...(modal?.form.servicios || []), creado.id])) });
      await onRefreshCatalogos?.();
    } catch (e) {
      setModalError(e instanceof Error ? e.message : 'Error al crear servicio');
    } finally {
      setSaving(false);
    }
  };

  const desvincular = async () => {
    if (!quitar) return;
    setSaving(true);
    onError(null);
    try {
      await superAdminService.desvincularUsuarioEmpresa(Number(empresa.id), quitar.idPersonal);
      setQuitar(null);
      onUpdated(await superAdminService.getEmpresa(empresa.id));
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Error al desvincular');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={styles.panel}>
      <div className={styles.stepToolbar}>
        <span className={styles.stepTitle}>Usuarios de la empresa</span>
        <button type="button" className={styles.btn} onClick={abrirCrear}>
          Nuevo usuario
        </button>
      </div>
      <input
        className={styles.input}
        placeholder="Buscar usuario…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{ marginBottom: '0.75rem' }}
      />
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Nombre</th>
              <th>Rol</th>
              <th>Sectores</th>
              <th>Servicios</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {usuarios.length === 0 ? (
              <tr>
                <td colSpan={6} className={styles.emptyCell}>
                  Sin usuarios
                </td>
              </tr>
            ) : (
              usuarios.map((u) => (
                <tr key={u.idPersonal}>
                  <td>{u.usuario}</td>
                  <td>
                    {u.apellido}, {u.nombre}
                  </td>
                  <td>{etiquetaRol(u.rol) || '—'}</td>
                  <td>{(u.sectores || []).map((s) => s.descripcion || s.id).join(', ') || '—'}</td>
                  <td>{(u.servicios || []).map((s) => s.descripcion || s.id).join(', ') || '—'}</td>
                  <td className={styles.actionsCell}>
                    <button type="button" className={styles.btnSmSecondary} onClick={() => abrirEditar(u)}>
                      Editar
                    </button>
                    <button type="button" className={styles.btnSmSecondary} onClick={() => setQuitar(u)}>
                      Quitar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className={styles.modalOverlay} onClick={() => !saving && setModal(null)}>
          <div className={`${styles.modalPanel} ${styles.modalPanelLg}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <strong>{modal.mode === 'create' ? 'Nuevo usuario' : 'Editar usuario'}</strong>
                <p className={styles.modalSubtitle}>
                  Acceso, identidad y asignación de sectores y servicios de pedidos.
                </p>
              </div>
              <button type="button" className={styles.modalClose} onClick={() => setModal(null)}>
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              {modalError ? <div className={styles.error}>{modalError}</div> : null}

              <p className={styles.modalSectionTitle}>Acceso</p>
              <div className={styles.grid2}>
                <div className={styles.formGroup}>
                  <label>Usuario *</label>
                  <input
                    className={styles.input}
                    maxLength={MAX_USUARIO}
                    autoComplete="off"
                    value={modal.form.nombreRed}
                    onChange={(e) => patch({ nombreRed: e.target.value })}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Contraseña {modal.mode === 'edit' ? '(vacío = no cambia)' : '*'}</label>
                  <PasswordInput
                    value={modal.form.password}
                    onChange={(e) => patch({ password: e.target.value })}
                  />
                </div>
              </div>

              <p className={styles.modalSectionTitle}>Identidad</p>
              <div className={styles.grid2}>
                <div className={styles.formGroup}>
                  <label>Apellido *</label>
                  <input
                    className={styles.input}
                    maxLength={MAX_APELLIDO}
                    value={modal.form.apellido}
                    onChange={(e) => patch({ apellido: e.target.value })}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Nombres *</label>
                  <input
                    className={styles.input}
                    maxLength={MAX_NOMBRES}
                    value={modal.form.nombres}
                    onChange={(e) => patch({ nombres: e.target.value })}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>DNI</label>
                  <input
                    className={styles.input}
                    inputMode="numeric"
                    maxLength={MAX_DNI}
                    value={modal.form.numeroDocumento}
                    onChange={(e) => patch({ numeroDocumento: e.target.value.replace(/\D/g, '') })}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Rol</label>
                  <select
                    className={styles.select}
                    value={modal.form.idRol}
                    onChange={(e) => patch({ idRol: Number(e.target.value) })}
                  >
                    {roles.map((r) => (
                      <option key={r.idRol} value={r.idRol}>
                        {etiquetaRol(r)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.assignGrid}>
                <div className={styles.assignPanel}>
                  <div className={styles.assignHead}>
                    <span>
                      Sectores <em>{modal.form.sectores.length}/{sectores.length}</em>
                    </span>
                    <span className={styles.assignActions}>
                      <button
                        type="button"
                        className={styles.btnSmSecondary}
                        onClick={() => patch({ sectores: sectores.map((s) => s.id) })}
                      >
                        Todos
                      </button>
                      <button type="button" className={styles.btnSmSecondary} onClick={() => patch({ sectores: [] })}>
                        Ninguno
                      </button>
                    </span>
                  </div>
                  <input
                    className={styles.input}
                    placeholder="Buscar sector…"
                    value={sectorQ}
                    onChange={(e) => setSectorQ(e.target.value)}
                  />
                  <div className={styles.sectorGrid}>
                    {sectoresFiltrados.length === 0 ? (
                      <p className={styles.assignEmpty}>
                        {sectores.length === 0
                          ? 'No hay sectores. Cargalos en Sectores y servicios.'
                          : 'Ningún sector coincide con la búsqueda.'}
                      </p>
                    ) : (
                      sectoresFiltrados.map((s) => (
                        <label key={s.id} className={styles.sectorChip}>
                          <input
                            type="checkbox"
                            checked={modal.form.sectores.includes(s.id)}
                            onChange={() => patch({ sectores: toggleId(modal.form.sectores, s.id) })}
                          />
                          {s.descripcion}
                        </label>
                      ))
                    )}
                  </div>
                </div>

                <div className={styles.assignPanel}>
                  <div className={styles.assignHead}>
                    <span>
                      Servicios <em>{modal.form.servicios.length}/{servicios.length}</em>
                    </span>
                    <span className={styles.assignActions}>
                      <button
                        type="button"
                        className={styles.btnSmSecondary}
                        onClick={() => patch({ servicios: servicios.map((s) => s.id) })}
                      >
                        Todos
                      </button>
                      <button type="button" className={styles.btnSmSecondary} onClick={() => patch({ servicios: [] })}>
                        Ninguno
                      </button>
                    </span>
                  </div>
                  <input
                    className={styles.input}
                    placeholder="Buscar servicio…"
                    value={servicioQ}
                    onChange={(e) => setServicioQ(e.target.value)}
                  />
                  <div className={styles.sectorGrid}>
                    {serviciosFiltrados.length === 0 ? (
                      <p className={styles.assignEmpty}>
                        {servicios.length === 0
                          ? 'No hay servicios cargados. Agregá uno abajo o usá Sectores y servicios.'
                          : 'Ningún servicio coincide con la búsqueda.'}
                      </p>
                    ) : (
                      serviciosFiltrados.map((s) => (
                        <label key={s.id} className={styles.sectorChip}>
                          <input
                            type="checkbox"
                            checked={modal.form.servicios.includes(s.id)}
                            onChange={() => patch({ servicios: toggleId(modal.form.servicios, s.id) })}
                          />
                          <span>
                            <strong>{s.id}</strong> {s.descripcion !== s.id ? s.descripcion : ''}
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                  <div className={styles.inlineForm} style={{ marginBottom: 0, marginTop: '0.5rem' }}>
                    <input
                      className={styles.input}
                      placeholder="Código"
                      maxLength={20}
                      value={nuevoServicio.valor}
                      onChange={(e) => setNuevoServicio({ ...nuevoServicio, valor: e.target.value.toUpperCase() })}
                    />
                    <input
                      className={styles.input}
                      placeholder="Nuevo servicio"
                      value={nuevoServicio.descripcion}
                      onChange={(e) => setNuevoServicio({ ...nuevoServicio, descripcion: e.target.value })}
                    />
                    <button
                      type="button"
                      className={styles.btnSm}
                      onClick={() => void crearServicioInline()}
                      disabled={saving}
                    >
                      Agregar
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnSecondary}`}
                onClick={() => setModal(null)}
                disabled={saving}
              >
                Cancelar
              </button>
              <button type="button" className={styles.btn} onClick={() => void guardar()} disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!quitar}
        title="Desvincular usuario"
        message={`¿Desvincular a "${quitar?.usuario}" de esta empresa?`}
        confirmLabel="Desvincular"
        danger
        busy={saving}
        onConfirm={() => void desvincular()}
        onCancel={() => setQuitar(null)}
      />
    </section>
  );
}
