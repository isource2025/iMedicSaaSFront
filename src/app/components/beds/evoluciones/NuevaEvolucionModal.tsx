"use client";

import React, { useEffect, useMemo, useState } from "react";
import styles from "./NuevaEvolucionModal.module.css";
import { NuevaEvolucionPayload } from "../../../types/evoluciones";
import { useAppContext } from "@/app/contexts/AppContext";
import { evolucionesService } from "../../../services/evolucionesService";
import { authService } from "../../../services/authService";
import { apiFetch } from '@/app/utils/authFetch';

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

const resolverProfecional = (idPersonalFallback: string): number | undefined => {
    const u = authService.getCurrentUser() as Record<string, unknown> | null;
    const mat = u?.matricula ?? u?.Matricula;
    if (mat != null && Number(mat) > 0) return Number(mat);
    const vp = u?.idValorpersonal ?? u?.valorPersonal;
    if (vp != null && Number(vp) > 0) return Number(vp);
    if (idPersonalFallback) return parseInt(idPersonalFallback, 10);
    return undefined;
};

const emptyPayload = (idVisita: number | null, numeroDocumento: string, idSector: string, idPersonal: string): NuevaEvolucionPayload => {
    return {
        IdVisita: idVisita || 0,
        FechaEv: getLocalDateString(new Date()),
        HoraEv: getLocalTimeString(new Date()),
        IdSector: idSector,
        Evolucion: "",
        NumeroDocumento: numeroDocumento,
        Profecional: resolverProfecional(idPersonal),
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
                const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/beds`);
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

    // Cargar datos - exactamente igual que en NuevaIndicacionModal
    useEffect(() => {
        (async () => {
            setLoading(true);

            try {
                if (idEvolucion) {
                    console.log('🔍 Cargando evolución con ID:', idEvolucion);
                    const res = await evolucionesService.getEvolucionById(idEvolucion);

                    if (res) {
                        console.log('✅ Evolución cargada:', res);
                        const resAny = res as any;
                        setForm((prev) => ({
                            ...prev,
                            IdVisita: resAny.IdVisita || res.idVisita,
                            FechaEv: resAny.FechaEv || res.fechaEv,
                            HoraEv: resAny.HoraEv || res.horaEv,
                            IdSector: resAny.IdSector || res.idSector || '',
                            Evolucion: resAny.Evolucion || res.evolucion,
                            NumeroDocumento: resAny.NumeroDocumento || res.numeroDocumento || '',
                            Profecional: resAny.Profecional || res.profesional,
                        }));
                    }
                }
            } catch (err) {
                console.error('❌ Error al cargar evolución:', err);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

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
