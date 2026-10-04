import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BandejaPedidosPage from "./page";
import estudiosService from "@/app/services/estudiosService";

const { estado } = vi.hoisted(() => ({
    estado: {
        searchParams: new URLSearchParams(),
        catalogo: { sectores: [] as any[], servicios: [] as any[], loading: true },
        usuario: { matricula: 10 },
        permiso: { puede: () => true },
    },
}));

vi.mock("next/navigation", () => ({ useSearchParams: () => estado.searchParams }));
vi.mock("@/app/hooks/useUsuarioActual", () => ({ useUsuarioActual: () => estado.usuario }));
vi.mock("@/app/hooks/usePermiso", () => ({ usePermiso: () => estado.permiso }));
vi.mock("@/app/hooks/useSectoresReceptor", () => ({ useSectoresReceptor: () => estado.catalogo }));

// Igual que el backend para un usuario que ve todos los servicios: sin sector, 400
const rechazarSinSector = async (sector: string) => {
    if (!sector.trim()) throw new Error("Query sector requerido");
    return [];
};
vi.mock("@/app/services/estudiosService", () => ({
    default: { listarPendientes: vi.fn(), contarLibres: vi.fn() },
}));
vi.mock("@/app/services/interconsultasService", () => ({
    interconsultasService: { listarPendientes: vi.fn(async () => []) },
}));
vi.mock("@/app/components/beds/estudios/CumplirEstudioModal", () => ({ default: () => null }));
vi.mock("@/app/components/beds/estudios/PedidoAdjuntosField", () => ({ default: () => null }));
vi.mock("@/app/components/beds/estudios/PacientePedidoHeader", () => ({ default: () => null }));
vi.mock("@/app/components/beds/shared/PedidoDetalleModal", () => ({ default: () => null }));

const servicios = [
    { valor: "CAR", descripcion: "CARDIOLOGIA" },
    { valor: "DPI", descripcion: "DIAGNOSTICO POR IMAGEN" },
];

const cargarServicios = (lista = servicios) => {
    estado.catalogo = { sectores: lista, servicios: lista, loading: false };
};

const sectoresPedidos = () =>
    vi.mocked(estudiosService.listarPendientes).mock.calls.map(([sector]) => sector);

beforeEach(() => {
    estado.searchParams = new URLSearchParams();
    estado.catalogo = { sectores: [], servicios: [], loading: true };
    vi.mocked(estudiosService.listarPendientes).mockReset().mockImplementation(rechazarSinSector as any);
    vi.mocked(estudiosService.contarLibres).mockReset().mockResolvedValue({
        estudios: 2,
        interconsultas: 2,
        urgentes: 1,
        porServicio: [],
    } as any);
});

describe("Bandeja de pedidos · entrada sin 'Query sector requerido'", () => {
    it("al entrar mientras cargan los servicios y luego en el panorama, no pide la cola sin servicio ni muestra el error", async () => {
        const { rerender } = render(<BandejaPedidosPage />);
        expect(await screen.findByText("Cargando servicios…")).toBeInTheDocument();

        await act(async () => {
            cargarServicios();
            rerender(<BandejaPedidosPage />);
        });

        expect(await screen.findByRole("button", { name: "Abrir cola de CARDIOLOGIA" })).toBeInTheDocument();
        await waitFor(() => expect(estudiosService.contarLibres).toHaveBeenCalled());
        expect(screen.queryByText("Query sector requerido")).not.toBeInTheDocument();
        expect(sectoresPedidos()).not.toContain("");
    });

    it("al abrir la cola de un servicio sí la pide con ese servicio", async () => {
        const user = userEvent.setup();
        cargarServicios();
        render(<BandejaPedidosPage />);

        await user.click(await screen.findByRole("button", { name: "Abrir cola de CARDIOLOGIA" }));

        await waitFor(() => expect(sectoresPedidos()).toContain("CAR"));
        expect(await screen.findByText("Sin estudios pendientes")).toBeInTheDocument();
        expect(screen.queryByText("Query sector requerido")).not.toBeInTheDocument();
    });

    it("entrando con ?sector= en la URL carga directo esa cola", async () => {
        estado.searchParams = new URLSearchParams("sector=DPI");
        cargarServicios();
        render(<BandejaPedidosPage />);

        await waitFor(() => expect(sectoresPedidos()).toContain("DPI"));
        expect(sectoresPedidos()).not.toContain("");
        expect(await screen.findByText("Sin estudios pendientes")).toBeInTheDocument();
    });

    it("con un solo servicio entra directo a su cola sin pasar por el error", async () => {
        const { rerender } = render(<BandejaPedidosPage />);
        await act(async () => {
            cargarServicios([servicios[0]]);
            rerender(<BandejaPedidosPage />);
        });

        await waitFor(() => expect(sectoresPedidos()).toContain("CAR"));
        expect(sectoresPedidos()).not.toContain("");
        expect(screen.queryByText("Query sector requerido")).not.toBeInTheDocument();
    });

    it("los errores reales al cargar una cola se siguen mostrando", async () => {
        estado.searchParams = new URLSearchParams("sector=CAR");
        cargarServicios();
        vi.mocked(estudiosService.listarPendientes).mockRejectedValue(new Error("Servicio no asignado"));
        render(<BandejaPedidosPage />);

        expect(await screen.findByText("Servicio no asignado")).toBeInTheDocument();
    });
});
