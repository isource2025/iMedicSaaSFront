"use client";

import { useState, useMemo, useEffect } from "react";
import styles from "./HCIngresoSection.module.css";
import { useBedDetail } from "../contexts/BedDetailContext";
import { HCIngresoRecord } from "@/app/types/hcIngreso";
import { obtenerHCIngresoPorVisita } from "@/app/services/hcIngresoService";

// Secciones de la HC de Ingreso para el modo edición
const HC_SECTIONS = [
    { id: "antecedentes", label: "Antecedentes", required: false },
    { id: "motivo", label: "Motivo y Enfermedad", required: true },
    { id: "signos-vitales", label: "Signos vitales", required: false },
    { id: "piel-faneras", label: "Piel y Faneras", required: false },
    { id: "tejido-subcutaneo", label: "Tejido Subcutáneo", required: false },
    { id: "sistema-linfatico", label: "Sistema Linfático", required: false },
    { id: "sistema-osteo", label: "Sistema Osteo-Artículo-Muscular", required: false },
    { id: "cabeza", label: "Cabeza", required: false },
    { id: "cuello", label: "Cuello", required: false },
    { id: "mamas", label: "Mamas", required: false },
    { id: "sistema-venoso", label: "Sistema Venoso", required: false },
    { id: "aparato-respiratorio", label: "Aparato Respiratorio", required: false },
    { id: "aparato-cardiovascular", label: "Aparato Cardiovascular", required: false },
    { id: "abdomen", label: "Abdomen", required: false },
    { id: "aparato-urogenital", label: "Aparato Urogenital", required: false },
    { id: "examen-ginecologico", label: "Examen Ginecológico", required: false },
    { id: "examen-obstetrico", label: "Examen Obstétrico", required: false },
    { id: "sistema-nervioso", label: "Sistema Nervioso", required: false },
    { id: "examen-oftalmologico", label: "Examen Oftalmológico", required: false },
    { id: "electrocardiograma", label: "Electrocardiograma", required: false },
    { id: "radiografia-torax", label: "Radiografía de Tórax", required: false },
    { id: "impresion-diagnostica", label: "Impresión Diagnóstica", required: false },
    { id: "plan-diagnostico", label: "Plan Diagnóstico", required: false },
    { id: "plan-terapeutico", label: "Plan Terapéutico", required: false },
    { id: "examen-complementario", label: "Examen Complementario", required: false },
];

interface HCIngresoSectionProps {
    bedId?: string | number;
    patientId?: string | number;
    numeroVisita: number | null;
    patientName?: string;
    patientLocation?: string;
    documentoPaciente?: string;
}

type ViewMode = "view" | "add" | "edit";

export default function HCIngresoSection({
    bedId,
    patientId,
    numeroVisita,
    patientName,
    patientLocation,
    documentoPaciente,
}: HCIngresoSectionProps) {
    const { selectedDate } = useBedDetail();
    
    // Estado del componente
    const [mode, setMode] = useState<ViewMode>("view");
    const [records, setRecords] = useState<HCIngresoRecord[]>([]);
    const [selectedRecordId, setSelectedRecordId] = useState<number | null>(null);
    const [activeSection, setActiveSection] = useState<string>("antecedentes");
    const [showOnlySelectedDay, setShowOnlySelectedDay] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    
    // Estado del formulario (para modo add/edit)
    const [formData, setFormData] = useState({
        fecha: "",
        hora: "",
        profesionalId: "",
        sector: "",
        motivoConsulta: "",
        enfermedadActual: "",
        antecedentes: "",
    });

    // Cargar datos desde el backend
    useEffect(() => {
        if (!numeroVisita) return;

        const cargarDatos = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await obtenerHCIngresoPorVisita(numeroVisita);
                setRecords(data);
                if (data.length > 0 && !selectedRecordId) {
                    setSelectedRecordId(data[0].IdHCIngreso);
                }
            } catch (err) {
                console.error("Error al cargar HC de Ingreso:", err);
                setError("Error al cargar la historia clínica de ingreso");
            } finally {
                setLoading(false);
            }
        };

        cargarDatos();
    }, [numeroVisita]);

    // Filtrar registros por fecha si está activo el checkbox
    const filteredRecords = useMemo(() => {
        if (!showOnlySelectedDay || !selectedDate) return records;
        const dateStr = selectedDate.toISOString().split("T")[0];
        return records.filter((r: HCIngresoRecord) => {
            if (!r.FechaFormateada) return false;
            return r.FechaFormateada === dateStr;
        });
    }, [showOnlySelectedDay, selectedDate, records]);

    // Registro seleccionado
    const selectedRecord = useMemo(() => {
        return records.find((r: HCIngresoRecord) => r.IdHCIngreso === selectedRecordId) || null;
    }, [selectedRecordId, records]);

    // Formatear fecha seleccionada para mostrar
    const formatSelectedDate = () => {
        if (!selectedDate) return null;
        const date = new Date(selectedDate);
        const dias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
        const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        const diaSemana = dias[date.getDay()];
        const diaMes = date.getDate();
        const mes = meses[date.getMonth()];
        return { diaSemana, diaMes, mes };
    };

    const fechaFormateada = formatSelectedDate();

    // Handlers
    const handleAdd = () => {
        setFormData({
            fecha: new Date().toISOString().split("T")[0],
            hora: new Date().toTimeString().slice(0, 5),
            profesionalId: "",
            sector: "",
            motivoConsulta: "",
            enfermedadActual: "",
            antecedentes: "",
        });
        setActiveSection("antecedentes");
        setMode("add");
    };

    const handleEdit = () => {
        if (!selectedRecord) return;
        setFormData({
            fecha: "", // Fecha no disponible en el modelo actual
            hora: "", // Hora no disponible en el modelo actual
            profesionalId: String(selectedRecord.IdProfecional || ""),
            sector: selectedRecord.IdSector,
            motivoConsulta: selectedRecord.MotivoConsulta,
            enfermedadActual: selectedRecord.EnfermedadActual,
            antecedentes: (selectedRecord as any).Antecedentes || "",
        });
        setActiveSection("antecedentes");
        setMode("edit");
    };

    const handleCancel = () => {
        setMode("view");
    };

    const handleSave = () => {
        // TODO: Implementar guardado real
        console.log("Guardando:", formData);
        setMode("view");
    };

    const handleDelete = () => {
        // TODO: Implementar borrado real
        if (confirm("¿Está seguro de que desea borrar este registro?")) {
            console.log("Borrando:", selectedRecordId);
        }
    };

    // ===== RENDER: MODO VIEW =====
    if (mode === "view") {
        return (
            <div className={styles.root}>
                {/* Header con fecha */}
                {fechaFormateada && (
                    <div className={styles.dateHeader}>
                        <h2 className={styles.sectionTitle}>HC de Ingreso</h2>
                        <span className={styles.dateNumber}>{fechaFormateada.diaMes}</span>
                        <span className={styles.dateText}>
                            {fechaFormateada.diaSemana} {fechaFormateada.diaMes}, {fechaFormateada.mes}
                        </span>
                        <div className={styles.dateActions}>
                            <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnAddDate}`} onClick={handleAdd}>
                                <span className={styles.addIcon}>+</span> Agregar
                            </button>
                        </div>
                    </div>
                )}

                {/* Mostrar estado de carga o error */}
                {loading && (
                    <div className={styles.loadingMessage}>
                        Cargando historia clínica de ingreso...
                    </div>
                )}

                {error && (
                    <div className={styles.errorMessage}>
                        {error}
                    </div>
                )}

                {/* Toolbar con selector y botones */}
                {!loading && !error && (
                <div className={styles.toolbar}>
                    <div className={styles.toolbarLeft}>
                        {/* Selector de registros - Custom Dropdown */}
                        <div className={styles.customDropdown}>
                            <div 
                                className={styles.dropdownTrigger}
                                onClick={() => setDropdownOpen(!dropdownOpen)}
                            >
                                <span className={styles.dropdownValue}>
                                    {selectedRecord 
                                        ? `${selectedRecord.FechaFormateada || "-"} ${selectedRecord.HoraFormateada || ""} - ${selectedRecord.SectorDescripcion || selectedRecord.IdSector}`
                                        : "Seleccionar ingreso..."}
                                </span>
                                <span className={styles.dropdownArrow}>{dropdownOpen ? "▲" : "▼"}</span>
                            </div>
                            {dropdownOpen && (
                                <ul className={styles.dropdownMenu}>
                                    {records.map((record) => (
                                        <li 
                                            key={record.IdHCIngreso}
                                            className={`${styles.dropdownItem} ${selectedRecordId === record.IdHCIngreso ? styles.dropdownItemActive : ""}`}
                                            onClick={() => {
                                                setSelectedRecordId(record.IdHCIngreso);
                                                setDropdownOpen(false);
                                            }}
                                        >
                                            {record.FechaFormateada || "-"} {record.HoraFormateada || ""} - {record.SectorDescripcion || record.IdSector}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {/* Botones Agregar (solo mobile), Modificar y Eliminar */}
                        <div className={styles.actionButtonsRow}>
                            <button 
                                className={`${styles.btn} ${styles.btnPrimary} ${styles.btnAddMobile}`} 
                                onClick={handleAdd}
                            >
                                <span className={styles.addIcon}>+</span> Agregar
                            </button>
                            <button 
                                className={styles.btnSecondary} 
                                onClick={handleEdit} 
                                disabled={!selectedRecord}
                            >
                                <span className={styles.btnIcon}>✏️</span> Modificar
                            </button>
                            <button 
                                className={styles.btnDanger} 
                                onClick={handleDelete} 
                                disabled={!selectedRecord}
                            >
                                <span className={styles.btnIcon}>✕</span> Eliminar
                            </button>
                        </div>
                    </div>

                    <div className={styles.toolbarRight}>
                        {/* Botones PDF y Recetario */}
                        <button className={styles.btnOutline}>
                            <span className={styles.btnIcon}>📄</span> PDF
                        </button>
                        <button className={styles.btnOutline}>
                            + Recetario
                        </button>
                    </div>
                </div>
                )}

                {/* Barra flotante inferior para mobile */}
                {!loading && !error && (
                <div className={styles.mobileBottomBar}>
                    <button className={styles.btnOutline}>
                        <span className={styles.btnIcon}>📄</span> PDF
                    </button>
                    <button className={styles.btnOutline}>
                        + Recetario
                    </button>
                </div>
                )}

                {/* Panel de detalle del registro */}
                {!loading && !error && (
                <div className={styles.detailPanelFull}>
                    {selectedRecord ? (
                        <div className={styles.detailContent}>
                            <h3 className={styles.detailTitle}>HC de Ingreso</h3>
                            <p className={styles.detailPatient}>
                                {patientName || "PACIENTE"} - DNI: {documentoPaciente || "N/A"}
                            </p>

                            <div className={styles.detailSection}>
                                <div className={styles.detailRow}>
                                    <span className={styles.detailLabel}>N. Visita:</span>
                                    <span className={styles.detailValue}>{selectedRecord.NumeroVisita}</span>
                                </div>
                            </div>

                            <div className={styles.detailSection}>
                                <div className={styles.detailMeta}>
                                    {selectedRecord.FechaFormateada && (
                                        <span>Fecha: {selectedRecord.FechaFormateada} {selectedRecord.HoraFormateada || ""}</span>
                                    )}
                                    <span>Profesional: {selectedRecord.IdProfecional} {selectedRecord.ProfesionalNombre || ""}</span>
                                    <span>Sector: {selectedRecord.SectorDescripcion || selectedRecord.IdSector}</span>
                                </div>
                            </div>

                            <div className={styles.detailSection}>
                                <p className={styles.detailLabel}>Motivo Consulta:</p>
                                <p className={styles.detailText}>{selectedRecord.MotivoConsulta}</p>
                            </div>

                            <div className={styles.detailSection}>
                                <p className={styles.detailLabel}>Enfermedad Actual:</p>
                                <p className={styles.detailText}>{selectedRecord.EnfermedadActual}</p>
                            </div>
                        </div>
                    ) : records.length === 0 ? (
                        <div className={styles.emptyDetail}>
                            No hay registros de HC de Ingreso
                        </div>
                    ) : null}
                </div>
                )}
            </div>
        );
    }

    // ===== RENDER: MODO ADD/EDIT =====
    return (
        <div className={styles.root}>
            {/* Header con fecha */}
            {fechaFormateada && (
                <div className={styles.dateHeader}>
                    <h2 className={styles.sectionTitle}>HC de Ingreso</h2>
                    <span className={styles.dateNumber}>{fechaFormateada.diaMes}</span>
                    <span className={styles.dateText}>
                        {fechaFormateada.diaSemana} {fechaFormateada.diaMes}, {fechaFormateada.mes}
                    </span>
                </div>
            )}

            {/* Contenido del formulario */}
            <div className={styles.editContent}>
                {/* Sidebar de secciones */}
                <div className={styles.sectionsSidebar}>
                    <h3 className={styles.sidebarTitle}>HC DE INGRESO</h3>
                    <ul className={styles.sectionsList}>
                        {HC_SECTIONS.map((section) => (
                            <li
                                key={section.id}
                                className={`${styles.sectionItem} ${activeSection === section.id ? styles.sectionItemActive : ""}`}
                                onClick={() => setActiveSection(section.id)}
                            >
                                {activeSection === section.id && <span className={styles.sectionIndicator}>●</span>}
                                <span className={styles.sectionLabel}>{section.label}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Panel del formulario */}
                <div className={styles.formPanel}>
                    <h3 className={styles.formTitle}>
                        {HC_SECTIONS.find((s) => s.id === activeSection)?.label || "Sección"}
                    </h3>

                    {activeSection === "motivo" && (
                        <div className={styles.formFields}>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Nro Visita</label>
                                    <input
                                        type="text"
                                        className={styles.formInput}
                                        value={numeroVisita || ""}
                                        disabled
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Fecha y hora</label>
                                    <div className={styles.formInputRow}>
                                        <input
                                            type="date"
                                            className={styles.formInput}
                                            value={formData.fecha}
                                            onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                                        />
                                        <input
                                            type="time"
                                            className={styles.formInput}
                                            value={formData.hora}
                                            onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>ID Profesional</label>
                                    <input
                                        type="text"
                                        className={styles.formInput}
                                        value={formData.profesionalId}
                                        onChange={(e) => setFormData({ ...formData, profesionalId: e.target.value })}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Sector</label>
                                    <input
                                        type="text"
                                        className={styles.formInput}
                                        value={formData.sector}
                                        onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className={styles.formGroupFull}>
                                <label className={styles.formLabel}>Motivo consulta</label>
                                <input
                                    type="text"
                                    className={styles.formInput}
                                    value={formData.motivoConsulta}
                                    onChange={(e) => setFormData({ ...formData, motivoConsulta: e.target.value })}
                                />
                            </div>

                            <div className={styles.formGroupFull}>
                                <label className={styles.formLabel}>Enfermedad actual</label>
                                <textarea
                                    className={styles.formTextarea}
                                    rows={8}
                                    value={formData.enfermedadActual}
                                    onChange={(e) => setFormData({ ...formData, enfermedadActual: e.target.value })}
                                />
                            </div>
                        </div>
                    )}

                    {activeSection === "antecedentes" && (
                        <div className={styles.formFields}>
                            <div className={styles.formGroupFull}>
                                <label className={styles.formLabel}>Antecedentes</label>
                                <textarea
                                    className={styles.formTextarea}
                                    rows={12}
                                    placeholder="Ingrese los antecedentes del paciente..."
                                    value={formData.antecedentes}
                                    onChange={(e) => setFormData({ ...formData, antecedentes: e.target.value })}
                                />
                            </div>
                        </div>
                    )}

                    {activeSection !== "motivo" && activeSection !== "antecedentes" && (
                        <div className={styles.formPlaceholder}>
                            <p>Formulario de {HC_SECTIONS.find((s) => s.id === activeSection)?.label}</p>
                            <p className={styles.placeholderNote}>Campos pendientes de implementar</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer de acciones */}
            <div className={styles.editFooter}>
                <button className={styles.footerBtnPrimary} onClick={handleSave}>
                    <span className={styles.footerIcon}>✓</span> Guardar
                </button>
                <button className={styles.footerBtnSecondary} onClick={handleCancel}>
                    <span className={styles.footerIcon}>✕</span> Cancelar
                </button>
                <button className={styles.footerBtnHelp}>
                    <span className={styles.footerIcon}>?</span> Ayuda
                </button>
            </div>
        </div>
    );
}
