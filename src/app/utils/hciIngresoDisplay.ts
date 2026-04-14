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

const EO_OFTALMO_HEADS = new Set([
  'FONDODEOJO',
  'MEDIOSBIREFRINGENTES',
  'CRUCES',
  'RELACION',
  'HEMORRAGIAEXUDADOS',
]);

function headAfterPrefix(key: string, prefixLen: number): string {
  const rest = key.slice(prefixLen + 1);
  return rest.split('_')[0] || rest;
}

function obtenerTituloSeccion(fieldKey: string): string | null {
  if (fieldKey.startsWith('CTRL_')) {
    return SECCIONES_CONFIG.CTRL;
  }

  const match = fieldKey.match(/^([A-Z]+)_/);
  if (!match) {
    return null;
  }

  const pref = match[1];
  const head = headAfterPrefix(fieldKey, pref.length);

  if (pref === 'SV') {
    if (SV_VENOSO_HEADS.has(head)) {
      return 'SISTEMA VENOSO';
    }
    return 'SIGNOS VITALES';
  }

  if (pref === 'EO') {
    if (EO_OFTALMO_HEADS.has(head)) {
      return 'EXAMEN OFTALMOLÓGICO';
    }
    return 'EXAMEN OBSTÉTRICO';
  }

  if (pref === 'MI') {
    return 'MAMAS — INSPECCIÓN';
  }
  if (pref === 'MP') {
    return 'MAMAS — PALPACIÓN';
  }

  return SECCIONES_CONFIG[pref] || null;
}

function formatearNombreCampo(key: string): string {
  const sinPrefijo = key.replace(/^[A-Z]+_/, '');
  return sinPrefijo
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

const IGNORE_KEYS = new Set([
  'IdHCIngreso',
  'NumeroVisita',
  'IdSector',
  'IdProfecional',
  'Fecha',
  'FechaFormateada',
  'HoraFormateada',
  'ProfesionalNombre',
  'SectorDescripcion',
  'MotivoConsulta',
  'EnfermedadActual',
  ...Object.keys(HCI_CAMPOS_TEXTO_LIBRE),
]);

function agruparPorSecciones(record: HCIIngresoDisplayRecord): HCIPhysicalExamSection[] {
  const seccionesMap: Record<string, Array<{ label: string; valor: string }>> = {};

  Object.keys(record).forEach((key) => {
    const valor = record[key];

    if (IGNORE_KEYS.has(key)) {
      return;
    }

    if (valor === undefined || valor === null || valor === '') {
      return;
    }

    const nombreSeccion = obtenerTituloSeccion(key) || (key.includes('_') ? 'OTROS DATOS DE LA HC' : null);

    if (!nombreSeccion) {
      return;
    }

    if (!seccionesMap[nombreSeccion]) {
      seccionesMap[nombreSeccion] = [];
    }

    seccionesMap[nombreSeccion].push({
      label: formatearNombreCampo(key),
      valor: String(valor),
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
