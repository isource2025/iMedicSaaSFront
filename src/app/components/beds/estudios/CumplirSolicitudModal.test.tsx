/**
 * Completar una solicitud: UN informe para varias prácticas; se puede informar solo una parte.
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/services/solicitudesEstudiosService", () => ({
    default: { cumplir: vi.fn() },
}));
vi.mock("@/app/services/adjuntosService", () => ({
    adjuntosService: { getTiposImagenes: vi.fn(async () => []), subirArchivos: vi.fn() },
}));
vi.mock("./PedidoAdjuntosField", () => ({
    default: () => null,
    sugerirTipoImagen: () => "",
}));
vi.mock("./PacientePedidoHeader", () => ({ default: () => null }));
vi.mock("@/app/utils/jwtSession", () => ({ getIdSectorFromToken: () => "LAB" }));

import solicitudesEstudiosService from "@/app/services/solicitudesEstudiosService";
import CumplirSolicitudModal from "./CumplirSolicitudModal";

const item = (id: number, cod: number, nombre: string, cumplido = false) => ({
    IdPedido: id,
    IdVisita: 100,
    CodigoPractica: cod,
    PracticaSolicitada: nombre,
    Cumplido: cumplido,
    IdProtocolo: cumplido ? 55 : 0,
});

const solicitud = (items: any[]): any => ({
    Clave: 5,
    IdSolicitud: 5,
    IdVisita: 100,
    TotalItems: items.length,
    Items: items,
    SectorReceptor: "LAB",
    ServicioCodigo: "LAB",
});

const renderModal = (sol: any, onCumplido = vi.fn()) =>
    render(<CumplirSolicitudModal open solicitud={sol} onClose={vi.fn()} onCumplido={onCumplido} />);

beforeEach(() => {
    vi.mocked(solicitudesEstudiosService.cumplir).mockReset().mockResolvedValue({} as any);
});

describe("CumplirSolicitudModal", () => {
    it("completa todas las prácticas con un solo informe (sin idsPedidos)", async () => {
        const user = userEvent.setup();
        renderModal(solicitud([item(1, 660001, "GLUCEMIA"), item(2, 660002, "UREA"), item(3, 660003, "CREATININA")]));

        await user.type(screen.getByPlaceholderText(/Redacte el resultado/), "Todo normal");
        await user.click(screen.getByRole("button", { name: "Completar" }));

        await waitFor(() => expect(solicitudesEstudiosService.cumplir).toHaveBeenCalledTimes(1));
        const [clave, payload] = vi.mocked(solicitudesEstudiosService.cumplir).mock.calls[0];
        expect(clave).toBe(5);
        expect(payload.textoInforme).toBe("Todo normal");
        expect(payload.idsPedidos).toBeUndefined();
        expect(payload.sectorServicio).toBe("LAB");
    });

    it("desmarcar una práctica informa solo las marcadas", async () => {
        const user = userEvent.setup();
        renderModal(solicitud([item(1, 660001, "GLUCEMIA"), item(2, 660002, "UREA"), item(3, 660003, "CREATININA")]));

        await user.click(screen.getByRole("checkbox", { name: /CREATININA/ }));
        expect(screen.getByText(/quedan pendientes en la bandeja/)).toBeTruthy();
        await user.type(screen.getByPlaceholderText(/Redacte el resultado/), "Parcial");
        await user.click(screen.getByRole("button", { name: "Completar" }));

        await waitFor(() => expect(solicitudesEstudiosService.cumplir).toHaveBeenCalled());
        expect(vi.mocked(solicitudesEstudiosService.cumplir).mock.calls[0][1].idsPedidos).toEqual([1, 2]);
    });

    it("las prácticas ya informadas se muestran tildadas y bloqueadas", () => {
        renderModal(solicitud([item(1, 660001, "GLUCEMIA", true), item(2, 660002, "UREA"), item(3, 660003, "CREATININA")]));
        const hecha = screen.getByRole("checkbox", { name: /GLUCEMIA/ }) as HTMLInputElement;
        expect(hecha.checked).toBe(true);
        expect(hecha.disabled).toBe(true);
        expect(screen.getByText("2/2")).toBeTruthy();
    });

    it("sin informe no envía", async () => {
        const user = userEvent.setup();
        renderModal(solicitud([item(1, 660001, "GLUCEMIA"), item(2, 660002, "UREA")]));
        await user.click(screen.getByRole("button", { name: "Completar" }));
        expect(await screen.findByText("Ingrese el informe / resultado")).toBeTruthy();
        expect(solicitudesEstudiosService.cumplir).not.toHaveBeenCalled();
    });

    it("no se reinicia el texto si la bandeja refresca con los mismos datos", async () => {
        const user = userEvent.setup();
        const sol = solicitud([item(1, 660001, "GLUCEMIA"), item(2, 660002, "UREA")]);
        const { rerender } = renderModal(sol);
        await user.type(screen.getByPlaceholderText(/Redacte el resultado/), "borrador");
        rerender(
            <CumplirSolicitudModal
                open
                solicitud={solicitud([item(1, 660001, "GLUCEMIA"), item(2, 660002, "UREA")])}
                onClose={vi.fn()}
                onCumplido={vi.fn()}
            />,
        );
        expect((screen.getByPlaceholderText(/Redacte el resultado/) as HTMLTextAreaElement).value).toBe("borrador");
    });
});
