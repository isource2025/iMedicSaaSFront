"use client";

import { useState, useMemo, useEffect } from "react";
import styles from './HCIngresoSection.module.css';
import Loader from '../../Loader/Loader';
import { useBedDetail } from "../contexts/BedDetailContext";
import { HCIngresoRecord } from "@/app/types/hcIngreso";
import { 
    obtenerHCIngresoPorVisita, 
    crearHCIngreso, 
    actualizarHCIngreso, 
    eliminarHCIngreso 
} from "@/app/services/hcIngresoService";
import { useAppContext } from "@/app/contexts/AppContext";
import { ExamenFisicoCompleto } from "@/app/types/examenFisico";
import {
    getEmptyExamenFisico,
    mapearHCIaExamenFisico,
    buildHcPayloadFromForm,
    diffHcUpdatePayload,
    type HcFormBasics,
} from "@/app/utils/examenFisicoHelpers";
import {
    getSessionUser,
    getHcIdProfesional,
    getUserDisplayName,
    resolveHcSector,
} from "@/app/utils/sessionUser";

function fechaHoraLocal(d: Date = new Date()) {
    const pad = (n: number) => String(n).padStart(2, "0");
    return {
        fecha: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
        hora: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
    };
}

function fechaLocalDesdeDate(d: Date) {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fechaHoraDesdeRecord(record: HCIngresoRecord): { fecha: string; hora: string } | null {
    if (record.FechaFormateada) {
        return {
            fecha: record.FechaFormateada,
            hora: (record.HoraFormateada || "00:00").slice(0, 5),
        };
    }
    const raw = record.Fecha;
    if (!raw) return null;
    const m = String(raw).match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})/);
    if (m) return { fecha: m[1], hora: `${m[2]}:${m[3]}` };
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return null;
    return fechaHoraLocal(d);
}
import ExportButton, { ExportOption } from '../shared/ExportButton';
import { obtenerInfoEmpresa, EmpresaInfo } from "@/app/services/empresaService";
import { generarPDFHistoriaClinica } from '@/app/utils/pdfHCIngreso';
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
    { id: "ginecologico", label: "Examen Ginecológico" },
    { id: "obstetrico", label: "Examen Obstétrico" },
    { id: "neurologico", label: "Sistema Nervioso" },
    { id: "oftalmologico", label: "Examen Oftalmológico" },
    { id: "electrocardiograma", label: "Electrocardiograma" },
    { id: "radiografiaTorax", label: "Radiografía de Tórax" },
    { id: "impresionDiagnostica", label: "Impresión Diagnóstica" },
    { id: "planDiagnostico", label: "Plan Diagnóstico" },
    { id: "planTerapeutico", label: "Plan Terapéutico" },
    { id: "examenesComplementarios", label: "Exámenes Complementarios" },
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
    'AC': 'Aparato Cardiovascular',
    'ACV': 'Aparato Cardiovascular',
    'A': 'Abdomen',
    'AUG': 'Aparato Urogenital',
    'SN': 'Sistema Nervioso',
    'EO': 'Examen Oftalmológico',
    'EC': 'Electrocardiograma',
    'RDT': 'Radiografía de Tórax',
    'PD': 'Plan Diagnóstico',
    'PT': 'Plan Terapéutico',
    'ID': 'Impresión Diagnóstica',
};

// Función para obtener el nombre legible de un campo
const getNombreCampo = (key: string): string => {
    const sinPrefijo = key.replace(/^[A-Z]+_/, '');
    
    // Diccionario de abreviaturas a expandir
    const abreviaturas: Record<string, string> = {
        'PR': 'Pulso Radial',
        'QT': 'QT',
        'QRS': 'QRS',
        'OndaP': 'Onda P',
        'OndaT': 'Onda T',
        'ST': 'ST',
        'ICT': 'Índice Cardiotorácico',
        'Duracion': 'Duración',
        'Amplitud': 'Amplitud',
        'Conformacion': 'Conformación',
        'Ritmo': 'Ritmo',
        'Frecuencia': 'Frecuencia',
        'Conclusiones': 'Conclusiones',
        'Tecnica': 'Técnica',
        'PartesBlandas': 'Partes Blandas',
        'PartesOseas': 'Partes Óseas',
        'Hemidiafragmas': 'Hemidiafragmas',
        'SenosCostoFrenicos': 'Senos Costofrenicos',
        'Mediastino': 'Mediastino',
        'SiluetaCardiovascular': 'Silueta Cardiovascular',
        'CamposPulmonares': 'Campos Pulmonares',
        'Hilios': 'Hilios',
    };
    
    // Verificar si el campo sin prefijo está en el diccionario
    if (abreviaturas[sinPrefijo]) {
        return abreviaturas[sinPrefijo];
    }
    
    // Si no está en el diccionario, aplicar formato estándar
    return sinPrefijo
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim();
};

// Función para agrupar campos por sección
const getSecciones = (record: any): Record<string, Array<{campo: string, valor: any}>> => {
    const secciones: Record<string, Array<{campo: string, valor: any}>> = {};
    
    // Campos de sistema a ignorar
    const camposIgnorar = [
        'IdHCIngreso', 'NumeroVisita', 'IdSector', 'IdProfecional', 'Fecha', 
        'FechaFormateada', 'HoraFormateada', 'ProfesionalNombre', 'SectorDescripcion',
        'MotivoConsulta', 'EnfermedadActual',
        // Campos viejos de signos vitales
        'FC', 'FR', 'Pulso', 'Presion', 'Temperatura', 'Saturacion', 'Glucemia',
        'FrecuenciaCardiaca', 'FrecuenciaRespiratoria', 'PresionArterial'
    ];
    
    // Inyectar datos medibles del control vinculado en sección Signos Vitales
    const seccionSV = 'Signos Vitales';
    const ctrlItems: Array<{campo: string, valor: any}> = [];
    
    // PA: Maximo/Minimo combinados
    if (record.CTRL_Maximo && record.CTRL_Maximo > 0) {
        const minimo = record.CTRL_Minimo || 0;
        ctrlItems.push({ campo: 'Presión Arterial', valor: `${record.CTRL_Maximo}/${minimo} mmHg` });
    }
    if (record.CTRL_Pulso && record.CTRL_Pulso > 0) {
        ctrlItems.push({ campo: 'Frecuencia Cardíaca', valor: `${record.CTRL_Pulso} lpm` });
    }
    if (record.CTRL_FrecuenciaRespiratoria && record.CTRL_FrecuenciaRespiratoria > 0) {
        ctrlItems.push({ campo: 'Frecuencia Respiratoria', valor: `${record.CTRL_FrecuenciaRespiratoria} rpm` });
    }
    if (record.CTRL_Axilar && record.CTRL_Axilar > 0) {
        ctrlItems.push({ campo: 'Temperatura Axilar', valor: `${Number(record.CTRL_Axilar).toFixed(1)}°C` });
    }
    if (record.CTRL_Glucemia && record.CTRL_Glucemia > 0) {
        ctrlItems.push({ campo: 'Glucemia', valor: `${record.CTRL_Glucemia} mg/dL` });
    }
    if (record.CTRL_Saturometria && record.CTRL_Saturometria > 0) {
        ctrlItems.push({ campo: 'Saturación', valor: `${record.CTRL_Saturometria}%` });
    }
    
    if (ctrlItems.length > 0) {
        secciones[seccionSV] = ctrlItems;
    }
    
    Object.keys(record).forEach(key => {
        const valor = record[key];
        
        // Ignorar campos vacíos, null, undefined, de sistema o CTRL_*
        if (!valor || valor === '' || valor === 0 ||
            camposIgnorar.includes(key) ||
            key.startsWith('CTRL_')) {
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
    /** Sector de la cama/recurso (fallback si el login no trae sector, p. ej. admin Grupo 11). */
    bedSector?: string;
}

type ViewMode = "view" | "add" | "edit";

export default function HCIngresoSection({
    bedId,
    patientId,
    numeroVisita,
    patientName,
    patientLocation,
    documentoPaciente,
    bedSector,
}: HCIngresoSectionProps) {
    const { selectedDate } = useBedDetail();
    const { usuario, sectorSeleccionado } = useAppContext();
    
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

    /** Snapshot al entrar en edición: solo se envían campos que difieren */
    const [editBaseline, setEditBaseline] = useState<Record<string, unknown> | null>(null);

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
        const dateStr = fechaLocalDesdeDate(selectedDate);
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
        const usuarioActual = getSessionUser(usuario);
        const sectorResolved = resolveHcSector(sectorSeleccionado, bedSector);
        const profesionalIdNum = getHcIdProfesional(usuarioActual);
        const profesionalId = profesionalIdNum != null ? String(profesionalIdNum) : "";
        const profesionalNombre = getUserDisplayName(usuarioActual);
        const sector = sectorResolved.id;
        const sectorDescripcion = sectorResolved.descripcion || sector;
        
        const { fecha, hora } = fechaHoraLocal();
        
        setFormData({
            fecha,
            hora,
            profesionalId,
            profesionalNombre,
            sector,
            sectorDescripcion: sectorDescripcion || sector,
            motivoConsulta: "",
            enfermedadActual: "",
            antecedentes: "",
        });
        setEditBaseline(null);
        setActiveSection("motivo");
        setMode("add");
    };

    const handleEdit = () => {
        if (!selectedRecord || !numeroVisita) return;
        
        const desdeRecord = fechaHoraDesdeRecord(selectedRecord);
        const ahora = fechaHoraLocal();
        
        const newFormData: HcFormBasics & { profesionalNombre: string; sectorDescripcion: string; antecedentes: string } = {
            fecha: desdeRecord?.fecha || ahora.fecha,
            hora: ahora.hora,
            profesionalId: String(selectedRecord.IdProfecional || ""),
            profesionalNombre: selectedRecord.ProfesionalNombre || "",
            sector: selectedRecord.IdSector,
            sectorDescripcion: selectedRecord.SectorDescripcion || selectedRecord.IdSector,
            motivoConsulta: selectedRecord.MotivoConsulta || "",
            enfermedadActual: selectedRecord.EnfermedadActual || "",
            antecedentes: (selectedRecord as { Antecedentes?: string }).Antecedentes || "",
        };
        
        const examenFisicoMapeado = mapearHCIaExamenFisico(selectedRecord);
        setFormData(newFormData);
        setExamenFisico(examenFisicoMapeado);
        setEditBaseline(buildHcPayloadFromForm(newFormData, examenFisicoMapeado, numeroVisita));
        
        setActiveSection("motivo");
        setMode("edit");
    };

    const handleCancel = () => {
        setEditBaseline(null);
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

            const usuarioActual = getSessionUser(usuario);
            const sectorResolved = resolveHcSector(sectorSeleccionado, bedSector);
            const profFallback = getHcIdProfesional(usuarioActual);

            const formBasics: HcFormBasics = {
                fecha: formData.fecha,
                hora: formData.hora,
                profesionalId: formData.profesionalId || (profFallback != null ? String(profFallback) : ""),
                sector: formData.sector || sectorResolved.id,
                motivoConsulta: formData.motivoConsulta,
                enfermedadActual: formData.enfermedadActual,
            };
            const payloadActual = buildHcPayloadFromForm(formBasics, examenFisico, numeroVisita);

            if (mode === "add") {
                const result = await crearHCIngreso(payloadActual as Partial<HCIngresoRecord>);
                const data = await obtenerHCIngresoPorVisita(numeroVisita);
                setRecords(data);
                if (result.IdHCIngreso) {
                    setSelectedRecordId(result.IdHCIngreso);
                }
            } else if (mode === "edit" && selectedRecordId && editBaseline) {
                const { patch, sincronizarSignosVitales } = diffHcUpdatePayload(editBaseline, payloadActual);

                if (Object.keys(patch).length === 0) {
                    setMode("view");
                    setEditBaseline(null);
                    return;
                }

                const dataToSave: Record<string, unknown> = {
                    ...patch,
                    sincronizarSignosVitales,
                };
                if (sincronizarSignosVitales) {
                    dataToSave.NumeroVisita = numeroVisita;
                    if (dataToSave.IdSector === undefined) dataToSave.IdSector = payloadActual.IdSector;
                    if (dataToSave.IdProfecional === undefined) {
                        dataToSave.IdProfecional = payloadActual.IdProfecional;
                    }
                }

                console.log('[HC Ingreso] Actualización parcial:', {
                    campos: Object.keys(patch).length,
                    sincronizarSignosVitales,
                });

                await actualizarHCIngreso(selectedRecordId, dataToSave);
                const data = await obtenerHCIngresoPorVisita(numeroVisita);
                setRecords(data);
            }

            setEditBaseline(null);
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
            
            generarPDFHistoriaClinica(
                selectedRecord,
                patientName || 'N/A',
                documentoPaciente || 'N/A',
                empresaInfo
            );
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
                    <div style={{ position: 'relative', minHeight: '200px' }}>
                        <Loader />
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
                                <div className={styles.detailSection}>
                                    <p className={styles.detailLabel}>Motivo Consulta:</p>
                                    <p className={styles.detailText}>{selectedRecord.MotivoConsulta}</p>
                                </div>
                            )}

                            {selectedRecord.EnfermedadActual && (
                                <div className={styles.detailSection}>
                                    <p className={styles.detailLabel}>Enfermedad Actual:</p>
                                    <p className={styles.detailText}>{selectedRecord.EnfermedadActual}</p>
                                </div>
                            )}

                            {/* Secciones organizadas por prefijo */}
                            {(() => {
                                const secciones = getSecciones(selectedRecord);
                                return Object.keys(secciones).map(nombreSeccion => (
                                    <div key={nombreSeccion} className={styles.detailSectionGroup}>
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
                    {activeSection === "piel" && (
                        <div className={styles.formFields}>
                            <ExamenFisicoPielForm
                                data={examenFisico.piel}
                                onChange={(piel) => setExamenFisico({ ...examenFisico, piel })}
                                readOnly={false}
                            />
                        </div>
                    )}

                    {/* Tejido Subcutáneo (incluye Sistema Linfático y Sistema Osteo) */}
                    {activeSection === "tejidoSubcutaneo" && (
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
                    {activeSection === "cuello" && (
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
                    {activeSection === "respiratorio" && (
                        <div className={styles.formFields}>
                            <ExamenFisicoRespiratorioForm
                                data={examenFisico.aparatoRespiratorio}
                                onChange={(aparatoRespiratorio) => setExamenFisico({ ...examenFisico, aparatoRespiratorio })}
                                readOnly={false}
                            />
                        </div>
                    )}

                    {/* Aparato Cardiovascular */}
                    {activeSection === "cardiovascular" && (
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
                    {activeSection === "urogenital" && (
                        <div className={styles.formFields}>
                            <ExamenFisicoUrogenitalForm
                                data={examenFisico.aparatoUrogenital}
                                onChange={(aparatoUrogenital) => setExamenFisico({ ...examenFisico, aparatoUrogenital })}
                                readOnly={false}
                            />
                        </div>
                    )}

                    {/* Examen Ginecológico */}
                    {activeSection === "ginecologico" && (
                        <div className={styles.formFields}>
                            <ExamenFisicoGinecologicoForm
                                data={examenFisico.examenGinecologico}
                                onChange={(examenGinecologico) => setExamenFisico({ ...examenFisico, examenGinecologico })}
                                readOnly={false}
                            />
                        </div>
                    )}

                    {/* Examen Obstétrico */}
                    {activeSection === "obstetrico" && (
                        <div className={styles.formFields}>
                            <ExamenFisicoObstetricoForm
                                data={examenFisico.examenObstetrico}
                                onChange={(examenObstetrico) => setExamenFisico({ ...examenFisico, examenObstetrico })}
                                readOnly={false}
                            />
                        </div>
                    )}

                    {/* Sistema Nervioso */}
                    {activeSection === "neurologico" && (
                        <div className={styles.formFields}>
                            <ExamenFisicoNerviosoForm
                                data={examenFisico.sistemaNervioso}
                                onChange={(sistemaNervioso) => setExamenFisico({ ...examenFisico, sistemaNervioso })}
                                readOnly={false}
                            />
                        </div>
                    )}

                    {/* Signos Vitales */}
                    {activeSection === "signosVitales" && (
                        <div className={styles.formFields}>
                            <SignosVitalesForm
                                data={examenFisico.signosVitales}
                                onChange={(signosVitales) => setExamenFisico({ ...examenFisico, signosVitales })}
                                readOnly={false}
                                numeroVisita={numeroVisita || undefined}
                                idHCIngreso={mode === "edit" ? selectedRecordId || undefined : undefined}
                            />
                        </div>
                    )}

                    {/* Examen Oftalmológico */}
                    {activeSection === "oftalmologico" && (
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
                    {activeSection === "radiografiaTorax" && (
                        <div className={styles.formFields}>
                            <RadiografiaToraxForm
                                data={examenFisico.radiografiaTorax}
                                onChange={(radiografiaTorax) => setExamenFisico({ ...examenFisico, radiografiaTorax })}
                                readOnly={false}
                            />
                        </div>
                    )}

                    {/* Impresión Diagnóstica */}
                    {activeSection === "impresionDiagnostica" && (
                        <div className={styles.formFields}>
                            <ImpresionDiagnosticaForm
                                data={examenFisico.impresionDiagnostica}
                                onChange={(impresionDiagnostica) => setExamenFisico({ ...examenFisico, impresionDiagnostica })}
                                readOnly={false}
                            />
                        </div>
                    )}

                    {/* Plan Diagnóstico */}
                    {activeSection === "planDiagnostico" && (
                        <div className={styles.formFields}>
                            <PlanDiagnosticoForm
                                data={examenFisico.planDiagnostico}
                                onChange={(planDiagnostico) => setExamenFisico({ ...examenFisico, planDiagnostico })}
                                readOnly={false}
                            />
                        </div>
                    )}

                    {/* Plan Terapéutico */}
                    {activeSection === "planTerapeutico" && (
                        <div className={styles.formFields}>
                            <PlanTerapeuticoForm
                                data={examenFisico.planTerapeutico}
                                onChange={(planTerapeutico) => setExamenFisico({ ...examenFisico, planTerapeutico })}
                                readOnly={false}
                            />
                        </div>
                    )}

                    {/* Exámenes Complementarios */}
                    {activeSection === "examenesComplementarios" && (
                        <div className={styles.formFields}>
                            <ExamenesComplementariosForm
                                data={examenFisico.examenesComplementarios}
                                onChange={(examenesComplementarios) => setExamenFisico({ ...examenFisico, examenesComplementarios })}
                                readOnly={false}
                            />
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
