/**
 * Ticket: "se carga presión máxima y mínima, la presión media debe calcularla y no lo hace".
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { contexto } = vi.hoisted(() => ({
    contexto: { usuario: { idValorpersonal: 7, codigoOperador: 7 }, sectorSeleccionado: null },
}));
vi.mock("@/app/contexts/AppContext", () => ({ useAppContext: () => contexto }));
vi.mock("../../../services/controlesFrecuentesService", () => ({
    crearControl: vi.fn(),
    actualizarControl: vi.fn(),
}));

import { actualizarControl, crearControl } from "../../../services/controlesFrecuentesService";
import NuevoControlModal from "./NuevoControlModal";

const crear = vi.mocked(crearControl);
const actualizar = vi.mocked(actualizarControl);

beforeEach(() => {
    crear.mockResolvedValue({ Valor: 1 });
    actualizar.mockResolvedValue(undefined as any);
});

const media = () => screen.getByLabelText("TA Media") as HTMLInputElement;

describe("NuevoControlModal · presión media automática", () => {
    it("la media es de sólo lectura y está vacía hasta tener máxima y mínima", () => {
        render(<NuevoControlModal defaultNumeroVisita={100} onClose={vi.fn()} />);
        expect(media()).toHaveAttribute("readonly");
        expect(media().value).toBe("");
    });

    it("al cargar 120/80 calcula 93", async () => {
        const user = userEvent.setup();
        render(<NuevoControlModal defaultNumeroVisita={100} onClose={vi.fn()} />);

        await user.type(screen.getByLabelText("TA Máx"), "120");
        expect(media().value).toBe(""); // todavía falta la mínima
        await user.type(screen.getByLabelText("TA Mín"), "80");
        expect(media().value).toBe("93");
    });

    it("se recalcula si se corrige un valor", async () => {
        const user = userEvent.setup();
        render(<NuevoControlModal defaultNumeroVisita={100} onClose={vi.fn()} />);
        await user.type(screen.getByLabelText("TA Máx"), "120");
        await user.type(screen.getByLabelText("TA Mín"), "80");
        await user.clear(screen.getByLabelText("TA Mín"));
        await user.type(screen.getByLabelText("TA Mín"), "90");
        expect(media().value).toBe("100"); // (120 + 180) / 3
    });

    it("al guardar envía la media calculada", async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();
        const { container } = render(<NuevoControlModal defaultNumeroVisita={100} onClose={onClose} />);
        await user.type(screen.getByLabelText("TA Máx"), "120");
        await user.type(screen.getByLabelText("TA Mín"), "80");

        await user.click(screen.getByRole("button", { name: "Guardar control" }));

        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(container.querySelector("form")).toBeTruthy();
        expect(crear).toHaveBeenCalledTimes(1);
        expect(crear.mock.calls[0][0]).toMatchObject({
            numeroVisita: 100,
            presionMax: 120,
            presionMin: 80,
            presionMedia: 93,
        });
    });

    it("si falta la mínima no envía media", async () => {
        const user = userEvent.setup();
        render(<NuevoControlModal defaultNumeroVisita={100} onClose={vi.fn()} />);
        await user.type(screen.getByLabelText("TA Máx"), "120");
        await user.click(screen.getByRole("button", { name: "Guardar control" }));
        await waitFor(() => expect(crear).toHaveBeenCalled());
        expect(crear.mock.calls[0][0].presionMedia).toBeUndefined();
    });

    it("al editar un control recalcula la media con los valores nuevos", async () => {
        const user = userEvent.setup();
        const control: any = {
            Valor: 77,
            NumeroVisita: 100,
            FechaControl: "2026-10-02",
            HoraControl: "08:30:00",
            OperadorCarga: 7,
            IdSector: "CM1",
            Maximo: 120,
            Minimo: 80,
            PAMedia: 93,
        };
        render(<NuevoControlModal defaultNumeroVisita={100} onClose={vi.fn()} controlToEdit={control} />);
        expect(media().value).toBe("93");

        await user.clear(screen.getByLabelText("TA Máx"));
        await user.type(screen.getByLabelText("TA Máx"), "150");
        expect(media().value).toBe("103"); // (150 + 160) / 3

        await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
        await waitFor(() => expect(actualizar).toHaveBeenCalled());
        expect(actualizar.mock.calls[0][0]).toBe(77);
        expect(actualizar.mock.calls[0][1]).toMatchObject({ presionMax: 150, presionMin: 80, presionMedia: 103 });
    });
});
