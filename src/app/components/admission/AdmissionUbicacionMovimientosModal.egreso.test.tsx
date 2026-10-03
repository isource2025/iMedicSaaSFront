import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import path from "node:path";
import AdmissionUbicacionMovimientosModal from "./AdmissionUbicacionMovimientosModal";
import visitaMovimientoService from "@/app/services/visitaMovimientoService";
import { admissionSearchService } from "@/app/services/admissionSearchService";

const { estado } = vi.hoisted(() => ({ estado: { admin: true } }));

vi.mock("@/app/hooks/useUsuarioActual", () => ({ esAdminClinico: () => estado.admin }));
vi.mock("@/app/services/admissionSearchService", () => ({
    admissionSearchService: { getDatosPrincipales: vi.fn() },
}));
vi.mock("@/app/services/visitaMovimientoService", () => ({
    default: {
        getMovimientosVisita: vi.fn(),
        getUltimoMovimiento: vi.fn(),
        getEstadoRevertirEgreso: vi.fn(),
        revertirEgreso: vi.fn(),
        actualizarUltimoMovimiento: vi.fn(),
    },
}));
vi.mock("@/app/services/disposicionEgresoService", () => ({
    getDisposicionesEgreso: vi.fn(async () => [{ Valor: 1, Descripcion: "ALTA MEDICA" }]),
}));
vi.mock("@/app/services/diagnosticosService", () => ({
    default: { buscarDiagnosticosCie10: vi.fn(async () => []) },
}));
vi.mock("@/app/components/beds/movimientos/MovimientosTimelineTable", () => ({
    default: ({ movimientos }: { movimientos: unknown[] }) => <div>{movimientos.length} movimientos</div>,
}));
vi.mock("@/app/components/modals/ModalAsignarCamaAVisita", () => ({
    default: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div data-testid="asignar-cama">Elegir cama</div> : null),
}));
vi.mock("@/app/components/modals/ModalCambiarCama", () => ({ default: () => null }));
vi.mock("@/app/components/Loader/Loader", () => ({ default: () => <div>Cargando…</div> }));

const visitaEgresada = {
    NumeroVisita: 500,
    ApellidoYNombre: "PEREZ JUAN",
    FechaEgreso: "2026-10-01",
    FechaEgresoClarion: 82000,
    HoraEgreso: "21:29",
    DisposicionEgreso: 1,
    DiagnosticoEgreso: "D64",
    DiagnosticoEgresoDescripcion: "ANEMIA DE TIPO NO ESPECIFICADO",
    OperadorEgreso: 33,
    OperadorEgresoNombre: "EMERGENCIAS",
    Sector: "EME",
    Habitacion: "",
    ClasePaciente: "I",
};
const movCerrado = {
    ValorSector: "EME",
    ValorHabitacionCama: "02",
    NombreSector: "EMERGENCIA GENERAL",
    FechaAdmision: 81990,
    HoraAdmision: 5000000,
    FechaEgreso: 82000,
    HoraEgreso: 7000000,
};

const renderEmbebido = () =>
    render(
        <AdmissionUbicacionMovimientosModal isOpen embedded numeroVisita={500} onClose={() => {}} focusSection="all" />,
    );

beforeEach(() => {
    estado.admin = true;
    vi.mocked(admissionSearchService.getDatosPrincipales).mockReset().mockResolvedValue({ visita: visitaEgresada } as any);
    vi.mocked(visitaMovimientoService.getMovimientosVisita).mockReset().mockResolvedValue([movCerrado] as any);
    vi.mocked(visitaMovimientoService.getUltimoMovimiento).mockReset().mockResolvedValue(movCerrado as any);
    vi.mocked(visitaMovimientoService.getEstadoRevertirEgreso).mockReset();
    vi.mocked(visitaMovimientoService.revertirEgreso).mockReset();
});

describe("Modificar admisión · egreso de internado", () => {
    it("el formulario de Modificar embebe también la sección de egreso (no solo ubicación y movimientos)", () => {
        const fuente = readFileSync(
            path.join(process.cwd(), "src/app/dashboard/admission/new/NuevaAdmisionClient.tsx"),
            "utf8",
        );
        const bloque = fuente.slice(fuente.indexOf("<AdmissionUbicacionMovimientosModal"));
        expect(bloque.slice(0, bloque.indexOf("/>"))).toMatch(/focusSection="all"/);
    });

    it("muestra el egreso cargado, editable, y el botón para quitarlo (admin)", async () => {
        renderEmbebido();

        expect(await screen.findByDisplayValue("2026-10-01")).toBeInTheDocument();
        expect(screen.getByDisplayValue("21:29")).toBeInTheDocument();
        expect(screen.getByDisplayValue("D64 — ANEMIA DE TIPO NO ESPECIFICADO")).toBeInTheDocument();
        expect(screen.getByDisplayValue("EMERGENCIAS (33)")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Actualizar egreso" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Revertir egreso" })).toBeInTheDocument();
        expect(screen.getByText("Última ubicación (egresado)")).toBeInTheDocument();
    });

    it("quitar el egreso: avisa qué va a pasar con la cama, lo anula y abre la elección de cama", async () => {
        const user = userEvent.setup();
        vi.mocked(visitaMovimientoService.getEstadoRevertirEgreso).mockResolvedValue({
            pacienteNombre: "PEREZ JUAN",
            cama: "02",
            sector: "EME",
            camaEstado: "ocupada",
            puedeRevertir: true,
            mensaje: "Se va a anular el egreso de PEREZ JUAN. Quedará en internación sin cama.",
            conflictos: [],
            avisos: [{ codigo: "cama_ocupada", mensaje: "La cama 02 ya está ocupada. Hoy está GOMEZ ANA." }],
        } as any);
        vi.mocked(visitaMovimientoService.revertirEgreso).mockImplementation(async () => {
            vi.mocked(admissionSearchService.getDatosPrincipales).mockResolvedValue({
                visita: { ...visitaEgresada, FechaEgreso: null, FechaEgresoClarion: 0, Sector: "", Habitacion: "" },
            } as any);
            vi.mocked(visitaMovimientoService.getMovimientosVisita).mockResolvedValue([
                { ValorSector: "", ValorHabitacionCama: "", FechaAdmision: 82000, HoraAdmision: 7000000, FechaEgreso: 0 },
                movCerrado,
            ] as any);
            return { mensaje: "Se anuló el egreso. PEREZ JUAN quedó en internación sin cama." } as any;
        });

        renderEmbebido();
        await user.click(await screen.findByRole("button", { name: "Revertir egreso" }));

        expect(await screen.findByText(/Hoy está GOMEZ ANA/)).toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "Anular egreso" }));

        await waitFor(() => expect(visitaMovimientoService.revertirEgreso).toHaveBeenCalledWith(500));
        expect(await screen.findByTestId("asignar-cama")).toBeInTheDocument();
        expect(await screen.findByText(/quedó en internación sin cama/)).toBeInTheDocument();
        // Ya sin egreso y sin cama: el formulario queda vacío y ofrece asignar ubicación
        await waitFor(() => expect(screen.getByRole("button", { name: "Registrar egreso" })).toBeInTheDocument());
        expect(screen.queryByDisplayValue("2026-10-01")).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Asignar cama" })).toBeInTheDocument();
        expect(screen.getByText("Ubicación actual")).toBeInTheDocument();
    });

    it("si el backend no permite quitarlo (otra internación abierta) lo explica y no anula nada", async () => {
        const user = userEvent.setup();
        vi.mocked(visitaMovimientoService.getEstadoRevertirEgreso).mockResolvedValue({
            puedeRevertir: false,
            mensaje: "PEREZ JUAN ya tiene otra internación abierta.",
            conflictos: [{ codigo: "otra_internacion", mensaje: "PEREZ JUAN ya tiene otra internación abierta." }],
            avisos: [],
        } as any);

        renderEmbebido();
        await user.click(await screen.findByRole("button", { name: "Revertir egreso" }));

        expect(await screen.findByText("No se puede revertir el egreso")).toBeInTheDocument();
        expect(screen.getByText(/otra internación abierta/)).toBeInTheDocument();
        expect(visitaMovimientoService.revertirEgreso).not.toHaveBeenCalled();
    });

    it("un usuario que no es admin ve el egreso pero no puede quitarlo", async () => {
        estado.admin = false;
        renderEmbebido();
        expect(await screen.findByDisplayValue("2026-10-01")).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Revertir egreso" })).not.toBeInTheDocument();
    });
});
