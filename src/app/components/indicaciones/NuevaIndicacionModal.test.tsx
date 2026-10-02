/**
 * Ticket: "cuando quiero modificar una indicación con adicional, quiero agregar otro adicional y no lo agrega".
 * Se renderiza el formulario real en modo edición, con el servicio simulado.
 */
import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Referencias estables: el formulario tiene un efecto que depende de `usuario`;
// un objeto nuevo en cada render lo dispararía en bucle.
const { contexto, params } = vi.hoisted(() => ({
    contexto: { usuario: { idValorpersonal: 7, nombre: "Ana", apellido: "Gómez" } },
    params: {},
}));
vi.mock("next/navigation", () => ({ useParams: () => params }));
vi.mock("@/app/contexts/AppContext", () => ({ useAppContext: () => contexto }));
vi.mock("../Patients/AddPatient/LoadingSelect", () => ({
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
vi.mock("../../services/indicacionesService", () => ({
    indicacionesService: {
        getFormularioDatos: vi.fn(),
        getIndicacionesByNroIndicacion: vi.fn(),
        postNuevaIndicacion: vi.fn(),
        deleteIndicacionHija: vi.fn(),
    },
}));

import { indicacionesService } from "../../services/indicacionesService";
import IndicacionForm from "./NuevaIndicacionModal";

const svc = vi.mocked(indicacionesService, true);

const catalogos = {
    tiposIndicacion: [{ Valor: 1, Descripcion: "Medicación", OrdenMedicacion: 1, Tipo: "M" }],
    vademecum: [
        { Valor: 55, Nombre: "SUERO FISIOLOGICO", Descripcion: "", TipoMedicamento: "ML" },
        { Valor: 60, Nombre: "GLUCOSA", Descripcion: "", TipoMedicamento: "ML" },
        { Valor: 61, Nombre: "CLORURO DE POTASIO", Descripcion: "", TipoMedicamento: "ML" },
    ],
    tiposDieta: [],
    tiposControles: [],
    controlesAsistenciales: [],
    unidadesMedida: [{ Valor: 1, Descripcion: "ML" }],
    frecuenciasAdmin: [{ Valor: "8", Intervalo: 2880000 }],
};

// Indicación 4000 (plan de hidratación) que ya tiene un adicional (GLUCOSA, nº 4001)
const indicacionConAdicional = {
    NumeroVisita: 100,
    NroIndicacion: 4000,
    NroAdicional: 0,
    FechaCarga: "2026-09-28",
    HoraCarga: "10:00:00",
    OperadorCarga: 7,
    ProfesionalAsiste: 7,
    ProfesionalNombre: "ANA GOMEZ",
    TipoIndicacion: 1,
    Codigo: 55,
    CantidadIndicada: 1,
    Cantidad: 3,
    TipoUnidad: "ML",
    Frecuencia: "8",
    IdSector: "CM1",
    AliasMedicamento: "SUERO FISIOLOGICO",
    ParaFechaEntrega: "2026-09-28T00:00:00",
    indicacionesHijas: [
        {
            nroIndicacion: 4001,
            nroAdicional: 4000,
            formaAdicional: "MAS",
            codigo: 60,
            medicamento: "GLUCOSA",
            cantidad: 1,
            tipoUnidad: "ML",
            frecuencia: "8",
            observaciones: null,
        },
    ],
};

beforeEach(() => {
    vi.spyOn(window, "alert").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
    svc.getFormularioDatos.mockResolvedValue(catalogos as any);
    svc.getIndicacionesByNroIndicacion.mockResolvedValue(indicacionConAdicional as any);
    svc.postNuevaIndicacion.mockResolvedValue({ NroIndicacion: 5001 } as any);
});

const abrirDrawerYAgregarAdicional = async (user: ReturnType<typeof userEvent.setup>, codigo: string) => {
    await user.click(screen.getByRole("button", { name: /Agregar Adicional/ }));
    await user.selectOptions(screen.getByLabelText("CodigoAdicional"), codigo);
    await user.click(screen.getByRole("button", { name: "Confirmar" }));
};

const enviar = (container: HTMLElement) => fireEvent.submit(container.querySelector("form")!);

describe("IndicacionForm · editar una indicación que ya tiene adicional", () => {
    it("muestra el adicional existente", async () => {
        render(<IndicacionForm onClose={vi.fn()} onSave={vi.fn()} defaultNumeroVisita={100} nroIndicacion={4000} idSector="CM1" />);
        expect(await screen.findByText("GLUCOSA", { selector: "span" })).toBeInTheDocument();
        expect(screen.getByText("1 adicional")).toBeInTheDocument();
    });

    it("agregar un segundo adicional lo guarda enganchado a la indicación editada (aunque onSave no devuelva nada)", async () => {
        const user = userEvent.setup();
        // Como el handleUpdate real: el PUT no devuelve el nº de indicación
        const onSave = vi.fn().mockResolvedValue(undefined);
        const onClose = vi.fn();
        const refetch = vi.fn().mockResolvedValue(undefined);

        const { container } = render(
            <IndicacionForm
                onClose={onClose}
                onSave={onSave}
                defaultNumeroVisita={100}
                nroIndicacion={4000} idSector="CM1"
                refetch={refetch}
            />,
        );
        await screen.findByText("GLUCOSA", { selector: "span" });

        await abrirDrawerYAgregarAdicional(user, "61");
        expect(await screen.findByText("2 adicionales")).toBeInTheDocument();

        enviar(container);

        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(onSave).toHaveBeenCalledTimes(1);
        // Sólo el nuevo: el adicional 4001 que ya existía no se duplica
        expect(svc.postNuevaIndicacion).toHaveBeenCalledTimes(1);
        expect(svc.postNuevaIndicacion.mock.calls[0][0]).toMatchObject({
            NroAdicional: 4000,
            Codigo: 61,
            AliasMedicamento: "CLORURO DE POTASIO",
            NumeroVisita: 100,
        });
        expect(refetch).toHaveBeenCalled();
    });

    it("sin agregar adicionales nuevos, guardar no vuelve a crear los existentes", async () => {
        const onSave = vi.fn().mockResolvedValue({ NroIndicacion: 4000 });
        const onClose = vi.fn();
        const { container } = render(
            <IndicacionForm onClose={onClose} onSave={onSave} defaultNumeroVisita={100} nroIndicacion={4000} idSector="CM1" />,
        );
        await screen.findByText("GLUCOSA", { selector: "span" });

        enviar(container);

        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(svc.postNuevaIndicacion).not.toHaveBeenCalled();
    });

    it("si falla la actualización de la indicación no guarda adicionales ni cierra", async () => {
        const user = userEvent.setup();
        const onSave = vi.fn().mockRejectedValue(new Error("No se pudo actualizar"));
        const onClose = vi.fn();
        const { container } = render(
            <IndicacionForm onClose={onClose} onSave={onSave} defaultNumeroVisita={100} nroIndicacion={4000} idSector="CM1" />,
        );
        await screen.findByText("GLUCOSA", { selector: "span" });
        await abrirDrawerYAgregarAdicional(user, "61");

        enviar(container);

        await waitFor(() => expect(window.alert).toHaveBeenCalledWith("No se pudo actualizar"));
        expect(svc.postNuevaIndicacion).not.toHaveBeenCalled();
        expect(onClose).not.toHaveBeenCalled();
    });
});

describe("IndicacionForm · alta con adicionales (no debe romperse)", () => {
    it("guarda los adicionales con el NroIndicacion que devolvió el alta", async () => {
        const user = userEvent.setup();
        const onSave = vi.fn().mockResolvedValue({ NroIndicacion: 900 });
        const onClose = vi.fn();
        const { container } = render(
            <IndicacionForm onClose={onClose} onSave={onSave} defaultNumeroVisita={100} idSector="CM1" />,
        );

        await user.selectOptions(await screen.findByLabelText("TipoIndicacion"), "1");
        await user.selectOptions(screen.getByLabelText("Codigo"), "55");
        await abrirDrawerYAgregarAdicional(user, "61");
        expect(await screen.findByText("1 adicional")).toBeInTheDocument();

        enviar(container);

        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(svc.postNuevaIndicacion).toHaveBeenCalledTimes(1);
        expect(svc.postNuevaIndicacion.mock.calls[0][0]).toMatchObject({ NroAdicional: 900, Codigo: 61 });
    });
});
