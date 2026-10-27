import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import path from "node:path";
import AdmissionUbicacionMovimientosModal from "./AdmissionUbicacionMovimientosModal";
import visitaMovimientoService from "@/app/services/visitaMovimientoService";
import { admissionSearchService } from "@/app/services/admissionSearchService";

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

    it("muestra el egreso cargado bloqueado, con solo Modificar y Eliminar egreso (admin)", async () => {
        renderEmbebido();

        expect(await screen.findByDisplayValue("2026-10-01")).toBeDisabled();
        expect(screen.getByDisplayValue("21:29")).toBeDisabled();
        expect(screen.getByDisplayValue("D64 — ANEMIA DE TIPO NO ESPECIFICADO")).toBeDisabled();
        expect(screen.getByDisplayValue("EMERGENCIAS (33)")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Modificar" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Eliminar egreso" })).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Actualizar egreso" })).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Limpiar" })).not.toBeInTheDocument();
        expect(screen.getByText("Última ubicación (egresado)")).toBeInTheDocument();
    });

    it("Modificar habilita los campos y Guardar cambios actualiza el egreso", async () => {
        const user = userEvent.setup();
        vi.mocked(visitaMovimientoService.actualizarUltimoMovimiento).mockReset().mockResolvedValue({ success: true });
        renderEmbebido();

        await user.click(await screen.findByRole("button", { name: "Modificar" }));
        const hora = screen.getByDisplayValue("21:29");
        expect(hora).toBeEnabled();
        expect(screen.getByDisplayValue("2026-10-01")).toBeEnabled();
        expect(screen.queryByRole("button", { name: "Eliminar egreso" })).not.toBeInTheDocument();

        await user.clear(hora);
        await user.type(hora, "22:15");
        await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

        await waitFor(() =>
            expect(visitaMovimientoService.actualizarUltimoMovimiento).toHaveBeenCalledWith(
                500,
                expect.objectContaining({ fechaEgreso: "2026-10-01", horaEgreso: "22:15", disposicionEgreso: 1 }),
            ),
        );
        expect(await screen.findByRole("button", { name: "Modificar" })).toBeInTheDocument();
    });

    it("Cancelar descarta lo editado y vuelve a bloquear los campos", async () => {
        const user = userEvent.setup();
        renderEmbebido();

        await user.click(await screen.findByRole("button", { name: "Modificar" }));
        const hora = screen.getByDisplayValue("21:29");
        await user.clear(hora);
        await user.type(hora, "10:00");
        await user.click(screen.getByRole("button", { name: "Cancelar" }));

        expect(await screen.findByDisplayValue("21:29")).toBeDisabled();
        expect(visitaMovimientoService.actualizarUltimoMovimiento).not.toHaveBeenCalled();
    });

    it("si la cama sigue libre, eliminar el egreso lo devuelve ahí y no pide elegir cama", async () => {
        const user = userEvent.setup();
        vi.mocked(visitaMovimientoService.getEstadoRevertirEgreso).mockResolvedValue({
            pacienteNombre: "PEREZ JUAN",
            camaEstado: "libre",
            puedeRevertir: true,
            mensaje: "Se va a anular el egreso de PEREZ JUAN. Volverá a internación en la cama 02.",
            conflictos: [],
            avisos: [],
        } as any);
        vi.mocked(visitaMovimientoService.revertirEgreso).mockResolvedValue({
            success: true,
            mensaje: "Se anuló el egreso. PEREZ JUAN volvió a la cama 02.",
            data: { sinCama: false, cama: "02", sector: "EME" },
        } as any);

        renderEmbebido();
        await user.click(await screen.findByRole("button", { name: "Eliminar egreso" }));
        expect(await screen.findByText(/Volverá a internación en la cama 02/)).toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "Confirmar" }));

        expect(await screen.findByText(/volvió a la cama 02/)).toBeInTheDocument();
        expect(screen.queryByTestId("asignar-cama")).not.toBeInTheDocument();
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
            return {
                mensaje: "Se anuló el egreso. PEREZ JUAN quedó en internación sin cama.",
                data: { sinCama: true },
            } as any;
        });

        renderEmbebido();
        await user.click(await screen.findByRole("button", { name: "Eliminar egreso" }));

        expect(await screen.findByText(/Hoy está GOMEZ ANA/)).toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "Confirmar" }));

        await waitFor(() => expect(visitaMovimientoService.revertirEgreso).toHaveBeenCalledWith(500));
        expect(await screen.findByTestId("asignar-cama")).toBeInTheDocument();
        expect(await screen.findByText(/quedó en internación sin cama/)).toBeInTheDocument();
        // Ya sin egreso y sin cama: el formulario queda vacío y ofrece asignar ubicación
        await waitFor(() => expect(screen.getByRole("button", { name: "Registrar egreso" })).toBeInTheDocument());
        expect(screen.queryByDisplayValue("2026-10-01")).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Asignar cama" })).toBeInTheDocument();
        expect(screen.getByText("Ubicación actual")).toBeInTheDocument();
    });

    it("si hay otra internación abierta advierte y deja confirmar Eliminar egreso o Cancelar", async () => {
        const user = userEvent.setup();
        vi.mocked(visitaMovimientoService.getEstadoRevertirEgreso).mockResolvedValue({
            puedeRevertir: true,
            mensaje: "Se va a anular el egreso de PEREZ JUAN. Quedará en internación sin cama; después podés asignarle ubicación en movimientos.",
            conflictos: [],
            avisos: [{
                codigo: "otra_internacion",
                mensaje: "PEREZ JUAN ya tiene otra internación en curso. Si anulás este egreso, quedarán dos internaciones abiertas a la vez.",
            }],
        } as any);
        vi.mocked(visitaMovimientoService.revertirEgreso).mockResolvedValue({
            success: true,
            mensaje: "Se anuló el egreso.",
            data: { camaEstado: "sin_cama" },
        } as any);

        renderEmbebido();
        await user.click(await screen.findByRole("button", { name: "Eliminar egreso" }));

        expect(await screen.findByRole("heading", { name: "Eliminar egreso" })).toBeInTheDocument();
        expect(screen.getByText(/dos internaciones abiertas/)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
        expect(visitaMovimientoService.revertirEgreso).not.toHaveBeenCalled();

        const botonesEliminar = screen.getAllByRole("button", { name: "Eliminar egreso" });
        await user.click(botonesEliminar[botonesEliminar.length - 1]);
        await waitFor(() => expect(visitaMovimientoService.revertirEgreso).toHaveBeenCalledWith(500));
    });

    it("Eliminar egreso siempre visible y llama al API (autoriza GESTIONAR en el servidor)", async () => {
        const user = userEvent.setup();
        vi.mocked(visitaMovimientoService.getEstadoRevertirEgreso).mockResolvedValue({
            puedeRevertir: true,
            mensaje: "Se va a anular el egreso de PEREZ JUAN.",
            conflictos: [],
            avisos: [],
        } as any);

        renderEmbebido();
        await user.click(await screen.findByRole("button", { name: "Eliminar egreso" }));

        expect(await screen.findByText("No se puede eliminar el egreso")).toBeInTheDocument();
        expect(screen.getByText(/otra internación abierta/)).toBeInTheDocument();
        expect(visitaMovimientoService.revertirEgreso).not.toHaveBeenCalled();
    });

    it("un usuario que no es admin ve el egreso pero no puede quitarlo", async () => {
        estado.admin = false;
        renderEmbebido();
        expect(await screen.findByDisplayValue("2026-10-01")).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Eliminar egreso" })).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Modificar" })).toBeInTheDocument();
    });
});
