export type CatalogoSqlId =
  | 'lugar-episodio'
  | 'centro-asistencial'
  | 'categorias-medico'
  | 'clases-medico'
  | 'especialidad-medica'
  | 'funciones-medicas'
  | 'letras-practicas'
  | 'tipo-medicamento'
  | 'estado-cama'
  | 'sectores'
  | 'servicios'
  | 'tipo-dieta'
  | 'tipo-indicacion'
  | 'tipo-control'
  | 'tipo-alergeno'
  | 'severidad-alergia'
  | 'estado-clinico-alergia'
  | 'agente-causante'
  | 'dispositivo-alerta'
  | 'tipo-unidad-medida';

export interface CatalogoSqlMeta {
  id: CatalogoSqlId;
  title: string;
  match: string[];
}

/** Misma lista que el back: se usa para abrir el modal desde la tarjeta de opcgrd. */
export const CATALOGOS_SQL: CatalogoSqlMeta[] = [
  { id: 'lugar-episodio', title: 'Lugares de episodio', match: ['lugar', 'episodio'] },
  { id: 'centro-asistencial', title: 'Centros asistenciales', match: ['centro'] },
  { id: 'categorias-medico', title: 'Categoría del médico', match: ['categoria'] },
  { id: 'clases-medico', title: 'Clases de médicos', match: ['clases de medico'] },
  { id: 'especialidad-medica', title: 'Especialidad médica', match: ['especialidad'] },
  { id: 'funciones-medicas', title: 'Funciones médicas', match: ['funcion'] },
  { id: 'letras-practicas', title: 'Letras de prácticas médicas', match: ['letra'] },
  { id: 'tipo-medicamento', title: 'Tipo de medicamentos', match: ['medicamento'] },
  { id: 'estado-cama', title: 'Estado de camas', match: ['estado de cama'] },
  { id: 'sectores', title: 'Sectores', match: ['sector'] },
  { id: 'servicios', title: 'Servicios', match: ['servicio'] },
  { id: 'tipo-dieta', title: 'Tipo de dieta', match: ['dieta'] },
  { id: 'tipo-indicacion', title: 'Tipo de indicación', match: ['indicacion'] },
  { id: 'tipo-control', title: 'Tipo de controles', match: ['tipo de control'] },
  { id: 'tipo-alergeno', title: 'Tipo de alérgeno', match: ['alergeno'] },
  { id: 'severidad-alergia', title: 'Severidad de alergia', match: ['severidad'] },
  { id: 'estado-clinico-alergia', title: 'Estado clínico de alergia', match: ['estado clinico'] },
  { id: 'agente-causante', title: 'Agentes causantes', match: ['agente'] },
  { id: 'dispositivo-alerta', title: 'Dispositivo identificatorio', match: ['dispositivo'] },
  { id: 'tipo-unidad-medida', title: 'Tipo unidad medida', match: ['unidad'] },
];

export function normalizarEtiqueta(texto: string): string {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function catalogoSqlPorEtiqueta(texto: string): CatalogoSqlMeta | null {
  const n = normalizarEtiqueta(texto);
  return CATALOGOS_SQL.find((c) => c.match.every((m) => n.includes(m))) ?? null;
}

export function etiquetaVisibleOpcgrd(descripcion: string): string {
  const n = normalizarEtiqueta(descripcion);
  if (n.includes('requisito') && n.includes('cliente')) return 'Requisitos';
  return descripcion;
}
