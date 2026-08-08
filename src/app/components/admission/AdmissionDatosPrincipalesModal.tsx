'use client';

import { useCallback, useEffect, useState } from 'react';
import ModalBusquedaDiagnosticos from '@/app/components/modals/ModalBusquedaDiagnosticos';
import Loader from '@/app/components/Loader/Loader';
import AdmissionUbicacionMovimientosModal from './AdmissionUbicacionMovimientosModal';
import {
  admissionSearchService,
  type AdmissionCatalogOption,
  type AdmissionDatosPrincipalesPayload,
  type AdmissionDatosPrincipalesUpdate,
} from '@/app/services/admissionSearchService';
import coberturaService, { type CoberturaOption } from '@/app/services/coberturaService';
import { getPersonalList } from '@/app/services/personalService';
import type { DiagnosticoCie10 } from '@/app/types/diagnosticos';
import type { Personal } from '@/app/types/personal';
import styles from './AdmissionDatosPrincipalesModal.module.css';

type NavSection = 'datos' | 'ubicacion_movimientos' | 'egreso';

const NAV_ITEMS: { id: NavSection; label: string }[] = [
  { id: 'datos', label: 'Datos principales' },
  { id: 'ubicacion_movimientos', label: 'Ubicación y movimientos' },
  { id: 'egreso', label: 'Egreso' },
];

/** Compat: callers antiguos podían abrir en ubicacion/movimientos por separado */
function normalizeSection(section: string | undefined): NavSection {
  if (section === 'ubicacion' || section === 'movimientos' || section === 'ubicacion_movimientos') {
    return 'ubicacion_movimientos';
  }
  if (section === 'egreso') return 'egreso';
  return 'datos';
}

type Props = {
  isOpen: boolean;
  numeroVisita: number | null;
  onClose: () => void;
  onSaved?: () => void;
  /** @deprecated La navegación ahora es interna (sidebar) */
  onOpenUbicacion?: (numeroVisita: number) => void;
  /** También acepta 'ubicacion' | 'movimientos' (legacy → ubicacion_movimientos) */
  initialSection?: NavSection | 'ubicacion' | 'movimientos';
};

type FormState = {
  fechaAdmision: string;
  horaAdmision: string;
  clasePaciente: string;
  numeroInternacion: string;
  tipoAdmision: string;
  idLugarEpisodio: string;
  origenAdmision: string;
  diagnostico: string;
  diagnosticoDescripcion: string;
  estadoAmbulatorio: string;
  doctorAdmisor: string;
  doctorAdmisorNombre: string;
  cliente: string;
  coberturaOS: string;
  contrato: string;
  doctorAsistiendo: string;
  doctorAsistiendoNombre: string;
  tipoPaciente: string;
  doctorCabecera: string;
  doctorCabeceraNombre: string;
};

const emptyForm: FormState = {
  fechaAdmision: '',
  horaAdmision: '',
  clasePaciente: '',
  numeroInternacion: '',
  tipoAdmision: '',
  idLugarEpisodio: '',
  origenAdmision: '',
  diagnostico: '',
  diagnosticoDescripcion: '',
  estadoAmbulatorio: '',
  doctorAdmisor: '',
  doctorAdmisorNombre: '',
  cliente: '',
  coberturaOS: '',
  contrato: '',
  doctorAsistiendo: '',
  doctorAsistiendoNombre: '',
  tipoPaciente: '',
  doctorCabecera: '',
  doctorCabeceraNombre: '',
};

function optVal(o: AdmissionCatalogOption): string {
  return String(o.Valor ?? '').trim();
}

function optLabel(o: AdmissionCatalogOption): string {
  const d = String(o.Descripcion ?? '').trim();
  const v = optVal(o);
  return d || v || '—';
}

export default function AdmissionDatosPrincipalesModal({
  isOpen,
  numeroVisita,
  onClose,
  onSaved,
  initialSection = 'datos',
}: Props) {
  const [section, setSection] = useState<NavSection>(() => normalizeSection(initialSection));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState<FormState>(emptyForm);
  const [fechaEgreso, setFechaEgreso] = useState('');
  const [horaEgreso, setHoraEgreso] = useState('');
  const [operadorEgresoLabel, setOperadorEgresoLabel] = useState('');
  const [patientLabel, setPatientLabel] = useState('');
  const [catalogos, setCatalogos] = useState<AdmissionDatosPrincipalesPayload['catalogos'] | null>(null);
  const [coberturas, setCoberturas] = useState<CoberturaOption[]>([]);
  const [diagModalOpen, setDiagModalOpen] = useState(false);

  const [profTarget, setProfTarget] = useState<'admisor' | 'asistiendo' | 'cabecera' | null>(null);
  const [profQuery, setProfQuery] = useState('');
  const [profResults, setProfResults] = useState<Personal[]>([]);
  const [profLoading, setProfLoading] = useState(false);

  const [osQuery, setOsQuery] = useState('');
  const [osOpen, setOsOpen] = useState(false);

  const load = useCallback(async () => {
    if (!numeroVisita) return;
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      const [payload, cobList] = await Promise.all([
        admissionSearchService.getDatosPrincipales(numeroVisita),
        coberturaService.getCoberturas().catch(() => [] as CoberturaOption[]),
      ]);
      const v = payload.visita;
      setCatalogos(payload.catalogos);
      setCoberturas(cobList);
      setPatientLabel(
        `Visita #${v.NumeroVisita} · ${String(v.ApellidoYNombre || '').trim()} · DNI ${v.NumeroDocumento || '—'}`,
      );
      setFechaEgreso(String(v.FechaEgreso || '').slice(0, 10));
      setHoraEgreso(String(v.HoraEgreso || '').slice(0, 5));
      const opCod =
        v.OperadorEgreso != null && Number(v.OperadorEgreso) > 0 ? String(v.OperadorEgreso) : '';
      const opNombre = String(v.OperadorEgresoNombre || '').trim();
      setOperadorEgresoLabel(
        opNombre && opCod ? `${opNombre} (${opCod})` : opNombre || (opCod ? `Operador ${opCod}` : ''),
      );
      setForm({
        fechaAdmision: String(v.FechaAdmision || '').slice(0, 10),
        horaAdmision: String(v.HoraAdmision || '').slice(0, 5),
        clasePaciente: String(v.ClasePaciente || '').trim(),
        numeroInternacion: String(v.NumeroInternacion || '').trim(),
        tipoAdmision: String(v.TipoAdmision || '').trim(),
        idLugarEpisodio: v.IdLugarEpisodio != null ? String(v.IdLugarEpisodio) : '',
        origenAdmision: v.OrigenAdmision != null && Number(v.OrigenAdmision) > 0 ? String(v.OrigenAdmision) : '',
        diagnostico: String(v.Diagnostico || '').trim(),
        diagnosticoDescripcion: String(v.DiagnosticoDescripcion || '').trim(),
        estadoAmbulatorio: String(v.EstadoAmbulatorio || '').trim(),
        doctorAdmisor: v.DoctorAdmisor != null && Number(v.DoctorAdmisor) > 0 ? String(v.DoctorAdmisor) : '',
        doctorAdmisorNombre: String(v.DoctorAdmisorNombre || '').trim(),
        cliente: v.Cliente != null && Number(v.Cliente) > 0 ? String(v.Cliente) : '',
        coberturaOS: String(v.CoberturaOS || '').trim(),
        contrato: v.Contrato != null ? String(v.Contrato) : '0',
        doctorAsistiendo:
          v.DoctorAsistiendo != null && Number(v.DoctorAsistiendo) > 0 ? String(v.DoctorAsistiendo) : '',
        doctorAsistiendoNombre: String(v.DoctorAsistiendoNombre || '').trim(),
        tipoPaciente: String(v.TipoPaciente || '').trim(),
        doctorCabecera: v.DoctorCabecera != null && Number(v.DoctorCabecera) > 0 ? String(v.DoctorCabecera) : '',
        doctorCabeceraNombre: String(v.DoctorCabeceraNombre || '').trim(),
      });
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      setError(err?.response?.data?.message || err?.message || 'Error al cargar datos principales');
    } finally {
      setLoading(false);
    }
  }, [numeroVisita]);

  useEffect(() => {
    if (!isOpen || !numeroVisita) return;
    setSection(normalizeSection(initialSection));
    void load();
  }, [isOpen, numeroVisita, load, initialSection]);

  useEffect(() => {
    if (!profTarget) return;
    const q = profQuery.trim();
    if (q.length < 2) {
      setProfResults([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        setProfLoading(true);
        const res = await getPersonalList(1, 20, q);
        if (!cancelled) setProfResults(res.data || []);
      } catch {
        if (!cancelled) setProfResults([]);
      } finally {
        if (!cancelled) setProfLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [profQuery, profTarget]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const pickProf = (p: Personal) => {
    if (!profTarget) return;
    const id = String(p.Valor);
    const name = String(p.ApellidoNombre || '').trim();
    if (profTarget === 'admisor') {
      setField('doctorAdmisor', id);
      setField('doctorAdmisorNombre', name);
    } else if (profTarget === 'asistiendo') {
      setField('doctorAsistiendo', id);
      setField('doctorAsistiendoNombre', name);
    } else {
      setField('doctorCabecera', id);
      setField('doctorCabeceraNombre', name);
    }
    setProfTarget(null);
    setProfQuery('');
    setProfResults([]);
  };

  const pickCobertura = (c: CoberturaOption) => {
    setField('cliente', c.value);
    setField('coberturaOS', c.label);
    setOsOpen(false);
    setOsQuery('');
    void admissionSearchService.getCatalogos(Number(c.value)).then((cats) => {
      setCatalogos((prev) => (prev ? { ...prev, convenios: cats.convenios } : cats));
    });
  };

  const onSelectDiagnostico = (d: DiagnosticoCie10) => {
    setField('diagnostico', String(d.CodigoOMS || '').trim());
    setField('diagnosticoDescripcion', String(d.descripcion || '').trim());
    setDiagModalOpen(false);
  };

  const onSave = async () => {
    if (!numeroVisita) return;
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      const body: AdmissionDatosPrincipalesUpdate = {
        fechaAdmision: form.fechaAdmision || undefined,
        horaAdmision: form.horaAdmision || undefined,
        clasePaciente: form.clasePaciente || undefined,
        numeroInternacion: form.numeroInternacion,
        tipoAdmision: form.tipoAdmision || undefined,
        idLugarEpisodio: form.idLugarEpisodio ? Number(form.idLugarEpisodio) : null,
        origenAdmision: form.origenAdmision ? Number(form.origenAdmision) : 0,
        diagnostico: form.diagnostico,
        estadoAmbulatorio: form.estadoAmbulatorio,
        doctorAdmisor: form.doctorAdmisor ? Number(form.doctorAdmisor) : 0,
        cliente: form.cliente ? Number(form.cliente) : 0,
        contrato: form.contrato ? Number(form.contrato) : 0,
        doctorAsistiendo: form.doctorAsistiendo ? Number(form.doctorAsistiendo) : 0,
        tipoPaciente: form.tipoPaciente || undefined,
        doctorCabecera: form.doctorCabecera ? Number(form.doctorCabecera) : null,
      };
      await admissionSearchService.updateDatosPrincipales(numeroVisita, body);
      setSuccess('Datos principales guardados');
      onSaved?.();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      setError(err?.response?.data?.message || err?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const goSection = (id: NavSection) => {
    setSection(id);
    if (id === 'datos' && numeroVisita) void load();
  };

  if (!isOpen) return null;

  const cobFiltered = coberturas.filter((c) => {
    const q = osQuery.trim().toLowerCase();
    if (!q) return true;
    return c.label.toLowerCase().includes(q) || c.value.toLowerCase().includes(q);
  });

  const sectionTitle =
    section === 'datos'
      ? 'Datos principales'
      : section === 'ubicacion_movimientos'
        ? 'Ubicación y movimientos'
        : 'Egreso';

  const sectionSubtitle =
    section === 'ubicacion_movimientos'
      ? 'Sector, habitación e historial de cambios de cama'
      : section === 'egreso'
        ? 'Registrar o asistir el egreso de la visita'
        : '';

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className={styles.header}>
          <div className={styles.headerText}>
            <h2 className={styles.title}>Gestión de visita</h2>
            <p className={styles.subtitle}>{patientLabel || `Visita #${numeroVisita ?? '—'}`}</p>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>

        <div className={styles.shell}>
          <aside className={styles.sidebar} aria-label="Secciones de la visita">
            <p className={styles.navLabel}>Menú</p>
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`${styles.navItem} ${section === item.id ? styles.navItemActive : ''}`}
                onClick={() => goSection(item.id)}
              >
                <span className={styles.navDot} aria-hidden />
                {item.label}
              </button>
            ))}
            <p className={styles.navHint}>Más opciones de admisión se agregarán en este menú.</p>
          </aside>

          <div className={styles.main}>
            <div className={styles.mainScroll}>
              {section === 'datos' ? (
                loading ? (
                  <div className={styles.loadingWrap}>
                    <Loader />
                  </div>
                ) : (
                  <div className={styles.panelCard}>
                    <div className={styles.panelHeader}>
                      <h3 className={styles.panelTitle}>{sectionTitle}</h3>
                      <p className={styles.panelSubtitle}>Datos de admisión y cobertura de la visita</p>
                    </div>
                    <div className={styles.panelBody}>
                      {error ? <div className={styles.error}>{error}</div> : null}
                      {success ? <div className={styles.success}>{success}</div> : null}

                      <div className={styles.formGrid}>
                        <div className={styles.field}>
                          <span className={styles.label}>Fecha y hora de admisión</span>
                          <div className={styles.fechaHora}>
                            <input
                              type="date"
                              className={styles.input}
                              value={form.fechaAdmision}
                              onChange={(e) => setField('fechaAdmision', e.target.value)}
                            />
                            <input
                              type="time"
                              className={styles.input}
                              value={form.horaAdmision}
                              onChange={(e) => setField('horaAdmision', e.target.value)}
                            />
                          </div>
                        </div>

                        <div className={styles.field}>
                          <span className={styles.label}>Fecha y hora de egreso</span>
                          <div className={styles.fechaHora}>
                            <input
                              type="date"
                              className={styles.input}
                              value={fechaEgreso}
                              readOnly
                              title="Se gestiona en la sección Egreso"
                            />
                            <input
                              type="time"
                              className={styles.input}
                              value={horaEgreso}
                              readOnly
                              title="Se gestiona en la sección Egreso"
                            />
                          </div>
                          {operadorEgresoLabel ? (
                            <span className={styles.fieldHint}>Operador: {operadorEgresoLabel}</span>
                          ) : null}
                        </div>

                        <div className={styles.field}>
                          <span className={styles.label}>Clase de paciente</span>
                          <select
                            className={styles.select}
                            value={form.clasePaciente}
                            onChange={(e) => setField('clasePaciente', e.target.value)}
                          >
                            <option value="">—</option>
                            {(catalogos?.clasesPaciente || []).map((o) => (
                              <option key={optVal(o)} value={optVal(o)}>
                                {optLabel(o)}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className={styles.field}>
                          <span className={styles.label}>Nº internación</span>
                          <input
                            className={styles.input}
                            value={form.numeroInternacion}
                            onChange={(e) => setField('numeroInternacion', e.target.value)}
                          />
                        </div>

                        <div className={styles.field}>
                          <span className={styles.label}>Tipo de admisión</span>
                          <select
                            className={styles.select}
                            value={form.tipoAdmision}
                            onChange={(e) => setField('tipoAdmision', e.target.value)}
                          >
                            <option value="">—</option>
                            {(catalogos?.tiposAdmision || []).map((o) => (
                              <option key={optVal(o)} value={optVal(o)}>
                                {optLabel(o)}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className={styles.field}>
                          <span className={styles.label}>Lugar del episodio</span>
                          <select
                            className={styles.select}
                            value={form.idLugarEpisodio}
                            onChange={(e) => setField('idLugarEpisodio', e.target.value)}
                          >
                            <option value="">—</option>
                            {(catalogos?.lugaresEpisodio || []).map((o) => (
                              <option key={optVal(o)} value={optVal(o)}>
                                {optLabel(o)}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className={styles.field}>
                          <span className={styles.label}>Derivado de</span>
                          <select
                            className={styles.select}
                            value={form.origenAdmision}
                            onChange={(e) => setField('origenAdmision', e.target.value)}
                          >
                            <option value="">—</option>
                            {(catalogos?.origenesAdmision || []).map((o) => (
                              <option key={optVal(o)} value={optVal(o)}>
                                {optLabel(o)}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className={styles.field}>
                          <span className={styles.label}>Estado ambulatorio</span>
                          <select
                            className={styles.select}
                            value={form.estadoAmbulatorio}
                            onChange={(e) => setField('estadoAmbulatorio', e.target.value)}
                          >
                            <option value="">—</option>
                            {(catalogos?.estadosAmbulatorios || []).map((o) => (
                              <option key={optVal(o)} value={optVal(o)}>
                                {optLabel(o)}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className={`${styles.field} ${styles.fieldFull}`}>
                          <span className={styles.label}>Diagnóstico</span>
                          <div className={styles.fieldRow}>
                            <input
                              className={styles.inputSm}
                              value={form.diagnostico}
                              onChange={(e) => setField('diagnostico', e.target.value)}
                            />
                            <button
                              type="button"
                              className={styles.lookupBtn}
                              onClick={() => setDiagModalOpen(true)}
                              title="Buscar diagnóstico"
                              aria-label="Buscar diagnóstico"
                            >
                              🔍
                            </button>
                            <input className={styles.inputGrow} value={form.diagnosticoDescripcion} readOnly />
                          </div>
                        </div>

                        <div className={`${styles.field} ${styles.fieldFull}`}>
                          <span className={styles.label}>Profesional que interna</span>
                          <div className={styles.lookupWrap}>
                            <input
                              className={styles.inputSm}
                              value={form.doctorAdmisor}
                              onChange={(e) => setField('doctorAdmisor', e.target.value)}
                            />
                            <button
                              type="button"
                              className={styles.lookupBtn}
                              onClick={() => {
                                setProfTarget('admisor');
                                setProfQuery(form.doctorAdmisorNombre || form.doctorAdmisor);
                              }}
                              title="Buscar profesional"
                            >
                              🔍
                            </button>
                            <input className={styles.inputGrow} value={form.doctorAdmisorNombre} readOnly />
                            {profTarget === 'admisor' ? (
                              <div className={styles.lookupPanel}>
                                <input
                                  className={styles.input}
                                  placeholder="Buscar profesional…"
                                  value={profQuery}
                                  onChange={(e) => setProfQuery(e.target.value)}
                                  autoFocus
                                />
                                {profLoading ? <div className={styles.lookupItem}>Buscando…</div> : null}
                                {profResults.map((p) => (
                                  <button
                                    key={p.Valor}
                                    type="button"
                                    className={styles.lookupItem}
                                    onClick={() => pickProf(p)}
                                  >
                                    {p.Valor} — {p.ApellidoNombre}
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </div>

                        <div className={`${styles.field} ${styles.fieldFull}`}>
                          <span className={styles.label}>Cobertura (OS)</span>
                          <div className={styles.lookupWrap}>
                            <input
                              className={styles.inputSm}
                              value={form.cliente}
                              onChange={(e) => setField('cliente', e.target.value)}
                            />
                            <button
                              type="button"
                              className={styles.lookupBtn}
                              onClick={() => setOsOpen((v) => !v)}
                              title="Buscar cobertura"
                            >
                              🔍
                            </button>
                            <input className={styles.inputGrow} value={form.coberturaOS} readOnly />
                            {osOpen ? (
                              <div className={styles.lookupPanel}>
                                <input
                                  className={styles.input}
                                  placeholder="Buscar cobertura…"
                                  value={osQuery}
                                  onChange={(e) => setOsQuery(e.target.value)}
                                  autoFocus
                                />
                                {cobFiltered.slice(0, 40).map((c) => (
                                  <button
                                    key={c.value}
                                    type="button"
                                    className={styles.lookupItem}
                                    onClick={() => pickCobertura(c)}
                                  >
                                    {c.value} — {c.label}
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </div>

                        <div className={styles.field}>
                          <span className={styles.label}>Convenio / Plan</span>
                          <select
                            className={styles.select}
                            value={form.contrato}
                            onChange={(e) => setField('contrato', e.target.value)}
                          >
                            <option value="0">0</option>
                            {(catalogos?.convenios || []).map((o) => (
                              <option key={optVal(o)} value={optVal(o)}>
                                {optVal(o)} — {optLabel(o)}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className={styles.field}>
                          <span className={styles.label}>Tipo de paciente</span>
                          <select
                            className={styles.select}
                            value={form.tipoPaciente}
                            onChange={(e) => setField('tipoPaciente', e.target.value)}
                          >
                            <option value="">—</option>
                            {(catalogos?.tiposPaciente || []).map((o) => (
                              <option key={optVal(o)} value={optVal(o)}>
                                {optLabel(o)}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className={`${styles.field} ${styles.fieldFull}`}>
                          <span className={styles.label}>Profesional que asiste</span>
                          <div className={styles.lookupWrap}>
                            <input
                              className={styles.inputSm}
                              value={form.doctorAsistiendo}
                              onChange={(e) => setField('doctorAsistiendo', e.target.value)}
                            />
                            <button
                              type="button"
                              className={styles.lookupBtn}
                              onClick={() => {
                                setProfTarget('asistiendo');
                                setProfQuery(form.doctorAsistiendoNombre || form.doctorAsistiendo);
                              }}
                              title="Buscar profesional"
                            >
                              🔍
                            </button>
                            <input className={styles.inputGrow} value={form.doctorAsistiendoNombre} readOnly />
                            {profTarget === 'asistiendo' ? (
                              <div className={styles.lookupPanel}>
                                <input
                                  className={styles.input}
                                  placeholder="Buscar profesional…"
                                  value={profQuery}
                                  onChange={(e) => setProfQuery(e.target.value)}
                                  autoFocus
                                />
                                {profLoading ? <div className={styles.lookupItem}>Buscando…</div> : null}
                                {profResults.map((p) => (
                                  <button
                                    key={p.Valor}
                                    type="button"
                                    className={styles.lookupItem}
                                    onClick={() => pickProf(p)}
                                  >
                                    {p.Valor} — {p.ApellidoNombre}
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </div>

                        <div className={`${styles.field} ${styles.fieldFull}`}>
                          <span className={styles.label}>Profesional cabecera</span>
                          <div className={styles.lookupWrap}>
                            <input
                              className={styles.inputSm}
                              value={form.doctorCabecera}
                              onChange={(e) => setField('doctorCabecera', e.target.value)}
                            />
                            <button
                              type="button"
                              className={styles.lookupBtn}
                              onClick={() => {
                                setProfTarget('cabecera');
                                setProfQuery(form.doctorCabeceraNombre || form.doctorCabecera);
                              }}
                              title="Buscar profesional"
                            >
                              🔍
                            </button>
                            <input className={styles.inputGrow} value={form.doctorCabeceraNombre} readOnly />
                            {profTarget === 'cabecera' ? (
                              <div className={styles.lookupPanel}>
                                <input
                                  className={styles.input}
                                  placeholder="Buscar profesional…"
                                  value={profQuery}
                                  onChange={(e) => setProfQuery(e.target.value)}
                                  autoFocus
                                />
                                {profLoading ? <div className={styles.lookupItem}>Buscando…</div> : null}
                                {profResults.map((p) => (
                                  <button
                                    key={p.Valor}
                                    type="button"
                                    className={styles.lookupItem}
                                    onClick={() => pickProf(p)}
                                  >
                                    {p.Valor} — {p.ApellidoNombre}
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              ) : (
                <div className={styles.panelCard}>
                  <div className={styles.panelHeader}>
                    <h3 className={styles.panelTitle}>{sectionTitle}</h3>
                    {sectionSubtitle ? <p className={styles.panelSubtitle}>{sectionSubtitle}</p> : null}
                  </div>
                  <div className={`${styles.panelBody} ${styles.embeddedHost}`}>
                    <AdmissionUbicacionMovimientosModal
                      isOpen={Boolean(numeroVisita)}
                      numeroVisita={numeroVisita}
                      onClose={onClose}
                      embedded
                      focusSection={section === 'egreso' ? 'egreso' : 'ubicacion_movimientos'}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.btnSecondary} onClick={onClose} disabled={saving}>
            Cerrar
          </button>
          {section === 'datos' ? (
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={() => void onSave()}
              disabled={saving || loading}
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          ) : null}
        </div>
      </div>

      <ModalBusquedaDiagnosticos
        isOpen={diagModalOpen}
        onClose={() => setDiagModalOpen(false)}
        onSelectDiagnostico={onSelectDiagnostico}
      />
    </div>
  );
}
