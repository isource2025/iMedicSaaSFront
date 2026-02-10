"use client";

import React, { useEffect, useMemo, useState } from "react";
import styles from "./NuevaEvolucionEnfermeriaModal.module.css";
import { useAppContext } from "@/app/contexts/AppContext";

interface NuevaEvolucionEnfermeriaPayload {
    NumeroVisita: number;
    FechaControl: string;
    HoraControl: string;
    Observaciones: string;
    Profesional?: number;
}

interface NuevaEvolucionEnfermeriaModalProps {
    onClose: () => void;
    onSave: (data: NuevaEvolucionEnfermeriaPayload) => Promise<any> | any;
    defaultNumeroVisita: number | null;
    refetch?: () => Promise<void>;
}

const getLocalDateString = (date: Date): string => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

const getLocalTimeString = (date: Date): string => {
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
};

const emptyPayload = (numeroVisita: number | null, idPersonal: string): NuevaEvolucionEnfermeriaPayload => {
    return {
        NumeroVisita: numeroVisita || 0,
        FechaControl: getLocalDateString(new Date()),
        HoraControl: getLocalTimeString(new Date()),
        Observaciones: "",
        Profesional: idPersonal ? parseInt(idPersonal) : undefined,
    };
};

export default function NuevaEvolucionEnfermeriaModal({
    onClose,
    onSave,
    defaultNumeroVisita,
    refetch,
}: NuevaEvolucionEnfermeriaModalProps) {
    const { sectorSeleccionado } = useAppContext();
    
    // Obtener idPersonal del sectorSeleccionado
    const idPersonal = sectorSeleccionado?.idPersonal || '';
    
    const initial = useMemo(
        () => emptyPayload(defaultNumeroVisita, idPersonal),
        [defaultNumeroVisita, idPersonal]
    );
    const [form, setForm] = useState<NuevaEvolucionEnfermeriaPayload>(initial);

    useEffect(() => {
        setForm(emptyPayload(defaultNumeroVisita, idPersonal));
    }, [defaultNumeroVisita, idPersonal]);

    const set = (field: keyof NuevaEvolucionEnfermeriaPayload, value: any) =>
        setForm((prev) => ({ ...prev, [field]: value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!form.Observaciones || form.Observaciones.trim() === "") {
            alert("Debe ingresar las observaciones");
            return;
        }

        try {
            await onSave(form);
            
            if (refetch) {
                await refetch();
            }
            
            onClose();
        } catch (err) {
            console.error('❌ Error al guardar evolución:', err);
            if (err instanceof Error) {
                alert(
                    err.message || "Error inesperado al guardar la evolución"
                );
            }
        }
    };

    return (
        <form id="nueva-evolucion-enfermeria-form" onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGrid}>
                {/* Fecha */}
                <div className={styles.formGroup}>
                    <label className={styles.label}>
                        Fecha <span className={styles.required}>*</span>
                    </label>
                    <input
                        type="date"
                        className={styles.input}
                        value={form.FechaControl}
                        onChange={(e) => set("FechaControl", e.target.value)}
                        required
                    />
                </div>

                {/* Hora */}
                <div className={styles.formGroup}>
                    <label className={styles.label}>
                        Hora <span className={styles.required}>*</span>
                    </label>
                    <input
                        type="time"
                        className={styles.input}
                        value={form.HoraControl}
                        onChange={(e) => set("HoraControl", e.target.value)}
                        required
                    />
                </div>

                {/* Observaciones - Ocupa todo el ancho */}
                <div className={styles.formGroupFull}>
                    <label className={styles.label}>
                        Observaciones <span className={styles.required}>*</span>
                    </label>
                    <textarea
                        className={styles.textarea}
                        value={form.Observaciones}
                        onChange={(e) => set("Observaciones", e.target.value)}
                        placeholder="Ingrese las observaciones de la evolución..."
                        rows={10}
                        required
                    />
                    <div className={styles.charCount}>
                        {form.Observaciones.length} caracteres
                    </div>
                </div>
            </div>
        </form>
    );
}
