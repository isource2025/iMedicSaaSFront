/**
 * Ticket: "indicaciones en la vista de celular: agregar botón de volver a indicar;
 * si es un plan de hidratación que también se vean los adicionales".
 */
import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const permisos = new Set<string>();
let rolNombre = "MEDICO";

vi.mock("../../../hooks/usePermiso", () => ({
    usePermiso: () => ({ puede: (k: string) => permisos.has(k), rol: { nombre: rolNombre } }),
}));
vi.mock("../../../hooks/useUsuarioActual", () => ({
    useUsuarioActual: () => ({}),
    esRegistroPropio: () => true,
}));
vi.mock("../../../services/indicacionesService", () => ({
    indicacionesService: { deleteIndicacion: vi.fn(), dejarSinEfecto: vi.fn() },
}));
vi.mock("../shared/ConfirmationModal", () => ({ default: () => null }));
vi.mock("../../indicaciones/AplicarIndicacion", () => ({ default: () => null }));

import IndicacionesTable, { type IndicacionRow } from "./IndicacionesTable";

const planHidratacion: IndicacionRow = {
    id: "1",
    nro: 1,
    descripcion: "PLAN DE HIDRATACION",
    frecuencia: "8",
    cantidad: 1,
    idSector: "CM1",
    profesional: "ANA GOMEZ",
    tipo: "M",
    indicacionesHijas: [
        {
            nroIndicacion: 11,
            nroAdicional: 1,
            cantidad: 20,
            tipoUnidad: "ML ",
            medicamento: "CLORURO DE POTASIO",
            descripcion: null,
            observaciones: null,
            frecuencia: "8",
            formaAdicional: "MAS",
        },
        {
            nroIndicacion: 12,
            nroAdicional: 1,
            cantidad: 1,
            tipoUnidad: null,
            medicamento: "GLUCOSA",
            descripcion: null,
            observaciones: null,
            frecuencia: null,
            formaAdicional: null,
        },
    ],
};
const simple: IndicacionRow = {
    id: "2",
    nro: 2,
    descripcion: "PARACETAMOL",
    frecuencia: "6",
    cantidad: 1,
    idSector: "CM1",
    profesional: "ANA GOMEZ",
    tipo: "M",
};

const renderTabla = (props: Partial<React.ComponentProps<typeof IndicacionesTable>> = {}) =>
    render(
        <IndicacionesTable
            rows={[planHidratacion, simple]}
            refetch={vi.fn()}
            numeroVisita="100"
            {...props}
        />,
    );

const tarjeta = (id: string) => within(screen.getByTestId(`indicacion-card-${id}`));

beforeEach(() => {
    permisos.clear();
    permisos.add("INTERNACION.INDICACIONES.EDITAR");
    rolNombre = "MEDICO";
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("Indicaciones · vista móvil · volver a indicar", () => {
    it("cada tarjeta tiene el botón «Volver a indicar» para quien puede editar", () => {
        renderTabla();
        expect(tarjeta("1").getByRole("button", { name: "Volver a indicar" })).toBeInTheDocument();
        expect(tarjeta("2").getByRole("button", { name: "Volver a indicar" })).toBeInTheDocument();
    });

    it("no aparece para quien no puede editar (enfermería)", () => {
        permisos.clear();
        permisos.add("INTERNACION.INDICACIONES.APLICAR");
        rolNombre = "ENFERMERO";
        renderTabla();
        expect(screen.queryByRole("button", { name: "Volver a indicar" })).not.toBeInTheDocument();
    });

    it("al tocarlo activa el modo y deja marcada esa tarjeta", async () => {
        const user = userEvent.setup();
        const onActivar = vi.fn();
        const onToggle = vi.fn();
        renderTabla({ onActivarModoReindicar: onActivar, onToggleReindicar: onToggle });

        await user.click(tarjeta("2").getByRole("button", { name: "Volver a indicar" }));

        expect(onActivar).toHaveBeenCalledTimes(1);
        expect(onToggle).toHaveBeenCalledTimes(1);
        expect(onToggle).toHaveBeenCalledWith("2");
    });

    it("en modo reindicar cada tarjeta muestra su casilla y refleja la selección", async () => {
        const user = userEvent.setup();
        const onToggle = vi.fn();
        renderTabla({
            modoReindicar: true,
            selectedForReindicar: new Set(["1"]),
            onToggleReindicar: onToggle,
        });

        const check1 = tarjeta("1").getByRole("checkbox", { name: /Seleccionar para volver a indicar/ });
        const check2 = tarjeta("2").getByRole("checkbox", { name: /Seleccionar para volver a indicar/ });
        expect(check1).toBeChecked();
        expect(check2).not.toBeChecked();
        // ya en el modo, el botón deja de mostrarse
        expect(screen.queryByRole("button", { name: "Volver a indicar" })).not.toBeInTheDocument();

        await user.click(check2);
        expect(onToggle).toHaveBeenCalledWith("2");
    });

    it("fuera del modo no hay casillas ni barra de confirmación", () => {
        renderTabla();
        expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
        expect(screen.queryByTestId("reindicar-bar")).not.toBeInTheDocument();
    });

    it("en modo reindicar se selecciona tocando cualquier parte de la tarjeta", async () => {
        const user = userEvent.setup();
        const onToggle = vi.fn();
        renderTabla({ modoReindicar: true, onToggleReindicar: onToggle });

        await user.click(tarjeta("2").getByText("Indicado:"));

        expect(onToggle).toHaveBeenCalledTimes(1);
        expect(onToggle).toHaveBeenCalledWith("2");
    });

    it("en modo reindicar se ocultan las acciones de editar/eliminar/etc. para no tocarlas sin querer", () => {
        permisos.add("INTERNACION.INDICACIONES.ELIMINAR");
        permisos.add("INTERNACION.INDICACIONES.APLICAR");
        const { rerender } = renderTabla();
        // sanity: fuera del modo las acciones sí están (en la vista móvil)
        const movil = () => within(screen.getByTestId("indicaciones-mobile"));
        expect(movil().getAllByTitle("Eliminar").length).toBeGreaterThan(0);

        rerender(<IndicacionesTable rows={[planHidratacion, simple]} refetch={vi.fn()} numeroVisita="100" modoReindicar />);
        expect(movil().queryByTitle("Eliminar")).not.toBeInTheDocument();
        expect(movil().queryByTitle("Editar")).not.toBeInTheDocument();
        expect(movil().queryByTitle("Aplicar indicación")).not.toBeInTheDocument();
    });
});

describe("Indicaciones · vista móvil · barra fija de confirmación", () => {
    const bar = () => within(screen.getByTestId("reindicar-bar"));

    it("muestra la cantidad seleccionada y confirma / cancela desde ahí", async () => {
        const user = userEvent.setup();
        const onConfirmar = vi.fn();
        const onCancelar = vi.fn();
        renderTabla({
            modoReindicar: true,
            selectedForReindicar: new Set(["1", "2"]),
            onConfirmarReindicar: onConfirmar,
            onCancelarReindicar: onCancelar,
        });

        await user.click(bar().getByRole("button", { name: "Reindicar 2 indicaciones" }));
        expect(onConfirmar).toHaveBeenCalledTimes(1);

        await user.click(bar().getByRole("button", { name: "Cancelar" }));
        expect(onCancelar).toHaveBeenCalledTimes(1);
    });

    it("flota fija sobre la pantalla (montada en body) y deja espacio al final para no tapar la última indicación", () => {
        renderTabla({ modoReindicar: true, selectedForReindicar: new Set(), onConfirmarReindicar: vi.fn() });

        const barra = screen.getByTestId("reindicar-bar");
        const contenedor = screen.getByTestId("indicaciones-mobile");
        // Fuera del contenedor de tarjetas: ningún ancestro con overflow/scroll puede dejarla "debajo de todo"
        expect(barra.parentElement).toBe(document.body);
        expect(contenedor.contains(barra)).toBe(false);

        // Espaciador como último elemento de la lista, después de la última tarjeta
        const ultimo = contenedor.lastElementChild as HTMLElement;
        expect(ultimo.className).toContain("reindicarEspaciador");
        expect(ultimo.previousElementSibling).toBe(screen.getByTestId("indicacion-card-2"));
    });

    it("no hay barra ni espaciador fuera del modo volver a indicar", () => {
        renderTabla();
        expect(screen.queryByTestId("reindicar-bar")).not.toBeInTheDocument();
        const contenedor = screen.getByTestId("indicaciones-mobile");
        expect(contenedor.querySelector('[class*="reindicarEspaciador"]')).toBeNull();
    });

    it("singular con una sola y deshabilitado sin ninguna", () => {
        const { rerender } = renderTabla({
            modoReindicar: true,
            selectedForReindicar: new Set(["1"]),
            onConfirmarReindicar: vi.fn(),
        });
        expect(bar().getByRole("button", { name: "Reindicar 1 indicación" })).toBeEnabled();

        rerender(
            <IndicacionesTable
                rows={[planHidratacion, simple]}
                refetch={vi.fn()}
                numeroVisita="100"
                modoReindicar
                selectedForReindicar={new Set()}
                onConfirmarReindicar={vi.fn()}
            />,
        );
        expect(bar().getByRole("button", { name: "Reindicar 0 indicaciones" })).toBeDisabled();
    });

    it("mientras reindica no permite confirmar ni cancelar de nuevo", () => {
        renderTabla({
            modoReindicar: true,
            selectedForReindicar: new Set(["1"]),
            onConfirmarReindicar: vi.fn(),
            onCancelarReindicar: vi.fn(),
            reindicando: true,
        });
        expect(bar().getByRole("button", { name: "Reindicando…" })).toBeDisabled();
        expect(bar().getByRole("button", { name: "Cancelar" })).toBeDisabled();
    });

    it("«Todas» selecciona las que faltan y, si ya están todas, las deselecciona", async () => {
        const user = userEvent.setup();
        const onToggle = vi.fn();
        const { rerender } = renderTabla({
            modoReindicar: true,
            selectedForReindicar: new Set(["1"]),
            onToggleReindicar: onToggle,
        });

        await user.click(bar().getByRole("checkbox", { name: "Seleccionar todas" }));
        expect(onToggle.mock.calls.map((c) => c[0])).toEqual(["2"]); // sólo la que faltaba

        onToggle.mockClear();
        rerender(
            <IndicacionesTable
                rows={[planHidratacion, simple]}
                refetch={vi.fn()}
                numeroVisita="100"
                modoReindicar
                selectedForReindicar={new Set(["1", "2"])}
                onToggleReindicar={onToggle}
            />,
        );
        await user.click(bar().getByRole("checkbox", { name: "Seleccionar todas" }));
        expect(onToggle.mock.calls.map((c) => c[0]).sort()).toEqual(["1", "2"]);
    });
});

describe("Indicaciones · vista móvil · adicionales (plan de hidratación)", () => {
    it("la tarjeta del plan muestra todos sus adicionales", () => {
        renderTabla();
        const adicionales = within(screen.getByTestId("adicionales-1"));
        expect(adicionales.getByText(/MAS - CLORURO DE POTASIO/)).toBeInTheDocument();
        expect(adicionales.getByText(/GLUCOSA/)).toBeInTheDocument();
        // cantidad, unidad y frecuencia del adicional
        expect(adicionales.getByText(/CLORURO DE POTASIO · 20 ML · 8/)).toBeInTheDocument();
    });

    it("una indicación sin adicionales no muestra el bloque", () => {
        renderTabla();
        expect(screen.queryByTestId("adicionales-2")).not.toBeInTheDocument();
        expect(tarjeta("2").queryByText("Adicionales:")).not.toBeInTheDocument();
    });
});
