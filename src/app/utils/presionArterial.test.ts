import { describe, expect, it } from "vitest";
import { calcularPresionMedia, presionMediaComoTexto } from "./presionArterial";

describe("calcularPresionMedia", () => {
    it("120/80 → 93", () => {
        expect(calcularPresionMedia(120, 80)).toBe(93);
    });

    it("redondea al entero más cercano", () => {
        expect(calcularPresionMedia(130, 85)).toBe(100);
        expect(calcularPresionMedia(110, 70)).toBe(83); // 83,33
        expect(calcularPresionMedia(100, 61)).toBe(74);
    });

    it("acepta texto (valores de inputs)", () => {
        expect(calcularPresionMedia("120", "80")).toBe(93);
    });

    it("sin máxima o mínima devuelve null", () => {
        expect(calcularPresionMedia(120, "")).toBeNull();
        expect(calcularPresionMedia(undefined, 80)).toBeNull();
        expect(calcularPresionMedia(0, 80)).toBeNull();
        expect(calcularPresionMedia(null, null)).toBeNull();
    });

    it("mínima mayor que la máxima es inválido", () => {
        expect(calcularPresionMedia(80, 120)).toBeNull();
    });
});

describe("presionMediaComoTexto", () => {
    it("devuelve el número como texto o vacío", () => {
        expect(presionMediaComoTexto("120", "80")).toBe("93");
        expect(presionMediaComoTexto("120", "")).toBe("");
    });
});
