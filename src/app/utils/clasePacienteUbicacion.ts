import type { AdmissionCatalogOption } from '@/app/services/admissionSearchService';

/** Normaliza acentos para comparar descripciones de catálogo (DÍA → DIA). */
function sinAcentos(texto: string): string {
  try {
    return texto.normalize('NFD').replace(/\p{M}/gu, '');
  } catch {
    return texto;
  }
}

/**
 * Clases que usan cama / mapa de internación: Internado (I) y Hospital de día (H).
 * Si el código no es I/H, fallback por descripción del catálogo (otros tenants).
 */
export function claseRequiereUbicacion(
  valor: string,
  clases?: AdmissionCatalogOption[] | null,
): boolean {
  const v = String(valor || '').trim().toUpperCase();
  if (!v) return false;
  if (v === 'I' || v === 'H') return true;

  const desc = sinAcentos(
    String(
      (clases ?? []).find((c) => String(c.Valor ?? '').trim().toUpperCase() === v)
        ?.Descripcion ?? '',
    ),
  ).toUpperCase();

  return /HOSPITAL\s*DE\s*DIA/.test(desc);
}
