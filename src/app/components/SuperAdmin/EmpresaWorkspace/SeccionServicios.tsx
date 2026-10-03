'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { superAdminService } from '@/app/services/superAdminService';
import type { CatalogoServicio, EmpresaAdmin, ServiciosPrefijosEmpresa } from '@/app/types/superAdmin';
import PrefijosPracticaPicker, { unirPrefijos } from '@/app/components/UI/PrefijosPracticaPicker';
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
  const [prefData, setPrefData] = useState<ServiciosPrefijosEmpresa | null>(null);
  const [prefError, setPrefError] = useState<string | null>(null);
  const [prefEdit, setPrefEdit] = useState<{ id: string; descripcion: string; valor: string } | null>(null);
  const [prefError2, setPrefError2] = useState<string | null>(null);

  const cargarPrefijos = useCallback(async () => {
    try {
      setPrefData(await superAdminService.getServiciosPrefijos(empresa.id));
      setPrefError(null);
    } catch (e) {
      setPrefData(null);
      setPrefError(e instanceof Error ? e.message : 'No se pudieron cargar los prefijos de práctica');
    }
  }, [empresa.id]);

  useEffect(() => {
    void cargarPrefijos();
  }, [cargarPrefijos]);

  const prefijosDe = useMemo(() => {
    const m = new Map<string, string[]>();
    (prefData?.servicios || []).forEach((p) => m.set(p.id.toUpperCase(), p.prefijos));
    return m;
  }, [prefData]);

  const guardarPrefijos = async () => {
    if (!prefEdit) return;
    setSaving(true);
    setPrefError2(null);
    try {
      await superAdminService.guardarPrefijosServicio(
        empresa.id,
        prefEdit.id,
        prefEdit.valor ? prefEdit.valor.split(',') : [],
      );
      setPrefEdit(null);
      await cargarPrefijos();
    } catch (e) {
      setPrefError2(e instanceof Error ? e.message : 'No se pudieron guardar los prefijos');
    } finally {
      setSaving(false);
    }
  };

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
      {prefError ? (
        <p className={styles.muted}>No se pudieron cargar los prefijos de práctica: {prefError}</p>
      ) : null}
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
              <th>Prefijos de práctica</th>
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
                <td>
                  {prefData ? (
                    (prefijosDe.get(s.id.toUpperCase()) || []).length ? (
                      (prefijosDe.get(s.id.toUpperCase()) || []).join(', ')
                    ) : (
                      <span className={styles.muted}>—</span>
                    )
                  ) : (
                    <span className={styles.muted}>…</span>
                  )}
                </td>
                <td className={styles.actionsCell}>
                  <button
                    type="button"
                    className={styles.btnSmSecondary}
                    disabled={!prefData}
                    onClick={() => {
                      setPrefError2(null);
                      setPrefEdit({
                        id: s.id,
                        descripcion: s.descripcion,
                        valor: unirPrefijos(prefijosDe.get(s.id.toUpperCase()) || []),
                      });
                    }}
                  >
                    Prefijos
                  </button>
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
      {prefEdit && prefData ? (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="sa-prefijos-title">
          <div className={styles.modalPanel} style={{ width: 'min(640px, 96vw)' }}>
            <div className={styles.modalHeader}>
              <strong id="sa-prefijos-title" className="modal-title">
                Prefijos de práctica · {prefEdit.id} {prefEdit.descripcion ? `(${prefEdit.descripcion})` : ''}
              </strong>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setPrefEdit(null)}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.wizardHint} style={{ marginTop: 0 }}>
                Capítulos del nomenclador que realiza este servicio. Con ellos se arma el catálogo de estudios
                que se pueden pedir. El 42 (consultas / interconsulta) suele estar en todos los servicios.
              </p>
              {prefError2 ? <div className={styles.error}>{prefError2}</div> : null}
              <PrefijosPracticaPicker
                name="prefijos"
                options={prefData.opciones}
                value={prefEdit.valor}
                maxLength={40}
                onChange={(valor) => setPrefEdit((p) => (p ? { ...p, valor } : p))}
              />
            </div>
            <div className={styles.modalFooter}>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnSecondary}`}
                onClick={() => setPrefEdit(null)}
                disabled={saving}
              >
                Cancelar
              </button>
              <button type="button" className={styles.btn} onClick={() => void guardarPrefijos()} disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar prefijos'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
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
