import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SOLICITUDES_MULTI_STORAGE_KEY, setSolicitudesMulti, solicitudesMultiHabilitado } from "./solicitudesMulti";

describe("vista agrupada de estudios (beta)", () => {
    beforeEach(() => window.localStorage.clear());
    afterEach(() => window.localStorage.clear());

    it("por defecto está APAGADA: se ve la pantalla de siempre", () => {
        expect(solicitudesMultiHabilitado()).toBe(false);
    });

    it("se activa y se desactiva por navegador", () => {
        setSolicitudesMulti(true);
        expect(window.localStorage.getItem(SOLICITUDES_MULTI_STORAGE_KEY)).toBe("1");
        expect(solicitudesMultiHabilitado()).toBe(true);
        setSolicitudesMulti(false);
        expect(solicitudesMultiHabilitado()).toBe(false);
    });
});
