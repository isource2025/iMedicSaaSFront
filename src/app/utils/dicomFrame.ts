import dicomParser from 'dicom-parser';

// Solo little endian: los píxeles se leen con typed arrays nativos
const UNCOMPRESSED_TRANSFER_SYNTAXES = new Set([
  '1.2.840.10008.1.2',
  '1.2.840.10008.1.2.1',
]);

/** Corte DICOM decodificado, listo para renderizar con cualquier ventana. */
export interface DicomFrame {
  rows: number;
  columns: number;
  /** Escala de grises: valores crudos (antes de Rescale). RGB: bytes intercalados. */
  pixels: Int16Array | Uint16Array | Uint8Array;
  rgb: boolean;
  slope: number;
  intercept: number;
  invert: boolean;
  windowCenter: number;
  windowWidth: number;
  instanceNumber: number | null;
  sliceLocation: number | null;
}

function firstFloat(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number.parseFloat(value.split('\\')[0]?.trim() ?? '');
  return Number.isFinite(n) ? n : undefined;
}

function str(dataSet: dicomParser.DataSet, tag: string): string | undefined {
  try {
    return dataSet.string(tag) || undefined;
  } catch {
    return undefined;
  }
}

export function parseDicomFrame(arrayBuffer: ArrayBuffer): DicomFrame {
  const dataSet = dicomParser.parseDicom(new Uint8Array(arrayBuffer));

  const transferSyntax = str(dataSet, 'x00020010');
  if (transferSyntax && !UNCOMPRESSED_TRANSFER_SYNTAXES.has(transferSyntax)) {
    throw new Error('Imagen comprimida: no soportada por el visor web.');
  }

  const rows = dataSet.uint16('x00280010') ?? 0;
  const columns = dataSet.uint16('x00280011') ?? 0;
  if (!rows || !columns) throw new Error('El DICOM no tiene dimensiones de imagen.');

  const bitsAllocated = dataSet.uint16('x00280100') ?? 8;
  const pixelRepresentation = dataSet.uint16('x00280103') ?? 0;
  const samplesPerPixel = dataSet.uint16('x00280002') || 1;
  const photometric = (str(dataSet, 'x00280004') || 'MONOCHROME2').toUpperCase();

  const el = dataSet.elements.x7fe00010;
  if (!el) throw new Error('El DICOM no tiene datos de píxeles.');

  const count = rows * columns;
  const instanceNumber = firstFloat(str(dataSet, 'x00200013')) ?? null;
  const sliceLocation = firstFloat(str(dataSet, 'x00201041')) ?? null;

  if (samplesPerPixel === 3 && bitsAllocated === 8 && photometric === 'RGB') {
    const pixels = dataSet.byteArray.slice(el.dataOffset, el.dataOffset + count * 3);
    return {
      rows, columns, pixels, rgb: true, slope: 1, intercept: 0, invert: false,
      windowCenter: 128, windowWidth: 256, instanceNumber, sliceLocation,
    };
  }
  if (samplesPerPixel !== 1) throw new Error('Formato de imagen DICOM no soportado.');

  let pixels: Int16Array | Uint16Array | Uint8Array;
  if (bitsAllocated === 16) {
    // slice() copia a un buffer propio alineado y libera el archivo original
    const bytes = dataSet.byteArray.slice(el.dataOffset, el.dataOffset + count * 2);
    pixels = pixelRepresentation === 1 ? new Int16Array(bytes.buffer) : new Uint16Array(bytes.buffer);
  } else if (bitsAllocated === 8) {
    pixels = dataSet.byteArray.slice(el.dataOffset, el.dataOffset + count);
  } else {
    throw new Error(`Profundidad de ${bitsAllocated} bits no soportada.`);
  }

  const slope = firstFloat(str(dataSet, 'x00281053')) ?? 1;
  const intercept = firstFloat(str(dataSet, 'x00281052')) ?? 0;

  let windowCenter = firstFloat(str(dataSet, 'x00281050'));
  let windowWidth = firstFloat(str(dataSet, 'x00281051'));
  if (windowCenter == null || windowWidth == null || windowWidth <= 0) {
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < count; i += 1) {
      const v = pixels[i] * slope + intercept;
      if (v < min) min = v;
      if (v > max) max = v;
    }
    windowCenter = (min + max) / 2;
    windowWidth = Math.max(max - min, 1);
  }

  return {
    rows, columns, pixels, rgb: false, slope, intercept,
    invert: photometric === 'MONOCHROME1',
    windowCenter, windowWidth, instanceNumber, sliceLocation,
  };
}

/** Dibuja el corte aplicando ventana (centro/ancho en unidades reescaladas, p.ej. HU). */
export function renderDicomFrame(
  canvas: HTMLCanvasElement,
  frame: DicomFrame,
  windowCenter: number,
  windowWidth: number,
): void {
  if (canvas.width !== frame.columns) canvas.width = frame.columns;
  if (canvas.height !== frame.rows) canvas.height = frame.rows;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const image = ctx.createImageData(frame.columns, frame.rows);
  const out = image.data;
  const count = frame.rows * frame.columns;

  if (frame.rgb) {
    for (let i = 0, p = 0; i < count; i += 1, p += 4) {
      out[p] = frame.pixels[i * 3];
      out[p + 1] = frame.pixels[i * 3 + 1];
      out[p + 2] = frame.pixels[i * 3 + 2];
      out[p + 3] = 255;
    }
  } else {
    const width = Math.max(windowWidth, 1);
    const lower = windowCenter - width / 2;
    const scale = 255 / width;
    const { pixels, slope, intercept, invert } = frame;
    for (let i = 0, p = 0; i < count; i += 1, p += 4) {
      let g = ((pixels[i] * slope + intercept) - lower) * scale;
      g = g < 0 ? 0 : g > 255 ? 255 : g;
      if (invert) g = 255 - g;
      out[p] = g;
      out[p + 1] = g;
      out[p + 2] = g;
      out[p + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
}
