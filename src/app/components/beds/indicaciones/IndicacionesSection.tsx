"use client";

import { useMemo, useState } from "react";
import { useBedSectionFetch } from "../contexts/useBedSectionQuery";
import IndicacionesTable, { IndicacionRow } from "./IndicacionesTable";
import { useBedDetail } from "../contexts/BedDetailContext";
import styles from "./IndicacionesSection.module.css";
import IndicativoColors from "./IdicativosColors";
import NuevaIndicacionModal from "../../indicaciones/NuevaIndicacionModal";
import { NuevaIndicacionPayload } from "../../../types/indicaciones";
import ModalBasePaciente from "../../modals/ModalBasePaciente";
import { indicacionesService } from "../../../services/indicacionesService";
import ExportButton, { ExportOption } from '../shared/ExportButton';
import { exportToPDF } from '../../../utils/pdfExport';
import { obtenerInfoEmpresa } from '../../../services/empresaService';


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
    const { activeSection, selectedDate } = useBedDetail();

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
        cacheTimeMs: 0,
    });



    const baseRows: IndicacionRow[] = useMemo(() => {


        // 🔓 soporta tanto array directo como wrapper {data:[]}
        const list: IndicacionDTO[] = Array.isArray(data)
            ? data
            : data && Array.isArray((data as any).data)
                ? (data as any).data
                : [];


        return list.map((x) => ({
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
            idSector: x.idSector,
            medicamento: x.medicamento,
            ultimaAplicacion: x.ultimaAplicacion,
            proximaAplicacion: x.proximaAplicacion,
            estado: x.estado,
            suspendida: x.suspendida,
            unicaVez: x.unicaVez,
            indicacionesHijas: (x as any).indicacionesHijas || [],
        }));
    }, [data]);

    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [query, setQuery] = useState("");
    const [helpOpen, setHelpOpen] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    
    // Estado para modo "volver a indicar"
    const [modoReindicar, setModoReindicar] = useState(false);
    const [selectedForReindicar, setSelectedForReindicar] = useState<Set<string>>(new Set());
    const [reindicando, setReindicando] = useState(false);

    if (activeSection !== "indicaciones") return null;
    
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
    
    const handleConfirmarReindicar = async () => {
        if (selectedForReindicar.size === 0) return;
        
        setReindicando(true);
        try {
            // Obtener las indicaciones seleccionadas
            const indicacionesAReindicar = baseRows.filter(r => selectedForReindicar.has(r.id));
            
            // Obtener fecha y hora actual
            const ahora = new Date();
            const fechaActual = ahora.toISOString().split('T')[0]; // YYYY-MM-DD
            const horaActual = ahora.toTimeString().split(' ')[0]; // HH:mm:ss
            
            // Reindicar cada una
            let exitosas = 0;
            let fallidas = 0;
            
            for (const indicacion of indicacionesAReindicar) {
                try {
                    // Obtener la indicación completa del backend para tener todos los datos
                    const indicacionCompleta = await indicacionesService.getIndicacionesByNroIndicacion(Number(indicacion.nro));
                    
                    if (!indicacionCompleta) {
                        console.error('No se pudo obtener la indicación completa:', indicacion.nro);
                        fallidas++;
                        continue;
                    }
                    
                    // Crear payload con los datos de la indicación original pero con fecha actual
                    const payload: NuevaIndicacionPayload = {
                        NumeroVisita: numeroVisita,
                        NroAdicional: indicacionCompleta.NroAdicional,
                        FechaCarga: fechaActual,
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
                        Estado: 'A',
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
                    exitosas++;
                } catch (error) {
                    console.error('Error al reindicar indicación:', indicacion.nro, error);
                    fallidas++;
                }
            }
            
            // Mostrar resultado
            if (exitosas > 0) {
                alert(`Se reindicaron exitosamente ${exitosas} indicación(es) con fecha ${fechaActual}`);
            }
            if (fallidas > 0) {
                alert(`No se pudieron reindicar ${fallidas} indicación(es). Ver consola para detalles.`);
            }
            
            // Refrescar y salir del modo reindicar
            await refetch();
            setModoReindicar(false);
            setSelectedForReindicar(new Set());
        } catch (err) {
            console.error('Error al reindicar:', err);
            alert('Error al reindicar las indicaciones');
        } finally {
            setReindicando(false);
        }
    };
    
    const handleCancelarReindicar = () => {
        setModoReindicar(false);
        setSelectedForReindicar(new Set());
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

    const tableMaxHeight = "calc(100vh - 15rem)";

    const onAddIndicacion = () => {
        setModalOpen(true);
    };

    const handleSave = async (data: NuevaIndicacionPayload) => {
        setSaving(true);
        try {
            // Garantiza NumeroVisita desde props si viniera null
            const finalPayload: NuevaIndicacionPayload = {
                ...data,
                NumeroVisita: data.NumeroVisita ?? numeroVisita,
            };
            const resultado = await indicacionesService.postNuevaIndicacion(finalPayload);
            
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
            const primeraIndicacion = rows[0];
            const profesionalInfo = primeraIndicacion ? {
                nombre: String(primeraIndicacion.fullName || 'PROFESIONAL'),
                matricula: undefined,
                especialidad: undefined
            } : undefined;

            const pdfData = rows.map(row => [
                row.descripcion || '-',
                row.cantidad || '-',
                row.frecuencia || '-',
                row.fullName || '-',
                row.tipo || '-'
            ]);

            exportToPDF({
                title: 'Indicaciones Médicas',
                subtitle: `Fecha: ${fechaFormateada?.diaSemana} ${fechaFormateada?.diaMes}, ${fechaFormateada?.mes}`,
                headers: ['Descripción', 'Cantidad', 'Frecuencia', 'Profesional', 'Tipo'],
                data: pdfData,
                fileName: `indicaciones_${selectedDate?.toISOString().split('T')[0]}.pdf`,
                orientation: 'landscape',
                empresaInfo,
                patientInfo: {
                    numeroVisita: numeroVisita || undefined,
                    nombre: patientName,
                    numeroDocumento: documentoPaciente,
                    ubicacion: patientLocation,
                    fechaIngreso: fechaIngreso,
                    horaIngreso: horaIngreso
                },
                profesionalInfo
            });
        }
    };

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
                                onClick={handleConfirmarReindicar}
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
                    {isLoading && (
                        <div className={styles.loadingOverlay}>
                            Cargando indicaciones…
                        </div>
                    )}

                    {error ? (
                        <div className={styles.errorBox}>
                            <div>
                                Error cargando indicaciones: {error.message}
                            </div>
                        </div>
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
                    refetch={refetch}
                    fechaCarga={selectedDate}
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
                />
            </ModalBasePaciente>
        </div>
    );
}
