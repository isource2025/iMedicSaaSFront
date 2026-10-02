const aNumeroPositivo = (v: unknown): number | null => {
    if (v == null || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * Presión arterial media: PAM = (PAS + 2 × PAD) / 3, redondeada al entero.
 * Devuelve null si falta la máxima o la mínima, o si son incoherentes (mínima > máxima).
 * Misma regla que el backend (iMedicSaaSBack/src/utils/presionArterial.js).
 */
export function calcularPresionMedia(
    presionMax: unknown,
    presionMin: unknown,
): number | null {
    const max = aNumeroPositivo(presionMax);
    const min = aNumeroPositivo(presionMin);
    if (max == null || min == null) return null;
    if (min > max) return null;
    return Math.round((max + 2 * min) / 3);
}

/** Igual que `calcularPresionMedia` pero como texto para inputs ("" si no se puede calcular). */
export function presionMediaComoTexto(
    presionMax: unknown,
    presionMin: unknown,
): string {
    const pam = calcularPresionMedia(presionMax, presionMin);
    return pam == null ? "" : String(pam);
}
