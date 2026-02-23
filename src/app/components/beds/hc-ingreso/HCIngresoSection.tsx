"use client";

import { useState, useMemo, useEffect } from "react";
import styles from "./HCIngresoSection.module.css";
import { useBedDetail } from "../contexts/BedDetailContext";
import { HCIngresoRecord } from "@/app/types/hcIngreso";
import { 
    obtenerHCIngresoPorVisita, 
    crearHCIngreso, 
    actualizarHCIngreso, 
    eliminarHCIngreso 
} from "@/app/services/hcIngresoService";
import { ExamenFisicoCompleto } from "@/app/types/examenFisico";
import { getEmptyExamenFisico } from "@/app/utils/examenFisicoHelpers";
import ExportButton, { ExportOption } from '../shared/ExportButton';
import { exportToPDF } from '../../../utils/pdfExport';
import { obtenerInfoEmpresa, EmpresaInfo } from "@/app/services/empresaService";
import ExamenFisicoPielForm from "./examen-fisico/ExamenFisicoPiel";
import ExamenFisicoTejidoSubcutaneo from "./examen-fisico/ExamenFisicoTejidoSubcutaneo";
import ExamenFisicoCabezaForm from "./examen-fisico/ExamenFisicoCabeza";
import ExamenFisicoCuelloForm from "./examen-fisico/ExamenFisicoCuello";
import ExamenFisicoMamasForm from "./examen-fisico/ExamenFisicoMamas";
import ExamenFisicoRespiratorioForm from "./examen-fisico/ExamenFisicoRespiratorio";
import ExamenFisicoCardiovascularForm from "./examen-fisico/ExamenFisicoCardiovascular";
import ExamenFisicoAbdomenForm from "./examen-fisico/ExamenFisicoAbdomen";
import ExamenFisicoUrogenitalForm from "./examen-fisico/ExamenFisicoUrogenital";
import ExamenFisicoGinecologicoForm from "./examen-fisico/ExamenFisicoGinecologico";
import ExamenFisicoObstetricoForm from "./examen-fisico/ExamenFisicoObstetrico";
import ExamenFisicoNerviosoForm from "./examen-fisico/ExamenFisicoNervioso";
import SignosVitalesForm from "./examen-fisico/SignosVitales";
import ExamenOftalmologicoForm from "./examen-fisico/ExamenOftalmologico";
import ElectrocardiogramaForm from "./examen-fisico/Electrocardiograma";
import RadiografiaToraxForm from "./examen-fisico/RadiografiaTorax";
import ImpresionDiagnosticaForm from "./examen-fisico/ImpresionDiagnostica";
import PlanDiagnosticoForm from "./examen-fisico/PlanDiagnostico";
import PlanTerapeuticoForm from "./examen-fisico/PlanTerapeutico";
import ExamenesComplementariosForm from "./examen-fisico/ExamenesComplementarios";
import AntecedentesPersonalesForm from "./examen-fisico/AntecedentesPersonales";

// Secciones de la HC de Ingreso para el modo edición
const HC_SECTIONS = [
    { id: "motivo", label: "Motivo de Consulta" },
    { id: "signosVitales", label: "Signos Vitales" },
    { id: "piel", label: "Piel y Faneras" },
    { id: "tejidoSubcutaneo", label: "Tejido Celular Subcutáneo" },
    { id: "cabeza", label: "Cabeza" },
    { id: "cuello", label: "Cuello" },
    { id: "mamas", label: "Mamas" },
    { id: "respiratorio", label: "Aparato Respiratorio" },
    { id: "cardiovascular", label: "Aparato Cardiovascular" },
    { id: "abdomen", label: "Abdomen" },
    { id: "urogenital", label: "Aparato Urogenital" },
    { id: "neurologico", label: "Sistema Nervioso" },
    { id: "linfatico", label: "Sistema Linfático" },
    { id: "osteoarticular", label: "Sistema Osteoarticulomuscular" },
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

// Configuración de secciones para vista de detalle
const SECCIONES_CONFIG: Record<string, string> = {
    'SV': 'Signos Vitales',
    'PF': 'Piel y Faneras',
    'TCS': 'Tejido Celular Subcutáneo',
    'SL': 'Sistema Linfático',
    'SOAM': 'Sistema Osteoarticulomuscular',
    'C': 'Cabeza',
    'CU': 'Cuello',
    'M': 'Mamas',
    'AR': 'Aparato Respiratorio',
    'ACV': 'Aparato Cardiovascular',
    'A': 'Abdomen',
    'AUG': 'Aparato Urogenital',
    'SN': 'Sistema Nervioso',
};

// Función para obtener el nombre legible de un campo
const getNombreCampo = (key: string): string => {
    const sinPrefijo = key.replace(/^[A-Z]+_/, '');
    return sinPrefijo
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim();
};

// Función para agrupar campos por sección
const getSecciones = (record: any): Record<string, Array<{campo: string, valor: any}>> => {
    const secciones: Record<string, Array<{campo: string, valor: any}>> = {};
    
    Object.keys(record).forEach(key => {
        const valor = record[key];
        
        // Ignorar campos vacíos, null, undefined o de sistema
        if (!valor || valor === '' || 
            ['IdHCIngreso', 'NumeroVisita', 'IdSector', 'IdProfecional', 'Fecha', 
             'FechaFormateada', 'HoraFormateada', 'ProfesionalNombre', 'SectorDescripcion',
             'MotivoConsulta', 'EnfermedadActual'].includes(key)) {
            return;
        }
        
        // Buscar el prefijo de la sección
        const match = key.match(/^([A-Z]+)_/);
        if (match) {
            const prefijo = match[1];
            const nombreSeccion = SECCIONES_CONFIG[prefijo] || prefijo;
            
            if (!secciones[nombreSeccion]) {
                secciones[nombreSeccion] = [];
            }
            
            secciones[nombreSeccion].push({
                campo: getNombreCampo(key),
                valor: valor
            });
        }
    });
    
    return secciones;
};

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
    const [empresaInfo, setEmpresaInfo] = useState<EmpresaInfo | undefined>(undefined);
    
    // Estado del formulario (para modo add/edit)
    const [formData, setFormData] = useState({
        fecha: "",
        hora: "",
        profesionalId: "",
        profesionalNombre: "",
        sector: "",
        sectorDescripcion: "",
        motivoConsulta: "",
        enfermedadActual: "",
        antecedentes: "",
    });

    // Estado del examen físico
    const [examenFisico, setExamenFisico] = useState<ExamenFisicoCompleto>(getEmptyExamenFisico());

    // Cargar información de empresa al montar
    useEffect(() => {
        const cargarEmpresa = async () => {
            try {
                const info = await obtenerInfoEmpresa();
                setEmpresaInfo(info);
            } catch (err) {
                console.error("Error al cargar info de empresa:", err);
            }
        };
        cargarEmpresa();
    }, []);

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

    // Generar título descriptivo para HC
    const generarTituloHC = (record: HCIngresoRecord) => {
        const fecha = record.FechaFormateada || "Sin fecha";
        const hora = record.HoraFormateada || "";
        const sector = record.SectorDescripcion || record.IdSector || "";
        return `${fecha} ${hora} - ${sector}`.trim();
    };

    // Handlers
    const handleAdd = () => {
        // Obtener datos del localStorage
        const userDataStr = localStorage.getItem('userData');
        const sectorSeleccionado = localStorage.getItem('sectorSeleccionado');
        
        let profesionalId = "";
        let profesionalNombre = "";
        let sector = sectorSeleccionado || "";
        
        if (userDataStr) {
            try {
                const userData = JSON.parse(userDataStr);
                profesionalId = String(userData.CodOperador || "");
                profesionalNombre = `${userData.Apellido || ""} ${userData.Nombres || ""}`.trim();
            } catch (e) {
                console.error("Error al parsear userData:", e);
            }
        }
        
        // Fecha y hora actual
        const now = new Date();
        const fecha = now.toISOString().split("T")[0];
        const hora = now.toTimeString().slice(0, 5);
        
        setFormData({
            fecha,
            hora,
            profesionalId,
            profesionalNombre,
            sector,
            sectorDescripcion: sector, // Por ahora usamos el mismo valor
            motivoConsulta: "",
            enfermedadActual: "",
            antecedentes: "",
        });
        setActiveSection("motivo");
        setMode("add");
    };

    const handleEdit = () => {
        if (!selectedRecord) return;
        
        // Extraer fecha y hora del campo Fecha si existe
        let fecha = "";
        let hora = "";
        if (selectedRecord.Fecha) {
            const fechaObj = new Date(selectedRecord.Fecha);
            fecha = fechaObj.toISOString().split("T")[0];
            hora = fechaObj.toTimeString().slice(0, 5);
        }
        
        setFormData({
            fecha: fecha || new Date().toISOString().split("T")[0],
            hora: hora || new Date().toTimeString().slice(0, 5),
            profesionalId: String(selectedRecord.IdProfecional || ""),
            profesionalNombre: selectedRecord.ProfesionalNombre || "",
            sector: selectedRecord.IdSector,
            sectorDescripcion: selectedRecord.SectorDescripcion || selectedRecord.IdSector,
            motivoConsulta: selectedRecord.MotivoConsulta || "",
            enfermedadActual: selectedRecord.EnfermedadActual || "",
            antecedentes: (selectedRecord as any).Antecedentes || "",
        });
        setActiveSection("motivo");
        setMode("edit");
    };

    const handleCancel = () => {
        setMode("view");
    };

    const handleSave = async () => {
        if (!numeroVisita) {
            alert("Error: No hay número de visita");
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // Preparar datos para guardar
            const dataToSave: Partial<HCIngresoRecord> = {
                NumeroVisita: numeroVisita,
                IdSector: formData.sector,
                MotivoConsulta: formData.motivoConsulta,
                EnfermedadActual: formData.enfermedadActual,
                IdProfecional: formData.profesionalId ? parseInt(formData.profesionalId) : undefined,
            };

            if (mode === "add") {
                // Crear nueva HC
                const result = await crearHCIngreso(dataToSave);
                console.log("HC creada exitosamente:", result);
                
                // Recargar datos
                const data = await obtenerHCIngresoPorVisita(numeroVisita);
                setRecords(data);
                
                // Seleccionar el nuevo registro
                if (result.IdHCIngreso) {
                    setSelectedRecordId(result.IdHCIngreso);
                }
            } else if (mode === "edit" && selectedRecordId) {
                // Actualizar HC existente
                await actualizarHCIngreso(selectedRecordId, dataToSave);
                console.log("HC actualizada exitosamente");
                
                // Recargar datos
                const data = await obtenerHCIngresoPorVisita(numeroVisita);
                setRecords(data);
            }

            setMode("view");
        } catch (error) {
            console.error("Error al guardar HC:", error);
            setError(error instanceof Error ? error.message : "Error al guardar la historia clínica");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedRecordId || !numeroVisita) {
            alert("Error: No hay registro seleccionado");
            return;
        }

        if (!confirm("¿Está seguro de que desea eliminar este registro de Historia Clínica?")) {
            return;
        }

        try {
            setLoading(true);
            setError(null);

            await eliminarHCIngreso(selectedRecordId);
            console.log("HC eliminada exitosamente");

            // Recargar datos
            const data = await obtenerHCIngresoPorVisita(numeroVisita);
            setRecords(data);

            // Seleccionar el primer registro si existe
            if (data.length > 0) {
                setSelectedRecordId(data[0].IdHCIngreso);
            } else {
                setSelectedRecordId(null);
            }
        } catch (error) {
            console.error("Error al eliminar HC:", error);
            setError(error instanceof Error ? error.message : "Error al eliminar la historia clínica");
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async (option: ExportOption, data: any[]) => {
        if (option === 'pdf' && selectedRecord) {
            const empresaInfo = await obtenerInfoEmpresa();
            const pdfData = [
                ['Fecha', selectedRecord.FechaFormateada || '-'],
                ['Hora', selectedRecord.HoraFormateada || '-'],
                ['Profesional', selectedRecord.ProfesionalNombre || '-'],
                ['Sector', selectedRecord.SectorDescripcion || selectedRecord.IdSector || '-'],
                ['Motivo de Consulta', selectedRecord.MotivoConsulta || '-'],
                ['Enfermedad Actual', selectedRecord.EnfermedadActual || '-'],
            ];

            exportToPDF({
                title: 'Historia Clínica de Ingreso',
                subtitle: `Paciente: ${patientName || 'N/A'} - DNI: ${documentoPaciente || 'N/A'}`,
                headers: ['Campo', 'Valor'],
                data: pdfData,
                empresaInfo,
                orientation: 'portrait'
            });
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
                                        ? generarTituloHC(selectedRecord)
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
                                            {generarTituloHC(record)}
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
                        <ExportButton
                            data={selectedRecord ? [selectedRecord] : []}
                            fileName={`hc_ingreso_${numeroVisita}.pdf`}
                            onExport={handleExport}
                            options={['pdf']}
                            disabled={!selectedRecord}
                        />
                    </div>
                </div>
                )}

                {/* Barra flotante inferior para mobile */}
                {!loading && !error && (
                <div className={styles.mobileBottomBar}>
                    <ExportButton
                        data={selectedRecord ? [selectedRecord] : []}
                        fileName={`hc_ingreso_${numeroVisita}.pdf`}
                        onExport={handleExport}
                        options={['pdf']}
                        disabled={!selectedRecord}
                    />
                </div>
                )}

                {/* Panel de detalle del registro */}
                {!loading && !error && (
                <div className={styles.detailPanelFull}>
                    {selectedRecord ? (
                        <div className={styles.detailWrapper}>
                            {/* Índice de navegación rápida */}
                            <aside className={styles.detailIndex}>
                                <div className={styles.indexSticky}>
                                    <h4 className={styles.indexTitle}>Contenido</h4>
                                    <nav className={styles.indexNav}>
                                        {selectedRecord.MotivoConsulta && (
                                            <a href="#motivo-consulta" className={styles.indexLink}>
                                                Motivo Consulta
                                            </a>
                                        )}
                                        {selectedRecord.EnfermedadActual && (
                                            <a href="#enfermedad-actual" className={styles.indexLink}>
                                                Enfermedad Actual
                                            </a>
                                        )}
                                        {(() => {
                                            const secciones = getSecciones(selectedRecord);
                                            return Object.keys(secciones).map(nombreSeccion => (
                                                <a 
                                                    key={nombreSeccion}
                                                    href={`#${nombreSeccion.toLowerCase().replace(/\s+/g, '-')}`}
                                                    className={styles.indexLink}
                                                >
                                                    {nombreSeccion}
                                                </a>
                                            ));
                                        })()}
                                    </nav>
                                </div>
                            </aside>

                            {/* Contenido principal */}
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
                                    <span>Profesional: {selectedRecord.ProfesionalNombre || selectedRecord.IdProfecional}</span>
                                    <span>Sector: {selectedRecord.SectorDescripcion || selectedRecord.IdSector}</span>
                                </div>
                            </div>

                            {/* Motivo y Enfermedad Actual */}
                            {selectedRecord.MotivoConsulta && (
                                <div id="motivo-consulta" className={styles.detailSection}>
                                    <p className={styles.detailLabel}>Motivo Consulta:</p>
                                    <p className={styles.detailText}>{selectedRecord.MotivoConsulta}</p>
                                </div>
                            )}

                            {selectedRecord.EnfermedadActual && (
                                <div id="enfermedad-actual" className={styles.detailSection}>
                                    <p className={styles.detailLabel}>Enfermedad Actual:</p>
                                    <p className={styles.detailText}>{selectedRecord.EnfermedadActual}</p>
                                </div>
                            )}

                            {/* Secciones organizadas por prefijo */}
                            {(() => {
                                const secciones = getSecciones(selectedRecord);
                                return Object.keys(secciones).map(nombreSeccion => (
                                    <div 
                                        key={nombreSeccion} 
                                        id={nombreSeccion.toLowerCase().replace(/\s+/g, '-')}
                                        className={styles.detailSectionGroup}
                                    >
                                        <h4 className={styles.detailSectionTitle}>{nombreSeccion}</h4>
                                        <div className={styles.detailFieldsGrid}>
                                            {secciones[nombreSeccion].map(({campo, valor}, idx) => (
                                                <div key={idx} className={styles.detailField}>
                                                    <span className={styles.detailFieldLabel}>{campo}:</span>
                                                    <span className={styles.detailFieldValue}>{valor}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ));
                            })()}
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
                                    <label className={styles.formLabel}>Profesional</label>
                                    <input
                                        type="text"
                                        className={styles.formInput}
                                        value={formData.profesionalNombre || "No especificado"}
                                        disabled
                                        title={`ID: ${formData.profesionalId}`}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Sector</label>
                                    <input
                                        type="text"
                                        className={styles.formInput}
                                        value={formData.sectorDescripcion || formData.sector || "No especificado"}
                                        disabled
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
                            <AntecedentesPersonalesForm
                                data={examenFisico.antecedentesPersonales}
                                onChange={(antecedentesPersonales) => setExamenFisico({ ...examenFisico, antecedentesPersonales })}
                                readOnly={false}
                            />
                        </div>
                    )}

                    {/* Piel y Faneras */}
                    {activeSection === "piel-faneras" && (
                        <div className={styles.formFields}>
                            <ExamenFisicoPielForm
                                data={examenFisico.piel}
                                onChange={(piel) => setExamenFisico({ ...examenFisico, piel })}
                                readOnly={false}
                            />
                        </div>
                    )}

                    {/* Tejido Subcutáneo (incluye Sistema Linfático y Sistema Osteo) */}
                    {(activeSection === "tejido-subcutaneo" || activeSection === "sistema-linfatico" || activeSection === "sistema-osteo") && (
                        <div className={styles.formFields}>
                            <ExamenFisicoTejidoSubcutaneo
                                tejidoCelular={examenFisico.tejidoCelularSubcutaneo}
                                sistemaLinfatico={examenFisico.sistemaLinfatico}
                                sistemaOsteo={examenFisico.sistemaOsteoArticuloMuscular}
                                onChangeTejido={(tejidoCelularSubcutaneo) => setExamenFisico({ ...examenFisico, tejidoCelularSubcutaneo })}
                                onChangeLinfatico={(sistemaLinfatico) => setExamenFisico({ ...examenFisico, sistemaLinfatico })}
                                onChangeOsteo={(sistemaOsteoArticuloMuscular) => setExamenFisico({ ...examenFisico, sistemaOsteoArticuloMuscular })}
                                readOnly={false}
                            />
                        </div>
                    )}

                    {/* Cabeza */}
                    {activeSection === "cabeza" && (
                        <div className={styles.formFields}>
                            <ExamenFisicoCabezaForm
                                data={examenFisico.cabeza}
                                onChange={(cabeza) => setExamenFisico({ ...examenFisico, cabeza })}
                                readOnly={false}
                            />
                        </div>
                    )}

                    {/* Cuello (incluye Sistema Venoso) */}
                    {(activeSection === "cuello" || activeSection === "sistema-venoso") && (
                        <div className={styles.formFields}>
                            <ExamenFisicoCuelloForm
                                cuello={examenFisico.cuello}
                                sistemaVenoso={examenFisico.sistemaVenoso}
                                onChangeCuello={(cuello) => setExamenFisico({ ...examenFisico, cuello })}
                                onChangeVenoso={(sistemaVenoso) => setExamenFisico({ ...examenFisico, sistemaVenoso })}
                                readOnly={false}
                            />
                        </div>
                    )}

                    {/* Mamas */}
                    {activeSection === "mamas" && (
                        <div className={styles.formFields}>
                            <ExamenFisicoMamasForm
                                data={examenFisico.mamas}
                                onChange={(mamas) => setExamenFisico({ ...examenFisico, mamas })}
                                readOnly={false}
                            />
                        </div>
                    )}

                    {/* Aparato Respiratorio */}
                    {activeSection === "aparato-respiratorio" && (
                        <div className={styles.formFields}>
                            <ExamenFisicoRespiratorioForm
                                data={examenFisico.aparatoRespiratorio}
                                onChange={(aparatoRespiratorio) => setExamenFisico({ ...examenFisico, aparatoRespiratorio })}
                                readOnly={false}
                            />
                        </div>
                    )}

                    {/* Aparato Cardiovascular */}
                    {activeSection === "aparato-cardiovascular" && (
                        <div className={styles.formFields}>
                            <ExamenFisicoCardiovascularForm
                                data={examenFisico.aparatoCardiovascular}
                                onChange={(aparatoCardiovascular) => setExamenFisico({ ...examenFisico, aparatoCardiovascular })}
                                readOnly={false}
                            />
                        </div>
                    )}

                    {/* Abdomen */}
                    {activeSection === "abdomen" && (
                        <div className={styles.formFields}>
                            <ExamenFisicoAbdomenForm
                                data={examenFisico.abdomen}
                                onChange={(abdomen) => setExamenFisico({ ...examenFisico, abdomen })}
                                readOnly={false}
                            />
                        </div>
                    )}

                    {/* Aparato Urogenital */}
                    {activeSection === "aparato-urogenital" && (
                        <div className={styles.formFields}>
                            <ExamenFisicoUrogenitalForm
                                data={examenFisico.aparatoUrogenital}
                                onChange={(aparatoUrogenital) => setExamenFisico({ ...examenFisico, aparatoUrogenital })}
                                readOnly={false}
                            />
                        </div>
                    )}

                    {/* Examen Ginecológico */}
                    {activeSection === "examen-ginecologico" && (
                        <div className={styles.formFields}>
                            <ExamenFisicoGinecologicoForm
                                data={examenFisico.examenGinecologico}
                                onChange={(examenGinecologico) => setExamenFisico({ ...examenFisico, examenGinecologico })}
                                readOnly={false}
                            />
                        </div>
                    )}

                    {/* Examen Obstétrico */}
                    {activeSection === "examen-obstetrico" && (
                        <div className={styles.formFields}>
                            <ExamenFisicoObstetricoForm
                                data={examenFisico.examenObstetrico}
                                onChange={(examenObstetrico) => setExamenFisico({ ...examenFisico, examenObstetrico })}
                                readOnly={false}
                            />
                        </div>
                    )}

                    {/* Sistema Nervioso */}
                    {activeSection === "sistema-nervioso" && (
                        <div className={styles.formFields}>
                            <ExamenFisicoNerviosoForm
                                data={examenFisico.sistemaNervioso}
                                onChange={(sistemaNervioso) => setExamenFisico({ ...examenFisico, sistemaNervioso })}
                                readOnly={false}
                            />
                        </div>
                    )}

                    {/* Signos Vitales */}
                    {activeSection === "signos-vitales" && (
                        <div className={styles.formFields}>
                            <SignosVitalesForm
                                data={examenFisico.signosVitales}
                                onChange={(signosVitales) => setExamenFisico({ ...examenFisico, signosVitales })}
                                readOnly={false}
                            />
                        </div>
                    )}

                    {/* Examen Oftalmológico */}
                    {activeSection === "examen-oftalmologico" && (
                        <div className={styles.formFields}>
                            <ExamenOftalmologicoForm
                                data={examenFisico.examenOftalmologico}
                                onChange={(examenOftalmologico) => setExamenFisico({ ...examenFisico, examenOftalmologico })}
                                readOnly={false}
                            />
                        </div>
                    )}

                    {/* Electrocardiograma */}
                    {activeSection === "electrocardiograma" && (
                        <div className={styles.formFields}>
                            <ElectrocardiogramaForm
                                data={examenFisico.electrocardiograma}
                                onChange={(electrocardiograma) => setExamenFisico({ ...examenFisico, electrocardiograma })}
                                readOnly={false}
                            />
                        </div>
                    )}

                    {/* Radiografía de Tórax */}
                    {activeSection === "radiografia-torax" && (
                        <div className={styles.formFields}>
                            <RadiografiaToraxForm
                                data={examenFisico.radiografiaTorax}
                                onChange={(radiografiaTorax) => setExamenFisico({ ...examenFisico, radiografiaTorax })}
                                readOnly={false}
                            />
                        </div>
                    )}

                    {/* Impresión Diagnóstica */}
                    {activeSection === "impresion-diagnostica" && (
                        <div className={styles.formFields}>
                            <ImpresionDiagnosticaForm
                                data={examenFisico.impresionDiagnostica}
                                onChange={(impresionDiagnostica) => setExamenFisico({ ...examenFisico, impresionDiagnostica })}
                                readOnly={false}
                            />
                        </div>
                    )}

                    {/* Plan Diagnóstico */}
                    {activeSection === "plan-diagnostico" && (
                        <div className={styles.formFields}>
                            <PlanDiagnosticoForm
                                data={examenFisico.planDiagnostico}
                                onChange={(planDiagnostico) => setExamenFisico({ ...examenFisico, planDiagnostico })}
                                readOnly={false}
                            />
                        </div>
                    )}

                    {/* Plan Terapéutico */}
                    {activeSection === "plan-terapeutico" && (
                        <div className={styles.formFields}>
                            <PlanTerapeuticoForm
                                data={examenFisico.planTerapeutico}
                                onChange={(planTerapeutico) => setExamenFisico({ ...examenFisico, planTerapeutico })}
                                readOnly={false}
                            />
                        </div>
                    )}

                    {/* Exámenes Complementarios */}
                    {activeSection === "examen-complementario" && (
                        <div className={styles.formFields}>
                            <ExamenesComplementariosForm
                                data={examenFisico.examenesComplementarios}
                                onChange={(examenesComplementarios) => setExamenFisico({ ...examenFisico, examenesComplementarios })}
                                readOnly={false}
                            />
                        </div>
                    )}

                    {/* Placeholder para secciones no implementadas */}
                    {!["motivo", "antecedentes", "signos-vitales", "piel-faneras", "tejido-subcutaneo", "sistema-linfatico", "sistema-osteo", "cabeza", "cuello", "sistema-venoso", "mamas", "aparato-respiratorio", "aparato-cardiovascular", "abdomen", "aparato-urogenital", "examen-ginecologico", "examen-obstetrico", "sistema-nervioso", "examen-oftalmologico", "electrocardiograma", "radiografia-torax", "impresion-diagnostica", "plan-diagnostico", "plan-terapeutico", "examen-complementario"].includes(activeSection) && (
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
