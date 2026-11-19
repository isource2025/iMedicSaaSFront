/**
 * Agrupa campos planos de imHCI (examen físico, signos, etc.) en secciones legibles.
 * Compartido entre el PDF de HC de ingreso y el modal de búsqueda de admisiones (sin depender de jsPDF).
 */

export interface HCIIngresoDisplayRecord {
  NumeroVisita?: number;
  FechaFormateada?: string;
  HoraFormateada?: string;
  ProfesionalNombre?: string;
  IdProfecional?: number;
  SectorDescripcion?: string;
  IdSector?: string;
  MotivoConsulta?: string;
  EnfermedadActual?: string;
  [key: string]: unknown;
}

export interface HCIPhysicalExamSection {
  titulo: string;
  campos: Array<{ label: string; valor: string }>;
}

const SECCIONES_CONFIG: Record<string, string> = {
  PF: 'PIEL Y FANERAS',
  TCS: 'TEJIDO CELULAR SUBCUTÁNEO',
  SL: 'SISTEMA LINFÁTICO',
  SOAM: 'SISTEMA OSTEOARTICULOMUSCULAR',
  C: 'CABEZA',
  CU: 'CUELLO',
  M: 'MAMAS',
  AR: 'APARATO RESPIRATORIO',
  AC: 'APARATO CARDIOVASCULAR',
  ACV: 'APARATO CARDIOVASCULAR',
  A: 'ABDOMEN',
  AUG: 'APARATO UROGENITAL',
  AIG: 'APARATO DIGESTIVO INFERIOR',
  SN: 'SISTEMA NERVIOSO',
  EC: 'ELECTROCARDIOGRAMA',
  RDT: 'RADIOGRAFÍA DE TÓRAX',
  PD: 'PLAN DIAGNÓSTICO',
  PT: 'PLAN TERAPÉUTICO',
  AD: 'ANTECEDENTES',
  EN: 'ENFERMEDAD',
  EG: 'EXAMEN GINECOLÓGICO',
  DIA: 'DIAGNÓSTICO',
  CTRL: 'CONTROL FRECUENTE (ASOCIADO A LA HC)',
};

export const HCI_CAMPOS_TEXTO_LIBRE: Record<string, string> = {
  ModMedica: 'MODIFICACIÓN MÉDICA',
  Semiologia: 'SEMIOLOGÍA',
  IMPRESIONDIAGNOSTICA: 'IMPRESIÓN DIAGNÓSTICA',
  COMENTARIODEINGRESO: 'COMENTARIO DE INGRESO',
  EXAMENCOMPLEMENTARIO: 'EXÁMENES COMPLEMENTARIOS',
};

const SV_VENOSO_HEADS = new Set(['VARICES', 'FLEBITIS', 'TROMBOSIS', 'CIRCULACIONCOLATERAL']);

/**
 * imHCI usa el prefijo EO_ para dos exámenes distintos (oftalmológico y obstétrico).
 * Las columnas que no figuran en ninguna lista (EO_TONO, que existe en ambos, o
 * columnas propias de una empresa) van con el examen que tenga datos en la HC.
 */
const EO_OFTALMO_HEADS = new Set([
  'FONDODEOJO',
  'MEDIOSBIREFRINGENTES',
  'MEDIOSBIREFRIGENTES',
  'CRUCES',
  'RELACION',
  'HEMORRAGIAEXUDADOS',
  'REFRACCION',
  'BIOMOSCROPIA',
  'BIOMICROSCOPIA',
  'TONOMETRIA',
  'PRACTICAQUIRURGICA',
]);

const EO_OBSTETRICO_HEADS = new Set([
  'AU',
  'LCF',
  'MFA',
  'DU',
  'LEOPOLD',
  'TACTOVAGINAL',
  'BISHOP',
  'MEMBRANASOVULARES',
  'MANIOBRADETAMIER',
  'PLANO',
  'PELVIMETRIA',
  'HIDRORREA',
  'GINECORRAGIA',
  'LOQUIOS',
  'RETRACCION',
  'MAMAS',
  'LACTANCIA',
  'PERINE',
  'ESPECULOSCOPIA',
  'TBM',
  'DIAGNOSTICO',
]);

const EXAMEN_OFTALMOLOGICO = 'EXAMEN OFTALMOLÓGICO';
const EXAMEN_OBSTETRICO = 'EXAMEN OBSTÉTRICO';

function headAfterPrefix(key: string, prefixLen: number): string {
  const rest = key.slice(prefixLen + 1);
  return rest.split('_')[0] || rest;
}

/** Prefijo de sección de la columna (las columnas de imHCI no siempre vienen en mayúsculas). */
function prefijoDe(fieldKey: string): { pref: string; head: string } | null {
  const match = fieldKey.match(/^([A-Za-z]+)_/);
  if (!match) return null;
  const pref = match[1].toUpperCase();
  return { pref, head: headAfterPrefix(fieldKey, pref.length).toUpperCase() };
}

function obtenerTituloSeccion(fieldKey: string, eoAmbiguo: string): string | null {
  if (/^CTRL_/i.test(fieldKey)) {
    return SECCIONES_CONFIG.CTRL;
  }

  const p = prefijoDe(fieldKey);
  if (!p) {
    return null;
  }
  const { pref, head } = p;

  if (pref === 'SV') {
    if (SV_VENOSO_HEADS.has(head)) {
      return 'SISTEMA VENOSO';
    }
    return 'SIGNOS VITALES';
  }

  if (pref === 'EO') {
    if (EO_OFTALMO_HEADS.has(head)) return EXAMEN_OFTALMOLOGICO;
    if (EO_OBSTETRICO_HEADS.has(head)) return EXAMEN_OBSTETRICO;
    return eoAmbiguo;
  }

  if (pref === 'MI') {
    return 'MAMAS — INSPECCIÓN';
  }
  if (pref === 'MP') {
    return 'MAMAS — PALPACIÓN';
  }

  return SECCIONES_CONFIG[pref] || null;
}

/** Palabras conocidas para partir claves ALLCAPS (SV_PESOACTUAL → Peso actual). */
const HCI_LABEL_WORDS = [
  'HEMIDIAFRAGMAS',
  'COSTOFRENICOS',
  'CONCLUSIONES',
  'LINFANGITIS',
  'ADENOMEGALIAS',
  'NUTRICIONAL',
  'PULMONARES',
  'CIRCULACION',
  'COLATERAL',
  'IMPRESION',
  'GENERAL',
  'HABITUAL',
  'ACTUAL',
  'ESTADO',
  'CAMPOS',
  'SILUETA',
  'CARDIO',
  'SENOS',
  'PESO',
];

/** Las columnas de imHCI no llevan tildes: se restauran para mostrar. */
const ACENTOS: Record<string, string> = {
  auscultacion: 'auscultación',
  inspeccion: 'inspección',
  palpacion: 'palpación',
  percusion: 'percusión',
  decubito: 'decúbito',
  impresion: 'impresión',
  circulacion: 'circulación',
  costofrenicos: 'costofrénicos',
  diagnostico: 'diagnóstico',
  torax: 'tórax',
  linfatico: 'linfático',
  organos: 'órganos',
  musculos: 'músculos',
  region: 'región',
};

function titleWords(s: string): string {
  return s
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => ACENTOS[w] || w)
    .map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ');
}

function splitAllCapsBlob(blob: string): string {
  const upper = blob.toUpperCase();
  const words = [...HCI_LABEL_WORDS].sort((a, b) => b.length - a.length);
  let rest = upper;
  const parts: string[] = [];
  while (rest) {
    const hit = words.find((w) => rest.startsWith(w));
    if (hit) {
      parts.push(hit);
      rest = rest.slice(hit.length);
      continue;
    }
    parts.push(rest);
    break;
  }
  return parts.join(' ');
}

function formatearNombreCampo(key: string): string {
  const sinPrefijo = key.replace(/^[A-Za-z]+_/, '');
  if (!sinPrefijo) return key;
  if (sinPrefijo.includes('_')) {
    return titleWords(sinPrefijo.replace(/_/g, ' '));
  }
  if (/[a-z]/.test(sinPrefijo) && /[A-Z]/.test(sinPrefijo)) {
    return titleWords(sinPrefijo.replace(/([A-Z])/g, ' $1'));
  }
  return titleWords(splitAllCapsBlob(sinPrefijo));
}

const IGNORE_KEYS = new Set([
  'IdHCIngreso',
  'NumeroVisita',
  'IdSector',
	'IdProfecional',
	'IdPersonal',
	'Matricula',
	'Fecha',
  'FechaFormateada',
  'HoraFormateada',
  'ProfesionalNombre',
  'SectorDescripcion',
  'MotivoConsulta',
  'EnfermedadActual',
  // El back lo devuelve también como SN_PARESCRANEANOS.
  'SN _PARESCRANEANOS',
  ...Object.keys(HCI_CAMPOS_TEXTO_LIBRE),
]);

/**
 * Texto a mostrar de una columna, o '' si no tiene dato. Clarion guarda los vacíos
 * como 0, false o espacios; una columna repetida en el SELECT llega como array.
 */
function valorVisible(valor: unknown): string {
  if (valor === undefined || valor === null || valor === false || valor === 0) return '';
  if (valor === true) return 'Sí';
  if (Array.isArray(valor)) {
    return Array.from(new Set(valor.map(valorVisible).filter(Boolean))).join(' / ');
  }
  if (typeof valor === 'object') return '';
  return String(valor).trim();
}

/** Sección de las columnas EO_ que no son propias de un solo examen. */
function seccionEoAmbigua(record: HCIIngresoDisplayRecord): string {
  let obstetrico = false;
  for (const [key, valor] of Object.entries(record)) {
    const p = prefijoDe(key);
    if (p?.pref !== 'EO' || !valorVisible(valor)) continue;
    if (EO_OFTALMO_HEADS.has(p.head)) return EXAMEN_OFTALMOLOGICO;
    if (EO_OBSTETRICO_HEADS.has(p.head)) obstetrico = true;
  }
  return obstetrico ? EXAMEN_OBSTETRICO : EXAMEN_OFTALMOLOGICO;
}

function agruparPorSecciones(record: HCIIngresoDisplayRecord): HCIPhysicalExamSection[] {
  const seccionesMap: Record<string, Array<{ label: string; valor: string }>> = {};
  const eoAmbiguo = seccionEoAmbigua(record);

  Object.keys(record).forEach((key) => {
    if (IGNORE_KEYS.has(key)) {
      return;
    }

    const valor = valorVisible(record[key]);
    if (!valor) {
      return;
    }

    const nombreSeccion = obtenerTituloSeccion(key, eoAmbiguo) || (key.includes('_') ? 'OTROS DATOS DE LA HC' : null);

    if (!nombreSeccion) {
      return;
    }

    if (!seccionesMap[nombreSeccion]) {
      seccionesMap[nombreSeccion] = [];
    }

    seccionesMap[nombreSeccion].push({
      label: formatearNombreCampo(key),
      valor,
    });
  });

  return Object.keys(seccionesMap).map((titulo) => ({
    titulo,
    campos: seccionesMap[titulo],
  }));
}

export function buildHCIPhysicalExamSections(record: Record<string, unknown>): HCIPhysicalExamSection[] {
  return agruparPorSecciones(record as HCIIngresoDisplayRecord);
}
