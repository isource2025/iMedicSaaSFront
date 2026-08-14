'use client';

import { useCallback, useEffect, useState } from 'react';
import { superAdminService } from '@/app/services/superAdminService';
import type { EmpresaAdmin, SuperAdminCatalogos, TipoServidor } from '@/app/types/superAdmin';
import styles from './superAdmin.module.css';

type Props = {
  empresa: EmpresaAdmin;
  catalogos: SuperAdminCatalogos;
  onEmpresaActualizada: (empresa: EmpresaAdmin) => void;
  onAbrirPuestaEnMarcha?: () => void;
  onVolver?: () => void;
  onError: (msg: string | null) => void;
};

const ESTADOS = ['ACTIVA', 'PRUEBA', 'SUSPENDIDA', 'CANCELADA'];

export default function EmpresaEditor({
  empresa,
  catalogos,
  onEmpresaActualizada,
  onAbrirPuestaEnMarcha,
  onVolver,
  onError,
}: Props) {
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [datosForm, setDatosForm] = useState({
    descripcion: empresa.descripcion,
    cuit: empresa.cuit || '',
    email: empresa.email || '',
    telefono: empresa.telefono || '',
    tipoServidor: (empresa.tipoServidor || 'FISICO') as TipoServidor,
  });
  const [conexionForm, setConexionForm] = useState({
    dbServer: empresa.conexion?.dbServer || '',
    dbPort: empresa.conexion?.dbPort != null ? String(empresa.conexion.dbPort) : '1433',
    dbInstance: empresa.conexion?.dbInstance || '',
    dbName: empresa.conexion?.dbName || '',
    dbUser: empresa.conexion?.dbUser || '',
    dbPassword: '',
    fileServerUrl: empresa.conexion?.fileServerUrl || '',
  });
  const [packs, setPacks] = useState<string[]>(empresa.packs || []);
  const [estadoSub, setEstadoSub] = useState(empresa.suscripcion?.estado || 'PRUEBA');

  const esNube = datosForm.tipoServidor === 'NUBE';

  useEffect(() => {
    setDatosForm({
      descripcion: empresa.descripcion,
      cuit: empresa.cuit || '',
      email: empresa.email || '',
      telefono: empresa.telefono || '',
      tipoServidor: (empresa.tipoServidor || 'FISICO') as TipoServidor,
    });
    setConexionForm({
      dbServer: empresa.conexion?.dbServer || '',
      dbPort: empresa.conexion?.dbPort != null ? String(empresa.conexion.dbPort) : '1433',
      dbInstance: empresa.conexion?.dbInstance || '',
      dbName: empresa.conexion?.dbName || '',
      dbUser: empresa.conexion?.dbUser || '',
      dbPassword: '',
      fileServerUrl: empresa.conexion?.fileServerUrl || '',
    });
    setPacks(empresa.packs || []);
    setEstadoSub(empresa.suscripcion?.estado || 'PRUEBA');
    setMensaje(null);
  }, [empresa.id]);

  const guardar = useCallback(async () => {
    if (!datosForm.descripcion.trim()) {
      onError('Razón social obligatoria');
      return;
    }
    if (
      !window.confirm(
        `¿Guardar los cambios de "${datosForm.descripcion}" y aplicarlos ahora en los servidores?`,
      )
    ) {
      return;
    }
    setGuardando(true);
    setMensaje(null);
    onError(null);
    try {
      const fileServerUrl = (conexionForm.fileServerUrl || '').trim().replace(/\/+$/, '');
      const conexion = esNube
        ? { fileServerUrl }
        : {
            dbServer: conexionForm.dbServer,
            dbPort: conexionForm.dbPort ? Number(conexionForm.dbPort) : null,
            dbInstance: conexionForm.dbInstance,
            dbName: conexionForm.dbName,
            dbUser: conexionForm.dbUser,
            dbPassword: conexionForm.dbPassword || undefined,
            fileServerUrl,
          };
      await superAdminService.updateEmpresa(empresa.id, {
        ...datosForm,
        conexion,
      });
      await superAdminService.updateConexion(empresa.id, conexion);
      await superAdminService.updatePacks(empresa.id, packs);
      await superAdminService.updateSuscripcion(empresa.id, {
        ...(empresa.suscripcion || { plan: 'STARTER', importeMensual: null, moneda: 'ARS' }),
        estado: estadoSub,
      });
      const fresh = await superAdminService.getEmpresa(empresa.id);
      onEmpresaActualizada(fresh);
      setConexionForm((f) => ({
        ...f,
        dbPassword: '',
        fileServerUrl: fresh.conexion?.fileServerUrl || f.fileServerUrl,
      }));
      setMensaje({
        tipo: 'ok',
        texto: `Cambios guardados en ${fresh.descripcion}. Ya están aplicados (túnel, datos, módulos y estado).`,
      });
    } catch (e) {
      const ax = e as { response?: { data?: { mensaje?: string } }; message?: string };
      const msg = ax.response?.data?.mensaje || (e instanceof Error ? e.message : 'Error al guardar');
      onError(msg);
      setMensaje({ tipo: 'error', texto: msg });
    } finally {
      setGuardando(false);
    }
  }, [conexionForm, datosForm, empresa.id, empresa.suscripcion, esNube, estadoSub, onEmpresaActualizada, onError, packs]);

  const togglePack = (codigo: string) => {
    setPacks((prev) => (prev.includes(codigo) ? prev.filter((p) => p !== codigo) : [...prev, codigo]));
    setMensaje(null);
  };

  return (
    <div className={styles.editor}>
      <div className={styles.editorHeader}>
        <div>
          <p className={styles.editorMode}>Modo edición</p>
          <h3 className={styles.stepTitle} style={{ margin: 0 }}>
            {empresa.descripcion}
          </h3>
          <p className={styles.wizardHint}>
            Cambiá lo que haga falta y pulsá Guardar. Nada se aplica hasta confirmar.
          </p>
        </div>
        <div className={styles.stepActions}>
          {onVolver && (
            <button type="button" className={styles.btnSecondary} onClick={onVolver}>
              Volver al listado
            </button>
          )}
          {onAbrirPuestaEnMarcha && (
            <button type="button" className={styles.btnSecondary} onClick={onAbrirPuestaEnMarcha}>
              Puesta en marcha
            </button>
          )}
          <button type="button" className={styles.btn} disabled={guardando} onClick={() => void guardar()}>
            {guardando ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>

      {mensaje && (
        <div
          className={`${styles.wizardAlert} ${mensaje.tipo === 'ok' ? styles.wizardAlertOk : styles.wizardAlertError}`}
          role="status"
        >
          <span>{mensaje.texto}</span>
          <button
            type="button"
            className={styles.wizardAlertDismiss}
            onClick={() => setMensaje(null)}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
      )}

      <section className={styles.editorBlock}>
        <h4 className={styles.stepTitle}>Datos</h4>
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
            <label>Tipo de servidor</label>
            <select
              className={styles.select}
              value={datosForm.tipoServidor}
              onChange={(e) =>
                setDatosForm({ ...datosForm, tipoServidor: e.target.value as TipoServidor })
              }
            >
              <option value="NUBE">Nube (Railway)</option>
              <option value="FISICO">Físico (on-premise)</option>
            </select>
          </div>
          <div className={styles.formGroup}>
            <label>Estado suscripción</label>
            <select
              className={styles.select}
              value={estadoSub}
              onChange={(e) => setEstadoSub(e.target.value)}
            >
              {ESTADOS.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className={styles.editorBlock}>
        <h4 className={styles.stepTitle}>Túnel de adjuntos</h4>
        <div className={styles.formGroup}>
          <label>URL pública (Cloudflare / file server)</label>
          <input
            className={styles.input}
            value={conexionForm.fileServerUrl}
            onChange={(e) => setConexionForm({ ...conexionForm, fileServerUrl: e.target.value })}
            placeholder="https://xxxx.trycloudflare.com"
          />
          <p className={styles.packDesc} style={{ marginTop: '0.35rem' }}>
            Sin barra al final. Al guardar se aplica de inmediato para ver y subir adjuntos de esta
            empresa.
          </p>
        </div>
      </section>

      {!esNube && (
        <section className={styles.editorBlock}>
          <h4 className={styles.stepTitle}>Conexión SQL</h4>
          <div className={styles.grid2}>
            <div className={styles.formGroup}>
              <label>Servidor</label>
              <input
                className={styles.input}
                value={conexionForm.dbServer}
                onChange={(e) => setConexionForm({ ...conexionForm, dbServer: e.target.value })}
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
        </section>
      )}

      <section className={styles.editorBlock}>
        <h4 className={styles.stepTitle}>Módulos</h4>
        <div className={styles.packGrid}>
          {catalogos.packs.map((pack) => {
            const active = packs.includes(pack.codigo);
            return (
              <button
                key={pack.codigo}
                type="button"
                className={`${styles.packCard} ${active ? styles.packCardActive : ''}`}
                onClick={() => togglePack(pack.codigo)}
                disabled={guardando}
              >
                <span className={styles.packTitle}>{pack.label}</span>
                <span className={styles.packDesc}>{pack.descripcion}</span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
