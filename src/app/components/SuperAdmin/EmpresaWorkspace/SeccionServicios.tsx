'use client';

import { useEffect, useMemo, useState } from 'react';
import { superAdminService } from '@/app/services/superAdminService';
import type { CatalogoServicio, EmpresaAdmin } from '@/app/types/superAdmin';
import ConfirmDialog from '../ui/ConfirmDialog';
import styles from '../superAdmin.module.css';

type Props = {
  empresa: EmpresaAdmin;
  servicios: CatalogoServicio[];
  onRefresh: () => Promise<void>;
  onUpdated: (empresa: EmpresaAdmin) => void;
  onError: (msg: string | null) => void;
};

export default function SeccionServicios({ empresa, servicios, onRefresh, onUpdated, onError }: Props) {
  const [sel, setSel] = useState<Set<string>>(new Set(empresa.onboarding?.serviciosDefecto || []));
  const [nuevo, setNuevo] = useState({ valor: '', descripcion: '' });
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ descripcion: '' });
  const [q, setQ] = useState('');
  const [saving, setSaving] = useState(false);
  const [borrar, setBorrar] = useState<string | null>(null);

  useEffect(() => {
    setSel(new Set(empresa.onboarding?.serviciosDefecto || []));
  }, [empresa.id, empresa.onboarding?.serviciosDefecto]);

  const filtrados = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return servicios;
    return servicios.filter(
      (s) => s.id.toLowerCase().includes(term) || s.descripcion.toLowerCase().includes(term),
    );
  }, [servicios, q]);

  const crear = async () => {
    setSaving(true);
    onError(null);
    try {
      await superAdminService.crearServicio({ ...nuevo, idEmpresa: Number(empresa.id) });
      setNuevo({ valor: '', descripcion: '' });
      await onRefresh();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Error al crear servicio');
    } finally {
      setSaving(false);
    }
  };

  const guardarEdit = async () => {
    if (!editId) return;
    setSaving(true);
    onError(null);
    try {
      await superAdminService.actualizarServicio(editId, { ...editForm, idEmpresa: Number(empresa.id) });
      setEditId(null);
      await onRefresh();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Error al editar servicio');
    } finally {
      setSaving(false);
    }
  };

  const eliminar = async () => {
    if (!borrar) return;
    setSaving(true);
    onError(null);
    try {
      await superAdminService.eliminarServicio(borrar, Number(empresa.id));
      const next = new Set(sel);
      next.delete(borrar);
      setSel(next);
      setBorrar(null);
      await onRefresh();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Error al eliminar servicio');
    } finally {
      setSaving(false);
    }
  };

  const guardarDefecto = async () => {
    setSaving(true);
    onError(null);
    try {
      await superAdminService.updateOnboarding(empresa.id, {
        serviciosDefecto: Array.from(sel),
        altaCompletada: empresa.onboarding?.altaCompletada,
        completado: empresa.onboarding?.completado,
      });
      onUpdated(await superAdminService.getEmpresa(empresa.id));
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Error al guardar servicios por defecto');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={styles.panel}>
      <div className={styles.stepToolbar}>
        <span className={styles.stepTitle}>Servicios de pedidos</span>
        <button type="button" className={styles.btn} onClick={() => void guardarDefecto()} disabled={saving}>
          Guardar predeterminados
        </button>
      </div>
      <div className={styles.inlineForm}>
        <input className={styles.input} placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} />
        <input
          className={styles.input}
          placeholder="Código"
          maxLength={20}
          value={nuevo.valor}
          onChange={(e) => setNuevo({ ...nuevo, valor: e.target.value.toUpperCase() })}
        />
        <input
          className={styles.input}
          placeholder="Descripción"
          value={nuevo.descripcion}
          onChange={(e) => setNuevo({ ...nuevo, descripcion: e.target.value })}
        />
        <button type="button" className={styles.btn} onClick={() => void crear()} disabled={saving}>
          Agregar
        </button>
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Default</th>
              <th>Código</th>
              <th>Descripción</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((s) => (
              <tr key={s.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={sel.has(s.id)}
                    onChange={() => {
                      const next = new Set(sel);
                      if (next.has(s.id)) next.delete(s.id);
                      else next.add(s.id);
                      setSel(next);
                    }}
                  />
                </td>
                <td>{s.id}</td>
                <td>
                  {editId === s.id ? (
                    <input
                      className={styles.input}
                      value={editForm.descripcion}
                      onChange={(e) => setEditForm({ descripcion: e.target.value })}
                    />
                  ) : (
                    s.descripcion
                  )}
                </td>
                <td className={styles.actionsCell}>
                  {editId === s.id ? (
                    <button type="button" className={styles.btnSm} onClick={() => void guardarEdit()}>
                      OK
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={styles.btnSmSecondary}
                      onClick={() => {
                        setEditId(s.id);
                        setEditForm({ descripcion: s.descripcion });
                      }}
                    >
                      Editar
                    </button>
                  )}
                  <button type="button" className={styles.btnSmSecondary} onClick={() => setBorrar(s.id)}>
                    Borrar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ConfirmDialog
        open={!!borrar}
        title="Eliminar servicio"
        message={`¿Eliminar el servicio ${borrar}?`}
        confirmLabel="Eliminar"
        danger
        busy={saving}
        onConfirm={() => void eliminar()}
        onCancel={() => setBorrar(null)}
      />
    </section>
  );
}
