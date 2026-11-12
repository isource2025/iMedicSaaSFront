import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { params } = vi.hoisted(() => ({ params: { id: "CM1-02" } }));
vi.mock("next/navigation", () => ({ useParams: () => params }));
vi.mock("../../Patients/AddPatient/LoadingSelect", () => ({
    default: ({ name, value, onChange, options }: any) => (
        <select aria-label={name} value={value} onChange={(e) => onChange(e.target.value)}>
            <option value="">--</option>
            {options.map((o: any) => (
                <option key={o.value} value={o.value}>
                    {o.label}
                </option>
            ))}
        </select>
    ),
}));
vi.mock("../../../services/indicacionesService", () => ({
    indicacionesService: {
        getFormularioDatos: vi.fn(),
        postNuevaIndicacion: vi.fn(),
    },
}));

import { indicacionesService } from "../../../services/indicacionesService";
import NuevoInsumoForm, { NUEVO_INSUMO_FORM_ID } from "./NuevoInsumoForm";

const svc = vi.mocked(indicacionesService, true);

const catalogos = {
    tiposIndicacion: [
        { Valor: 1, Descripcion: "Medicación", OrdenMedicacion: 1, Tipo: "M" },
        { Valor: 9, Descripcion: "Descartables", OrdenMedicacion: 9, Tipo: "M" },
    ],
    vademecum: [
        { Valor: 55, Nombre: "SUERO FISIOLOGICO", Descripcion: "", TipoMedicamento: "ML" },
        { Valor: 70, Nombre: "JERINGA 5 ML", Descripcion: "", TipoMedicamento: "DESC" },
        { Valor: 71, Nombre: "GUANTES DESCARTABLES", Descripcion: "", TipoMedicamento: "DESC" },
    ],
    tiposDieta: [],
    tiposControles: [],
    controlesAsistenciales: [],
    unidadesMedida: [],
    frecuenciasAdmin: [],
};

const enviar = (container: HTMLElement) =>
    fireEvent.submit(container.querySelector(`#${NUEVO_INSUMO_FORM_ID}`)!);

describe("NuevoInsumoForm", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        svc.getFormularioDatos.mockResolvedValue(catalogos as any);
        svc.postNuevaIndicacion.mockResolvedValue({ NroIndicacion: 1 } as any);
    });

    it("ofrece sólo descartables", async () => {
        render(<NuevoInsumoForm numeroVisita={100} fechaCarga="2026-11-12" onGuardado={vi.fn()} />);
        await screen.findByRole("option", { name: "JERINGA 5 ML" });
        expect(screen.queryByRole("option", { name: "SUERO FISIOLOGICO" })).toBeNull();
    });

    it("guarda como indicación tipo 9 con cantidad y observación", async () => {
        const onGuardado = vi.fn();
        const { container } = render(
            <NuevoInsumoForm numeroVisita={100} fechaCarga="2026-11-12" onGuardado={onGuardado} />
        );
        await screen.findByRole("option", { name: "GUANTES DESCARTABLES" });

        fireEvent.change(screen.getByLabelText("Codigo"), { target: { value: "71" } });
        fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "3" } });
        fireEvent.change(screen.getByRole("textbox"), { target: { value: "curación" } });
        enviar(container);

        await waitFor(() => expect(onGuardado).toHaveBeenCalledWith("2026-11-12"));
        expect(svc.postNuevaIndicacion).toHaveBeenCalledWith(
            expect.objectContaining({
                NumeroVisita: 100,
                TipoIndicacion: 9,
                Codigo: 71,
                AliasMedicamento: "GUANTES DESCARTABLES",
                Cantidad: 3,
                CantidadIndicada: 3,
                Orden: 9,
                FechaCarga: "2026-11-12",
                Observaciones: "curación",
            })
        );
    });

    it("sin descartable elegido no envía", async () => {
        const { container } = render(
            <NuevoInsumoForm numeroVisita={100} fechaCarga="2026-11-12" onGuardado={vi.fn()} />
        );
        await screen.findByRole("option", { name: "JERINGA 5 ML" });
        enviar(container);
        await screen.findByText("Elegí el descartable a cargar.");
        expect(svc.postNuevaIndicacion).not.toHaveBeenCalled();
    });
});
