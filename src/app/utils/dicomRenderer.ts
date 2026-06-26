import dicomParser from 'dicom-parser';

const UNCOMPRESSED_TRANSFER_SYNTAXES = new Set([
  '1.2.840.10008.1.2',
  '1.2.840.10008.1.2.1',
  '1.2.840.10008.1.2.2',
]);

function parseFirstFloat(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const first = value.split('\\')[0]?.trim();
  if (!first) return undefined;
  const n = Number.parseFloat(first);
  return Number.isFinite(n) ? n : undefined;
}

function getTransferSyntaxUid(dataSet: dicomParser.DataSet): string | null {
  try {
    return dataSet.string('x00020010') || null;
  } catch {
    return null;
  }
}

function readPixelValue(
  pixelData: Uint8Array,
  index: number,
  bitsAllocated: number,
  pixelRepresentation: number
): number {
  if (bitsAllocated === 8) return pixelData[index];

  const offset = index * 2;
  const raw = pixelData[offset] | (pixelData[offset + 1] << 8);
  if (pixelRepresentation === 1 && raw > 32767) return raw - 65536;
  return raw;
}

function applyWindowLevel(value: number, center: number, width: number): number {
  const safeWidth = width > 0 ? width : 1;
  const lower = center - safeWidth / 2;
  const upper = center + safeWidth / 2;
  if (value <= lower) return 0;
  if (value >= upper) return 255;
  return Math.round(((value - lower) / (upper - lower)) * 255);
}

function invertGray(value: number): number {
  return 255 - value;
}

export async function renderDicomToCanvas(arrayBuffer: ArrayBuffer, canvas: HTMLCanvasElement): Promise<void> {
  const byteArray = new Uint8Array(arrayBuffer);
  const dataSet = dicomParser.parseDicom(byteArray);

  const transferSyntax = getTransferSyntaxUid(dataSet);
  if (transferSyntax && !UNCOMPRESSED_TRANSFER_SYNTAXES.has(transferSyntax)) {
    throw new Error(
      'Este DICOM usa compresión no soportada en el visor web. Descargue el archivo para abrirlo en un visor DICOM externo.'
    );
  }

  const rows = dataSet.uint16('x00280010') ?? 0;
  const columns = dataSet.uint16('x00280011') ?? 0;
  if (!rows || !columns) {
    throw new Error('No se encontraron dimensiones de imagen en el archivo DICOM.');
  }

  const bitsAllocated = dataSet.uint16('x00280100') ?? 8;
  const pixelRepresentation = dataSet.uint16('x00280103') ?? 0;
  const photometricInterpretation = (dataSet.string('x00280004') || 'MONOCHROME2').toUpperCase();
  const samplesPerPixel = dataSet.uint16('x00280002') || 1;

  const pixelDataElement = dataSet.elements.x7fe00010;
  if (!pixelDataElement) {
    throw new Error('No se encontraron datos de píxeles en el archivo DICOM.');
  }

  const pixelData = dataSet.byteArray.subarray(
    pixelDataElement.dataOffset,
    pixelDataElement.dataOffset + pixelDataElement.length
  );

  canvas.width = columns;
  canvas.height = rows;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo inicializar el lienzo de visualización.');

  const imageData = ctx.createImageData(columns, rows);
  const rgba = imageData.data;

  if (samplesPerPixel === 3 && bitsAllocated === 8 && photometricInterpretation === 'RGB') {
    const expectedLength = rows * columns * 3;
    if (pixelData.length < expectedLength) {
      throw new Error('Los datos de píxeles RGB están incompletos.');
    }

    for (let i = 0, p = 0; i < expectedLength; i += 3, p += 4) {
      rgba[p] = pixelData[i];
      rgba[p + 1] = pixelData[i + 1];
      rgba[p + 2] = pixelData[i + 2];
      rgba[p + 3] = 255;
    }
  } else if (samplesPerPixel === 1) {
    const pixelCount = rows * columns;
    const values: number[] = new Array(pixelCount);

    for (let i = 0; i < pixelCount; i += 1) {
      values[i] = readPixelValue(pixelData, i, bitsAllocated, pixelRepresentation);
    }

    let windowCenter = parseFirstFloat(dataSet.string('x00281050'));
    let windowWidth = parseFirstFloat(dataSet.string('x00281051'));

    if (windowCenter == null || windowWidth == null) {
      let min = Number.POSITIVE_INFINITY;
      let max = Number.NEGATIVE_INFINITY;
      for (const value of values) {
        if (value < min) min = value;
        if (value > max) max = value;
      }
      windowCenter = (min + max) / 2;
      windowWidth = Math.max(max - min, 1);
    }

    const invert = photometricInterpretation === 'MONOCHROME1';

    for (let i = 0, p = 0; i < pixelCount; i += 1, p += 4) {
      let gray = applyWindowLevel(values[i], windowCenter, windowWidth);
      if (invert) gray = invertGray(gray);
      rgba[p] = gray;
      rgba[p + 1] = gray;
      rgba[p + 2] = gray;
      rgba[p + 3] = 255;
    }
  } else {
    throw new Error('Formato de imagen DICOM no soportado en el visor web.');
  }

  ctx.putImageData(imageData, 0, 0);
}

export async function renderDicomPreviewDataUrl(arrayBuffer: ArrayBuffer): Promise<string> {
  const canvas = document.createElement('canvas');
  await renderDicomToCanvas(arrayBuffer, canvas);
  return canvas.toDataURL('image/png');
}
