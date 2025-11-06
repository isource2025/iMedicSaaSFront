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

interface IndicacionFormProps {
    onClose: () => void;
    onSave: (data: NuevaIndicacionPayload) => Promise<void> | void;
    defaultNumeroVisita: number | null;
    nroIndicacion?: number | null;
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
    FechaCarga: getLocalDateString(new Date),
    HoraCarga: new Date().toTimeString().slice(0, 8),
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
    ParaFechaEntrega: getLocalDateString(new Date),
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
}: IndicacionFormProps) {
    const initial = useMemo(
        () => emptyPayload(defaultNumeroVisita),
        [defaultNumeroVisita]
    );
    const [form, setForm] = useState<NuevaIndicacionPayload>(initial);
    const [dataLoading, setDataLoading] = useState(false);
    const [dataForm, setDataForm] = useState<FormularioDatosResponse | null>(
        null
    );
    const params = useParams();
    const { usuario } = useAppContext();

    useEffect(() => {
        setForm(emptyPayload(defaultNumeroVisita));
        setForm((prev) => ({
            ...prev,
            ProfesionalAsiste:
                usuario?.valorPersonal || usuario?.idValorpersonal,
            OperadorCarga: usuario?.valorPersonal || usuario?.idValorpersonal
        }));
    }, [defaultNumeroVisita]);

    const set = (field: keyof NuevaIndicacionPayload, value: any) =>
        setForm((prev) => ({ ...prev, [field]: value }));

    const n = (v: string) => (v === "" ? null : Number(v));
    const s = (v: string) => (v === "" ? null : v);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await onSave(form);
            onClose();
        } catch (err) {
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
                set("IdSector", (params.id as string).split("-")[0]);
                const data = await indicacionesService.getFormularioDatos();
                if (data) setDataForm(data);

                if (nroIndicacion) {
                    const res =
                        await indicacionesService.getIndicacionesByNroIndicacion(
                            nroIndicacion
                        );

                    if (res) {
                        console.log("Indicacion loaded:", res);
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
        set("AliasMedicamento", null); // ← solo hay un campo; aquí guardamos el ID
        set("Codigo", null);
    }, [tipoIndicacion]);

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

                    <div className={styles.inlineField}>
                        <label>Fecha / Hora que indica</label>
                        <div className={styles.inlineInputs}>
                            <input
                                type="date"
                                className={styles.inputSm}
                                value={form.FechaCarga ?? ""}
                                onChange={(e) =>
                                    set("FechaCarga", s(e.target.value))
                                }
                            />
                            <input
                                type="time"
                                className={styles.inputSm}
                                value={form.HoraCarga ?? ""}
                                onChange={(e) =>
                                    set("HoraCarga", s(e.target.value))
                                }
                            />
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

                {/* Fila 2: Tipo / Medicación / Descripción (solo visual) */}
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
                            tabIndex={1}
                            autoFocus={true}
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
                            value={form.Codigo ?? ""} // ✅ guardamos ID en AliasMedicamento
                            onChange={(val) => set("Codigo", Number(val))}
                            options={medicaCionData}
                            tabIndex={2}
                        />
                    </div>

                    <div className={styles.hField}>
                        <label className={styles.hLabel}>Descripción</label>
                        <input
                            className={styles.input}
                            type="text"
                            value={aliasDescripcion} // ✅ calculado, NO se guarda
                            disabled
                            placeholder="Se completa al elegir medicación"
                            aria-disabled="true"
                        />
                    </div>
                </div>

                {/* Fila 3: Cantidades */}
                <div className={styles.rowQty}>
                    <div className={styles.qtyGroup}>
                        <label>Cantidad</label>
                        <input
                            type="number"
                            step="1"
                            min={1}
                            className={styles.inputNum}
                            value={form.CantidadIndicada ?? ""} // ✅ editable
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
                            tabIndex={3}
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
                            tabIndex={4}
                        />
                    </div>

                    <div className={styles.qtyGroupWide}>
                        <label>Frecuencia</label>
                        <CustomSelect
                            label=""
                            name="Frecuencia"
                            isLoading={dataLoading}
                            onChange={(val) => set("Frecuencia", val)} // no casteamos; el parser se encarga
                            value={form.Frecuencia || ""}
                            options={
                                dataForm?.frecuenciasAdmin.map((item) => ({
                                    value: item.Valor,
                                    label: item.Valor,
                                })) || []
                            }
                            tabIndex={5}
                        />
                    </div>

                    <div className={styles.qtyGroup}>
                        <label>Cantidad</label>
                        <input
                            type="number"
                            className={styles.inputNum}
                            value={form.Cantidad ?? ""} // ✅ calculado
                            onChange={() => { }}
                            disabled
                        />
                    </div>

                    <div className={styles.actionGroup}>
                        <button type="button" className={styles.btnGhost}>
                            Agregar
                        </button>
                        <button type="button" className={styles.btnGhost}>
                            Cambiar
                        </button>
                        <button type="button" className={styles.btnGhostDanger}>
                            Borrar
                        </button>
                    </div>
                </div>

                {/* Fila 4: Tabla */}
                <div className={styles.tableCard}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Operación</th>
                                <th>Medicamento</th>
                                <th>Observaciones</th>
                                <th>Cantidad</th>
                                <th>Tipo unidad</th>
                                <th>Frecuencia</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className={styles.emptyRow}>
                                <td colSpan={6}>Sin ítems agregados</td>
                            </tr>
                        </tbody>
                    </table>
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
                            tabIndex={6}
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
        </div>
    );
}
