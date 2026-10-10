'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  BedDouble,
  ClipboardPlus,
  HeartPulse,
  LayoutDashboard,
  Paperclip,
  Search,
  Stethoscope,
  X,
  type LucideIcon,
} from 'lucide-react';
import type { VisitDetailPayload, VisitDetailTabId } from './AdmissionVisitDetailModal';
import VisitSectionBody from './visitDetail/VisitSectionBody';
import VisitSummary from './visitDetail/VisitSummary';
import {
  fmtFechaHora,
  GROUP_LABELS,
  GROUP_ORDER,
  normalizar,
  rowSearchText,
  SECTION_BY_ID,
  SECTIONS,
  str,
  type Row,
  type VisitSectionGroup,
  type VisitSectionId,
} from './visitDetail/visitDetailModel';
import s from './visitDetail/VisitDetail.module.css';

export type VisitDetailSectionId = VisitDetailTabId;

export interface AdmissionVisitDetailContentProps {
  numeroVisita: number | null;
  loading: boolean;
  data: VisitDetailPayload | null;
  error?: string;
  initialSection?: VisitDetailSectionId;
  onBack?: () => void;
  backLabel?: string;
  exportButton?: ReactNode;
  /** Muestra solo el cuerpo de una sección (panel inline, sin navegación). */
  singleSectionOnly?: VisitSectionId;
  hideToolbar?: boolean;
  hideResumen?: boolean;
  /** Permite subir adjuntos aunque la visita esté cerrada / histórica. */
  allowAdjuntosUpload?: boolean;
  onReloadData?: () => void;
}

type Orden = 'desc' | 'asc';

const GROUP_ICONS: Record<VisitSectionGroup, LucideIcon> = {
  general: BedDouble,
  medica: Stethoscope,
  enfermeria: HeartPulse,
  documentacion: Paperclip,
};

function useSectionRows(data: VisitDetailPayload | null, id: VisitSectionId | null) {
  const [query, setQuery] = useState('');
  const [chip, setChip] = useState('todos');
  const [orden, setOrden] = useState<Orden>('desc');

  useEffect(() => {
    setQuery('');
    setChip('todos');
  }, [id]);

  const def = id ? SECTION_BY_ID[id] : null;
  const all = useMemo(() => (data && def ? def.rows(data) : []), [data, def]);

  const chipOptions = useMemo(() => {
    if (!def?.chipFilter) return [];
    const counts = new Map<string, number>();
    all.forEach((r) => {
      const v = def.chipFilter!.value(r);
      counts.set(v, (counts.get(v) || 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0], 'es'));
  }, [all, def]);

  const rows = useMemo(() => {
    if (!def) return [];
    let list: Row[] = all;
    if (def.chipFilter && chip !== 'todos') list = list.filter((r) => def.chipFilter!.value(r) === chip);
    const q = normalizar(query.trim());
    if (q) {
      const terms = q.split(/\s+/);
      list = list.filter((r) => {
        const t = rowSearchText(r);
        return terms.every((term) => t.includes(term));
      });
    }
    if (def.sortKey) {
      const key = def.sortKey;
      list = [...list].sort((a, b) => (orden === 'desc' ? key(b).localeCompare(key(a)) : key(a).localeCompare(key(b))));
    }
    return list;
  }, [all, def, chip, query, orden]);

  return { def, all, rows, query, setQuery, chip, setChip, chipOptions, orden, setOrden };
}

function VisitHeader({
  data,
  numeroVisita,
  actions,
}: {
  data: VisitDetailPayload;
  numeroVisita: number | null;
  actions: ReactNode;
}) {
  const a = (data.admision || {}) as Row;
  const egresada = Boolean(a.Egresada ?? str(a.FechaEgreso));
  const dias = a.DiasEstadia != null && str(a.DiasEstadia) !== '' ? Number(a.DiasEstadia) : null;
  const ubicacion = [str(a.SectorDescripcion) || str(a.Sector), str(a.Habitacion) && `Cama ${str(a.Habitacion)}`]
    .filter(Boolean)
    .join(' · ');
  const dxIngreso = str(a.DiagnosticoDescripcion) || str(a.Diagnostico);
  const dxEgreso = str(a.DiagnosticoEgresoDescripcion) || str(a.DiagnosticoEgreso);
  const cobertura = [str(a.CoberturaOS), str(a.NumeroSSN) && `Afil. ${str(a.NumeroSSN)}`].filter(Boolean).join(' · ');

  const facts: Array<[string, string]> = [
    ['Ingreso', fmtFechaHora(a.FechaAdmision, a.HoraAdmision) || '—'],
    ['Egreso', egresada ? fmtFechaHora(a.FechaEgreso, a.HoraEgreso) : 'En curso'],
    ['Estadía', dias != null && Number.isFinite(dias) ? `${dias} ${dias === 1 ? 'día' : 'días'}` : '—'],
    ['Ubicación', ubicacion || '—'],
    ['Médico', str(a.DoctorAsistiendoNombre) || str(a.DoctorCabeceraNombre) || '—'],
    ['Cobertura', cobertura || '—'],
  ];

  return (
    <header className={s.header}>
      <div className={s.headerTop}>
        <div className={s.identity}>
          <div className={s.identityLine}>
            <h3 className={s.patientName}>{str(a.ApellidoYNombre) || 'Paciente'}</h3>
            <span className={`${s.statusPill} ${egresada ? s.statusEgresado : s.statusActivo}`}>
              {egresada ? 'Egresado' : 'En curso'}
            </span>
            {str(a.ClasePacienteDescripcion) ? (
              <span className={s.statusPill}>{str(a.ClasePacienteDescripcion)}</span>
            ) : null}
          </div>
          <p className={s.identityMeta}>
            <span>Visita <strong>#{str(a.NumeroVisita) || str(numeroVisita)}</strong></span>
            <span>DNI <strong>{str(a.NumeroDocumento) || '—'}</strong></span>
            <span>HC <strong>{str(a.NumeroHC) || '—'}</strong></span>
            {str(a.SexoDescripcion) ? <span>{str(a.SexoDescripcion)}</span> : null}
          </p>
        </div>
        <div className={s.headerActions}>{actions}</div>
      </div>
      <dl className={s.facts}>
        {facts.map(([k, v]) => (
          <div key={k} className={s.fact}>
            <dt>{k}</dt>
            <dd title={v}>{v}</dd>
          </div>
        ))}
      </dl>
      {dxIngreso || dxEgreso ? (
        <div className={s.dxRow}>
          {dxIngreso ? (
            <div className={s.dxBox}>
              <span className={s.dxLabel}>Diagnóstico{dxEgreso ? ' de ingreso' : ''}</span>
              <span className={s.dxText}>
                {str(a.Diagnostico) && str(a.DiagnosticoDescripcion) ? (
                  <span className={s.dxCode}>{str(a.Diagnostico)}</span>
                ) : null}
                {dxIngreso}
              </span>
            </div>
          ) : null}
          {dxEgreso ? (
            <div className={`${s.dxBox} ${s.dxBoxEgreso}`}>
              <span className={s.dxLabel}>Diagnóstico de egreso</span>
              <span className={s.dxText}>
                {str(a.DiagnosticoEgreso) && str(a.DiagnosticoEgresoDescripcion) ? (
                  <span className={s.dxCode}>{str(a.DiagnosticoEgreso)}</span>
                ) : null}
                {dxEgreso}
              </span>
            </div>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}

function SectionToolbar({
  ctl,
}: {
  ctl: ReturnType<typeof useSectionRows>;
}) {
  const { def, all, query, setQuery, chip, setChip, chipOptions, orden, setOrden } = ctl;
  if (!def || all.length === 0) return null;
  const showSearch = def.searchable && all.length > 1;
  const showChips = def.chipFilter && chipOptions.length > 1;
  const showOrden = Boolean(def.sortKey) && all.length > 1;
  if (!showSearch && !showChips && !showOrden) return null;
  return (
    <div className={s.toolbar}>
      {showSearch ? (
        <label className={s.search}>
          <Search size={15} aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Buscar en ${def.label.toLowerCase()}…`}
            aria-label={`Buscar en ${def.label}`}
          />
          {query ? (
            <button type="button" className={s.searchClear} onClick={() => setQuery('')} aria-label="Limpiar búsqueda">
              <X size={14} />
            </button>
          ) : null}
        </label>
      ) : null}
      {showChips ? (
        <div className={s.chips} role="group" aria-label={def.chipFilter!.label}>
          <button
            type="button"
            className={`${s.chip} ${chip === 'todos' ? s.chipActive : ''}`}
            onClick={() => setChip('todos')}
          >
            Todos <span className={s.chipCount}>{all.length}</span>
          </button>
          {chipOptions.map(([v, n]) => (
            <button
              key={v}
              type="button"
              className={`${s.chip} ${chip === v ? s.chipActive : ''}`}
              onClick={() => setChip(v)}
            >
              {v} <span className={s.chipCount}>{n}</span>
            </button>
          ))}
        </div>
      ) : null}
      {showOrden ? (
        <button
          type="button"
          className={s.orderBtn}
          onClick={() => setOrden(orden === 'desc' ? 'asc' : 'desc')}
          title="Cambiar orden"
        >
          {orden === 'desc' ? <ArrowDownWideNarrow size={15} /> : <ArrowUpNarrowWide size={15} />}
          {orden === 'desc' ? 'Más recientes primero' : 'Más antiguos primero'}
        </button>
      ) : null}
    </div>
  );
}

export default function AdmissionVisitDetailContent({
  numeroVisita,
  loading,
  data,
  error,
  initialSection,
  onBack,
  backLabel = '← Atrás',
  exportButton,
  singleSectionOnly,
  hideToolbar = false,
  hideResumen = false,
  allowAdjuntosUpload = true,
  onReloadData,
}: AdmissionVisitDetailContentProps) {
  const fallback: VisitDetailTabId = hideResumen ? 'indicaciones' : 'resumen';
  const [active, setActive] = useState<VisitDetailTabId>(initialSection ?? fallback);
  const mainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActive(initialSection && !(hideResumen && initialSection === 'resumen') ? initialSection : fallback);
  }, [numeroVisita, initialSection, hideResumen, fallback]);

  const sectionId: VisitSectionId | null = singleSectionOnly ?? (active === 'resumen' ? null : active);
  const ctl = useSectionRows(data, sectionId);

  const open = (id: VisitDetailTabId) => {
    setActive(id);
    mainRef.current?.scrollTo({ top: 0 });
  };

  const counts = useMemo(() => {
    const m = new Map<VisitSectionId, number>();
    if (data) SECTIONS.forEach((sec) => m.set(sec.id, sec.rows(data).length));
    return m;
  }, [data]);

  const filteredOut = ctl.all.length > 0 && ctl.rows.length === 0;

  const sectionBody = sectionId ? (
    <VisitSectionBody
      id={sectionId}
      rows={ctl.rows}
      filtered={filteredOut}
      numeroVisita={numeroVisita}
      allowAdjuntosUpload={allowAdjuntosUpload}
      onReloadData={onReloadData}
    />
  ) : null;

  if (loading) {
    return (
      <div className={s.stateBox} role="status" aria-live="polite">
        <span className={s.spinner} aria-hidden />
        <span>Cargando la historia de la visita…</span>
      </div>
    );
  }

  if (!data) {
    return <p className={s.empty}>{error?.trim() || 'No se pudo cargar el detalle. Probá de nuevo.'}</p>;
  }

  if (singleSectionOnly) {
    return (
      <div className={s.inlinePanel}>
        <div className={s.inlineHead}>
          <h4>{SECTION_BY_ID[singleSectionOnly].label}</h4>
          <span className={s.countPill}>{ctl.all.length}</span>
        </div>
        <SectionToolbar ctl={ctl} />
        {sectionBody}
      </div>
    );
  }

  const actions = (
    <>
      {!hideToolbar && onBack ? (
        <button type="button" className={s.ghostBtn} onClick={onBack}>
          {backLabel}
        </button>
      ) : null}
      {!hideToolbar ? exportButton : null}
      {numeroVisita ? (
        <Link
          href={`/dashboard/visita/${numeroVisita}`}
          className={s.primaryBtn}
          title="Cargar nuevos registros clínicos en esta visita (también post-egreso)"
        >
          <ClipboardPlus size={16} aria-hidden />
          Continuar carga clínica
        </Link>
      ) : null}
    </>
  );

  const groups = GROUP_ORDER;

  return (
    <div className={s.root}>
      <VisitHeader data={data} numeroVisita={numeroVisita} actions={actions} />

      <div className={s.layout}>
        <nav className={s.nav} aria-label="Secciones de la visita">
          {!hideResumen ? (
            <button
              type="button"
              className={`${s.navItem} ${s.navItemTop} ${active === 'resumen' ? s.navItemActive : ''}`}
              onClick={() => open('resumen')}
              aria-current={active === 'resumen' ? 'page' : undefined}
            >
              <span className={s.navGroupLabel}>
                <LayoutDashboard size={15} aria-hidden />
                Resumen
              </span>
            </button>
          ) : null}
          {groups.map((g) => {
            const Icon = GROUP_ICONS[g];
            const secs = SECTIONS.filter((sec) => sec.group === g);
            const total = secs.reduce((acc, sec) => acc + (counts.get(sec.id) ?? 0), 0);
            return (
            <div key={g} className={s.navGroup}>
              <span className={s.navGroupTitle}>
                <span className={s.navGroupLabel}>
                  <Icon size={15} aria-hidden />
                  {GROUP_LABELS[g]}
                </span>
                <span className={s.navGroupTotal}>{total}</span>
              </span>
              {secs.map((sec) => {
                const n = counts.get(sec.id) ?? 0;
                return (
                  <button
                    key={sec.id}
                    type="button"
                    className={`${s.navItem} ${active === sec.id ? s.navItemActive : ''} ${n === 0 ? s.navItemEmpty : ''}`}
                    onClick={() => open(sec.id)}
                    aria-current={active === sec.id ? 'page' : undefined}
                  >
                    <span>{sec.label}</span>
                    <span className={s.navCount}>{n}</span>
                  </button>
                );
              })}
            </div>
            );
          })}
        </nav>

        <div className={s.main} ref={mainRef}>
          {active === 'resumen' || !sectionId ? (
            <VisitSummary data={data} numeroVisita={numeroVisita} onOpenSection={open} />
          ) : (
            <section aria-labelledby="visit-section-title">
              <div className={s.sectionHead}>
                <div>
                  <span className={s.sectionGroup}>{GROUP_LABELS[SECTION_BY_ID[sectionId].group]}</span>
                  <h3 id="visit-section-title" className={s.sectionTitle}>
                    {SECTION_BY_ID[sectionId].label}
                  </h3>
                </div>
                <span className={s.countPill}>
                  {ctl.rows.length !== ctl.all.length ? `${ctl.rows.length} de ${ctl.all.length}` : ctl.all.length}
                </span>
              </div>
              <SectionToolbar ctl={ctl} />
              {sectionBody}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
