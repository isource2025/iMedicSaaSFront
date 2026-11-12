"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import styles from "../../indicaciones/NuevaIndicacionModal.module.css";
import CustomSelect from "../../Patients/AddPatient/LoadingSelect";
import MessageModal from "../../UI/MessageModal";
import { indicacionesService } from "../../../services/indicacionesService";
import { sectorDesdeCamaId } from "../../../utils/dateUtils";
import type { FormularioDatosResponse, NuevaIndicacionPayload } from "../../../types/indicaciones";

export const TIPO_DESCARTABLES = 9;
export const NUEVO_INSUMO_FORM_ID = "nuevo-insumo-form";

interface NuevoInsumoFormProps {
    numeroVisita: number | null;
    /** YYYY-MM-DD: hoy o mañana. */
    fechaCarga: string;
    onGuardado: (fechaCarga: string) => void | Promise<void>;
    onSavingChange?: (saving: boolean) => void;
}

function formatearFecha(ymd: string): string {
    const [y, m, d] = ymd.split("-");
    return `${d}/${m}/${y}`;
}

export default function NuevoInsumoForm({
    numeroVisita,
    fechaCarga,
    onGuardado,
    onSavingChange,
}: NuevoInsumoFormProps) {
    const params = useParams();
    const [datos, setDatos] = useState<FormularioDatosResponse | null>(null);
    const [cargando, setCargando] = useState(true);
    const [codigo, setCodigo] = useState<number | null>(null);
    const [cantidad, setCantidad] = useState<number>(1);
    const [observaciones, setObservaciones] = useState("");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let activo = true;
        indicacionesService
            .getFormularioDatos()
            .then((d) => activo && setDatos(d))
            .finally(() => activo && setCargando(false));
        return () => {
            activo = false;
        };
    }, []);

    const descartables = useMemo(() => {
        const vademecum = datos?.vademecum ?? [];
        const soloDesc = vademecum.filter(
            (v) => String(v.TipoMedicamento || "").trim().toUpperCase() === "DESC"
        );
        return soloDesc.length ? soloDesc : vademecum;
    }, [datos]);

    const opciones = useMemo(
        () => descartables.map((v) => ({ value: Number(v.Valor), label: v.Nombre })),
        [descartables]
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const elegido = descartables.find((v) => Number(v.Valor) === codigo);
        if (!elegido) {
            setError("Elegí el descartable a cargar.");
            return;
        }
        if (!Number.isFinite(cantidad) || cantidad < 1) {
            setError("La cantidad tiene que ser 1 o más.");
            return;
        }

        const tipo = datos?.tiposIndicacion.find((t) => Number(t.Valor) === TIPO_DESCARTABLES);
        const payload: NuevaIndicacionPayload = {
            NumeroVisita: numeroVisita,
            NroAdicional: null,
            FechaCarga: fechaCarga,
            HoraCarga: null,
            OperadorCarga: null,
            ProfesionalAsiste: null,
            FechaCumplido: null,
            HoraCumplido: null,
            FechaProximo: null,
            HoraProximo: null,
            FechaRevision: null,
            HoraRevision: null,
            TipoIndicacion: TIPO_DESCARTABLES,
            Codigo: Number(elegido.Valor),
            Cantidad: cantidad,
            TipoUnidad: elegido.TipoMedicamento?.trim() || null,
            Frecuencia: null,
            Observaciones: observaciones.trim() || null,
            FechaExpiro: 0,
            HoraExpiro: null,
            CantidadIndicada: cantidad,
            Orden: tipo?.OrdenMedicacion ?? null,
            Estado: null,
            CantidadPorTurno: null,
            CantidadEntregada: null,
            ParaFechaEntrega: fechaCarga,
            FormaAdicional: null,
            NroIndicacionAnterior: null,
            IdSector: sectorDesdeCamaId(params.id as string | undefined) || null,
            AliasMedicamento: elegido.Nombre,
            ExcluidoDeEntrega: null,
        };

        onSavingChange?.(true);
        try {
            await indicacionesService.postNuevaIndicacion(payload);
            await onGuardado(fechaCarga);
        } catch (err) {
            setError(err instanceof Error && err.message ? err.message : "No se pudo guardar el insumo.");
        } finally {
            onSavingChange?.(false);
        }
    };

    return (
        <div className={styles.formScrollContainer}>
            <form id={NUEVO_INSUMO_FORM_ID} onSubmit={handleSubmit} className={styles.wrap}>
                <div className={styles.row}>
                    <div className={styles.fieldFull}>
                        <label>Descartable</label>
                        <CustomSelect
                            label=""
                            name="Codigo"
                            isLoading={cargando}
                            value={codigo ?? ""}
                            onChange={(val) => setCodigo(Number(val))}
                            options={opciones}
                        />
                    </div>
                </div>

                <div className={styles.row}>
                    <div className={styles.qtyGroup}>
                        <label>Cantidad</label>
                        <input
                            type="number"
                            min={1}
                            step={1}
                            className={styles.inputNum}
                            value={cantidad}
                            onChange={(e) => setCantidad(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
                            required
                        />
                    </div>
                    <div className={styles.qtyGroup}>
                        <label>Para el día</label>
                        <div className={styles.badge}>{formatearFecha(fechaCarga)}</div>
                    </div>
                </div>

                <div className={styles.row}>
                    <div className={styles.fieldFull}>
                        <label>Observaciones (opcional)</label>
                        <textarea
                            className={styles.textarea}
                            value={observaciones}
                            onChange={(e) => setObservaciones(e.target.value)}
                            rows={2}
                        />
                    </div>
                </div>
            </form>

            <MessageModal
                open={Boolean(error)}
                title="No se pudo guardar"
                message={error || ""}
                tone="warning"
                onClose={() => setError(null)}
            />
        </div>
    );
}
