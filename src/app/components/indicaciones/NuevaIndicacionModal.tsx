"use client";

import React, { useEffect, useMemo, useState } from "react";
import styles from "./NuevaIndicacionModal.module.css";
import {
    FormularioDatosResponse,
    NuevaIndicacionPayload,
} from "../../types/indicaciones";
import { indicacionesService } from "../../services/indicacionesService";
import CustomSelect from "../Patients/AddPatient/LoadingSelect";
import { useParams } from "next/navigation";
import { useAppContext } from "@/app/contexts/AppContext";
import SlideDrawer from "../UI/SlideDrawer";

interface IndicacionHija {
    id: string;
    formaAdicional: string | null;
    codigo: number | null;
    aliasMedicamento: string | null;
    cantidad: number | null;
    tipoUnidad: string | null;
    frecuencia: string | null;
    observaciones: string | null;
}

interface IndicacionFormProps {
    onClose: () => void;
    onSave: (data: NuevaIndicacionPayload) => Promise<void> | void;
    defaultNumeroVisita: number | null;
    nroIndicacion?: number | null;
    refetch?: () => Promise<void>;
    idSector?: string | null;
}

// ===== Clarion helpers =====
const CLARION_TICKS_PER_SEC = 100;
const SECS_PER_HOUR = 3600;
const DAY_TICKS = 24 * SECS_PER_HOUR * CLARION_TICKS_PER_SEC;

const getLocalDateString = (date: Date): string => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0'); // getMonth() es 0-11
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};  

// ===== Payload inicial =====
const emptyPayload = (numeroVisita: number | null): NuevaIndicacionPayload => ({
    NumeroVisita: numeroVisita,
    NroAdicional: null,
    FechaCarga: null, // ✅ El backend calcula automáticamente con fecha actual
    HoraCarga: null, // ✅ El backend calcula automáticamente con hora actual
    OperadorCarga: null,
    ProfesionalAsiste: null,
    FechaCumplido: null,
    HoraCumplido: null,
    FechaProximo: null,
    HoraProximo: null,
    FechaRevision: null,
    HoraRevision: null,
    TipoIndicacion: null,
    Codigo: null,

    // Cantidades
    CantidadIndicada: 1, // ✅ EDITABLE (por toma)
    TipoUnidad: null,
    Frecuencia: null, // puede ser ticks / "HH:MM" / "8" / "8h"
    Cantidad: null, // ✅ CALCULADA = CantidadIndicada × dosisPorDia

    Observaciones: null,
    FechaExpiro: 0,
    HoraExpiro: null,
    Orden: null,
    Estado: null,
    CantidadPorTurno: null,
    CantidadEntregada: null,
    ParaFechaEntrega: getLocalDateString(new Date()),
    FormaAdicional: null,
    NroIndicacionAnterior: null,
    IdSector: null,

    // Medicación — ÚNICO CAMPO
    AliasMedicamento: null,
    ExcluidoDeEntrega: null,
});

export default function IndicacionForm({
    onClose,
    onSave,
    defaultNumeroVisita,
    nroIndicacion = null,
    refetch,
    idSector = null,
}: IndicacionFormProps) {
    const initial = useMemo(
        () => ({
            ...emptyPayload(defaultNumeroVisita),
            IdSector: idSector, // ✅ Usar el idSector del prop si está disponible
        }),
        [defaultNumeroVisita, idSector]
    );
    const [form, setForm] = useState<NuevaIndicacionPayload>(initial);
    const [dataLoading, setDataLoading] = useState(false);
    const [dataForm, setDataForm] = useState<FormularioDatosResponse | null>(
        null
    );
    const params = useParams();
    const { usuario } = useAppContext();
    
    const [indicacionesHijas, setIndicacionesHijas] = useState<IndicacionHija[]>([]);
    const [mostrarAdicionales, setMostrarAdicionales] = useState(false);
    const [hijaEnEdicion, setHijaEnEdicion] = useState<IndicacionHija>({
        id: '',
        formaAdicional: null,
        codigo: null,
        aliasMedicamento: null,
        cantidad: null,
        tipoUnidad: null,
        frecuencia: null,
        observaciones: null,
    });
    
    // Estado separado para campos de adicional
    const [adicionalForm, setAdicionalForm] = useState({
        codigo: null as number | null,
        cantidadIndicada: 1,
        tipoUnidad: null as string | null,
        frecuencia: null as string | null,
        cantidad: null as number | null,
        observaciones: null as string | null,
    });
    
    const setAdicional = (field: keyof typeof adicionalForm, value: any) =>
        setAdicionalForm((prev) => ({ ...prev, [field]: value }));

    useEffect(() => {
        setForm(emptyPayload(defaultNumeroVisita));
    }, [defaultNumeroVisita]);

    useEffect(() => {
        console.log('🔍 Usuario desde contexto:', usuario);
        console.log('📋 Campos disponibles:', usuario ? Object.keys(usuario) : 'No hay usuario');
        console.log('🆔 idValorpersonal:', usuario?.idValorpersonal);
        console.log('🆔 valorPersonal:', usuario?.valorPersonal);
        console.log('🆔 idCodOperador:', usuario?.idCodOperador);
        
        if (usuario) {
            const profesional = usuario?.idValorpersonal || usuario?.valorPersonal;
            const operador = usuario?.idValorpersonal || usuario?.valorPersonal || usuario?.idCodOperador;
            
            console.log('✅ ProfesionalAsiste será:', profesional);
            console.log('✅ OperadorCarga será:', operador);
            
            setForm((prev) => ({
                ...prev,
                ProfesionalAsiste: profesional,
                OperadorCarga: operador
            }));
        }
    }, [usuario]);

    const set = (field: keyof NuevaIndicacionPayload, value: any) =>
        setForm((prev) => ({ ...prev, [field]: value }));

    const n = (v: string) => (v === "" ? null : Number(v));
    const s = (v: string) => (v === "" ? null : v);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const resultado = await onSave(form);
            console.log('📥 Resultado completo del backend:', resultado);
            
            if (indicacionesHijas.length > 0 && resultado && (resultado as any).NroIndicacion) {
                const nroIndicacionPadre = (resultado as any).NroIndicacion;
                
                console.log('✅ Indicación padre guardada con NroIndicacion:', nroIndicacionPadre);
                console.log(`📋 Guardando ${indicacionesHijas.length} indicación(es) adicional(es)...`);
                
                for (let i = 0; i < indicacionesHijas.length; i++) {
                    const hija = indicacionesHijas[i];
                    
                    // La indicación adicional copia TODOS los datos del padre
                    // Solo cambia: Codigo, CantidadIndicada, TipoUnidad, Frecuencia, Cantidad, AliasMedicamento
                    // Y establece NroAdicional = NroIndicacion del padre
                    // El backend incrementará automáticamente HoraCarga según el índice
                    const hijaPayload: NuevaIndicacionPayload = {
                        ...form, // Copiar TODO del padre
                        Codigo: hija.codigo,
                        CantidadIndicada: hija.cantidad,
                        TipoUnidad: hija.tipoUnidad,
                        Frecuencia: hija.frecuencia,
                        Cantidad: hija.cantidad,
                        AliasMedicamento: hija.aliasMedicamento,
                        FormaAdicional: hija.formaAdicional,
                        NroAdicional: nroIndicacionPadre, // DEBE IR AL FINAL para sobrescribir el 0 del padre
                    };
                    
                    console.log(`💊 Guardando indicación adicional ${i + 1}/${indicacionesHijas.length}`);
                    console.log('📦 Payload completo:', hijaPayload);
                    console.log('🔗 NroAdicional debe ser:', nroIndicacionPadre);
                    
                    await indicacionesService.postNuevaIndicacion(hijaPayload);
                    console.log(`✅ Indicación adicional ${i + 1} guardada exitosamente`);
                }
                
                console.log('🎉 Todas las indicaciones adicionales guardadas exitosamente');
            } else {
                console.log('✅ Indicación guardada (sin adicionales)');
            }
            
            // Recargar la tabla de indicaciones
            if (refetch) {
                await refetch();
            }
            
            onClose();
        } catch (err) {
            console.error('❌ Error al guardar indicaciones:', err);
            if (err instanceof Error) {
                alert(
                    err.message || "Error inesperado al guardar la indicación"
                );
            }
        }
    };

    // Cargar catálogos
    useEffect(() => {
        (async () => {
            setDataLoading(true);

            try {
                // Usar idSector prop si está disponible, sino extraer de params.id
                const sectorId = idSector || (params.id ? (params.id as string).split("-")[0] : null);
                if (sectorId) {
                    set("IdSector", sectorId);
                }
                const data = await indicacionesService.getFormularioDatos();
                if (data) setDataForm(data);

                if (nroIndicacion) {
                    const res =
                        await indicacionesService.getIndicacionesByNroIndicacion(
                            nroIndicacion
                        );

                    if (res) {
                        console.log("Indicacion loaded:", res);
                        console.log("Indicaciones hijas:", (res as any).indicacionesHijas);
                        
                        setForm((prev) => ({
                            ...prev,
                            // ids / relación
                            NumeroVisita: res.NumeroVisita,
                            NroAdicional: res.NroAdicional,
                            NroIndicacionAnterior: res.NroIndicacionAnterior,
                            IdSector: res.IdSector,

                            // fecha/hora carga
                            FechaCarga: res.FechaCarga,
                            HoraCarga: res.HoraCarga,
                            OperadorCarga: res.OperadorCarga,
                            ProfesionalAsiste: res.ProfesionalAsiste,

                            // últimas/próximas/revisión
                            FechaCumplido: res.FechaCumplido,
                            HoraCumplido: res.HoraCumplido,
                            FechaProximo: res.FechaProximo,
                            HoraProximo: res.HoraProximo,
                            FechaRevision: res.FechaRevision,
                            HoraRevision: res.HoraRevision,

                            // tipo / código / alias
                            TipoIndicacion: res.TipoIndicacion,
                            Codigo: res.Codigo,
                            AliasMedicamento: res.AliasMedicamento,

                            // cantidades/frecuencia
                            CantidadIndicada: res.CantidadIndicada,
                            TipoUnidad: res.TipoUnidad,
                            Frecuencia: res.Frecuencia,
                            Cantidad: res.Cantidad,

                            // varios
                            Observaciones: res.Observaciones,
                            FechaExpiro: res.FechaExpiro,
                            HoraExpiro: res.HoraExpiro,
                            Orden: res.Orden,
                            Estado: res.Estado,
                            CantidadPorTurno: res.CantidadPorTurno,
                            CantidadEntregada: res.CantidadEntregada,
                            ParaFechaEntrega:
                                res.ParaFechaEntrega?.split("T")[0] || null,
                            FormaAdicional: res.FormaAdicional,
                            ExcluidoDeEntrega: res.ExcluidoDeEntrega,
                        }));
                        
                        // Cargar indicaciones hijas si existen
                        if ((res as any).indicacionesHijas && Array.isArray((res as any).indicacionesHijas)) {
                            const hijas = (res as any).indicacionesHijas.map((h: any) => ({
                                id: String(h.nroIndicacion || ''),
                                formaAdicional: h.formaAdicional || null,
                                codigo: h.codigo || null,
                                aliasMedicamento: h.medicamento || h.descripcion || null,
                                cantidad: h.cantidad || null,
                                tipoUnidad: h.tipoUnidad || null,
                                frecuencia: h.frecuencia || null,
                                observaciones: h.observaciones || null,
                            }));
                            setIndicacionesHijas(hijas);
                            console.log("✅ Indicaciones hijas cargadas:", hijas);
                        }
                    }
                }
            } catch (err) {
                console.error(err);
            } finally {
                setDataLoading(false);
            }
        })();
    }, []);

    // Tipo de indicación
    const tipoIndicacion = useMemo(() => {
        if (!dataForm || form.TipoIndicacion == null) return undefined;
        return dataForm.tiposIndicacion.find(
            (t) => Number(t.Valor) === Number(form.TipoIndicacion)
        )?.Tipo as "M" | "D" | "C" | "A" | undefined;
    }, [dataForm, form.TipoIndicacion]);

    // Opciones de medicación según tipo
    const medicaCionData = useMemo(() => {
        if (!dataForm || !tipoIndicacion) return [];
        switch (tipoIndicacion) {
            case "M":
                return dataForm.vademecum.map((v) => ({
                    value: Number(v.Valor),
                    label: v.Nombre,
                }));
            case "D":
                return dataForm.tiposDieta.map((d) => ({
                    value: Number(d.Valor),
                    label: d.Descripcion,
                }));
            case "C":
                return dataForm.tiposControles.map((c) => ({
                    value: Number(c.Valor),
                    label: c.Descripcion,
                }));
            case "A":
                return dataForm.controlesAsistenciales.map((a) => ({
                    value: Number(a.Valor),
                    label: a.Descripcion,
                }));
            default:
                return [];
        }
    }, [dataForm, tipoIndicacion]);

    // Al cambiar tipo, limpiamos selección (ID) para evitar incoherencias
    useEffect(() => {
        set("AliasMedicamento", null);
        set("Codigo", null);
        set("TipoUnidad", null);
    }, [tipoIndicacion]);

    // Al seleccionar medicamento PADRE, cargar automáticamente el TipoUnidad si es medicamento
    useEffect(() => {
        if (tipoIndicacion === 'M' && form.Codigo && dataForm?.vademecum) {
            const medicamento = dataForm.vademecum.find(
                (v) => Number(v.Valor) === Number(form.Codigo)
            );
            if (medicamento?.TipoMedicamento) {
                set("TipoUnidad", medicamento.TipoMedicamento);
            }
        }
    }, [form.Codigo, tipoIndicacion, dataForm]);
    
    // Al seleccionar medicamento ADICIONAL, cargar automáticamente el TipoUnidad
    useEffect(() => {
        if (tipoIndicacion === 'M' && adicionalForm.codigo && dataForm?.vademecum) {
            const medicamento = dataForm.vademecum.find(
                (v) => Number(v.Valor) === Number(adicionalForm.codigo)
            );
            if (medicamento?.TipoMedicamento) {
                setAdicional("tipoUnidad", medicamento.TipoMedicamento);
            }
        }
    }, [adicionalForm.codigo, tipoIndicacion, dataForm]);

    // === Descripción calculada (NO se guarda en payload) ===
    const aliasDescripcion = useMemo(() => {
        if (!dataForm || form.Codigo == null || !tipoIndicacion) return "";
        const id = Number(form.Codigo);

        if (tipoIndicacion === "M") {
            const found = dataForm.vademecum.find(
                (v) => Number(v.Valor) === id
            );

            return found?.Nombre ?? ""
        }
        if (tipoIndicacion === "D") {
            const found = dataForm.tiposDieta.find(
                (d) => Number(d.Valor) === id
            );
            return found?.Descripcion ?? "";
        }
        if (tipoIndicacion === "C") {
            const found = dataForm.tiposControles.find(
                (c) => Number(c.Valor) === id
            );
            return found?.Descripcion ?? "";
        }
        if (tipoIndicacion === "A") {
            const found = dataForm.controlesAsistenciales.find(
                (a) => Number(a.Valor) === id
            );
            return found?.Descripcion ?? "";
        }
        return "";
    }, [dataForm, form.Codigo, tipoIndicacion]);

    useEffect(() => {
        const next = aliasDescripcion || null;
        if (form.AliasMedicamento !== next) {
            set("AliasMedicamento", next);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [aliasDescripcion]);

    // Recalcular Cantidad (total/día) a partir de CantidadIndicada (por toma) y Frecuencia
    useEffect(() => {
        // proteger: catálogo cargado y frecuencia elegida
        if (!dataForm?.frecuenciasAdmin || !form.Frecuencia) {
            set("Cantidad", null);
            return;
        }
        // buscar el Intervalo (Clarion ticks) por el Valor seleccionado en el select
        const key = String(form.Frecuencia).trim().toLowerCase();
        const freq = dataForm.frecuenciasAdmin.find(
            (f) => String(f.Valor).trim().toLowerCase() === key
        );
        if (!freq || !Number.isFinite(freq.Intervalo) || freq.Intervalo <= 0) {
            set("Cantidad", null);
            return;
        }

        // dosisPorDia = entero de 24h / intervalo (en ticks Clarion)
        const dosisPorDia = Math.max(
            1,
            Math.round(DAY_TICKS / Number(freq.Intervalo))
        );

        // CantidadIndicada debe ser >= 1 (si algo raro llega, forzamos 1)
        const porToma =
            typeof form.CantidadIndicada === "number" &&
                form.CantidadIndicada >= 1
                ? form.CantidadIndicada
                : 1;

        // Cantidad = por_toma × dosisPorDia (entero)
        set("Cantidad", porToma * dosisPorDia);
    }, [dataForm, form.Frecuencia, form.CantidadIndicada]);

    const handleAgregarHija = () => {
        if (!adicionalForm.codigo || !adicionalForm.cantidadIndicada) {
            alert('Complete los campos obligatorios (Medicamento y Cantidad) antes de agregar');
            return;
        }
        
        // Obtener descripción del medicamento adicional
        const descripcionAdicional = getMedicamentoLabel(adicionalForm.codigo);
        
        const nuevaHija: IndicacionHija = {
            id: Date.now().toString(),
            formaAdicional: hijaEnEdicion.formaAdicional,
            codigo: adicionalForm.codigo,
            aliasMedicamento: descripcionAdicional,
            cantidad: adicionalForm.cantidadIndicada,
            tipoUnidad: adicionalForm.tipoUnidad,
            frecuencia: adicionalForm.frecuencia,
            observaciones: adicionalForm.observaciones,
        };
        
        setIndicacionesHijas([...indicacionesHijas, nuevaHija]);
        
        // Limpiar campos de adicional
        setAdicionalForm({
            codigo: null,
            cantidadIndicada: 1,
            tipoUnidad: null,
            frecuencia: null,
            cantidad: null,
            observaciones: null,
        });
        setHijaEnEdicion({
            id: '',
            formaAdicional: null,
            codigo: null,
            aliasMedicamento: null,
            cantidad: null,
            tipoUnidad: null,
            frecuencia: null,
            observaciones: null,
        });
        
        // Close drawer after adding
        setMostrarAdicionales(false);
    };

    const handleEliminarHija = (id: string) => {
        setIndicacionesHijas(indicacionesHijas.filter(h => h.id !== id));
    };

    const handleCambiarOperacion = (id: string, operacion: string) => {
        setIndicacionesHijas(indicacionesHijas.map(h => 
            h.id === id ? { ...h, formaAdicional: operacion } : h
        ));
    };

    const getMedicamentoLabel = (codigo: number | null) => {
        if (!codigo || !dataForm) return '';
        const id = Number(codigo);
        
        if (tipoIndicacion === 'M') {
            const found = dataForm.vademecum.find(v => Number(v.Valor) === id);
            return found?.Nombre ?? '';
        }
        if (tipoIndicacion === 'D') {
            const found = dataForm.tiposDieta.find(d => Number(d.Valor) === id);
            return found?.Descripcion ?? '';
        }
        if (tipoIndicacion === 'C') {
            const found = dataForm.tiposControles.find(c => Number(c.Valor) === id);
            return found?.Descripcion ?? '';
        }
        if (tipoIndicacion === 'A') {
            const found = dataForm.controlesAsistenciales.find(a => Number(a.Valor) === id);
            return found?.Descripcion ?? '';
        }
        return '';
    };


    return (
        <div className={styles.formScrollContainer}>
            <form
                id="nueva-indicacion-form"
                onSubmit={handleSubmit}
                className={styles.wrap}
            >
                {/* Fila 1 */}
                <div className={styles.rowHeader}>
                    <div className={styles.row}>
                        <div className={styles.inlineField}>
                            <label>Profesional que indica</label>
                            <div className={styles.inlineInputs}>
                                <input
                                    type="number"
                                    className={styles.inputXs}
                                    placeholder="Código"
                                    value={form.ProfesionalAsiste ?? ""}
                                    disabled
                                    required
                                />
                                <div className={styles.badge}>
                                    {(usuario?.nombre + " " + usuario?.apellido) || "ADMINISTRADOR"}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={styles.inlineFieldRight}>
                        <label>Solicitado para el día</label>
                        <input
                            type="date"
                            className={styles.inputSm}
                            value={form.ParaFechaEntrega ?? ""}
                            onChange={(e) =>
                                set("ParaFechaEntrega", s(e.target.value))
                            }
                        />
                    </div>
                </div>

                {/* Fila 2: INDICACIÓN PADRE - Tipo / Medicación / Descripción */}
                <div className={styles.rowTmd}>
                    <div className={styles.hField}>
                        <label htmlFor="TipoIndicacion">
                            Tipo de Indicación
                        </label>
                        <CustomSelect
                            label=""
                            name="TipoIndicacion"
                            isLoading={dataLoading}
                            onChange={
                                (val) => {
                                    set("TipoIndicacion", Number(val))
                                    set("Orden", dataForm?.tiposIndicacion.filter(i => i.Valor === val)[0]?.OrdenMedicacion)
                                }
                            }
                            value={form.TipoIndicacion || ""}
                            autoFocus={false}
                            options={
                                dataForm?.tiposIndicacion.map((item) => ({
                                    value: Number(item.Valor),
                                    label: item.Descripcion,
                                })) || []
                            }
                        />
                    </div>

                    <div className={styles.hField}>
                        <label className={styles.hLabel}>Medicación</label>
                        <CustomSelect
                            label=""
                            name="Codigo"
                            isLoading={dataLoading || !tipoIndicacion}
                            value={form.Codigo ?? ""}
                            onChange={(val) => set("Codigo", Number(val))}
                            options={medicaCionData}
                        />
                    </div>

                    <div className={styles.hField}>
                        <label className={styles.hLabel}>Descripción</label>
                        <input
                            className={styles.input}
                            type="text"
                            value={aliasDescripcion}
                            disabled
                            placeholder="Se completa al elegir medicación"
                            aria-disabled="true"
                        />
                    </div>
                </div>

                {/* Fila 3: INDICACIÓN PADRE - Cantidad / Tipo unidad / Frecuencia */}
                <div className={styles.rowQtyPadre}>
                    <div className={styles.qtyGroup}>
                        <label>Cantidad</label>
                        <input
                            type="number"
                            step="1"
                            min={1}
                            className={styles.inputNum}
                            value={form.CantidadIndicada ?? ""}
                            onChange={(e) =>
                                set("CantidadIndicada", n(e.target.value))
                            }
                            onInput={(e) => {
                                const inputElement = e.target as HTMLInputElement;
                                const rawValue = inputElement.value;

                                if (rawValue === "" || rawValue === "-") {
                                    inputElement.value = "";
                                }

                                const numericValue = parseInt(rawValue);

                                if (isNaN(numericValue) || numericValue < 1) {
                                    if (rawValue !== "") {
                                        inputElement.value = "1";
                                    }
                                }
                            }}
                        />
                    </div>

                    <div className={styles.qtyGroup}>
                        <label>Tipo unidad</label>
                        <CustomSelect
                            label=""
                            name="TipoUnidad"
                            isLoading={dataLoading}
                            onChange={(val) => set("TipoUnidad", val)}
                            options={
                                dataForm?.unidadesMedida.map((item) => ({
                                    value: item.Valor,
                                    label: item.Descripcion,
                                })) || []
                            }
                            value={form.TipoUnidad || ""}
                        />
                    </div>

                    <div className={styles.qtyGroupWide}>
                        <label>Frecuencia</label>
                        <CustomSelect
                            label=""
                            name="Frecuencia"
                            isLoading={dataLoading}
                            onChange={(val) => set("Frecuencia", val)}
                            value={form.Frecuencia || ""}
                            options={
                                dataForm?.frecuenciasAdmin.map((item) => ({
                                    value: item.Valor,
                                    label: item.Valor,
                                })) || []
                            }
                        />
                    </div>
                </div>

                {/* Botón Agregar Adicional + Chips de adicionales agregados */}
                <div className={styles.adicionalSection}>
                    <div className={styles.adicionalHeader}>
                        <button
                            type="button"
                            className={styles.btnAgregarAdicional}
                            onClick={() => setMostrarAdicionales(true)}
                            disabled={!form.Codigo}
                        >
                            <span className={styles.iconPlus}>+</span>
                            Agregar Adicional
                        </button>
                        {indicacionesHijas.length > 0 && (
                            <span className={styles.adicionalCount}>
                                {indicacionesHijas.length} adicional{indicacionesHijas.length !== 1 ? 'es' : ''}
                            </span>
                        )}
                    </div>

                    {/* Tabla-pill híbrida de adicionales */}
                    {indicacionesHijas.length > 0 && (
                        <div className={styles.chipTable}>
                            <div className={styles.chipTableHead}>
                                <span className={styles.colOp}>Operación</span>
                                <span className={styles.colCant}>Cant.</span>
                                <span className={styles.colUni}>Tipo Unidad</span>
                                <span className={styles.colMed}>Medicamento</span>
                                <span className={styles.colFreq}>Frecuencia</span>
                                <span className={styles.colObs}>Observación</span>
                                <span className={styles.colAcc}></span>
                            </div>
                            {indicacionesHijas.map((hija) => (
                                <div key={hija.id} className={styles.chipRow}>
                                    <span className={styles.colOp}>
                                        <select
                                            className={styles.chipOperacion}
                                            value={hija.formaAdicional || ''}
                                            onChange={(e) => handleCambiarOperacion(hija.id, e.target.value)}
                                        >
                                            <option value="">—</option>
                                            <option value="MAS">Más</option>
                                            <option value="ALTERNO">Alterno</option>
                                            <option value="PARALELO">Paralelo</option>
                                        </select>
                                    </span>
                                    <span className={`${styles.colCant} ${styles.chipMeta}`}>
                                        {hija.cantidad}
                                    </span>
                                    <span className={`${styles.colUni} ${styles.chipMeta}`}>
                                        {hija.tipoUnidad || '—'}
                                    </span>
                                    <span className={`${styles.colMed} ${styles.chipText}`}>
                                        {hija.aliasMedicamento}
                                    </span>
                                    <span className={`${styles.colFreq} ${styles.chipMeta}`}>
                                        {hija.frecuencia || '—'}
                                    </span>
                                    <span className={`${styles.colObs} ${styles.chipMeta}`}>
                                        {hija.observaciones || '—'}
                                    </span>
                                    <span className={styles.colAcc}>
                                        <button
                                            type="button"
                                            className={styles.chipRemove}
                                            onClick={() => handleEliminarHija(hija.id)}
                                            aria-label="Eliminar"
                                        >
                                            ✕
                                        </button>
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Fila 5: Observaciones */}
                <div className={styles.row}>
                    <div className={styles.fieldFull}>
                        <label>Observaciones</label>
                        <textarea
                            className={styles.textarea}
                            value={form.Observaciones ?? ""}
                            onChange={(e) =>
                                set("Observaciones", s(e.target.value))
                            }
                        />
                    </div>
                </div>

                {/* Fila 6: Última / Próxima administración */}
                <div className={styles.rowCols3}>
                    <div className={styles.inlineField}>
                        <label>Última administración</label>
                        <div className={styles.inlineInputs}>
                            <input
                                type="date"
                                className={styles.inputSm}
                                value={form.FechaCumplido ?? ""}
                                onChange={(e) =>
                                    set("FechaCumplido", s(e.target.value))
                                }
                            />
                            <input
                                type="time"
                                className={styles.inputSm}
                                value={form.HoraCumplido ?? ""}
                                onChange={(e) =>
                                    set("HoraCumplido", s(e.target.value))
                                }
                            />
                        </div>
                    </div>

                    <div className={styles.inlineField}>
                        <label>Próxima administración</label>
                        <div className={styles.inlineInputs}>
                            <input
                                type="date"
                                className={styles.inputSm}
                                value={form.FechaProximo ?? ""}
                                onChange={(e) =>
                                    set("FechaProximo", s(e.target.value))
                                }
                            />
                            <input
                                type="time"
                                className={styles.inputSm}
                                value={form.HoraProximo ?? ""}
                                onChange={(e) =>
                                    set("HoraProximo", s(e.target.value))
                                }
                            />
                        </div>
                    </div>

                    <div style={{ width: "210px" }} />
                </div>
            </form>

            {/* Slide Drawer para agregar adicional — fuera del form para evitar submit */}
            <SlideDrawer
                isOpen={mostrarAdicionales}
                onClose={() => setMostrarAdicionales(false)}
                title="Agregar Medicamento Adicional"
                footer={
                    <>
                        <button
                            type="button"
                            className={styles.drawerBtnCancel}
                            onClick={() => setMostrarAdicionales(false)}
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            className={styles.drawerBtnConfirm}
                            onClick={() => {
                                handleAgregarHija();
                            }}
                        >
                            Confirmar
                        </button>
                    </>
                }
            >
                <div className={styles.drawerField}>
                    <label>Operación</label>
                    <select
                        className={styles.input}
                        value={hijaEnEdicion.formaAdicional || ''}
                        onChange={(e) => setHijaEnEdicion(prev => ({ ...prev, formaAdicional: e.target.value || null }))}
                        autoFocus
                    >
                        <option value="">Seleccionar operación</option>
                        <option value="MAS">Más</option>
                        <option value="ALTERNO">Alterno</option>
                        <option value="PARALELO">Paralelo</option>
                    </select>
                </div>

                <div className={styles.drawerField}>
                    <label>Medicamento</label>
                    <CustomSelect
                        label=""
                        name="CodigoAdicional"
                        isLoading={dataLoading}
                        value={adicionalForm.codigo ?? ""}
                        onChange={(val) => setAdicional("codigo", Number(val))}
                        options={medicaCionData}
                    />
                </div>

                <div className={styles.drawerFieldRow}>
                    <div className={styles.drawerField}>
                        <label>Cantidad</label>
                        <input
                            type="number"
                            step="1"
                            min={1}
                            className={styles.input}
                            value={adicionalForm.cantidadIndicada ?? ""}
                            onChange={(e) =>
                                setAdicional("cantidadIndicada", n(e.target.value))
                            }
                            onInput={(e) => {
                                const inputElement = e.target as HTMLInputElement;
                                const rawValue = inputElement.value;
                                if (rawValue === "" || rawValue === "-") {
                                    inputElement.value = "";
                                }
                                const numericValue = parseInt(rawValue);
                                if (isNaN(numericValue) || numericValue < 1) {
                                    if (rawValue !== "") {
                                        inputElement.value = "1";
                                    }
                                }
                            }}
                        />
                    </div>

                    <div className={styles.drawerField}>
                        <label>Tipo Unidad</label>
                        <select
                            className={styles.input}
                            value={adicionalForm.tipoUnidad || ""}
                            onChange={(e) => setAdicional("tipoUnidad", e.target.value || null)}
                            disabled={dataLoading}
                        >
                            <option value="">Seleccione...</option>
                            {dataForm?.unidadesMedida.map((item) => (
                                <option key={item.Valor} value={item.Valor}>{item.Descripcion}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className={styles.drawerField}>
                    <label>Frecuencia</label>
                    <select
                        className={styles.input}
                        value={adicionalForm.frecuencia || ""}
                        onChange={(e) => setAdicional("frecuencia", e.target.value || null)}
                        disabled={dataLoading}
                    >
                        <option value="">Seleccione...</option>
                        {dataForm?.frecuenciasAdmin.map((item) => (
                            <option key={item.Valor} value={item.Valor}>{item.Valor}</option>
                        ))}
                    </select>
                </div>

                <div className={styles.drawerField}>
                    <label>Observaciones</label>
                    <textarea
                        className={styles.textarea}
                        value={adicionalForm.observaciones ?? ""}
                        onChange={(e) => setAdicional("observaciones", s(e.target.value))}
                        rows={3}
                    />
                </div>
            </SlideDrawer>
        </div>
    );
}
