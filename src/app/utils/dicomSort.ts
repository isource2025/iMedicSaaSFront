function extractAllNumbers(text: string): number[] {
  const nums: number[] = [];
  const re = /\d+/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    nums.push(Number.parseInt(match[0], 10));
  }
  return nums;
}

/** Extrae el índice numérico principal del nombre de archivo DICOM. */
export function extractNumericOrder(fileName: string): number {
  const base = fileName.replace(/\.(dcm|dicom)$/i, '');
  const matches = extractAllNumbers(base);
  if (!matches.length) return Number.MAX_SAFE_INTEGER;
  return matches[matches.length - 1];
}

export function isDicomFile(file: File): boolean {
  return file.type === 'application/dicom' || /\.dcm$/i.test(file.name) || /\.dicom$/i.test(file.name);
}

export function sortDicomFilesByNumericOrder(files: File[]): File[] {
  return [...files].sort((a, b) => {
    const na = extractNumericOrder(a.name);
    const nb = extractNumericOrder(b.name);
    if (na !== nb) return na - nb;
    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
  });
}

/**
 * Sugiere FPS a partir del rango numérico en los nombres.
 * Ej.: archivos 1..60 → ~15 fps; si el rango es pequeño respecto a la cantidad, sube el valor.
 */
export function inferFpsFromDicomFiles(files: File[]): number {
  const sorted = sortDicomFilesByNumericOrder(files);
  if (sorted.length < 2) return 12;

  const nums = sorted.map((f) => extractNumericOrder(f.name)).filter((n) => Number.isFinite(n));
  if (nums.length < 2) return 12;

  const min = nums[0];
  const max = nums[nums.length - 1];
  const span = Math.max(max - min + 1, 1);

  const fps = Math.round((sorted.length / span) * 12);
  return Math.min(30, Math.max(5, fps));
}
