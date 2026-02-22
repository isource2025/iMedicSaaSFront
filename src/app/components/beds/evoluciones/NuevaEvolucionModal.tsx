"use client";

import React, { useEffect, useMemo, useState } from "react";
import styles from "./NuevaEvolucionModal.module.css";
import { NuevaEvolucionPayload } from "../../../types/evoluciones";
import { useAppContext } from "@/app/contexts/AppContext";
import { evolucionesService } from "../../../services/evolucionesService";

interface NuevaEvolucionModalProps {
    onClose: () => void;
    onSave: (data: NuevaEvolucionPayload) => Promise<any> | any;
    defaultIdVisita: number | null;
    documentoPaciente?: string;
    idEvolucion?: number | null;
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

const emptyPayload = (idVisita: number | null, numeroDocumento: string, idSector: string, idPersonal: string): NuevaEvolucionPayload => {
    return {
        IdVisita: idVisita || 0,
        FechaEv: getLocalDateString(new Date()),
        HoraEv: getLocalTimeString(new Date()),
        IdSector: idSector,
        Evolucion: "",
        NumeroDocumento: numeroDocumento,
        Profecional: idPersonal ? parseInt(idPersonal) : undefined,
    };
};

export default function NuevaEvolucionModal({
    onClose,
    onSave,
    defaultIdVisita,
    documentoPaciente,
    idEvolucion = null,
    refetch,
}: NuevaEvolucionModalProps) {
    const { idsector, sectorSeleccionado } = useAppContext();
    const [documentoReal, setDocumentoReal] = useState<string>('');
    
    // Obtener idPersonal del sectorSeleccionado
    const idPersonal = sectorSeleccionado?.idPersonal || '';
    
    // Obtener el documento del paciente desde el header
    useEffect(() => {
        const obtenerDocumento = async () => {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/beds`);
                if (!res.ok) return;
                const data = await res.json();
                if (!data.success) return;
                
                const cama = data.data.find((c: any) => String(c.NumeroVisita) === String(defaultIdVisita));
                if (cama && cama.DocumentoPaciente) {
                    setDocumentoReal(cama.DocumentoPaciente);
                }
            } catch (err) {
                console.error('Error obteniendo documento:', err);
            }
        };
        
        if (defaultIdVisita) {
            obtenerDocumento();
        }
    }, [defaultIdVisita]);
    
    const initial = useMemo(
        () => emptyPayload(
            defaultIdVisita, 
            documentoReal || documentoPaciente || '',
            idsector || '',
            idPersonal
        ),
        [defaultIdVisita, documentoReal, documentoPaciente, idsector, idPersonal]
    );
    const [form, setForm] = useState<NuevaEvolucionPayload>(initial);
    const [loading, setLoading] = useState(false);

    // Cargar datos de evolución cuando idEvolucion está presente (modo edición)
    useEffect(() => {
        const loadEvolucion = async () => {
            if (idEvolucion) {
                setLoading(true);
                try {
                    const evolucion = await evolucionesService.getEvolucionById(idEvolucion);
                    if (evolucion) {
                        setForm({
                            IdVisita: evolucion.idVisita,
                            FechaEv: evolucion.fechaEv,
                            HoraEv: evolucion.horaEv,
                            IdSector: evolucion.idSector || '',
                            Evolucion: evolucion.evolucion,
                            NumeroDocumento: evolucion.numeroDocumento || '',
                            Profecional: evolucion.profesional,
                        });
                    }
                } catch (error) {
                    console.error('Error al cargar evolución:', error);
                    alert('Error al cargar los datos de la evolución');
                } finally {
                    setLoading(false);
                }
            } else {
                // Modo creación - usar valores por defecto
                setForm(emptyPayload(
                    defaultIdVisita, 
                    documentoReal || documentoPaciente || '',
                    idsector || '',
                    idPersonal
                ));
            }
        };

        loadEvolucion();
    }, [idEvolucion, defaultIdVisita, documentoReal, documentoPaciente, idsector, idPersonal]);

    const set = (field: keyof NuevaEvolucionPayload, value: any) =>
        setForm((prev) => ({ ...prev, [field]: value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!form.Evolucion || form.Evolucion.trim() === "") {
            alert("Debe ingresar el texto de la evolución");
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
        <form id="nueva-evolucion-form" onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGrid}>
                {/* Fecha */}
                <div className={styles.formGroup}>
                    <label className={styles.label}>
                        Fecha <span className={styles.required}>*</span>
                    </label>
                    <input
                        type="date"
                        className={styles.input}
                        value={form.FechaEv}
                        onChange={(e) => set("FechaEv", e.target.value)}
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
                        value={form.HoraEv}
                        onChange={(e) => set("HoraEv", e.target.value)}
                        required
                    />
                </div>

                {/* Sector - Viene de localStorage (deshabilitado) */}
                <div className={styles.formGroup}>
                    <label className={styles.label}>
                        Sector <span className={styles.required}>*</span>
                    </label>
                    <input
                        type="text"
                        className={styles.input}
                        value={form.IdSector || ""}
                        disabled
                        required
                    />
                </div>

                {/* Número Documento - Del usuario logueado (deshabilitado) */}
                <div className={styles.formGroup}>
                    <label className={styles.label}>
                        Nro. Documento <span className={styles.required}>*</span>
                    </label>
                    <input
                        type="text"
                        className={styles.input}
                        value={form.NumeroDocumento || ""}
                        disabled
                        required
                    />
                </div>

                {/* Evolución - Ocupa todo el ancho */}
                <div className={styles.formGroupFull}>
                    <label className={styles.label}>
                        Evolución Médica <span className={styles.required}>*</span>
                    </label>
                    <textarea
                        className={styles.textarea}
                        value={form.Evolucion || ''}
                        onChange={(e) => set("Evolucion", e.target.value)}
                        placeholder="Ingrese la evolución médica del paciente..."
                        rows={10}
                        required
                    />
                    <div className={styles.charCount}>
                        {(form.Evolucion || '').length} caracteres
                    </div>
                </div>
            </div>
        </form>
    );
}
