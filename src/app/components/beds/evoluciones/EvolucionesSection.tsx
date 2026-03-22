"use client";

import { useMemo, useState } from "react";
import { useBedSectionFetch } from "../contexts/useBedSectionQuery";
import { useBedDetail } from '../contexts/BedDetailContext';
import NuevaEvolucionModal from "./NuevaEvolucionModal";
import { NuevaEvolucionPayload } from "../../../types/evoluciones";
import ModalBasePaciente from "../../modals/ModalBasePaciente";
import { evolucionesService } from "../../../services/evolucionesService";
import EvolucionesTable, { EvolucionRow } from "./EvolucionesTable";
import styles from './EvolucionesSection.module.css';
import ExportButton, { ExportOption } from '../shared/ExportButton';
import { exportToPDF } from '../../../utils/pdfExport';
import { obtenerInfoEmpresa } from '../../../services/empresaService';

type EvolucionDTO = {
    idHCEvolucion: number;
    idVisita: number;
    nroHC?: string;
    fechaEv: string;
    horaEv: string;
    idSector?: string;
    profesional?: number;
    evolucion: string;
    numeroDocumento?: string;
    profesionalNombre?: string;
    profesionalApellido?: string;
};

type PeriodFilter = '0' | '7' | '30' | 'all';

export default function EvolucionesSection({
    bedId,
    patientId,
    numeroVisita,
    patientName,
    patientLocation,
    documentoPaciente,
    fechaIngreso,
    horaIngreso,
}: {
    bedId?: string | number;
    patientId?: string | number;
    numeroVisita: number | null;
    patientName?: string;
    patientLocation?: string;
    documentoPaciente?: string;
    fechaIngreso?: string;
    horaIngreso?: string;
}) {
    const { activeSection, selectedDate } = useBedDetail();
    const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('0');

    const evolucionesPath = useMemo(
        () =>
            numeroVisita ? `/evoluciones/${numeroVisita}/byDate?days=${periodFilter}` : undefined,
        [numeroVisita, periodFilter]
    );

    const { data, isLoading, error, refetch } = useBedSectionFetch<
        EvolucionDTO[]
    >({
        bedId,
        patientId,
        enabled: !!evolucionesPath && activeSection === "evoluciones",
        endpointOverride: evolucionesPath
            ? { evoluciones: evolucionesPath }
            : undefined,
        cacheTimeMs: 0,
    });

    const baseRows: EvolucionRow[] = useMemo(() => {
        const list: any[] = Array.isArray(data)
            ? data
            : data && Array.isArray((data as any).data)
                ? (data as any).data
                : [];

        return list.map((x) => ({
            id: x.IdHCEvolucion || x.idHCEvolucion,
            idVisita: x.IdVisita || x.idVisita,
            nroHC: x.NroHC || x.nroHC,
            fechaEv: x.FechaEv || x.fechaEv,
            horaEv: x.HoraEv || x.horaEv,
            idSector: x.IdSector || x.idSector,
            profesional: x.Profesional || x.profesional,
            evolucion: x.Evolucion || x.evolucion,
            numeroDocumento: x.NumeroDocumento || x.numeroDocumento,
            profesionalNombre: x.ProfesionalNombre || x.profesionalNombre,
            profesionalApellido: x.ProfesionalApellido || x.profesionalApellido,
            profesionalNombreCompleto: x.ProfesionalNombreCompleto || x.profesionalNombreCompleto,
        }));
    }, [data]);

    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [query, setQuery] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    if (activeSection !== "evoluciones") return null;

    // Filtrado simple por texto
    const rows = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return baseRows;
        return baseRows.filter((r) => {
            const hay = (v?: string | number) =>
                v != null && String(v).toLowerCase().includes(q);
            return (
                hay(r.evolucion) ||
                hay(r.profesionalNombre) ||
                hay(r.profesionalApellido) ||
                hay(r.idSector) ||
                hay(r.nroHC)
            );
        });
    }, [baseRows, query]);

    const onAddEvolucion = () => {
        setModalOpen(true);
    };

    const handleSave = async (data: NuevaEvolucionPayload) => {
        setSaving(true);
        try {
            const finalPayload: NuevaEvolucionPayload = {
                ...data,
                IdVisita: data.IdVisita ?? numeroVisita ?? 0,
            };
            
            if (selectedId) {
                // Modo edición - actualizar evolución existente
                await evolucionesService.updateEvolucion(selectedId, finalPayload);
            } else {
                // Modo creación - crear nueva evolución
                await evolucionesService.postNuevaEvolucion(finalPayload);
            }
            
            return finalPayload;
        } catch (err) {
            if (err instanceof Error) {
                alert(
                    err.message ?? "Error inesperado al guardar la evolución"
                );
            }
            throw err;
        } finally {
            setSaving(false);
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
            // Obtener información de la empresa
            const empresaInfo = await obtenerInfoEmpresa();

            // Obtener información del profesional de la primera evolución (si existe)
            const primeraEvolucion = rows[0];
            const profesionalInfo = primeraEvolucion ? {
                nombre: String(primeraEvolucion.profesional || 'PROFESIONAL'),
                matricula: undefined,
                especialidad: undefined
            } : undefined;

            const pdfData = rows.map(row => [
                row.fechaEv || '-',
                row.horaEv || '-',
                row.profesionalNombreCompleto || '-',
                row.evolucion || '-',
                row.idSector || '-'
            ]);

            exportToPDF({
                title: 'Evoluciones Médicas',
                subtitle: `Fecha: ${fechaFormateada?.diaSemana} ${fechaFormateada?.diaMes}, ${fechaFormateada?.mes}`,
                headers: ['Fecha', 'Hora', 'Profesional', 'Evolución', 'Sector'],
                data: pdfData,
                fileName: `evoluciones_${selectedDate?.toISOString().split('T')[0]}.pdf`,
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
                    <h2 className={styles.sectionTitle}>Evoluciones</h2>
                    <span className={styles.dateNumber}>{fechaFormateada.diaMes}</span>
                    <span className={styles.dateText}>{fechaFormateada.diaSemana} {fechaFormateada.diaMes}, {fechaFormateada.mes}</span>
                    <div className={styles.dateActions}>
                        <button
                            className={`${styles.btn} ${styles.btnPrimary} ${styles.btnAddDate}`}
                            onClick={onAddEvolucion}
                        >
                            <span className={styles.addIcon} aria-hidden>
                                +
                            </span>
                            Evolución
                        </button>
                        <ExportButton
                            data={rows}
                            fileName={`evoluciones_${selectedDate?.toISOString().split('T')[0]}.pdf`}
                            onExport={handleExport}
                            options={['pdf']}
                        />
                    </div>
                </div>
            )}

            {/* Buscador y filtros */}
            <div className={styles.toolbar}>
                <div className={styles.searchWrap}>
                    <span className={styles.searchIcon}>🔍</span>
                    <input
                        type="text"
                        placeholder="Buscar por profesional, evolución, sector..."
                        className={styles.searchInput}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </div>
                <div className={styles.periodFilters}>
                    <button
                        className={`${styles.periodTag} ${periodFilter === '0' ? styles.periodTagActive : ''}`}
                        onClick={() => setPeriodFilter('0')}
                    >
                        Hoy
                    </button>
                    <button
                        className={`${styles.periodTag} ${periodFilter === '7' ? styles.periodTagActive : ''}`}
                        onClick={() => setPeriodFilter('7')}
                    >
                        7 días
                    </button>
                    <button
                        className={`${styles.periodTag} ${periodFilter === '30' ? styles.periodTagActive : ''}`}
                        onClick={() => setPeriodFilter('30')}
                    >
                        1 mes
                    </button>
                    <button
                        className={`${styles.periodTag} ${periodFilter === 'all' ? styles.periodTagActive : ''}`}
                        onClick={() => setPeriodFilter('all')}
                    >
                        Todas
                    </button>
                </div>
            </div>

            {/* Tabla */}
            <div className={styles.content}>
                <div className={styles.tableHolder}>
                    {isLoading && (
                        <div className={styles.loadingOverlay}>Cargando evoluciones...</div>
                    )}
                    {error && (
                        <div className={styles.errorBox}>
                            Error al cargar evoluciones: {error.message}
                        </div>
                    )}
                    {!isLoading && !error && (
                        <EvolucionesTable
                            rows={rows}
                            onSelectRow={setSelectedId}
                            selectedId={selectedId}
                            refetch={refetch}
                        />
                    )}
                </div>
            </div>

            {/* Modal de nueva/editar evolución */}
            <ModalBasePaciente
                numeroVisita={numeroVisita ? String(numeroVisita) : ""}
                onClose={() => {
                    setModalOpen(false);
                    setSelectedId(null);
                }}
                isOpen={modalOpen || selectedId !== null}
                titulo={selectedId !== null ? "Editando Evolución" : "Agregando nueva Evolución"}
                footerButtons={
                    <>
                        <button
                            className={styles.btn + " " + styles.btnPrimary}
                            type="submit"
                            form="nueva-evolucion-form"
                            disabled={saving}
                        >
                            {saving ? "Guardando…" : (selectedId !== null ? "Actualizar" : "Guardar")}
                        </button>
                    </>
                }
            >
                <NuevaEvolucionModal
                    onClose={() => {
                        setModalOpen(false);
                        setSelectedId(null);
                    }}
                    onSave={handleSave}
                    defaultIdVisita={numeroVisita}
                    documentoPaciente={documentoPaciente}
                    idEvolucion={selectedId}
                    refetch={refetch}
                />
            </ModalBasePaciente>
        </div>
    );
}
