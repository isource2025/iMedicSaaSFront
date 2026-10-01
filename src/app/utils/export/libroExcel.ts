/**
 * Exportación a Excel común a todas las vistas de estadísticas.
 *
 * Cada vista arma un `LibroExcel` con los datos que tiene en pantalla para el
 * período posicionado; este módulo se ocupa de dibujarlo: hoja "Resumen" con
 * período y filtros, hojas de datos con formatos numéricos, anchos de columna y
 * autofiltro, nombre de archivo con el período.
 *
 * `xlsx` se importa recién al exportar: pesa bastante y no hace falta para
 * renderizar ninguna pantalla.
 */

export type TipoColumna = 'texto' | 'entero' | 'decimal' | 'moneda' | 'porcentaje' | 'fecha';

export type ValorCelda = string | number | null | undefined;

export interface ColumnaExcel<T> {
  etiqueta: string;
  valor: (fila: T) => ValorCelda;
  /**
   * Por defecto 'texto'. 'fecha' espera 'yyyy-mm-dd' (o ISO); si no se puede leer queda como texto.
   * Puede ser una función de la fila para tablas de indicadores que mezclan importes, cantidades y porcentajes.
   */
  tipo?: TipoColumna | ((fila: T) => TipoColumna);
}

export interface HojaExcel<T = unknown> {
  nombre: string;
  columnas: ColumnaExcel<T>[];
  filas: T[];
  /** Aclaración que se escribe arriba de la tabla (p. ej. cómo se calcula algo). */
  nota?: string;
}

export interface LibroExcel {
  /** Título que encabeza la hoja "Resumen". */
  titulo: string;
  /** Prefijo del archivo, sin extensión ni período. */
  archivo: string;
  /** Período de los datos exportados, 'yyyy-mm-dd'. */
  periodo: { inicio: string; fin: string };
  /** Pares etiqueta/valor que se muestran en "Resumen" (filtros, parámetros, avisos). */
  detalles?: [string, ValorCelda][];
  /** Notas al pie de "Resumen" (letra chica: limitaciones de los datos). */
  notas?: string[];
  hojas: HojaExcel<any>[];
}

// ── Formatos ────────────────────────────────────────────────────────────────

const FORMATOS: Record<TipoColumna, string | undefined> = {
  texto: undefined,
  entero: '#,##0',
  decimal: '#,##0.00',
  moneda: '"$" #,##0.00',
  // Los porcentajes del sistema viajan como 12.5 (no 0.125): se muestra con el signo literal.
  porcentaje: '0.0"%"',
  fecha: 'dd/mm/yyyy',
};

const RE_FECHA = /^(\d{4})-(\d{2})-(\d{2})/;

/** 'yyyy-mm-dd' → número de serie de Excel (sin pasar por zonas horarias). */
export function fechaASerieExcel(texto: string): number | null {
  const m = RE_FECHA.exec(texto);
  if (!m) return null;
  const ms = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(ms)) return null;
  return Math.round((ms - Date.UTC(1899, 11, 30)) / 86_400_000);
}

export const fechaLegible = (iso: string): string => {
  const m = RE_FECHA.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
};

/** Excel no admite estos caracteres en el nombre de hoja ni más de 31 de largo. */
function nombreHojaValido(nombre: string, usados: Set<string>): string {
  const base = nombre.replace(/[\\/?*[\]:]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 31) || 'Hoja';
  let candidato = base;
  for (let i = 2; usados.has(candidato.toLowerCase()); i++) {
    const sufijo = ` (${i})`;
    candidato = `${base.slice(0, 31 - sufijo.length)}${sufijo}`;
  }
  usados.add(candidato.toLowerCase());
  return candidato;
}

function anchoPara(textos: string[]): number {
  const max = textos.reduce((acc, t) => Math.max(acc, t.length), 0);
  return Math.min(60, Math.max(10, max + 2));
}

/** Nombre de archivo seguro: sin tildes ni caracteres que Windows rechaza. */
export function nombreArchivo(prefijo: string, periodo: { inicio: string; fin: string }): string {
  const limpio = prefijo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return `${limpio || 'estadisticas'}_${periodo.inicio}_a_${periodo.fin}.xlsx`;
}

// ── Construcción del libro ──────────────────────────────────────────────────

export async function descargarLibroExcel(libro: LibroExcel): Promise<string> {
  const XLSX = await import('xlsx');
  const libroXlsx = XLSX.utils.book_new();
  const usados = new Set<string>();

  // Hoja "Resumen"
  const resumen: ValorCelda[][] = [
    [libro.titulo],
    [],
    ['Período', `${fechaLegible(libro.periodo.inicio)} al ${fechaLegible(libro.periodo.fin)}`],
    ['Generado', new Date().toLocaleString('es-AR')],
    ...(libro.detalles ?? []).map(([k, v]) => [k, v ?? '—'] as ValorCelda[]),
    [],
    ['Hojas'],
    ...libro.hojas.map((h) => [h.nombre, `${h.filas.length} ${h.filas.length === 1 ? 'fila' : 'filas'}`] as ValorCelda[]),
  ];
  if (libro.notas?.length) {
    resumen.push([], ['Notas']);
    libro.notas.forEach((n) => resumen.push([n]));
  }
  const hojaResumen = XLSX.utils.aoa_to_sheet(resumen);
  hojaResumen['!cols'] = [
    { wch: anchoPara(resumen.map((r) => String(r[0] ?? '')).filter((t) => t.length < 40)) },
    { wch: 60 },
  ];
  XLSX.utils.book_append_sheet(libroXlsx, hojaResumen, nombreHojaValido('Resumen', usados));

  // Hojas de datos
  for (const hoja of libro.hojas) {
    const encabezado = hoja.columnas.map((c) => c.etiqueta);
    const offset = hoja.nota ? 2 : 0;
    const tipoDe = (col: ColumnaExcel<any>, fila: unknown): TipoColumna =>
      typeof col.tipo === 'function' ? col.tipo(fila) : (col.tipo ?? 'texto');

    const cuerpo: ValorCelda[][] = hoja.filas.map((fila) =>
      hoja.columnas.map((c) => {
        const v = c.valor(fila);
        if (v == null || v === '') return null;
        if (tipoDe(c, fila) === 'fecha' && typeof v === 'string') return fechaASerieExcel(v) ?? v;
        return v;
      }),
    );

    const aoa: ValorCelda[][] = [...(hoja.nota ? [[hoja.nota], []] : []), encabezado, ...cuerpo];
    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Formato numérico por celda (las vacías no existen en la hoja).
    hoja.filas.forEach((fila, r) => {
      hoja.columnas.forEach((col, c) => {
        const z = FORMATOS[tipoDe(col, fila)];
        if (!z) return;
        const celda = ws[XLSX.utils.encode_cell({ r: offset + 1 + r, c })];
        if (celda && celda.t === 'n') celda.z = z;
      });
    });

    ws['!cols'] = hoja.columnas.map((col, i) => ({
      wch: anchoPara([
        col.etiqueta,
        // Con muestras alcanza para dimensionar: no hace falta recorrer 50.000 filas.
        ...cuerpo.slice(0, 500).map((fila) => (fila[i] == null ? '' : String(fila[i]))),
      ]),
    }));

    if (hoja.filas.length > 0) {
      ws['!autofilter'] = {
        ref: XLSX.utils.encode_range({
          s: { r: offset, c: 0 },
          e: { r: offset + hoja.filas.length, c: hoja.columnas.length - 1 },
        }),
      };
    }

    XLSX.utils.book_append_sheet(libroXlsx, ws, nombreHojaValido(hoja.nombre, usados));
  }

  const archivo = nombreArchivo(libro.archivo, libro.periodo);
  XLSX.writeFile(libroXlsx, archivo);
  return archivo;
}
