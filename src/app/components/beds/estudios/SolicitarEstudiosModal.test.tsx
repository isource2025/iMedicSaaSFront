/**
 * Solicitud con varias prácticas: se agregan/quitan estudios, el servicio destino lo propone la
 * primera práctica y se envía UNA sola solicitud con todos los ítems.
 */
import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { catalogo, tiposApi } = vi.hoisted(() => ({
    catalogo: {
        servicios: [
            { valor: "RAYOS", descripcion: "Rayos", prefijos: ["10"] },
            { valor: "LAB", descripcion: "Laboratorio", prefijos: ["66"] },
        ],
        loading: false,
    },
    tiposApi: [
        { idTipoPedido: 11, idPractica: 660001, descripcion: "GLUCEMIA" },
        { idTipoPedido: 12, idPractica: 660002, descripcion: "UREA" },
        { idTipoPedido: 13, idPractica: 660003, descripcion: "CREATININA" },
        { idTipoPedido: 21, idPractica: 100101, descripcion: "GLUCEMIA RADIO" },
    ],
}));

vi.mock("@/app/hooks/useSectoresReceptor", () => ({ useSectoresReceptor: () => catalogo }));
vi.mock("@/app/services/solicitudesEstudiosService", () => ({
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

import solicitudesEstudiosService from "@/app/services/solicitudesEstudiosService";
import SolicitarEstudiosModal from "./SolicitarEstudiosModal";

const servicioActual = () => (screen.getByLabelText("servicioDestino") as HTMLSelectElement).value;
const buscador = () => screen.getByPlaceholderText(/Buscar por descripción/);

const agregar = async (user: ReturnType<typeof userEvent.setup>, busqueda: string, descripcion: string) => {
    await user.clear(buscador());
    await user.type(buscador(), busqueda);
    // el nombre accesible del resultado es "<descripción><código>" (o "<descripción>✓ agregado")
    await user.click(await screen.findByRole("button", { name: new RegExp(`^${descripcion}\\d`) }));
};

const renderModal = (props: Partial<React.ComponentProps<typeof SolicitarEstudiosModal>> = {}) =>
    render(
        <SolicitarEstudiosModal
            open
            sectorSolicitante="CM1"
            idVisita={100}
            onClose={vi.fn()}
            onCreated={vi.fn()}
            {...props}
        />,
    );

beforeEach(() => {
    vi.mocked(solicitudesEstudiosService.crear).mockReset().mockResolvedValue({ idSolicitud: 1 });
    vi.mocked(solicitudesEstudiosService.actualizar).mockReset().mockResolvedValue({} as any);
});

describe("SolicitarEstudiosModal · varias prácticas en una solicitud", () => {
    it("agrega tres estudios y envía UNA solicitud con los tres ítems", async () => {
        const user = userEvent.setup();
        const onCreated = vi.fn();
        renderModal({ onCreated });

        await agregar(user, "gluc", "GLUCEMIA");
        await waitFor(() => expect(servicioActual()).toBe("LAB"));
        await agregar(user, "ure", "UREA");
        await agregar(user, "creat", "CREATININA");

        await user.click(screen.getByRole("button", { name: "Solicitar 3 estudios" }));

        await waitFor(() => expect(solicitudesEstudiosService.crear).toHaveBeenCalledTimes(1));
        const payload = vi.mocked(solicitudesEstudiosService.crear).mock.calls[0][0];
        expect(payload).toMatchObject({ idVisita: 100, idSectorReceptor: "LAB", sectorSolicitante: "CM1" });
        expect(payload.items.map((i) => i.idPractica)).toEqual([660001, 660002, 660003]);
        expect(onCreated).toHaveBeenCalled();
    });

    it("no duplica un estudio ya agregado", async () => {
        const user = userEvent.setup();
        renderModal();
        await agregar(user, "gluc", "GLUCEMIA");
        await user.clear(buscador());
        await user.type(buscador(), "glucemia");
        const dup = await screen.findByRole("button", { name: /^GLUCEMIA✓ agregado/ });
        expect((dup as HTMLButtonElement).disabled).toBe(true);
    });

    it("quitar un estudio lo saca de la solicitud", async () => {
        const user = userEvent.setup();
        renderModal();
        await agregar(user, "gluc", "GLUCEMIA");
        await agregar(user, "ure", "UREA");

        await user.click(screen.getByRole("button", { name: /Quitar GLUCEMIA/ }));
        await user.click(screen.getByRole("button", { name: "Solicitar" }));

        await waitFor(() => expect(solicitudesEstudiosService.crear).toHaveBeenCalled());
        const items = vi.mocked(solicitudesEstudiosService.crear).mock.calls[0][0].items;
        expect(items.map((i) => i.idPractica)).toEqual([660002]);
    });

    it("sin estudios no deja solicitar", async () => {
        const user = userEvent.setup();
        renderModal();
        await user.click(screen.getByRole("button", { name: "Solicitar" }));
        expect(await screen.findByText("Agregá al menos un estudio")).toBeTruthy();
        expect(solicitudesEstudiosService.crear).not.toHaveBeenCalled();
    });

    it("avisa si un estudio suele ir a otro servicio, pero respeta el elegido", async () => {
        const user = userEvent.setup();
        renderModal();
        await agregar(user, "gluc", "GLUCEMIA");
        await waitFor(() => expect(servicioActual()).toBe("LAB"));
        await agregar(user, "radio", "GLUCEMIA RADIO");
        expect(await screen.findByText(/suele ir a/)).toBeTruthy();
        expect(servicioActual()).toBe("LAB");
    });

    it("editando una solicitud PENDIENTE: solo envía los ítems si cambió la lista", async () => {
        const user = userEvent.setup();
        const solicitud: any = {
            Clave: 7,
            IdSolicitud: 7,
            Legacy: false,
            Estado: "PENDIENTE",
            SectorReceptor: "LAB",
            ServicioCodigo: "LAB",
            EstadoUrgencia: "Normal",
            NotasObservacion: "ayuno",
            Items: [
                { IdPedido: 1, IdTipoPedido: 11, CodigoPractica: 660001, TipoPedidoDescripcion: "GLUCEMIA" },
                { IdPedido: 2, IdTipoPedido: 12, CodigoPractica: 660002, TipoPedidoDescripcion: "UREA" },
            ],
        };
        renderModal({ solicitud });
        await waitFor(() => expect(servicioActual()).toBe("LAB"));

        await user.click(screen.getByRole("button", { name: "Guardar" }));
        await waitFor(() => expect(solicitudesEstudiosService.actualizar).toHaveBeenCalledTimes(1));
        const [clave, sinCambios] = vi.mocked(solicitudesEstudiosService.actualizar).mock.calls[0];
        expect(clave).toBe(7);
        expect(sinCambios.items).toBeUndefined();
        expect(sinCambios.notas).toBe("ayuno");
    });

    it("editando con la lista modificada envía los ítems nuevos", async () => {
        const user = userEvent.setup();
        const solicitud: any = {
            Clave: 7,
            IdSolicitud: 7,
            Legacy: false,
            Estado: "PENDIENTE",
            SectorReceptor: "LAB",
            ServicioCodigo: "LAB",
            Items: [{ IdPedido: 1, IdTipoPedido: 11, CodigoPractica: 660001, TipoPedidoDescripcion: "GLUCEMIA" }],
        };
        renderModal({ solicitud });
        await waitFor(() => expect(servicioActual()).toBe("LAB"));
        await agregar(user, "creat", "CREATININA");
        await user.click(screen.getByRole("button", { name: "Guardar" }));

        await waitFor(() => expect(solicitudesEstudiosService.actualizar).toHaveBeenCalled());
        const payload = vi.mocked(solicitudesEstudiosService.actualizar).mock.calls[0][1];
        expect(payload.items?.map((i) => i.idPractica)).toEqual([660001, 660003]);
    });

    it("solicitud ya tomada: no permite tocar la lista ni el servicio, solo notas y urgencia", async () => {
        const user = userEvent.setup();
        const solicitud: any = {
            Clave: 8,
            IdSolicitud: 8,
            Legacy: false,
            Estado: "TOMADA",
            SectorReceptor: "LAB",
            ServicioCodigo: "LAB",
            EstadoUrgencia: "Urgente",
            Items: [{ IdPedido: 1, IdTipoPedido: 11, CodigoPractica: 660001, TipoPedidoDescripcion: "GLUCEMIA" }],
        };
        renderModal({ solicitud });
        expect(screen.queryByPlaceholderText(/Buscar por descripción/)).toBeNull();
        expect(screen.queryByRole("button", { name: /Quitar/ })).toBeNull();
        expect(screen.getByText(/Ya fue tomada o respondida/)).toBeTruthy();

        await user.click(screen.getByRole("button", { name: "Guardar" }));
        await waitFor(() => expect(solicitudesEstudiosService.actualizar).toHaveBeenCalled());
        const payload = vi.mocked(solicitudesEstudiosService.actualizar).mock.calls[0][1];
        expect(payload.items).toBeUndefined();
        expect(payload.idSectorReceptor).toBeUndefined();
        expect(payload.estadoUrgencia).toBe("Urgente");
        void within;
    });
});
