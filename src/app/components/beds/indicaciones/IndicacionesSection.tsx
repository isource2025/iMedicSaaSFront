"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useBedSectionFetch } from "../contexts/useBedSectionQuery";
import IndicacionesTable, { IndicacionRow } from "./IndicacionesTable";
import { useBedDetail } from "../contexts/BedDetailContext";
import styles from './IndicacionesSection.module.css';
import BedSectionLoading from '../shared/BedSectionLoading';
import EmptyState from '../shared/EmptyState';
import IndicativoColors from "./IdicativosColors";
import NuevaIndicacionModal from "../../indicaciones/NuevaIndicacionModal";
import { NuevaIndicacionPayload } from "../../../types/indicaciones";
import ModalBasePaciente from "../../modals/ModalBasePaciente";
import { indicacionesService } from "../../../services/indicacionesService";
import ExportButton, { ExportOption } from '../shared/ExportButton';
import { exportToPDF } from '../../../utils/pdfExport';
import { obtenerInfoEmpresa } from '../../../services/empresaService';
import ResultadoReindicarModal, {
    ReindicarItemTrack,
    ReindicarPorTipo,
} from "./ResultadoReindicarModal";
import ConfirmarFechaReindicarModal from "./ConfirmarFechaReindicarModal";
import {
    fueNuevaEnSesion,
    rememberNuevasEnfermeriaSesion,
    subscribeNuevasEnfermeriaSesion,
} from "../../../utils/indicacionesNuevasSesion";

function toLocalYmd(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function addDaysYmd(ymd: string, days: number): string {
    const [y, m, d] = ymd.split("-").map(Number);
    const dt = new Date(y, m - 1, d + days);
    return toLocalYmd(dt);
}

function ymdToLocalDate(ymd: string): Date {
    const [y, m, d] = ymd.split("-").map(Number);
    return new Date(y, m - 1, d);
}

/** Indicaciones nuevas: día seleccionado si es hoy o mañana; si no, hoy. */
function fechaIndicacionPermitida(selected: Date | null | undefined): string {
    const hoy = toLocalYmd(new Date());
    const manana = addDaysYmd(hoy, 1);
    if (!selected) return hoy;
    const ymd = toLocalYmd(selected);
    if (ymd === hoy || ymd === manana) return ymd;
    return hoy;
}

function etiquetaTipoReindicar(row: IndicacionRow): string {
    const prompt = String(row.promptCodigo || "").trim().toUpperCase();
    if (prompt.includes("MEDIC")) return "Medicamento";
    if (prompt.includes("DIET")) return "Dieta";
    if (prompt.includes("CONTROL")) return "Control";
    if (prompt.includes("ASIST")) return "Asistencial";
    if (prompt) return prompt.charAt(0) + prompt.slice(1).toLowerCase();

    const tipo = String(row.tipo || "").trim().toUpperCase();
    if (tipo === "M") return "Medicamento";
    if (tipo === "D") return "Dieta";
    if (tipo === "C") return "Control";
    if (tipo === "A") return "Asistencial";
    return "Otras";
}

function formatearFechaReindicar(ymd: string): string {
    const [y, m, d] = ymd.split("-");
    if (!y || !m || !d) return ymd;
    return `${d}/${m}/${y}`;
}

function descripcionIndicacionReindicar(row: IndicacionRow): string {
    const alias = String(row.medicamento || row.descripcion || "").trim();
    if (alias) return alias;
    return `Indicación ${row.nro ?? row.id}`;
}

/** Mensajes claros para el usuario (sin códigos HTTP ni jerga técnica). */
function motivoErrorReindicar(error: unknown): string {
    const raw = String((error as Error)?.message || error || "").toLowerCase();
    if (
        raw.includes("ya existe") ||
        raw.includes("duplicate") ||
        raw.includes("conflict") ||
        raw.includes("unique")
    ) {
        return "Ya había una indicación cargada para ese día con el mismo tipo y horario. Suele pasar si se reindica otra vez o si varias se guardan al mismo tiempo.";
    }
    if (raw.includes("hoy o para mañana") || raw.includes("solo se puede indicar")) {
        return "Solo se pueden reindicar para el día de hoy o para mañana.";
    }
    if (raw.includes("network") || raw.includes("failed to fetch") || raw.includes("timeout")) {
        return "No se pudo completar por un problema de conexión. Intentá de nuevo en unos segundos.";
    }
    if (raw.includes("identidad") || raw.includes("profesional") || raw.includes("operador")) {
        return "Falta identificar correctamente al profesional que indica. Cerrá sesión, volvé a ingresar e intentá otra vez.";
    }
    const original = String((error as Error)?.message || "").trim();
    if (original && original.length < 160 && !/^\d+$/.test(original)) {
        return original;
    }
    return "No se pudo guardar esta indicación. Revisá los datos e intentá de nuevo.";
}

type IndicacionDTO = {
    id: string;
    cantidad?: number | string;
    descripcion?: string;
    profesional?: string;
    fullName?: string,
    frecuencia?: string;
    intervalo?: number;
    observaciones?: string;
    proximo?: string;
    anterior?: string;
    vigenteDesde?: string;
    horaCarga?: string;
    nro?: number | string;
    tipo?: string,
    idSector?: string;
    medicamento?: string;
    ultimaAplicacion?: string;
    proximaAplicacion?: string;
    estado?: string;
    suspendida?: boolean;
    unicaVez?: boolean;
    nuevaEnfermeria?: boolean;
};

interface IndicacionesSectionProps {
    bedId?: string | number;
    patientId?: string | number;
    numeroVisita: number | null;
    patientName?: string;
    patientLocation?: string;
    documentoPaciente?: string;
    fechaIngreso?: string;
    horaIngreso?: string;
}

export default function IndicacionesSection({
    bedId,
    patientId,
    numeroVisita,
    patientName,
    patientLocation,
    documentoPaciente,
    fechaIngreso,
    horaIngreso,
}: IndicacionesSectionProps) {
    const { activeSection, selectedDate, setSelectedDate } = useBedDetail();
    const fechaHoy = toLocalYmd(new Date());
    const fechaManana = addDaysYmd(fechaHoy, 1);

    const indicacionesPath = useMemo(
        () =>
            numeroVisita ? `/indicaciones/${numeroVisita}/byDate` : undefined,
        [numeroVisita]
    );

    const { data, isLoading, error, refetch } = useBedSectionFetch<
        IndicacionDTO[]
    >({
        bedId,
        patientId,
        enabled: !!indicacionesPath && activeSection === "indicaciones",
        endpointOverride: indicacionesPath
            ? { indicaciones: indicacionesPath }
            : undefined,
        cacheTimeMs: 20000,
    });

    // Evita refetch con queryKey viejo tras cambiar de fecha en medio del guardado
    const refetchRef = useRef(refetch);
    refetchRef.current = refetch;
    const refetchListado = useCallback(async () => {
        await refetchRef.current();
    }, []);

    // Re-render cuando el snapshot de "Nueva" (post-limpieza SQL) llega
    const [nuevasSesionTick, setNuevasSesionTick] = useState(0);
    useEffect(() => subscribeNuevasEnfermeriaSesion(() => setNuevasSesionTick((t) => t + 1)), []);

    // Si el listado llega con Estado=N, congelar esos ids en sesión (aunque SQL se limpie después)
    useEffect(() => {
        if (!numeroVisita || !data) return;
        const list: IndicacionDTO[] = Array.isArray(data)
            ? data
            : data && Array.isArray((data as { data?: IndicacionDTO[] }).data)
                ? (data as { data: IndicacionDTO[] }).data
                : [];
        const nros = list
            .filter((x) => Boolean((x as { nuevaEnfermeria?: boolean }).nuevaEnfermeria))
            .map((x) => Number(x.nro ?? x.id))
            .filter((n) => Number.isFinite(n) && n > 0);
        if (nros.length) {
            rememberNuevasEnfermeriaSesion(numeroVisita, nros);
        }
    }, [data, numeroVisita]);

    const baseRows: IndicacionRow[] = useMemo(() => {


        // 🔓 soporta tanto array directo como wrapper {data:[]}
        const list: IndicacionDTO[] = Array.isArray(data)
            ? data
            : data && Array.isArray((data as any).data)
                ? (data as any).data
                : [];


        const rows = list
            .filter((x) => {
                const estado = String(x.estado ?? '').trim().toUpperCase();
                return !x.suspendida && estado !== 'S';
            })
            .map((x) => ({
            id: x.id,
            cantidad: x.cantidad,
            descripcion: x.descripcion,
            profesional: x.profesional,
            fullName: x.fullName,
            frecuencia: x.frecuencia,
            intervalo: x.intervalo,
            observaciones: x.observaciones,
            proximo: x.proximo,
            anterior: x.anterior,
            vigenteDesde: x.vigenteDesde,
            horaCarga: x.horaCarga,
            nro: x.nro,
            tipo: x.tipo,
            promptCodigo: (x as any).promptCodigo,
            ordenTipo: (x as any).ordenTipo,
            idSector: x.idSector,
            medicamento: x.medicamento,
            ultimaAplicacion: x.ultimaAplicacion,
            proximaAplicacion: x.proximaAplicacion,
            estado: x.estado,
            suspendida: x.suspendida,
            unicaVez: x.unicaVez,
            OperadorCarga: (x as any).OperadorCarga ?? (x as any).operadorCarga ?? null,
            matricula: (x as any).matricula ?? (x as any).Matricula ?? null,
            indicacionesHijas: (x as any).indicacionesHijas || [],
            // API (Estado=N) o snapshot de sesión tras limpiar SQL al entrar
            nuevaEnfermeria:
                Boolean((x as any).nuevaEnfermeria) ||
                fueNuevaEnSesion(numeroVisita ?? 0, x.nro ?? x.id),
        }));

        // Ordenar por ordenTipo (campo Orden de imInterTipoIndicacion) y luego por nro
        return rows.sort((a, b) => {
            const ordenA = a.ordenTipo ?? 999;
            const ordenB = b.ordenTipo ?? 999;
            
            if (ordenA !== ordenB) {
                return ordenA - ordenB;
            }
            
            // Si tienen el mismo ordenTipo, ordenar por número de indicación
            const nroA = typeof a.nro === 'number' ? a.nro : parseInt(String(a.nro || '0'));
            const nroB = typeof b.nro === 'number' ? b.nro : parseInt(String(b.nro || '0'));
            return nroA - nroB;
        });
    }, [data, numeroVisita, nuevasSesionTick]);

    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [query, setQuery] = useState("");
    const [helpOpen, setHelpOpen] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    
    // Estado para modo "volver a indicar"
    const [modoReindicar, setModoReindicar] = useState(false);
    const [selectedForReindicar, setSelectedForReindicar] = useState<Set<string>>(new Set());
    const [reindicando, setReindicando] = useState(false);
    const [resultadoReindicar, setResultadoReindicar] = useState<{
        fase: "progreso" | "exito" | "resumen";
        fecha: string;
        fechaYmd: string;
        items: ReindicarItemTrack[];
        porTipo: ReindicarPorTipo[];
    } | null>(null);
    const [confirmarFechaOpen, setConfirmarFechaOpen] = useState(false);

    // Handlers para modo reindicar
    const handleToggleReindicar = (id: string) => {
        setSelectedForReindicar(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const patchItemReindicar = (
        id: string,
        patch: Partial<ReindicarItemTrack>,
    ) => {
        setResultadoReindicar((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                items: prev.items.map((it) =>
                    it.id === id ? { ...it, ...patch } : it,
                ),
            };
        });
    };
    
    const handleConfirmarReindicar = async (fechaYmd: string) => {
        if (selectedForReindicar.size === 0) return;
        
        const indicacionesAReindicar = baseRows.filter(r => selectedForReindicar.has(r.id));
        const itemsIniciales: ReindicarItemTrack[] = indicacionesAReindicar.map((r) => ({
            id: String(r.id),
            descripcion: descripcionIndicacionReindicar(r),
            status: "pendiente",
        }));

        setReindicando(true);
        setResultadoReindicar({
            fase: "progreso",
            fecha: formatearFechaReindicar(fechaYmd),
            fechaYmd,
            items: itemsIniciales,
            porTipo: [],
        });

        try {
            const ahora = new Date();
            const horaBase = ahora.toTimeString().split(' ')[0]; // HH:MM:SS
            
            const porTipoMap = new Map<string, number>();
            let offsetSegundos = 0;

            for (const indicacion of indicacionesAReindicar) {
                const itemId = String(indicacion.id);
                const label = descripcionIndicacionReindicar(indicacion);
                patchItemReindicar(itemId, { status: "cargando" });

                try {
                    const indicacionCompleta = await indicacionesService.getIndicacionesByNroIndicacion(Number(indicacion.nro));
                    
                    if (!indicacionCompleta) {
                        patchItemReindicar(itemId, {
                            status: "error",
                            motivo: "No se pudo leer la indicación original. Intentá de nuevo.",
                        });
                        continue;
                    }

                    // Hora distinta por ítem para evitar choque del índice único
                    // (NumeroVisita + Tipo + Fecha + Hora) al reindicar en lote.
                    const [hh, mm, ss] = horaBase.split(":").map((x) => Number(x) || 0);
                    const totalSeg = hh * 3600 + mm * 60 + ss + offsetSegundos;
                    offsetSegundos += 1;
                    const h2 = Math.floor(totalSeg / 3600) % 24;
                    const m2 = Math.floor((totalSeg % 3600) / 60);
                    const s2 = totalSeg % 60;
                    const horaActual = `${String(h2).padStart(2, "0")}:${String(m2).padStart(2, "0")}:${String(s2).padStart(2, "0")}`;
                    
                    const payload: NuevaIndicacionPayload = {
                        NumeroVisita: numeroVisita,
                        NroAdicional: indicacionCompleta.NroAdicional,
                        FechaCarga: fechaYmd,
                        HoraCarga: horaActual,
                        OperadorCarga: indicacionCompleta.OperadorCarga,
                        ProfesionalAsiste: indicacionCompleta.ProfesionalAsiste,
                        FechaCumplido: null,
                        HoraCumplido: null,
                        FechaProximo: null,
                        HoraProximo: null,
                        FechaRevision: null,
                        HoraRevision: null,
                        TipoIndicacion: indicacionCompleta.TipoIndicacion,
                        Codigo: indicacionCompleta.Codigo,
                        Cantidad: indicacionCompleta.Cantidad,
                        TipoUnidad: indicacionCompleta.TipoUnidad,
                        Frecuencia: indicacionCompleta.Frecuencia,
                        Observaciones: indicacionCompleta.Observaciones,
                        FechaExpiro: null,
                        HoraExpiro: null,
                        CantidadIndicada: indicacionCompleta.CantidadIndicada,
                        Orden: null,
                        Estado: 'N',
                        CantidadPorTurno: indicacionCompleta.CantidadPorTurno,
                        CantidadEntregada: null,
                        ParaFechaEntrega: null,
                        FormaAdicional: indicacionCompleta.FormaAdicional,
                        NroIndicacionAnterior: indicacionCompleta.NroIndicacion,
                        IdSector: indicacionCompleta.IdSector,
                        AliasMedicamento: indicacionCompleta.AliasMedicamento,
                        ExcluidoDeEntrega: indicacionCompleta.ExcluidoDeEntrega,
                    };
                    
                    await indicacionesService.postNuevaIndicacion(payload);
                    patchItemReindicar(itemId, { status: "ok" });
                    const tipo = etiquetaTipoReindicar(indicacion);
                    porTipoMap.set(tipo, (porTipoMap.get(tipo) || 0) + 1);
                } catch (error) {
                    const motivo = motivoErrorReindicar(error);
                    if (motivo.toLowerCase().includes("ya había")) {
                        patchItemReindicar(itemId, { status: "omitida", motivo });
                    } else {
                        patchItemReindicar(itemId, { status: "error", motivo });
                    }
                    console.error('Error al reindicar indicación:', indicacion.nro, error);
                }
            }
            
            const porTipo: ReindicarPorTipo[] = Array.from(porTipoMap.entries())
                .map(([tipo, cantidad]) => ({ tipo, cantidad }))
                .sort((a, b) => b.cantidad - a.cantidad);

            setModoReindicar(false);
            setSelectedForReindicar(new Set());

            // Deja la fase "exito"; el modal avanza a "resumen" tras la animación
            setResultadoReindicar((prev) =>
                prev
                    ? { ...prev, fase: "exito", porTipo }
                    : {
                          fase: "exito",
                          fecha: formatearFechaReindicar(fechaYmd),
                          fechaYmd,
                          items: [],
                          porTipo,
                      },
            );
        } catch (err) {
            console.error('Error al reindicar:', err);
            setResultadoReindicar((prev) => {
                const motivo = motivoErrorReindicar(err);
                const items =
                    prev?.items?.map((it) =>
                        it.status === "ok" || it.status === "omitida" || it.status === "error"
                            ? it
                            : { ...it, status: "error" as const, motivo },
                    ) ?? [
                        {
                            id: "reindicar",
                            descripcion: "Reindicación",
                            status: "error" as const,
                            motivo,
                        },
                    ];
                return {
                    fase: "resumen",
                    fecha: formatearFechaReindicar(fechaYmd),
                    fechaYmd,
                    items,
                    porTipo: prev?.porTipo ?? [],
                };
            });
        } finally {
            setReindicando(false);
        }
    };

    const handleCerrarResultadoReindicar = async () => {
        const destino = resultadoReindicar?.fechaYmd;
        setResultadoReindicar(null);
        if (!destino) return;
        const mismaFecha = selectedDate ? toLocalYmd(selectedDate) === destino : false;
        if (mismaFecha) {
            await refetch();
        } else {
            setSelectedDate(ymdToLocalDate(destino));
        }
    };

    const handleExitoReindicarComplete = useCallback(() => {
        setResultadoReindicar((prev) =>
            prev && prev.fase === "exito" ? { ...prev, fase: "resumen" } : prev,
        );
    }, []);
    
    const handleCancelarReindicar = () => {
        setModoReindicar(false);
        setSelectedForReindicar(new Set());
        setConfirmarFechaOpen(false);
    };

    // Filtrado simple por texto
    const rows = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return baseRows;
        return baseRows.filter((r) => {
            const hay = (v?: string | number) =>
                v != null && String(v).toLowerCase().includes(q);
            return (
                hay(r.descripcion) ||
                hay(r.profesional) ||
                hay(r.frecuencia) ||
                hay(r.fullName) ||
                hay(r.observaciones) ||
                hay(r.medicamento) ||
                hay(r.idSector) ||
                hay(r.nro)
            );
        });
    }, [baseRows, query]);

    if (activeSection !== "indicaciones") return null;

    const tableMaxHeight = "calc(100vh - 15rem)";

    const onAddIndicacion = () => {
        setModalOpen(true);
    };

    const handleSave = async (data: NuevaIndicacionPayload) => {
        setSaving(true);
        try {
            const fechaGuardada =
                data.FechaCarga || fechaIndicacionPermitida(selectedDate);
            // Garantiza NumeroVisita desde props si viniera null
            const finalPayload: NuevaIndicacionPayload = {
                ...data,
                NumeroVisita: data.NumeroVisita ?? numeroVisita,
                FechaCarga: fechaGuardada,
            };
            const resultado = await indicacionesService.postNuevaIndicacion(finalPayload);

            // Si se guardó para otro día, cambiar el calendario.
            // El refetch final lo hace NuevaIndicacionModal tras guardar hijas.
            const mismaFecha = selectedDate
                ? toLocalYmd(selectedDate) === fechaGuardada
                : false;
            if (!mismaFecha) {
                setSelectedDate(ymdToLocalDate(fechaGuardada));
            }

            return resultado;
        } catch (err) {
            if (err instanceof Error) {
                alert(
                    err.message ?? "Error inesperado al guardar la indicación"
                );
            }
            throw err;
        } finally {
            setSaving(false);
        }
    };

    const handleUpdate = async (data: NuevaIndicacionPayload) => {
        setSaving(true);

        try {
            const id = Number(selectedId);
            if (isNaN(id) || id <= 0) {
                throw new Error("ID de indicación inválido para actualizar");
            }

            await indicacionesService.updateIndicacion(
                Number(selectedId),
                data
            );

            await refetch();
        } catch (err) {
            if (err instanceof Error) {
                alert(
                    err.message ??
                    "Error inesperado al actualizar la indicación"
                );
            }
        } finally {
            setSaving(false);
            setSelectedId(null);
        }
    };

    // Formatear fecha seleccionada para mostrar
    const formatSelectedDate = () => {
        if (!selectedDate) return null;
        const date = new Date(selectedDate);
        const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        const diaSemana = dias[date.getDay()];
        const diaMes = date.getDate();
        const mes = meses[date.getMonth()];
        return { diaSemana, diaMes, mes };
    };

    const fechaFormateada = formatSelectedDate();

    const handleExport = async (option: ExportOption, data: any[]) => {
        if (option === 'pdf') {
            const empresaInfo = await obtenerInfoEmpresa();

            const parts = rows.map((row, idx) => ({
                title: `Indicación ${idx + 1}${row.nro != null ? ` · N° ${row.nro}` : ''}`,
                fields: [
                    { label: 'Tipo', value: row.tipo || '—' },
                    { label: 'Descripción', value: row.descripcion || '—' },
                    { label: 'Cantidad', value: row.cantidad ?? '—' },
                    { label: 'Frecuencia', value: row.frecuencia || '—' },
                    { label: 'Observaciones', value: row.observaciones || '—' },
                    { label: 'Sector', value: row.idSector || '—' },
                ],
                profesional: {
                    nombre: row.fullName || 'PROFESIONAL',
                    matricula: (row as any).matricula ?? undefined,
                },
            }));

            await exportToPDF({
                title: 'Indicaciones Médicas',
                subtitle: `Fecha: ${fechaFormateada?.diaSemana} ${fechaFormateada?.diaMes}, ${fechaFormateada?.mes}`,
                parts,
                fileName: `indicaciones_${selectedDate?.toISOString().split('T')[0]}.pdf`,
                orientation: 'portrait',
                empresaInfo,
                patientInfo: {
                    numeroVisita: numeroVisita || undefined,
                    nombre: patientName,
                    numeroDocumento: documentoPaciente,
                    ubicacion: patientLocation,
                    fechaIngreso: fechaIngreso,
                    horaIngreso: horaIngreso
                },
            });
        }
    };

    if (isLoading) {
        return <BedSectionLoading />;
    }

    return (
        <div className={styles.root}>
            {/* Fecha seleccionada + botón agregar */}
            {fechaFormateada && (
                <div className={styles.dateHeader}>
                    <h2 className={styles.sectionTitle}>Indicaciones</h2>
                    <span className={styles.dateNumber}>{fechaFormateada.diaMes}</span>
                    <span className={styles.dateText}>
                        {fechaFormateada.diaSemana} {fechaFormateada.diaMes}, {fechaFormateada.mes}
                    </span>
                    <div className={styles.dateActions}>
                        <button
                            className={`${styles.btn} ${styles.btnPrimary} ${styles.btnAddDate}`}
                            onClick={onAddIndicacion}
                        >
                            <span className={styles.addIcon} aria-hidden>
                                +
                            </span>
                            Indicación
                        </button>
                        <ExportButton
                            data={rows}
                            fileName={`indicaciones_${selectedDate?.toISOString().split('T')[0]}.pdf`}
                            onExport={handleExport}
                            options={['pdf']}
                        />
                    </div>
                </div>
            )}

            {/* Toolbar: búsqueda + acciones */}
            <div className={styles.toolbar}>
                <div className={styles.searchWrap}>
                    <span className={styles.searchIcon} aria-hidden>
                        🔎
                    </span>
                    <input
                        className={styles.searchInput}
                        type="text"
                        placeholder="Buscar por descripción, profesional, medicamento, sector, nro…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </div>

                <div className={styles.actions}>
                    {modoReindicar && (
                        <>
                            <button
                                className={`${styles.btn} ${styles.btnSuccess} ${reindicando ? styles.btnAnimated : ''}`}
                                onClick={() => setConfirmarFechaOpen(true)}
                                disabled={selectedForReindicar.size === 0 || reindicando}
                            >
                                <span className={styles.btnIcon} aria-hidden>
                                    ✓
                                </span>
                                {reindicando ? 'Reindicando...' : `Reindicar ${selectedForReindicar.size} indicación${selectedForReindicar.size !== 1 ? 'es' : ''}`}
                            </button>
                            <button
                                className={`${styles.btn} ${styles.btnGhost}`}
                                onClick={handleCancelarReindicar}
                                disabled={reindicando}
                            >
                                Cancelar
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Contenedor flexible para la tabla */}
            <div className={styles.content}>
                <div className={styles.tableHolder}>
                    {error ? (
                        <div className={styles.errorBox}>
                            <div>
                                Error cargando indicaciones: {error.message}
                            </div>
                        </div>
                    ) : rows.length === 0 ? (
                        <EmptyState
                            variant="indicaciones"
                            text={baseRows.length === 0 ? 'Sin indicaciones registradas' : 'Sin resultados'}
                            description={
                                baseRows.length === 0
                                    ? 'Cargá una indicación con el botón de arriba.'
                                    : 'Probá con otro criterio de búsqueda.'
                            }
                            actionLabel={baseRows.length === 0 ? 'Nueva Indicación' : undefined}
                            onAction={baseRows.length === 0 ? onAddIndicacion : undefined}
                        />
                    ) : (
                        <IndicacionesTable
                            rows={rows}
                            onSelectRow={(id) => setSelectedId(id)}
                            maxHeight={tableMaxHeight}
                            refetch={refetch}
                            numeroVisita={numeroVisita ? String(numeroVisita) : ""}
                            modoReindicar={modoReindicar}
                            selectedForReindicar={selectedForReindicar}
                            onToggleReindicar={handleToggleReindicar}
                            onActivarModoReindicar={() => setModoReindicar(true)}
                        />
                    )}
                </div>
            </div>

            {/* Modal de ayuda (placeholder) */}
            {helpOpen && <IndicativoColors setHelpOpen={setHelpOpen} />}

            {/* Modal de nueva indicación */}

            <ModalBasePaciente
                numeroVisita={numeroVisita ? String(numeroVisita) : ""}
                onClose={() => setModalOpen(false)}
                isOpen={modalOpen}
                titulo="Agregando nueva Indicación"
                footerButtons={
                    <>
                        <button
                            className={styles.btn + " " + styles.btnPrimary}
                            type="submit"
                            form="nueva-indicacion-form"
                            disabled={saving}
                        >
                            {saving ? "Guardando…" : "Guardar"}
                        </button>
                    </>
                } // usamos el footer interno del form
            >
                <NuevaIndicacionModal
                    onClose={() => setModalOpen(false)}
                    onSave={handleSave}
                    defaultNumeroVisita={numeroVisita}
                    refetch={refetchListado}
                    fechaCarga={fechaIndicacionPermitida(selectedDate)}
                />
            </ModalBasePaciente>

            <ModalBasePaciente
                numeroVisita={numeroVisita ? String(numeroVisita) : ""}
                onClose={() => setSelectedId(null)}
                isOpen={selectedId !== null}
                titulo="Actualizando una Indicación"
                footerButtons={
                    <>
                        <button
                            className={styles.btn + " " + styles.btnPrimary}
                            type="submit"
                            form="nueva-indicacion-form"
                            disabled={saving}
                        >
                            {saving ? "Guardando…" : "Guardar"}
                        </button>
                    </>
                } // usamos el footer interno del form
            >
                <NuevaIndicacionModal
                    onClose={() => setSelectedId(null)}
                    onSave={handleUpdate}
                    defaultNumeroVisita={numeroVisita}
                    nroIndicacion={selectedId}
                    refetch={refetchListado}
                />
            </ModalBasePaciente>

            <ConfirmarFechaReindicarModal
                isOpen={confirmarFechaOpen && !reindicando}
                cantidad={selectedForReindicar.size}
                fechaHoy={fechaHoy}
                fechaManana={fechaManana}
                onCancel={() => setConfirmarFechaOpen(false)}
                onElegir={(ymd) => {
                    setConfirmarFechaOpen(false);
                    void handleConfirmarReindicar(ymd);
                }}
            />

            <ResultadoReindicarModal
                isOpen={resultadoReindicar !== null}
                fase={resultadoReindicar?.fase ?? "progreso"}
                fecha={resultadoReindicar?.fecha ?? ""}
                items={resultadoReindicar?.items ?? []}
                porTipo={resultadoReindicar?.porTipo ?? []}
                onClose={() => {
                    void handleCerrarResultadoReindicar();
                }}
                onExitoComplete={handleExitoReindicarComplete}
            />
        </div>
    );
}
