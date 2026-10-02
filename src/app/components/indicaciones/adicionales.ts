import type { NuevaIndicacionPayload } from "../../types/indicaciones";

/**
 * Adicional (indicación "hija") tal como lo maneja el formulario.
 * Los que ya existen en la base traen `nroIndicacion`; los agregados en esta sesión no.
 */
export interface IndicacionHija {
    id: string;
    nroIndicacion?: number | null;
    formaAdicional: string | null;
    codigo: number | null;
    aliasMedicamento: string | null;
    cantidad: number | null;
    tipoUnidad: string | null;
    frecuencia: string | null;
    observaciones: string | null;
}

const aNroValido = (v: unknown): number | null => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * Nº de la indicación principal a la que se enganchan los adicionales.
 * - Al editar, es la indicación que se está editando (el PUT no devuelve el número).
 * - Al crear, es el `NroIndicacion` que devolvió el alta.
 */
export function resolverNroIndicacionPadre(
    nroIndicacionEnEdicion: number | null | undefined,
    resultadoGuardado: unknown,
): number | null {
    const enEdicion = aNroValido(nroIndicacionEnEdicion);
    if (enEdicion) return enEdicion;
    return aNroValido((resultadoGuardado as { NroIndicacion?: unknown } | null | undefined)?.NroIndicacion);
}

/** Adicionales que todavía no están en la base (los ya guardados no se vuelven a enviar). */
export function adicionalesPendientes(hijas: IndicacionHija[]): IndicacionHija[] {
    return hijas.filter((h) => !aNroValido(h.nroIndicacion));
}

/** Payload de un adicional: copia los datos del padre y pisa lo propio del adicional. */
export function armarPayloadAdicional(
    form: NuevaIndicacionPayload,
    hija: IndicacionHija,
    nroIndicacionPadre: number,
    fechaCarga: string | null = null,
): NuevaIndicacionPayload {
    return {
        ...form,
        Codigo: hija.codigo,
        CantidadIndicada: hija.cantidad,
        TipoUnidad: hija.tipoUnidad,
        Frecuencia: hija.frecuencia,
        Cantidad: hija.cantidad,
        AliasMedicamento: hija.aliasMedicamento,
        FormaAdicional: hija.formaAdicional,
        FechaCarga: form.FechaCarga || fechaCarga,
        // Va al final: sobrescribe el 0 / null del padre
        NroAdicional: nroIndicacionPadre,
    };
}

/**
 * Guarda los adicionales nuevos de una indicación (alta o edición).
 * Devuelve cuántos se guardaron. Si falla uno, la excepción corta el proceso.
 */
export async function guardarAdicionalesNuevos(args: {
    form: NuevaIndicacionPayload;
    hijas: IndicacionHija[];
    nroIndicacionEnEdicion: number | null | undefined;
    resultadoGuardado: unknown;
    fechaCarga?: string | null;
    postAdicional: (payload: NuevaIndicacionPayload) => Promise<unknown>;
}): Promise<number> {
    const pendientes = adicionalesPendientes(args.hijas);
    if (pendientes.length === 0) return 0;

    const nroPadre = resolverNroIndicacionPadre(args.nroIndicacionEnEdicion, args.resultadoGuardado);
    if (!nroPadre) {
        throw new Error(
            "No se pudo determinar la indicación principal; los adicionales no se guardaron.",
        );
    }

    for (const hija of pendientes) {
        await args.postAdicional(
            armarPayloadAdicional(args.form, hija, nroPadre, args.fechaCarga ?? null),
        );
    }
    return pendientes.length;
}
