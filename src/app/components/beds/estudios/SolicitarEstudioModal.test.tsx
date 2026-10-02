/**
 * Ticket: al cambiar la práctica de la solicitud de estudio, el servicio destino debe recalcularse
 * (radiografía de tórax → Rayos; si se cambia a biopsia → Anatomía Patológica).
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { catalogo, tiposApi } = vi.hoisted(() => ({
    catalogo: {
        servicios: [
            { valor: "RAYOS", descripcion: "Rayos", prefijos: ["10"] },
            { valor: "ANAT", descripcion: "Anatomía Patológica", prefijos: ["40"] },
            { valor: "LAB", descripcion: "Laboratorio", prefijos: ["66"] },
        ],
        loading: false,
    },
    tiposApi: [
        { idTipoPedido: 1, idPractica: 100101, descripcion: "RADIOGRAFIA DE TORAX" },
        { idTipoPedido: 2, idPractica: 400201, descripcion: "BIOPSIA" },
        { idTipoPedido: 3, idPractica: 990001, descripcion: "PRACTICA SIN SERVICIO" },
    ],
}));

vi.mock("@/app/hooks/useSectoresReceptor", () => ({ useSectoresReceptor: () => catalogo }));
vi.mock("@/app/services/estudiosService", () => ({
    default: {
        buscarTipos: vi.fn(async (q: string) =>
            tiposApi.filter((t) => t.descripcion.toLowerCase().includes(q.toLowerCase())),
        ),
        crear: vi.fn(),
        actualizar: vi.fn(),
    },
}));
vi.mock("@/app/components/Patients/AddPatient/LoadingSelect", () => ({
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

import estudiosService from "@/app/services/estudiosService";
import SolicitarEstudioModal from "./SolicitarEstudioModal";

const servicioActual = () => (screen.getByLabelText("servicioDestino") as HTMLSelectElement).value;

const elegirPractica = async (user: ReturnType<typeof userEvent.setup>, busqueda: string, descripcion: string) => {
    await user.type(screen.getByPlaceholderText(/Buscar por descripción/), busqueda);
    await user.click(await screen.findByRole("button", { name: new RegExp(descripcion) }));
};

const renderModal = (props: Partial<React.ComponentProps<typeof SolicitarEstudioModal>> = {}) =>
    render(
        <SolicitarEstudioModal
            open
            sectorSolicitante="CM1"
            idVisita={100}
            onClose={vi.fn()}
            onCreated={vi.fn()}
            {...props}
        />,
    );

beforeEach(() => {
    vi.mocked(estudiosService.crear).mockResolvedValue({} as any);
    vi.mocked(estudiosService.actualizar).mockResolvedValue({} as any);
});

describe("SolicitarEstudioModal · servicio destino según la práctica", () => {
    it("radiografía de tórax propone Rayos", async () => {
        const user = userEvent.setup();
        renderModal();
        await elegirPractica(user, "radio", "RADIOGRAFIA DE TORAX");
        await waitFor(() => expect(servicioActual()).toBe("RAYOS"));
    });

    it("al cambiar la práctica a biopsia el servicio pasa a Anatomía Patológica", async () => {
        const user = userEvent.setup();
        renderModal();
        await elegirPractica(user, "radio", "RADIOGRAFIA DE TORAX");
        await waitFor(() => expect(servicioActual()).toBe("RAYOS"));

        await user.click(screen.getByText("Cambiar"));
        await elegirPractica(user, "biop", "BIOPSIA");

        await waitFor(() => expect(servicioActual()).toBe("ANAT"));
    });

    it("si la nueva práctica no tiene servicio asociado, no queda el de la anterior", async () => {
        const user = userEvent.setup();
        renderModal();
        await elegirPractica(user, "radio", "RADIOGRAFIA DE TORAX");
        await waitFor(() => expect(servicioActual()).toBe("RAYOS"));

        await user.click(screen.getByText("Cambiar"));
        await elegirPractica(user, "sin servicio", "PRACTICA SIN SERVICIO");

        await waitFor(() => expect(servicioActual()).toBe(""));
    });

    it("se guarda con el servicio de la práctica nueva", async () => {
        const user = userEvent.setup();
        renderModal();
        await elegirPractica(user, "radio", "RADIOGRAFIA DE TORAX");
        await waitFor(() => expect(servicioActual()).toBe("RAYOS"));
        await user.click(screen.getByText("Cambiar"));
        await elegirPractica(user, "biop", "BIOPSIA");
        await waitFor(() => expect(servicioActual()).toBe("ANAT"));

        await user.click(screen.getByRole("button", { name: "Solicitar" }));

        await waitFor(() => expect(estudiosService.crear).toHaveBeenCalled());
        expect(vi.mocked(estudiosService.crear).mock.calls[0][0]).toMatchObject({
            idPractica: 400201,
            idSectorReceptor: "ANAT",
        });
    });

    it("una elección manual posterior del servicio se respeta", async () => {
        const user = userEvent.setup();
        renderModal();
        await elegirPractica(user, "biop", "BIOPSIA");
        await waitFor(() => expect(servicioActual()).toBe("ANAT"));

        await user.selectOptions(screen.getByLabelText("servicioDestino"), "LAB");
        expect(servicioActual()).toBe("LAB");
    });

    it("editando un pedido: conserva su servicio y lo recalcula si cambia la práctica", async () => {
        const user = userEvent.setup();
        const pedido: any = {
            IdPedido: 9,
            IdTipoPedido: 1,
            CodigoPractica: 100101,
            TipoPedidoDescripcion: "RADIOGRAFIA DE TORAX",
            SectorReceptor: "RAYOS",
            ServicioCodigo: "RAYOS",
            EstadoUrgencia: "Normal",
        };
        renderModal({ pedido });
        await waitFor(() => expect(servicioActual()).toBe("RAYOS"));

        await user.click(screen.getByText("Cambiar"));
        await elegirPractica(user, "biop", "BIOPSIA");

        await waitFor(() => expect(servicioActual()).toBe("ANAT"));
    });
});
