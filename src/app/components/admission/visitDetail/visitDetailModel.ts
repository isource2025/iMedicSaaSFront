import type { VisitDetailPayload, VisitDetailTabId } from '../AdmissionVisitDetailModal';

export type Row = Record<string, unknown>;
export type VisitSectionId = Exclude<VisitDetailTabId, 'resumen'>;
export type VisitSectionGroup = 'general' | 'medica' | 'enfermeria' | 'documentacion';

export type Profesional = { nombre: string; matricula: string; rol?: string };

// ---------------------------------------------------------------------------
// Formato
// ---------------------------------------------------------------------------

export function str(v: unknown): string {
  if (v == null) return '';
  return String(v).trim();
}

export function fmtFecha(v: unknown): string {
  const s = str(v);
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmy) return `${dmy[1].padStart(2, '0')}/${dmy[2].padStart(2, '0')}/${dmy[3]}`;
  return s;
}

export function fmtHora(v: unknown): string {
  const m = str(v).match(/(\d{1,2}):(\d{2})/);
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : '';
}

/** (fecha, hora) o fecha con hora embebida → "08/10/2026 10:30". */
export function fmtFechaHora(fecha: unknown, hora?: unknown): string {
  const f = str(fecha);
  if (!f) return fmtHora(hora);
  const h = fmtHora(hora) || (/[T ]\d{1,2}:\d{2}/.test(f) ? fmtHora(f.slice(10)) : '');
  return [fmtFecha(f), h].filter(Boolean).join(' ');
}

/** Clave ordenable "YYYY-MM-DD HH:MM" a partir de fecha ISO o dd/mm/yyyy. */
export function sortKey(fecha: unknown, hora?: unknown): string {
  const f = str(fecha);
  let ymd = '';
  const iso = f.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const dmy = f.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (iso) ymd = `${iso[1]}-${iso[2]}-${iso[3]}`;
  else if (dmy) ymd = `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  const h = fmtHora(hora) || (/[T ]\d{1,2}:\d{2}/.test(f) ? fmtHora(f.slice(10)) : '');
  return `${ymd || '0000-00-00'} ${h || '00:00'}`;
}

export function matriculaTxt(m: unknown): string {
  const n = Number(m);
  return Number.isFinite(n) && n > 0 && n !== 999999 ? `Mat. ${n}` : '';
}

export function valorControl(v: unknown, decimales?: number): string {
  const n = Number(v);
  if (v == null || v === '' || !Number.isFinite(n) || n === 0) return '';
  return decimales != null ? n.toFixed(decimales) : String(n);
}

export function rtfToPlain(raw: unknown): string {
  const s = str(raw);
  if (!s.includes('\\rtf')) return s;
  return s
    .replace(/\\par[d]?/gi, '\n')
    .replace(/\\'[0-9a-fA-F]{2}/g, (m) => String.fromCharCode(parseInt(m.slice(2), 16)))
    .replace(/\\[a-z]+-?\d* ?/gi, '')
    .replace(/[{}]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function joinNombre(...parts: unknown[]): string {
  return parts.map(str).filter(Boolean).join(' ');
}

function prof(nombre: unknown, matricula: unknown, rol?: string): Profesional | null {
  const n = str(nombre);
  if (!n || /^\d+$/.test(n)) return null;
  return { nombre: n, matricula: matriculaTxt(matricula), rol };
}

// ---------------------------------------------------------------------------
// Profesional responsable por tipo de registro (mismo criterio que el PDF)
// ---------------------------------------------------------------------------

export const responsable = {
  hci: (r: Row) => prof(r.ProfesionalNombre, r.Matricula),
  indicacion: (r: Row) => prof(r.fullName, r.matricula),
  evolucion: (r: Row) => prof(r.ProfesionalNombreCompleto, r.Matricula),
  epicrisis: (r: Row) => prof(r.ProfesionalNombreCompleto ?? r.profesionalNombreCompleto, r.Profecional),
  estudioSolicitante: (r: Row) =>
    prof(r.MedicoSolicitanteNombre ?? r.medicoSolicitanteNombre, r.MatriculaSolicitante ?? r.matriculaSolicitante, 'Solicitó'),
  estudioRealizador: (r: Row) =>
    prof(r.RealizadorNombre ?? r.realizadorNombre, r.MatriculaRealizador ?? r.matriculaRealizador, 'Realizó'),
  interSolicitante: (r: Row) => prof(r.MedicoSolicitanteNombre, r.MedicoSolicitante, 'Solicitó'),
  interRespuesta: (r: Row) =>
    str(r.Respuesta) ? prof(r.RealizadorNombre, r.MatriculaRealizador, 'Respondió') : null,
  protocolo: (r: Row) => prof(r.operadorNombre, r.operadorMatricula),
  control: (r: Row) => prof(joinNombre(r.ProfesionalApellido, r.ProfesionalNombres), r.Matricula),
  medicacion: (r: Row) =>
    prof(str(r.ProfesionalFullName) || joinNombre(r.ProfesionalApellido, r.ProfesionalNombres), r.Matricula),
  dieta: (r: Row) => prof(r.ProfesionalFullName || r.OperadorFullName, r.Matricula),
  insumo: (r: Row) => prof(r.fullName, null),
};

// ---------------------------------------------------------------------------
// Indicaciones
// ---------------------------------------------------------------------------

export function tipoIndicacion(r: Row): string {
  const t = str(r.tipo).toUpperCase();
  const prompt = str(r.promptCodigo).toUpperCase();
  if (prompt.includes('MEDIC') || t === 'M') return 'Medicamento';
  if (prompt.includes('DIET') || t === 'D') return 'Dieta';
  if (prompt) return prompt.charAt(0) + prompt.slice(1).toLowerCase();
  return 'Otra';
}

export type EstadoIndicacion = 'Vigente' | 'Suspendida' | 'Única vez';

export function estadoIndicacion(r: Row): EstadoIndicacion {
  if (r.suspendida) return 'Suspendida';
  if (r.unicaVez) return 'Única vez';
  return 'Vigente';
}

export function tituloIndicacion(r: Row): string {
  return str(r.descripcion) || str(r.medicamento) || `Indicación ${str(r.nroIndicacion)}`;
}

// ---------------------------------------------------------------------------
// Secciones
// ---------------------------------------------------------------------------

export type ChipFilter = { label: string; value: (r: Row) => string };

export type SectionDef = {
  id: VisitSectionId;
  label: string;
  group: VisitSectionGroup;
  rows: (d: VisitDetailPayload) => Row[];
  /** Orden cronológico; sin esto la sección no ofrece orden. */
  sortKey?: (r: Row) => string;
  chipFilter?: ChipFilter;
  searchable?: boolean;
};

const arr = (v: unknown): Row[] => (Array.isArray(v) ? (v as Row[]) : []);

export const GROUP_LABELS: Record<VisitSectionGroup, string> = {
  general: 'Internación',
  medica: 'Gestión médica',
  enfermeria: 'Enfermería',
  documentacion: 'Documentación',
};

/** Orden de los grupos en la navegación. */
export const GROUP_ORDER: VisitSectionGroup[] = ['medica', 'enfermeria', 'general', 'documentacion'];

export function visitaEgresada(d: VisitDetailPayload): boolean {
  const a = d.admision;
  return Boolean(a && (a.Egresada ?? str(a.FechaEgreso)));
}

export const SECTIONS: SectionDef[] = [
  {
    id: 'hcIngreso',
    label: 'HC de ingreso',
    group: 'medica',
    rows: (d) => arr(d.historialClinico),
    sortKey: (r) => sortKey(r.FechaFormateada || r.Fecha, r.HoraFormateada),
    searchable: true,
  },
  {
    id: 'indicaciones',
    label: 'Indicaciones',
    group: 'medica',
    rows: (d) => arr(d.indicaciones),
    sortKey: (r) => `${sortKey(r.vigenteDesde, r.horaCarga)} ${str(r.nroIndicacion).padStart(8, '0')}`,
    chipFilter: { label: 'Estado', value: estadoIndicacion },
    searchable: true,
  },
  {
    id: 'evoluciones',
    label: 'Evoluciones médicas',
    group: 'medica',
    rows: (d) => arr(d.evolucionesMedicas),
    sortKey: (r) => sortKey(r.FechaEv, r.HoraEv),
    chipFilter: {
      label: 'Servicio',
      value: (r) => str(r.EspecialidadDescripcion) || str(r.SectorDescripcion) || 'Sin servicio',
    },
    searchable: true,
  },
  {
    id: 'interconsultas',
    label: 'Interconsultas',
    group: 'medica',
    rows: (d) => arr(d.interconsultas),
    sortKey: (r) => sortKey(r.FechaSolicitud, r.HoraSolicitud),
    chipFilter: { label: 'Estado', value: (r) => (str(r.Respuesta) ? 'Respondida' : 'Pendiente') },
    searchable: true,
  },
  {
    id: 'estudios',
    label: 'Estudios solicitados',
    group: 'medica',
    rows: (d) => arr(d.estudios),
    sortKey: (r) => sortKey(r.FechaPedido ?? r.fechaPedido),
    chipFilter: {
      label: 'Resultado',
      value: (r) => (rtfToPlain(r.ResultadoEstudio ?? r.resultadoEstudio) ? 'Con resultado' : 'Sin resultado'),
    },
    searchable: true,
  },
  {
    id: 'laboratorios',
    label: 'Laboratorio',
    group: 'medica',
    rows: (d) => arr(d.practicas?.laboratorios),
    sortKey: (r) => sortKey(r.FechaExamen, r.HoraExamen),
    searchable: true,
  },
  {
    id: 'protocolos',
    label: 'Protocolos',
    group: 'medica',
    rows: (d) => arr(d.protocolos),
    sortKey: (r) => sortKey(r.fecha ?? r.fechaHoraInicio),
    searchable: true,
  },
  {
    id: 'practicas',
    label: 'Prácticas',
    group: 'medica',
    rows: (d) => arr(d.practicasPaciente),
    sortKey: (r) => sortKey(r.FechaPractica, r.HoraPracticaInicio),
    searchable: true,
  },
  {
    id: 'epicrisis',
    label: 'Epicrisis',
    group: 'medica',
    rows: (d) => arr(d.epicrisis),
    sortKey: (r) => sortKey(r.Fecha ?? r.fecha, r.Hora ?? r.hora),
    searchable: true,
  },
  {
    id: 'controles',
    label: 'Controles / signos vitales',
    group: 'enfermeria',
    rows: (d) => arr(d.controles),
    sortKey: (r) => sortKey(r.FechaControl, r.HoraControl),
    searchable: true,
  },
  {
    id: 'medicamentos',
    label: 'Medicación suministrada',
    group: 'enfermeria',
    rows: (d) => arr(d.medicamentos),
    sortKey: (r) => sortKey(r.FechaControl, r.HoraControl),
    searchable: true,
  },
  {
    id: 'evolucionEnfermeria',
    label: 'Evolución de enfermería',
    group: 'enfermeria',
    rows: (d) => arr(d.evolucionesEnfermeria),
    sortKey: (r) => sortKey(r.FechaControl, r.HoraControl),
    searchable: true,
  },
  {
    id: 'balanceHidrico',
    label: 'Balance hídrico',
    group: 'enfermeria',
    rows: (d) => arr(d.balanceHidrico),
    sortKey: (r) => sortKey(r.Fecha, r.Hora),
    searchable: true,
  },
  {
    id: 'dietas',
    label: 'Dietas',
    group: 'enfermeria',
    rows: (d) => arr(d.dietas),
    sortKey: (r) => sortKey(r.FechaDieta || r.FechaCarga, r.HoraDieta || r.HoraCarga),
    chipFilter: { label: 'Estado', value: (r) => (str(r.FechaDieta) ? 'Suministrada' : 'Indicada') },
    searchable: true,
  },
  {
    id: 'insumos',
    label: 'Insumos',
    group: 'enfermeria',
    rows: (d) => arr(d.insumos),
    sortKey: (r) => sortKey(r.vigenteDesde, r.horaCarga),
    searchable: true,
  },
  {
    id: 'movimientos',
    label: 'Movimientos de cama',
    group: 'general',
    rows: (d) => arr(d.movimientos),
  },
  {
    id: 'egreso',
    label: 'Egreso',
    group: 'general',
    rows: (d) => (visitaEgresada(d) ? [d.admision as Row] : []),
  },
  {
    id: 'adjuntos',
    label: 'Adjuntos',
    group: 'documentacion',
    rows: (d) => arr(d.practicas?.adjuntos),
  },
];

export const SECTION_BY_ID = Object.fromEntries(SECTIONS.map((s) => [s.id, s])) as Record<VisitSectionId, SectionDef>;

export function sectionLabel(id: VisitSectionId): string {
  return SECTION_BY_ID[id]?.label ?? id;
}

/** Texto plano de un registro (un nivel de anidamiento) para la búsqueda. */
export function rowSearchText(r: Row): string {
  const parts: string[] = [];
  const push = (v: unknown, depth: number) => {
    if (v == null) return;
    if (typeof v === 'string' || typeof v === 'number') parts.push(String(v));
    else if (depth < 2 && Array.isArray(v)) v.forEach((x) => push(x, depth + 1));
    else if (depth < 2 && typeof v === 'object') Object.values(v as Row).forEach((x) => push(x, depth + 1));
  };
  Object.values(r).forEach((v) => push(v, 0));
  return normalizar(parts.join(' '));
}

export function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// ---------------------------------------------------------------------------
// Línea de tiempo unificada
// ---------------------------------------------------------------------------

export type TimelineEvent = {
  key: string;
  section: VisitSectionId;
  ts: string;
  cuando: string;
  titulo: string;
  detalle: string;
  profesional: Profesional | null;
  alerta?: boolean;
};

function recorte(s: string, n = 160): string {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

export function buildTimeline(d: VisitDetailPayload): TimelineEvent[] {
  const out: TimelineEvent[] = [];
  const add = (section: VisitSectionId, rows: Row[], map: (r: Row, i: number) => Omit<TimelineEvent, 'key' | 'section'>) => {
    rows.forEach((r, i) => out.push({ key: `${section}-${i}`, section, ...map(r, i) }));
  };

  add('movimientos', arr(d.movimientos), (m) => ({
    ts: sortKey(m.FechaAdmisionISO, m.HoraAdmisionISO),
    cuando: fmtFechaHora(m.FechaAdmisionISO, m.HoraAdmisionISO),
    titulo: `Cama ${str(m.NombreCama || m.ValorHabitacionCama) || '—'}`,
    detalle: [str(m.NombreSector || m.ValorSector), str(m.NombreServicio)].filter(Boolean).join(' · '),
    profesional: prof(m.OperadorNombre, null),
  }));
  add('hcIngreso', arr(d.historialClinico), (r) => ({
    ts: sortKey(r.FechaFormateada || r.Fecha, r.HoraFormateada),
    cuando: fmtFechaHora(r.FechaFormateada || r.Fecha, r.HoraFormateada),
    titulo: 'Historia clínica de ingreso',
    detalle: recorte(str(r.MotivoConsulta) || str(r.EnfermedadActual)),
    profesional: responsable.hci(r),
  }));
  add('indicaciones', arr(d.indicaciones), (r) => ({
    ts: sortKey(r.vigenteDesde, r.horaCarga),
    cuando: fmtFechaHora(r.vigenteDesde, r.horaCarga),
    titulo: `Indicación: ${tituloIndicacion(r)}`,
    detalle: [tipoIndicacion(r), str(r.frecuencia), estadoIndicacion(r) === 'Suspendida' ? 'Suspendida' : '']
      .filter(Boolean)
      .join(' · '),
    profesional: responsable.indicacion(r),
    alerta: estadoIndicacion(r) === 'Suspendida',
  }));
  add('evoluciones', arr(d.evolucionesMedicas), (r) => ({
    ts: sortKey(r.FechaEv, r.HoraEv),
    cuando: fmtFechaHora(r.FechaEv, r.HoraEv),
    titulo: `Evolución · ${str(r.EspecialidadDescripcion) || str(r.SectorDescripcion) || 'médica'}`,
    detalle: recorte(rtfToPlain(r.Evolucion)),
    profesional: responsable.evolucion(r),
  }));
  add('interconsultas', arr(d.interconsultas), (r) => ({
    ts: sortKey(r.FechaSolicitud, r.HoraSolicitud),
    cuando: fmtFechaHora(r.FechaSolicitud, r.HoraSolicitud),
    titulo: `Interconsulta a ${str(r.ServicioDescripcion || r.SectorReceptorNombre || r.Especialidad) || '—'}`,
    detalle: recorte(str(r.Motivo)),
    profesional: responsable.interSolicitante(r),
  }));
  add('estudios', arr(d.estudios), (r) => ({
    ts: sortKey(r.FechaPedido ?? r.fechaPedido),
    cuando: fmtFechaHora(r.FechaPedido ?? r.fechaPedido),
    titulo: `Estudio: ${str(r.PracticaDescripcion ?? r.practicaDescripcion) || 'pedido'}`,
    detalle: rtfToPlain(r.ResultadoEstudio ?? r.resultadoEstudio) ? 'Con resultado' : 'Sin resultado',
    profesional: responsable.estudioSolicitante(r),
  }));
  add('laboratorios', arr(d.practicas?.laboratorios), (r) => ({
    ts: sortKey(r.FechaExamen, r.HoraExamen),
    cuando: fmtFechaHora(r.FechaExamen, r.HoraExamen),
    titulo: `Laboratorio: ${str(r.TipoEstudio) || 'análisis'}`,
    detalle: [str(r.Protocolo) && `Protocolo ${str(r.Protocolo)}`, str(r.Estado)].filter(Boolean).join(' · '),
    profesional: null,
  }));
  add('protocolos', arr(d.protocolos), (r) => ({
    ts: sortKey(r.fecha ?? r.fechaHoraInicio),
    cuando: fmtFechaHora(r.fecha ?? r.fechaHoraInicio),
    titulo: `Protocolo: ${str(r.tipoDescripcion || r.tipoProtocolo) || '—'}`,
    detalle: recorte(str(r.diagnosticoPos) || str(r.diagnosticoPre)),
    profesional: responsable.protocolo(r),
  }));
  add('epicrisis', arr(d.epicrisis), (r) => ({
    ts: sortKey(r.Fecha ?? r.fecha, r.Hora ?? r.hora),
    cuando: fmtFechaHora(r.Fecha ?? r.fecha, r.Hora ?? r.hora),
    titulo: 'Epicrisis',
    detalle: recorte(str(r.Diagnostico ?? r.diagnostico) || rtfToPlain(r.Epicrisis ?? r.epicrisis)),
    profesional: responsable.epicrisis(r),
  }));
  add('controles', arr(d.controles), (r) => ({
    ts: sortKey(r.FechaControl, r.HoraControl),
    cuando: fmtFechaHora(r.FechaControl, r.HoraControl),
    titulo: 'Control de signos vitales',
    detalle: resumenVitales(r),
    profesional: responsable.control(r),
  }));
  add('medicamentos', arr(d.medicamentos), (r) => ({
    ts: sortKey(r.FechaControl, r.HoraControl),
    cuando: fmtFechaHora(r.FechaControl, r.HoraControl),
    titulo: `Medicación: ${str(r.NombreMedicamento || r.DescripcionMedicamento) || '—'}`,
    detalle: [str(r.Cantidad), str(r.TipoUnidad)].filter(Boolean).join(' '),
    profesional: responsable.medicacion(r),
  }));
  add('evolucionEnfermeria', arr(d.evolucionesEnfermeria), (r) => ({
    ts: sortKey(r.FechaControl, r.HoraControl),
    cuando: fmtFechaHora(r.FechaControl, r.HoraControl),
    titulo: 'Evolución de enfermería',
    detalle: recorte(rtfToPlain(r.Observaciones)),
    profesional: responsable.control(r),
  }));
  add('balanceHidrico', arr(d.balanceHidrico), (r) => ({
    ts: sortKey(r.Fecha, r.Hora),
    cuando: fmtFechaHora(r.Fecha, r.Hora),
    titulo: 'Balance hídrico',
    detalle: `Ingresos ${str(r.TotalIngresos) || 0} ml · Egresos ${str(r.TotalEgresos) || 0} ml`,
    profesional: responsable.control(r),
  }));
  add('dietas', arr(d.dietas), (r) => ({
    ts: sortKey(r.FechaDieta || r.FechaCarga, r.HoraDieta || r.HoraCarga),
    cuando: fmtFechaHora(r.FechaDieta || r.FechaCarga, r.HoraDieta || r.HoraCarga),
    titulo: `Dieta: ${str(r.DescripcionDieta) || '—'}`,
    detalle: str(r.FechaDieta) ? 'Suministrada' : 'Indicada',
    profesional: responsable.dieta(r),
  }));

  if (visitaEgresada(d)) {
    const a = d.admision as Row;
    add('egreso', [a], () => ({
      ts: sortKey(a.FechaEgreso, a.HoraEgreso),
      cuando: fmtFechaHora(a.FechaEgreso, a.HoraEgreso),
      titulo: `Egreso${str(a.DisposicionEgresoDescripcion) ? `: ${str(a.DisposicionEgresoDescripcion)}` : ''}`,
      detalle: [str(a.DiagnosticoEgreso), str(a.DiagnosticoEgresoDescripcion)].filter(Boolean).join(' — '),
      profesional: prof(a.OperadorEgresoNombre, null),
    }));
  }

  return out.sort((a, b) => b.ts.localeCompare(a.ts));
}

export function resumenVitales(c: Row): string {
  const ta = valorControl(c.Maximo) ? `TA ${valorControl(c.Maximo)}/${valorControl(c.Minimo) || '—'}` : '';
  return [
    ta,
    valorControl(c.Pulso) && `FC ${valorControl(c.Pulso)}`,
    valorControl(c.FrecuenciaRespiratoria) && `FR ${valorControl(c.FrecuenciaRespiratoria)}`,
    (valorControl(c.Axilar, 1) || valorControl(c.Rectal, 1)) && `T° ${valorControl(c.Axilar, 1) || valorControl(c.Rectal, 1)}`,
    valorControl(c.Saturometria) && `Sat ${valorControl(c.Saturometria)}%`,
    str(c.Hgt) && `HGT ${str(c.Hgt)}`,
  ]
    .filter(Boolean)
    .join(' · ');
}
