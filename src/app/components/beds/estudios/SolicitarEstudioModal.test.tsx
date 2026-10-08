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
        { idTipoPedido: 4, idPractica: 100102, descripcion: "RADIOGRAFIA DE CRANEO" },
        { idTipoPedido: 5, idPractica: 100103, descripcion: "RADIOGRAFIA DE COLUMNA" },
        { idTipoPedido: 6, idPractica: 660174, descripcion: "RADIOINMUNOENSAYO" },
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
// Prefijos de cada servicio del catálogo de arriba (capítulo = código / 10000).
const capitulos: Record<string, number> = { RAYOS: 10, ANAT: 40, LAB: 66 };
vi.mock("@/app/services/solicitudesEstudiosService", () => ({
    default: {
        buscarTipos: vi.fn(async (q: string, _limit: number, servicio: string) =>
            tiposApi.filter(
                (t) =>
                    Math.floor(t.idPractica / 10000) === capitulos[servicio] &&
                    t.descripcion.toLowerCase().includes(q.toLowerCase()),
            ),
        ),
        crear: vi.fn(),
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
import solicitudesEstudiosService from "@/app/services/solicitudesEstudiosService";
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
    vi.mocked(estudiosService.crear).mockClear();
    vi.mocked(solicitudesEstudiosService.crear).mockReset().mockResolvedValue({ idSolicitud: 1 });
    vi.mocked(solicitudesEstudiosService.buscarTipos).mockClear();
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

        await user.click(screen.getByRole("button", { name: "Quitar RADIOGRAFIA DE TORAX" }));
        await elegirPractica(user, "biop", "BIOPSIA");

        await waitFor(() => expect(servicioActual()).toBe("ANAT"));
    });

    it("si la nueva práctica no tiene servicio asociado, no queda el de la anterior", async () => {
        const user = userEvent.setup();
        renderModal();
        await elegirPractica(user, "radio", "RADIOGRAFIA DE TORAX");
        await waitFor(() => expect(servicioActual()).toBe("RAYOS"));

        await user.click(screen.getByRole("button", { name: "Quitar RADIOGRAFIA DE TORAX" }));
        await elegirPractica(user, "sin servicio", "PRACTICA SIN SERVICIO");

        await waitFor(() => expect(servicioActual()).toBe(""));
    });

    it("se guarda con el servicio de la práctica nueva", async () => {
        const user = userEvent.setup();
        renderModal();
        await elegirPractica(user, "radio", "RADIOGRAFIA DE TORAX");
        await waitFor(() => expect(servicioActual()).toBe("RAYOS"));
        await user.click(screen.getByRole("button", { name: "Quitar RADIOGRAFIA DE TORAX" }));
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

describe("SolicitarEstudioModal · varias prácticas del mismo servicio", () => {
    const agregarOtro = async (user: ReturnType<typeof userEvent.setup>, busqueda: string) => {
        const input = screen.getByRole("textbox", { name: "Agregar otro estudio" });
        await user.clear(input);
        await user.type(input, busqueda);
    };

    it("después de la primera, el buscador sigue habilitado y solo ofrece prácticas del servicio", async () => {
        const user = userEvent.setup();
        renderModal();
        await elegirPractica(user, "radio", "RADIOGRAFIA DE TORAX");
        await waitFor(() => expect(servicioActual()).toBe("RAYOS"));

        await agregarOtro(user, "radio");
        expect(await screen.findByRole("button", { name: /RADIOGRAFIA DE CRANEO/ })).toBeInTheDocument();
        expect(screen.getByText(/Solo se muestran estudios que realiza Rayos/)).toBeInTheDocument();
        // De laboratorio (otro servicio) no aparece aunque coincida el texto
        expect(screen.queryByRole("button", { name: /RADIOINMUNOENSAYO/ })).not.toBeInTheDocument();
        // La ya agregada aparece marcada y no se puede volver a agregar
        const repetida = screen.getByRole("button", { name: /^RADIOGRAFIA DE TORAX/ });
        expect(repetida).toHaveAttribute("aria-disabled", "true");
        expect(repetida).toHaveTextContent("Ya agregado");
        expect(vi.mocked(solicitudesEstudiosService.buscarTipos).mock.calls.at(-1)?.[2]).toBe("RAYOS");
    });

    it("agregar más prácticas no cambia el servicio elegido", async () => {
        const user = userEvent.setup();
        renderModal();
        await elegirPractica(user, "radio", "RADIOGRAFIA DE TORAX");
        await waitFor(() => expect(servicioActual()).toBe("RAYOS"));

        await agregarOtro(user, "craneo");
        await user.click(await screen.findByRole("button", { name: /RADIOGRAFIA DE CRANEO/ }));

        expect(screen.getByText("Estudios (2)")).toBeInTheDocument();
        expect(servicioActual()).toBe("RAYOS");
    });

    it("con varias prácticas se guarda un solo pedido con todas", async () => {
        const user = userEvent.setup();
        renderModal();
        await elegirPractica(user, "radio", "RADIOGRAFIA DE TORAX");
        await waitFor(() => expect(servicioActual()).toBe("RAYOS"));
        await agregarOtro(user, "craneo");
        await user.click(await screen.findByRole("button", { name: /RADIOGRAFIA DE CRANEO/ }));
        await agregarOtro(user, "columna");
        await user.click(await screen.findByRole("button", { name: /RADIOGRAFIA DE COLUMNA/ }));

        await user.click(screen.getByRole("button", { name: "Solicitar 3 estudios" }));

        await waitFor(() => expect(solicitudesEstudiosService.crear).toHaveBeenCalledTimes(1));
        expect(estudiosService.crear).not.toHaveBeenCalled();
        expect(vi.mocked(solicitudesEstudiosService.crear).mock.calls[0][0]).toMatchObject({
            idVisita: 100,
            sectorSolicitante: "CM1",
            idSectorReceptor: "RAYOS",
            items: [
                { idTipoPedido: 1, idPractica: 100101 },
                { idTipoPedido: 4, idPractica: 100102 },
                { idTipoPedido: 5, idPractica: 100103 },
            ],
        });
    });

    it("si se quitan todas, la próxima práctica vuelve a definir el servicio", async () => {
        const user = userEvent.setup();
        renderModal();
        await elegirPractica(user, "radio", "RADIOGRAFIA DE TORAX");
        await waitFor(() => expect(servicioActual()).toBe("RAYOS"));
        await user.click(screen.getByRole("button", { name: "Quitar RADIOGRAFIA DE TORAX" }));

        await elegirPractica(user, "biop", "BIOPSIA");
        await waitFor(() => expect(servicioActual()).toBe("ANAT"));
    });

    it("los errores del servidor se muestran (por ejemplo, prácticas de otro servicio)", async () => {
        const user = userEvent.setup();
        vi.mocked(solicitudesEstudiosService.crear).mockRejectedValue(
            new Error("Los estudios deben corresponder al servicio destino (RAYOS)."),
        );
        renderModal();
        await elegirPractica(user, "radio", "RADIOGRAFIA DE TORAX");
        await waitFor(() => expect(servicioActual()).toBe("RAYOS"));
        await agregarOtro(user, "craneo");
        await user.click(await screen.findByRole("button", { name: /RADIOGRAFIA DE CRANEO/ }));
        await user.click(screen.getByRole("button", { name: "Solicitar 2 estudios" }));

        expect(await screen.findByText(/deben corresponder al servicio destino/)).toBeInTheDocument();
    });

    it("editando un pedido sigue siendo una sola práctica", async () => {
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
        expect(screen.queryByRole("textbox", { name: "Agregar otro estudio" })).not.toBeInTheDocument();
        expect(screen.getByText("Cambiar")).toBeInTheDocument();
    });
});
