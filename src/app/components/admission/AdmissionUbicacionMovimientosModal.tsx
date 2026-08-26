'use client';

import { useCallback, useEffect, useState } from 'react';
import Loader from '@/app/components/Loader/Loader';
import {
  admissionSearchService,
  type AdmissionDatosPrincipalesVisita,
} from '@/app/services/admissionSearchService';
import visitaMovimientoService from '@/app/services/visitaMovimientoService';
import { getDisposicionesEgreso } from '@/app/services/disposicionEgresoService';
import diagnosticosService from '@/app/services/diagnosticosService';
import type { DisposicionEgreso } from '@/app/types/disposicionEgreso.types';
import type { DiagnosticoCie10 } from '@/app/types/diagnosticos';
import { esAdminClinico } from '@/app/hooks/useUsuarioActual';
import { detalleDeError, mensajeDeError } from '@/app/utils/apiError';
import {
  catalogoDisposiciones,
  ordenarMovimientos,
} from '@/app/components/beds/movimientos/movimientosDisplay';
import MovimientosTimelineTable from '@/app/components/beds/movimientos/MovimientosTimelineTable';
import styles from './AdmissionUbicacionMovimientosModal.module.css';
import ConfirmationModal from '@/app/components/beds/shared/ConfirmationModal';
import MessageModal, { type MessageModalTone } from '@/app/components/UI/MessageModal';
import type { EstadoRevertirEgreso } from '@/app/services/visitaMovimientoService';
import ModalAsignarCamaAVisita from '@/app/components/modals/ModalAsignarCamaAVisita';
import ModalCambiarCama from '@/app/components/modals/ModalCambiarCama';

type Props = {
  isOpen: boolean;
  numeroVisita: number | null;
  onClose: () => void;
  /** Sin overlay propio: se embebe en el modal de gestión de visita */
  embedded?: boolean;
  /** Qué bloque mostrar (para menú lateral) */
  focusSection?: 'ubicacion' | 'movimientos' | 'egreso' | 'all' | 'ubicacion_movimientos';
};

type MovimientoRow = {
  ValorSector?: string;
  ValorHabitacionCama?: string;
  NombreSector?: string;
  NombreCama?: string;
  NumeroCama?: string;
  NombreServicio?: string;
  ServicioHospital?: string;
  FechaAdmision?: number;
  HoraAdmision?: number | string;
  FechaEgreso?: number;
  HoraEgreso?: number | string;
  FechaAdmisionISO?: string;
  HoraAdmisionISO?: string;
  FechaEgresoISO?: string;
  HoraEgresoISO?: string;
  Operador?: string;
  OperadorNombre?: string;
  Diagnostico?: string;
  DiagnosticoDescripcion?: string;
  DisposicionEgreso?: number;
  DisposicionEgresoDescripcion?: string;
};

function etiquetaDiagnosticoEgreso(codigo: string, descripcion: string): string {
  const code = codigo.trim();
  const desc = descripcion.trim();
  if (code && desc) return `${code} — ${desc}`;
  return code || desc;
}

function codigoCieDesdeTexto(raw: string): string {
  const v = raw.trim();
  const conDesc = /^([A-Za-z][0-9][0-9A-Za-z.]{1,6})\s*[—–-]\s+/.exec(v);
  if (conDesc) return conDesc[1].toUpperCase();
  if (/^[A-Za-z][0-9][0-9A-Za-z.]{1,6}$/.test(v)) return v.toUpperCase();
  return v;
}

function mensajeErrorHttp(e: unknown, fallback: string): string {
  const err = e as { response?: { data?: { message?: string; mensaje?: string } }; message?: string };
  return err?.response?.data?.mensaje || err?.response?.data?.message || err?.message || fallback;
}

function textoConfirmacionRevertir(estado: EstadoRevertirEgreso): string {
  const avisos = (estado.avisos || []).map((a) => a.mensaje).filter(Boolean);
  if (!avisos.length) return estado.mensaje;
  return `${estado.mensaje}\n\n${avisos.join('\n\n')}`;
}

function etiquetaOperadorGuardado(visita: AdmissionDatosPrincipalesVisita | null): string {
  const codigo =
    visita?.OperadorEgreso != null && Number(visita.OperadorEgreso) > 0
      ? String(visita.OperadorEgreso)
      : '';
  const nombre = String(visita?.OperadorEgresoNombre || '').trim();
  if (nombre && codigo) return `${nombre} (${codigo})`;
  if (nombre) return nombre;
  if (codigo) return `Operador ${codigo}`;
  return '';
}

/** Clarion 0 / null / época 1800-12-28 no cuentan como egreso real. */
function tieneEgresoGuardado(visita: AdmissionDatosPrincipalesVisita | null | undefined): boolean {
  if (!visita) return false;
  const clarion = Number(visita.FechaEgresoClarion);
  if (Number.isFinite(clarion) && visita.FechaEgresoClarion != null) return clarion > 0;
  const raw = visita.FechaEgreso;
  if (raw == null || raw === '') return false;
  if (typeof raw === 'number') return Number(raw) > 0;
  const iso = String(raw).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const y = Number(iso.slice(0, 4));
  return y >= 1900;
}

function fechaEgresoFormularioValida(iso: string): boolean {
  const fe = String(iso || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fe)) return false;
  return Number(fe.slice(0, 4)) >= 1900;
}

export default function AdmissionUbicacionMovimientosModal({
  isOpen,
  numeroVisita,
  onClose,
  embedded = false,
  focusSection = 'all',
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [visita, setVisita] = useState<AdmissionDatosPrincipalesVisita | null>(null);
  const [movimientos, setMovimientos] = useState<MovimientoRow[]>([]);
  const [disposiciones, setDisposiciones] = useState<DisposicionEgreso[]>([]);
  const [dispCatalogo, setDispCatalogo] = useState<Map<number, string>>(new Map());

  const [fechaEgreso, setFechaEgreso] = useState('');
  const [horaEgreso, setHoraEgreso] = useState('');
  const [disposicionEgreso, setDisposicionEgreso] = useState('');
  const [diagnosticoEgreso, setDiagnosticoEgreso] = useState('');
  const [diagnosticoEgresoDesc, setDiagnosticoEgresoDesc] = useState('');
  const [diagQuery, setDiagQuery] = useState('');
  const [diagOpen, setDiagOpen] = useState(false);
  const [diagTyping, setDiagTyping] = useState(false);
  const [diagResults, setDiagResults] = useState<DiagnosticoCie10[]>([]);
  const [diagLoading, setDiagLoading] = useState(false);
  const [operadorEgreso, setOperadorEgreso] = useState('');
  const [revertBusy, setRevertBusy] = useState(false);
  const [estadoRevertir, setEstadoRevertir] = useState<EstadoRevertirEgreso | null>(null);
  const [confirmarLimpiar, setConfirmarLimpiar] = useState(false);
  const [aviso, setAviso] = useState<{ title: string; message: string; tone: MessageModalTone } | null>(null);
  const [asignarCamaOpen, setAsignarCamaOpen] = useState(false);
  const [cambiarCamaOpen, setCambiarCamaOpen] = useState(false);
  const puedeRevertirEgreso = esAdminClinico();

  const load = useCallback(async () => {
    if (!numeroVisita) return;
    try {
      setLoading(true);
      setError('');
      const [payload, movs, disp, ultimo] = await Promise.all([
        admissionSearchService.getDatosPrincipales(numeroVisita),
        visitaMovimientoService.getMovimientosVisita(numeroVisita).catch(() => [] as MovimientoRow[]),
        getDisposicionesEgreso().catch(() => [] as DisposicionEgreso[]),
        visitaMovimientoService.getUltimoMovimiento(numeroVisita).catch(() => null),
      ]);
      setVisita(payload.visita);
      let list = (movs || []) as MovimientoRow[];
      // Si el listado viene vacío pero hay último movimiento, usarlo para cama/sector e historial mínimo
      if (list.length === 0 && ultimo) {
        const bed =
          String((ultimo as { ValorHabitacionCama?: string; bedId?: string }).ValorHabitacionCama ||
            (ultimo as { bedId?: string }).bedId ||
            '').trim();
        const sec = String((ultimo as { ValorSector?: string }).ValorSector || '').trim();
        if (bed || sec) {
          list = [
            {
              ValorHabitacionCama: bed,
              ValorSector: sec,
              NombreCama: bed,
            },
          ];
        }
      }
      setMovimientos(ordenarMovimientos(list));
      setDisposiciones(disp || []);
      setDispCatalogo(catalogoDisposiciones(disp || []));
      const fe = String(payload.visita.FechaEgreso || '').slice(0, 10);
      const he = String(payload.visita.HoraEgreso || '').slice(0, 5);
      const tieneEgreso = fechaEgresoFormularioValida(fe) && tieneEgresoGuardado(payload.visita);
      if (tieneEgreso) {
        setFechaEgreso(fe);
        setHoraEgreso(/^\d{2}:\d{2}/.test(he) ? he.slice(0, 5) : '');
        const dispVisita = Number(payload.visita.DisposicionEgreso);
        const dispMov = Number((ultimo as MovimientoRow | null)?.DisposicionEgreso);
        const dispVal =
          Number.isFinite(dispVisita) && dispVisita > 0
            ? String(dispVisita)
            : Number.isFinite(dispMov) && dispMov > 0
              ? String(dispMov)
              : '';
        setDisposicionEgreso(dispVal);
        const diagCode = String(payload.visita.DiagnosticoEgreso || '').trim();
        setDiagnosticoEgreso(diagCode);
        let diagDesc = String(payload.visita.DiagnosticoEgresoDescripcion || '').trim();
        if (diagCode && !diagDesc) {
          try {
            const rows = await diagnosticosService.buscarDiagnosticosCie10(diagCode);
            const hit = (rows || []).find((r) => String(r.CodigoOMS || '').trim() === diagCode);
            if (hit) diagDesc = String(hit.descripcion || '').trim();
          } catch {
            /* catálogo CIE opcional */
          }
        }
        setDiagnosticoEgresoDesc(diagDesc);
        setOperadorEgreso(etiquetaOperadorGuardado(payload.visita));
      } else {
        setFechaEgreso('');
        setHoraEgreso('');
        setDisposicionEgreso('');
        setDiagnosticoEgreso('');
        setDiagnosticoEgresoDesc('');
        setOperadorEgreso('');
      }
      setDiagOpen(false);
      setDiagTyping(false);
      setDiagQuery('');
      setDiagResults([]);
    } catch (e: unknown) {
      console.error('Error al cargar ubicación / movimientos:', detalleDeError(e));
      setError(mensajeDeError(e, 'Error al cargar ubicación / movimientos'));
    } finally {
      setLoading(false);
    }
  }, [numeroVisita]);

  useEffect(() => {
    if (!isOpen || !numeroVisita) return;
    void load();
  }, [isOpen, numeroVisita, load]);

  useEffect(() => {
    if (!diagOpen) return;
    const q = diagQuery.trim();
    if (q.length < 1) {
      setDiagResults([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        setDiagLoading(true);
        const rows = await diagnosticosService.buscarDiagnosticosCie10(q);
        if (!cancelled) setDiagResults(rows.slice(0, 25));
      } catch {
        if (!cancelled) setDiagResults([]);
      } finally {
        if (!cancelled) setDiagLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [diagQuery, diagOpen]);

  const pickDiagnosticoEgreso = (d: DiagnosticoCie10) => {
    setDiagnosticoEgreso(String(d.CodigoOMS || '').trim());
    setDiagnosticoEgresoDesc(String(d.descripcion || '').trim());
    setDiagOpen(false);
    setDiagTyping(false);
    setDiagQuery('');
    setDiagResults([]);
  };

  const actual = movimientos[0] || null;
  const sector = String(actual?.ValorSector || visita?.Sector || '').trim();
  const hab = String(actual?.ValorHabitacionCama || visita?.Habitacion || '').trim();
  const sectorDesc = String(actual?.NombreSector || visita?.SectorDescripcion || '').trim();
  const servicio = String(
    actual?.NombreServicio || actual?.ServicioHospital || visita?.ServicioHospitalDescripcion || visita?.ServicioHospital || '',
  ).trim();

  const bedId = hab;
  const yaEgresado = tieneEgresoGuardado(visita);
  const canEgreso = Boolean(numeroVisita);
  /** Sin habitación/cama actual (cabecera o último movimiento). */
  const sinUbicacion = Boolean(numeroVisita) && !hab;

  const bloqueAsignarCama = sinUbicacion ? (
    <div className={styles.actions} style={{ marginTop: 10 }}>
      {yaEgresado ? (
        <>
          <p className={styles.hintSinCama}>
            Esta visita figura egresada y sin cama. Revertí el egreso para poder
            asignarle una ubicación.
          </p>
          {puedeRevertirEgreso ? (
            <button
              type="button"
              className={`${styles.btn} ${styles.btnPrimary}`}
              disabled={loading || revertBusy}
              onClick={() => void onRevertirEgreso()}
            >
              {revertBusy ? 'Revisando…' : 'Revertir egreso y asignar cama'}
            </button>
          ) : null}
        </>
      ) : (
        <button
          type="button"
          className={`${styles.btn} ${styles.btnPrimary}`}
          disabled={loading}
          onClick={() => setAsignarCamaOpen(true)}
        >
          Asignar cama
        </button>
      )}
    </div>
  ) : !yaEgresado ? (
    <div className={styles.actions} style={{ marginTop: 10 }}>
      <button
        type="button"
        className={`${styles.btn} ${styles.btnPrimary}`}
        disabled={loading}
        onClick={() => setCambiarCamaOpen(true)}
      >
        Cambiar cama
      </button>
    </div>
  ) : null;

  const onEgresoRapido = async () => {
    if (!numeroVisita || !fechaEgreso || !horaEgreso) {
      setError('Indicá fecha y hora de egreso');
      return;
    }
    if (!disposicionEgreso) {
      setError('Indicá la condición de egreso');
      return;
    }
    try {
      setLoading(true);
      setError('');
      await visitaMovimientoService.actualizarUltimoMovimiento(numeroVisita, {
        fechaEgreso,
        horaEgreso,
        disposicionEgreso: Number(disposicionEgreso) || null,
        diagnostico: codigoCieDesdeTexto(diagnosticoEgreso) || null,
        bedId: bedId || null,
      });
      await load();
    } catch (e: unknown) {
      setError(mensajeErrorHttp(e, 'Error al registrar egreso'));
    } finally {
      setLoading(false);
    }
  };

  const onRevertirEgreso = async () => {
    if (!numeroVisita) return;
    try {
      setRevertBusy(true);
      setError('');
      const estado = await visitaMovimientoService.getEstadoRevertirEgreso(numeroVisita);
      if (!estado.puedeRevertir) {
        setAviso({
          title: 'No se puede revertir el egreso',
          message: textoConfirmacionRevertir(estado),
          tone: 'warning',
        });
        return;
      }
      setEstadoRevertir(estado);
    } catch (e: unknown) {
      setAviso({
        title: 'No se puede revertir el egreso',
        message: mensajeErrorHttp(e, 'No se pudo revisar el egreso'),
        tone: 'error',
      });
    } finally {
      setRevertBusy(false);
    }
  };

  const confirmarRevertirEgreso = async () => {
    if (!numeroVisita) return;
    try {
      setRevertBusy(true);
      setError('');
      const res = await visitaMovimientoService.revertirEgreso(numeroVisita);
      setEstadoRevertir(null);
      await load();
      // Flujo típico post-Binaria: egreso anulado → elegir cama real
      setAsignarCamaOpen(true);
      setAviso({
        title: 'Egreso anulado',
        message:
          res.mensaje ||
          res.message ||
          'Se anuló el egreso. Elegí una cama libre para ubicar al paciente.',
        tone: 'success',
      });
    } catch (e: unknown) {
      setEstadoRevertir(null);
      setAviso({
        title: 'No se pudo anular el egreso',
        message: mensajeErrorHttp(e, 'Error al revertir el egreso'),
        tone: 'error',
      });
    } finally {
      setRevertBusy(false);
    }
  };

  const onLimpiarEgreso = () => {
    setFechaEgreso('');
    setHoraEgreso('');
    setDisposicionEgreso('');
    setDiagnosticoEgreso('');
    setDiagnosticoEgresoDesc('');
    setDiagQuery('');
    setDiagOpen(false);
    setDiagResults([]);
    setConfirmarLimpiar(false);
  };

  if (!isOpen) return null;

  const showUbicacion =
    focusSection === 'all' ||
    focusSection === 'ubicacion' ||
    focusSection === 'ubicacion_movimientos';
  const showMovimientos =
    focusSection === 'all' ||
    focusSection === 'movimientos' ||
    focusSection === 'ubicacion_movimientos';
  const showEgreso = focusSection === 'all' || focusSection === 'egreso';

  const body = (
    <div className={embedded ? styles.embeddedBody : styles.body}>
      {!embedded && visita ? (
        <p className={styles.patientLine}>
          Visita #{visita.NumeroVisita} · {String(visita.ApellidoYNombre || '').trim()} · DNI{' '}
          {visita.NumeroDocumento || '—'}
        </p>
      ) : null}

      {error ? <div className={styles.error}>{error}</div> : null}

      {loading && !visita ? (
        <div className={styles.loadingWrap}>
          <Loader />
        </div>
      ) : (
        <>
          {showUbicacion ? (
            <section className={embedded ? styles.sectionFlat : styles.section}>
              {!embedded ? <h3 className={styles.sectionTitle}>Ubicación actual</h3> : null}
              <div className={styles.ubicacionGrid}>
                <label className={styles.field}>
                  <span>Sector</span>
                  <input className={styles.readonly} value={sector || '—'} readOnly />
                </label>
                <label className={styles.field}>
                  <span>Hab-Cama</span>
                  <input className={styles.readonly} value={hab || '—'} readOnly />
                </label>
                <label className={styles.field}>
                  <span>Descripción</span>
                  <input className={styles.readonly} value={sectorDesc || '—'} readOnly />
                </label>
                <label className={styles.field}>
                  <span>Servicio</span>
                  <input className={styles.readonly} value={servicio || '—'} readOnly />
                </label>
              </div>
              {showUbicacion ? bloqueAsignarCama : null}
            </section>
          ) : null}

          {showMovimientos ? (
            <section className={embedded ? styles.sectionFlat : styles.section}>
              <h3 className={styles.sectionTitle}>Historial de movimientos</h3>
              {movimientos.length === 0 ? (
                <div className={styles.empty}>Sin movimientos registrados</div>
              ) : (
                <MovimientosTimelineTable movimientos={movimientos} dispCatalogo={dispCatalogo} compact />
              )}
            </section>
          ) : null}

          {showEgreso ? (
            <section className={embedded ? styles.sectionFlat : styles.section}>
              {!embedded ? <h3 className={styles.sectionTitle}>Egreso</h3> : null}
              {!showUbicacion ? bloqueAsignarCama : null}
              <div className={styles.egresoGrid}>
                <label className={styles.field}>
                  <span>Fecha de egreso</span>
                  <input type="date" value={fechaEgreso} onChange={(e) => setFechaEgreso(e.target.value)} />
                </label>
                <label className={styles.field}>
                  <span>Hora de egreso</span>
                  <input type="time" value={horaEgreso} onChange={(e) => setHoraEgreso(e.target.value)} />
                </label>
                <label className={styles.field}>
                  <span>Condición de egreso</span>
                  <select value={disposicionEgreso} onChange={(e) => setDisposicionEgreso(e.target.value)}>
                    <option value="">—</option>
                    {disposiciones.map((d) => (
                      <option key={String(d.Valor)} value={String(Number(d.Valor) || d.Valor)}>
                        {d.Descripcion || d.Valor}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={`${styles.field} ${styles.fieldDiag}`}>
                  <span>Diagnóstico egreso</span>
                  <div className={styles.diagLookup}>
                    <input
                      value={
                        diagTyping
                          ? diagQuery
                          : etiquetaDiagnosticoEgreso(diagnosticoEgreso, diagnosticoEgresoDesc)
                      }
                      onChange={(e) => {
                        const v = e.target.value;
                        setDiagTyping(true);
                        setDiagQuery(v);
                        setDiagnosticoEgreso(codigoCieDesdeTexto(v));
                        setDiagnosticoEgresoDesc('');
                        setDiagOpen(true);
                      }}
                      onFocus={() => {
                        setDiagQuery(diagnosticoEgreso || diagnosticoEgresoDesc);
                        setDiagOpen(true);
                      }}
                      placeholder="Código o descripción CIE"
                    />
                    {diagOpen ? (
                      <div className={styles.diagPanel}>
                        {diagLoading ? <div className={styles.diagItem}>Buscando…</div> : null}
                        {!diagLoading && diagQuery.trim() && diagResults.length === 0 ? (
                          <div className={styles.diagItem}>Sin coincidencias</div>
                        ) : null}
                        {diagResults.map((d) => (
                          <button
                            key={`${d.idDiagnostico}-${d.CodigoOMS}`}
                            type="button"
                            className={styles.diagItem}
                            onClick={() => pickDiagnosticoEgreso(d)}
                          >
                            {d.CodigoOMS} — {d.descripcion}
                          </button>
                        ))}
                        <button
                          type="button"
                          className={styles.diagItem}
                          onClick={() => {
                            setDiagOpen(false);
                            setDiagResults([]);
                          }}
                        >
                          Cerrar
                        </button>
                      </div>
                    ) : null}
                  </div>
                </label>
                <label className={styles.field}>
                  <span>Operador egreso</span>
                  <input
                    value={operadorEgreso}
                    readOnly
                    placeholder="Se completa al registrar"
                    title="Se registra automáticamente con el usuario de la sesión (nombre y código)"
                  />
                </label>
              </div>
              <div className={styles.actions} style={{ marginTop: 10 }}>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  disabled={loading || !canEgreso}
                  onClick={() => void onEgresoRapido()}
                >
                  {yaEgresado ? 'Actualizar egreso' : 'Registrar egreso'}
                </button>
                <button
                  type="button"
                  className={styles.btn}
                  disabled={loading || revertBusy}
                  onClick={() => setConfirmarLimpiar(true)}
                  title="Borra fecha, hora, condición y diagnóstico de esta pantalla para cargarlos de nuevo"
                >
                  Limpiar
                </button>
                {yaEgresado && puedeRevertirEgreso ? (
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnDanger}`}
                    disabled={loading || revertBusy}
                    onClick={() => void onRevertirEgreso()}
                    title="Anula el egreso y devuelve al paciente a la misma cama"
                  >
                    {revertBusy ? 'Revisando…' : 'Revertir egreso'}
                  </button>
                ) : null}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );

  const overlays = (
    <>
      <ConfirmationModal
        isOpen={Boolean(estadoRevertir)}
        title="Anular egreso"
        message={estadoRevertir ? textoConfirmacionRevertir(estadoRevertir) : ''}
        confirmText={revertBusy ? 'Anulando…' : 'Anular egreso'}
        cancelText="Cancelar"
        onClose={() => {
          if (!revertBusy) setEstadoRevertir(null);
        }}
        onConfirm={() => {
          if (!revertBusy) void confirmarRevertirEgreso();
        }}
      />
      <ConfirmationModal
        isOpen={confirmarLimpiar}
        title="Limpiar egreso"
        message={
          yaEgresado
            ? 'Se van a borrar fecha, hora, condición y diagnóstico de esta pantalla para cargarlos de nuevo. Lo ya guardado no cambia hasta que actualices. Si el paciente tiene que volver a internación, usá Revertir egreso.'
            : 'Se van a borrar fecha, hora, condición y diagnóstico de esta pantalla para cargarlos de nuevo.'
        }
        confirmText="Limpiar"
        cancelText="Cancelar"
        onClose={() => setConfirmarLimpiar(false)}
        onConfirm={onLimpiarEgreso}
      />
      <MessageModal
        open={Boolean(aviso)}
        title={aviso?.title || ''}
        message={aviso?.message || ''}
        tone={aviso?.tone || 'info'}
        onClose={() => setAviso(null)}
      />
      {numeroVisita ? (
        <ModalAsignarCamaAVisita
          isOpen={asignarCamaOpen}
          onClose={() => setAsignarCamaOpen(false)}
          onSuccess={() => {
            setAsignarCamaOpen(false);
            void load();
          }}
          numeroVisita={numeroVisita}
          pacienteNombre={String(visita?.ApellidoYNombre || '').trim()}
          diagnostico={String(visita?.Diagnostico || '').trim()}
          clasePacienteDefault={String(visita?.ClasePaciente || 'I').trim() || 'I'}
        />
      ) : null}
      {numeroVisita && hab ? (
        <ModalCambiarCama
          isOpen={cambiarCamaOpen}
          onClose={() => setCambiarCamaOpen(false)}
          onSuccess={() => {
            setCambiarCamaOpen(false);
            void load();
          }}
          numeroVisita={numeroVisita}
          bedId={hab}
          bedSector={sector}
          sectorInfo={
            sector
              ? {
                  id: sector,
                  valor: sector,
                  descripcion: sectorDesc || sector,
                }
              : null
          }
          header={{
            nombre: String(visita?.ApellidoYNombre || '').trim() || undefined,
            documento: visita?.NumeroDocumento != null ? String(visita.NumeroDocumento) : undefined,
            sector: sector || undefined,
            numeroCama: hab || undefined,
          }}
        />
      ) : null}
    </>
  );

  if (embedded) {
    return (
      <>
        {body}
        {overlays}
      </>
    );
  }

  return (
    <>
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.dialog} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
          <div className={styles.header}>
            <h2 className={styles.title}>
              {focusSection === 'ubicacion'
                ? 'Ubicación'
                : focusSection === 'movimientos'
                  ? 'Movimientos'
                  : focusSection === 'ubicacion_movimientos'
                    ? 'Ubicación y movimientos'
                    : focusSection === 'egreso'
                      ? 'Egreso'
                      : 'Ubicación · Movimientos · Egreso'}
            </h2>
            <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">
              ×
            </button>
          </div>
          {body}
        </div>
      </div>
      {overlays}
    </>
  );
}
