import { describe, expect, it } from "vitest";
import { resolveReceptorPorTipo, type ReceptorLike } from "./resolveSectorReceptor";

const servicios: ReceptorLike[] = [
    { valor: "RAYOS", descripcion: "Rayos", prefijos: ["10"] },
    { valor: "ANAT", descripcion: "Anatomía Patológica", prefijos: ["40"] },
    { valor: "LAB", descripcion: "Laboratorio", prefijos: ["66"] },
];

describe("resolveReceptorPorTipo", () => {
    it("radiografía de tórax → Rayos (por prefijo de la práctica)", () => {
        expect(resolveReceptorPorTipo({ descripcion: "RADIOGRAFIA DE TORAX", idPractica: 100101 }, servicios)).toBe("RAYOS");
    });

    it("biopsia → Anatomía Patológica", () => {
        expect(resolveReceptorPorTipo({ descripcion: "BIOPSIA", idPractica: 400201 }, servicios)).toBe("ANAT");
    });

    it("práctica sin servicio asociado → vacío", () => {
        expect(resolveReceptorPorTipo({ descripcion: "OTRA COSA", idPractica: 990001 }, servicios)).toBe("");
    });
});
