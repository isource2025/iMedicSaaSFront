import { describe, expect, it, vi } from "vitest";
import type { NuevaIndicacionPayload } from "../../types/indicaciones";
import {
    adicionalesPendientes,
    armarPayloadAdicional,
    guardarAdicionalesNuevos,
    resolverNroIndicacionPadre,
    type IndicacionHija,
} from "./adicionales";

const hija = (over: Partial<IndicacionHija> = {}): IndicacionHija => ({
    id: "tmp-1",
    formaAdicional: "MAS",
    codigo: 61,
    aliasMedicamento: "CLORURO DE POTASIO",
    cantidad: 2,
    tipoUnidad: "ML",
    frecuencia: "8",
    observaciones: null,
    ...over,
});

const form = { NumeroVisita: 100, NroAdicional: 0, FechaCarga: "2026-09-28", Codigo: 55 } as NuevaIndicacionPayload;

describe("resolverNroIndicacionPadre", () => {
    it("al editar usa la indicación que se edita, aunque el PUT no devuelva nada", () => {
        expect(resolverNroIndicacionPadre(4000, undefined)).toBe(4000);
    });
    it("al crear usa el NroIndicacion del alta", () => {
        expect(resolverNroIndicacionPadre(null, { NroIndicacion: 900 })).toBe(900);
    });
    it("sin ninguno devuelve null", () => {
        expect(resolverNroIndicacionPadre(null, undefined)).toBeNull();
        expect(resolverNroIndicacionPadre(undefined, {})).toBeNull();
    });
});

describe("adicionalesPendientes", () => {
    it("ignora los adicionales que ya están en la base", () => {
        const existente = hija({ id: "4001", nroIndicacion: 4001 });
        const nueva = hija();
        expect(adicionalesPendientes([existente, nueva])).toEqual([nueva]);
    });
});

describe("armarPayloadAdicional", () => {
    it("copia el padre, pisa lo propio y apunta NroAdicional al padre", () => {
        const p = armarPayloadAdicional(form, hija(), 4000);
        expect(p.NroAdicional).toBe(4000);
        expect(p.Codigo).toBe(61);
        expect(p.AliasMedicamento).toBe("CLORURO DE POTASIO");
        expect(p.FormaAdicional).toBe("MAS");
        expect(p.NumeroVisita).toBe(100);
        expect(p.FechaCarga).toBe("2026-09-28");
    });
});

describe("guardarAdicionalesNuevos", () => {
    it("edición con un adicional existente: sólo envía el nuevo, enganchado al padre", async () => {
        const post = vi.fn().mockResolvedValue({});
        const n = await guardarAdicionalesNuevos({
            form,
            hijas: [hija({ id: "4001", nroIndicacion: 4001, codigo: 60 }), hija()],
            nroIndicacionEnEdicion: 4000,
            resultadoGuardado: undefined,
            postAdicional: post,
        });
        expect(n).toBe(1);
        expect(post).toHaveBeenCalledTimes(1);
        expect(post.mock.calls[0][0]).toMatchObject({ NroAdicional: 4000, Codigo: 61 });
    });

    it("alta con dos adicionales: los envía en orden con el nº del alta", async () => {
        const post = vi.fn().mockResolvedValue({});
        await guardarAdicionalesNuevos({
            form,
            hijas: [hija({ codigo: 61 }), hija({ id: "tmp-2", codigo: 62 })],
            nroIndicacionEnEdicion: null,
            resultadoGuardado: { NroIndicacion: 900 },
            postAdicional: post,
        });
        expect(post.mock.calls.map((c) => c[0].Codigo)).toEqual([61, 62]);
        expect(post.mock.calls.every((c) => c[0].NroAdicional === 900)).toBe(true);
    });

    it("sin adicionales nuevos no llama al servidor", async () => {
        const post = vi.fn();
        const n = await guardarAdicionalesNuevos({
            form,
            hijas: [hija({ nroIndicacion: 4001 })],
            nroIndicacionEnEdicion: 4000,
            resultadoGuardado: undefined,
            postAdicional: post,
        });
        expect(n).toBe(0);
        expect(post).not.toHaveBeenCalled();
    });

    it("si no puede determinar el padre falla con un error claro (no pierde adicionales en silencio)", async () => {
        const post = vi.fn();
        await expect(
            guardarAdicionalesNuevos({
                form,
                hijas: [hija()],
                nroIndicacionEnEdicion: null,
                resultadoGuardado: undefined,
                postAdicional: post,
            }),
        ).rejects.toThrow(/indicación principal/);
        expect(post).not.toHaveBeenCalled();
    });
});
