'use client';

import { useEffect, useState } from 'react';
import { superAdminService } from '@/app/services/superAdminService';
import type { EmpresaAdmin, PreviewTabla, ResultadoImport, TablaImportable } from '@/app/types/superAdmin';
import ConfirmDialog from '../ui/ConfirmDialog';
import PasswordInput from '../ui/PasswordInput';
import styles from '../superAdmin.module.css';

type Props = {
  empresa: EmpresaAdmin;
  onUpdated: (empresa: EmpresaAdmin) => void;
  onError: (msg: string | null) => void;
};

export default function SeccionInfra({ empresa, onUpdated, onError }: Props) {
  const esNube = (empresa.tipoServidor || 'FISICO') === 'NUBE';
  const [conexion, setConexion] = useState({
    dbServer: empresa.conexion?.dbServer || '',
    dbPort: empresa.conexion?.dbPort != null ? String(empresa.conexion.dbPort) : '1433',
    dbInstance: empresa.conexion?.dbInstance || '',
    dbName: empresa.conexion?.dbName || '',
    dbUser: empresa.conexion?.dbUser || '',
    dbPassword: '',
    fileServerUrl: empresa.conexion?.fileServerUrl || '',
  });
  const [saving, setSaving] = useState(false);
  const [test, setTest] = useState<{ ok: boolean; msg: string } | null>(null);
  const [tablas, setTablas] = useState<TablaImportable[]>([]);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [importResult, setImportResult] = useState<ResultadoImport | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [preview, setPreview] = useState<PreviewTabla | null>(null);
  const [confirmImport, setConfirmImport] = useState(false);

  useEffect(() => {
    setConexion({
      dbServer: empresa.conexion?.dbServer || '',
      dbPort: empresa.conexion?.dbPort != null ? String(empresa.conexion.dbPort) : '1433',
      dbInstance: empresa.conexion?.dbInstance || '',
      dbName: empresa.conexion?.dbName || '',
      dbUser: empresa.conexion?.dbUser || '',
      dbPassword: '',
      fileServerUrl: empresa.conexion?.fileServerUrl || '',
    });
    setTest(null);
    setTablas([]);
    setImportResult(null);
  }, [empresa.id]);

  const payload = (soloFile = false) =>
    soloFile
      ? { fileServerUrl: conexion.fileServerUrl || '' }
      : {
          dbServer: conexion.dbServer,
          dbPort: conexion.dbPort ? Number(conexion.dbPort) : null,
          dbInstance: conexion.dbInstance,
          dbName: conexion.dbName,
          dbUser: conexion.dbUser,
          dbPassword: conexion.dbPassword || undefined,
          fileServerUrl: conexion.fileServerUrl || '',
        };

  const persistir = async (soloFile = esNube) => {
    const det = await superAdminService.updateConexion(empresa.id, payload(soloFile));
    onUpdated(det);
    if (!soloFile) setConexion((f) => ({ ...f, dbPassword: '' }));
    return det;
  };

  const guardarTunel = async () => {
    setSaving(true);
    onError(null);
    try {
      await persistir(true);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Error al guardar el túnel');
    } finally {
      setSaving(false);
    }
  };

  const guardarSql = async () => {
    setSaving(true);
    onError(null);
    try {
      await persistir(false);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Error al guardar la conexión');
    } finally {
      setSaving(false);
    }
  };

  const probar = async () => {
    setSaving(true);
    onError(null);
    setTest(null);
    try {
      const r = await superAdminService.probarConexionDatos({
        idEmpresa: Number(empresa.id) || undefined,
        dbServer: conexion.dbServer,
        dbPort: conexion.dbPort ? Number(conexion.dbPort) : null,
        dbInstance: conexion.dbInstance,
        dbName: conexion.dbName,
        dbUser: conexion.dbUser,
        dbPassword: conexion.dbPassword || undefined,
      });
      setTest(
        r.ok
          ? { ok: true, msg: 'Conexión exitosa al servidor físico.' }
          : { ok: false, msg: r.error || 'No se pudo conectar.' },
      );
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Error al probar la conexión');
    } finally {
      setSaving(false);
    }
  };

  const detectarTablas = async () => {
    setSaving(true);
    onError(null);
    try {
      await persistir(false);
      const list = await superAdminService.getTablasImportables(empresa.id);
      setTablas(list);
      setSel(new Set(list.filter((t) => t.existeOrigen && t.existeDestino).map((t) => t.tabla)));
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Error al detectar tablas');
    } finally {
      setSaving(false);
    }
  };

  const ejecutarImport = async () => {
    setConfirmImport(false);
    setImportLoading(true);
    onError(null);
    try {
      const res = await superAdminService.importarTablas(empresa.id, Array.from(sel));
      setImportResult(res);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Error al importar');
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <div className={styles.altaGrid}>
      <section className={styles.panel}>
        <div className={styles.stepToolbar}>
          <span className={styles.stepTitle}>Túnel de adjuntos</span>
          <button type="button" className={styles.btn} onClick={() => void guardarTunel()} disabled={saving}>
            Guardar URL
          </button>
        </div>
        <div className={styles.formGroup}>
          <label>File server / Cloudflare</label>
          <input
            className={styles.input}
            placeholder="https://…"
            value={conexion.fileServerUrl}
            onChange={(e) => setConexion({ ...conexion, fileServerUrl: e.target.value })}
          />
        </div>
      </section>

      {!esNube && (
        <section className={styles.panel}>
          <div className={styles.stepToolbar}>
            <span className={styles.stepTitle}>Conexión SQL (servidor físico)</span>
            <div className={styles.stepActions}>
              <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => void probar()} disabled={saving}>
                Probar
              </button>
              <button type="button" className={styles.btn} onClick={() => void guardarSql()} disabled={saving}>
                Guardar
              </button>
            </div>
          </div>
          <div className={styles.grid2}>
            <div className={styles.formGroup}>
              <label>Servidor</label>
              <input className={styles.input} value={conexion.dbServer} onChange={(e) => setConexion({ ...conexion, dbServer: e.target.value })} />
            </div>
            <div className={styles.formGroup}>
              <label>Puerto</label>
              <input className={styles.input} value={conexion.dbPort} onChange={(e) => setConexion({ ...conexion, dbPort: e.target.value })} />
            </div>
            <div className={styles.formGroup}>
              <label>Instancia</label>
              <input className={styles.input} value={conexion.dbInstance} onChange={(e) => setConexion({ ...conexion, dbInstance: e.target.value })} />
            </div>
            <div className={styles.formGroup}>
              <label>Base</label>
              <input className={styles.input} value={conexion.dbName} onChange={(e) => setConexion({ ...conexion, dbName: e.target.value })} />
            </div>
            <div className={styles.formGroup}>
              <label>Usuario</label>
              <input className={styles.input} value={conexion.dbUser} onChange={(e) => setConexion({ ...conexion, dbUser: e.target.value })} />
            </div>
            <div className={styles.formGroup}>
              <label>Contraseña</label>
              <PasswordInput
                placeholder={empresa.conexion?.tienePassword ? 'Dejar vacío para conservar' : ''}
                value={conexion.dbPassword}
                onChange={(e) => setConexion({ ...conexion, dbPassword: e.target.value })}
              />
            </div>
          </div>
          {test && (
            <p className={test.ok ? styles.wizardOk : styles.wizardAlertError} style={{ marginTop: '0.75rem' }}>
              {test.msg}
            </p>
          )}
        </section>
      )}

      {!esNube && (
        <section className={styles.panel}>
          <div className={styles.stepToolbar}>
            <span className={styles.stepTitle}>Importar tablas a la nube</span>
            <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => void detectarTablas()} disabled={saving}>
              Detectar tablas
            </button>
          </div>
          {tablas.length === 0 ? (
            <p className={styles.emptyHint}>Guardá la conexión y detectá las tablas importables.</p>
          ) : (
            <>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th></th>
                      <th>Tabla</th>
                      <th>Origen</th>
                      <th>Destino</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {tablas.map((t) => (
                      <tr key={t.tabla}>
                        <td>
                          <input
                            type="checkbox"
                            checked={sel.has(t.tabla)}
                            onChange={() => {
                              const next = new Set(sel);
                              if (next.has(t.tabla)) next.delete(t.tabla);
                              else next.add(t.tabla);
                              setSel(next);
                            }}
                          />
                        </td>
                        <td>{t.label}</td>
                        <td>{t.existeOrigen ? t.filasOrigen ?? 'sí' : 'no'}</td>
                        <td>{t.existeDestino ? 'sí' : 'no'}</td>
                        <td>
                          <button
                            type="button"
                            className={styles.btnSmSecondary}
                            onClick={() =>
                              void superAdminService
                                .getPreviewTabla(empresa.id, t.tabla)
                                .then(setPreview)
                                .catch((e) => onError(e instanceof Error ? e.message : 'Error de preview'))
                            }
                          >
                            Preview
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className={styles.stepActions} style={{ marginTop: '0.75rem' }}>
                <button
                  type="button"
                  className={styles.btn}
                  disabled={importLoading || sel.size === 0}
                  onClick={() => setConfirmImport(true)}
                >
                  {importLoading ? 'Importando…' : `Importar ${sel.size} tabla(s)`}
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
                    <th>Error</th>
                  </tr>
                </thead>
                <tbody>
                  {importResult.resultados.map((r) => (
                    <tr key={r.tabla}>
                      <td>{r.tabla}</td>
                      <td>{r.leidas}</td>
                      <td>{r.escritas}</td>
                      <td>{r.error || r.nota || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {preview && (
        <div className={styles.modalOverlay} onClick={() => setPreview(null)}>
          <div className={styles.modalPanel} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <strong>Preview {preview.label}</strong>
              <button type="button" className={styles.modalClose} onClick={() => setPreview(null)}>
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
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
                        {preview.columnas.map((c) => (
                          <td key={c}>{String(fila[c] ?? '')}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmImport}
        title="Importar tablas"
        message={`¿Importar ${sel.size} tabla(s) del servidor físico a la nube? Se sobreescriben registros con la misma clave.`}
        confirmLabel="Importar"
        busy={importLoading}
        onConfirm={() => void ejecutarImport()}
        onCancel={() => setConfirmImport(false)}
      />
    </div>
  );
}
