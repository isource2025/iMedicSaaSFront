'use client';

import { useMemo, useState } from 'react';
import { superAdminService } from '@/app/services/superAdminService';
import type { CatalogoRol, CatalogoSector, EmpresaAdmin, EmpresaUsuario } from '@/app/types/superAdmin';
import ConfirmDialog from '../ui/ConfirmDialog';
import styles from '../superAdmin.module.css';

type Form = {
  nombreRed: string;
  password: string;
  apellido: string;
  nombres: string;
  numeroDocumento: string;
  idRol: number;
  sectores: string[];
};

type Modal =
  | null
  | { mode: 'create'; form: Form }
  | { mode: 'edit'; idPersonal: number; form: Form };

type Props = {
  empresa: EmpresaAdmin;
  roles: CatalogoRol[];
  sectores: CatalogoSector[];
  onUpdated: (empresa: EmpresaAdmin) => void;
  onError: (msg: string | null) => void;
};

const emptyForm = (idRol: number, sectores: string[] = []): Form => ({
  nombreRed: '',
  password: '',
  apellido: '',
  nombres: '',
  numeroDocumento: '',
  idRol,
  sectores,
});

export default function SeccionUsuarios({ empresa, roles, sectores, onUpdated, onError }: Props) {
  const idRolDefault = roles[0]?.idRol ?? 0;
  const [q, setQ] = useState('');
  const [modal, setModal] = useState<Modal>(null);
  const [saving, setSaving] = useState(false);
  const [quitar, setQuitar] = useState<EmpresaUsuario | null>(null);

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

  const patch = (p: Partial<Form>) => {
    setModal((prev) => (prev ? { ...prev, form: { ...prev.form, ...p } } : prev));
  };

  const guardar = async () => {
    if (!modal) return;
    const { form } = modal;
    setSaving(true);
    onError(null);
    try {
      if (modal.mode === 'create') {
        if (!form.nombreRed.trim() || !form.password.trim()) throw new Error('Usuario y contraseña son obligatorios');
        if (!form.apellido.trim() || !form.nombres.trim()) throw new Error('Apellido y nombres son obligatorios');
        await superAdminService.crearUsuarioEmpresa(Number(empresa.id), {
          nombreRed: form.nombreRed.trim(),
          password: form.password,
          apellido: form.apellido.trim(),
          nombres: form.nombres.trim(),
          numeroDocumento: form.numeroDocumento,
          idRol: form.idRol || undefined,
          sectores: form.sectores,
        });
      } else {
        await superAdminService.actualizarUsuarioEmpresa(Number(empresa.id), modal.idPersonal, {
          nombreRed: form.nombreRed,
          apellido: form.apellido,
          nombres: form.nombres,
          numeroDocumento: form.numeroDocumento,
          password: form.password || undefined,
          idRol: form.idRol || undefined,
          sectores: form.sectores,
        });
      }
      setModal(null);
      onUpdated(await superAdminService.getEmpresa(empresa.id));
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Error al guardar usuario');
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
        <button
          type="button"
          className={styles.btn}
          onClick={() =>
            setModal({
              mode: 'create',
              form: emptyForm(idRolDefault, empresa.onboarding?.sectoresDefecto || []),
            })
          }
        >
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
              <th></th>
            </tr>
          </thead>
          <tbody>
            {usuarios.length === 0 ? (
              <tr>
                <td colSpan={5} className={styles.emptyCell}>
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
                  <td>{u.rol || '—'}</td>
                  <td>{(u.sectores || []).map((s) => s.descripcion || s.id).join(', ') || '—'}</td>
                  <td className={styles.actionsCell}>
                    <button
                      type="button"
                      className={styles.btnSmSecondary}
                      onClick={() =>
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
                          },
                        })
                      }
                    >
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
        <div className={styles.modalOverlay}>
          <div className={styles.modalPanel}>
            <div className={styles.modalHeader}>
              <strong>{modal.mode === 'create' ? 'Nuevo usuario' : 'Editar usuario'}</strong>
              <button type="button" className={styles.modalClose} onClick={() => setModal(null)}>
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.grid2}>
                <div className={styles.formGroup}>
                  <label>Usuario</label>
                  <input className={styles.input} value={modal.form.nombreRed} onChange={(e) => patch({ nombreRed: e.target.value })} />
                </div>
                <div className={styles.formGroup}>
                  <label>Contraseña {modal.mode === 'edit' ? '(vacío = no cambia)' : ''}</label>
                  <input
                    className={styles.input}
                    type="password"
                    value={modal.form.password}
                    onChange={(e) => patch({ password: e.target.value })}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Apellido</label>
                  <input className={styles.input} value={modal.form.apellido} onChange={(e) => patch({ apellido: e.target.value })} />
                </div>
                <div className={styles.formGroup}>
                  <label>Nombres</label>
                  <input className={styles.input} value={modal.form.nombres} onChange={(e) => patch({ nombres: e.target.value })} />
                </div>
                <div className={styles.formGroup}>
                  <label>DNI</label>
                  <input
                    className={styles.input}
                    value={modal.form.numeroDocumento}
                    onChange={(e) => patch({ numeroDocumento: e.target.value })}
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
                        {r.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <p className={styles.crudBlockTitle} style={{ marginTop: '0.85rem' }}>
                Sectores
              </p>
              <div className={styles.sectorGrid}>
                {sectores.map((s) => (
                  <label key={s.id} className={styles.sectorChip}>
                    <input
                      type="checkbox"
                      checked={modal.form.sectores.includes(s.id)}
                      onChange={() => {
                        const next = new Set(modal.form.sectores);
                        if (next.has(s.id)) next.delete(s.id);
                        else next.add(s.id);
                        patch({ sectores: Array.from(next) });
                      }}
                    />
                    {s.descripcion}
                  </label>
                ))}
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setModal(null)}>
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
