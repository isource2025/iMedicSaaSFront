"use client";

import React, { useEffect, useMemo, useState } from "react";
import styles from "./NuevaIndicacionModal.module.css";
import { NuevaIndicacionPayload } from "../../types/indicaciones";

interface NuevaIndicacionModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: NuevaIndicacionPayload) => Promise<void> | void;
  defaultNumeroVisita: number | null;
}

const emptyPayload = (numeroVisita: number | null): NuevaIndicacionPayload => ({
  NumeroVisita: numeroVisita,
  NroAdicional: null,
  FechaCarga: new Date().toISOString().slice(0, 10), // YYYY-MM-DD
  HoraCarga: new Date().toTimeString().slice(0, 8),   // HH:mm:ss
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
  Cantidad: null,
  TipoUnidad: null,
  Frecuencia: null,
  Observaciones: null,
  FechaExpiro: null,
  HoraExpiro: null,
  CantidadIndicada: null,
  Orden: null,
  Estado: "A",
  CantidadPorTurno: null,
  CantidadEntregada: null,
  ParaFechaEntrega: null,
  FormaAdicional: null,
  NroIndicacionAnterior: null,
  IdSector: null,
  AliasMedicamento: null,
  ExcluidoDeEntrega: null,
});

export default function NuevaIndicacionModal({ open, onClose, onSave, defaultNumeroVisita }: NuevaIndicacionModalProps) {
  const [saving, setSaving] = useState(false);
  const initial = useMemo(() => emptyPayload(defaultNumeroVisita), [defaultNumeroVisita]);
  const [form, setForm] = useState<NuevaIndicacionPayload>(initial);

  useEffect(() => {
    if (open) setForm(emptyPayload(defaultNumeroVisita));
  }, [open, defaultNumeroVisita]);

  if (!open) return null;

  const handleChange = (field: keyof NuevaIndicacionPayload, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const parseNumber = (v: string): number | null => (v === "" ? null : Number(v));
  const parseString = (v: string): string | null => (v === "" ? null : v);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await onSave(form);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.title}>Nueva indicación</div>
          <button onClick={onClose} className={styles.closeBtn} aria-label="Cerrar">×</button>
        </div>
        <form onSubmit={handleSubmit} className={styles.content}>
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label className={styles.label}>Número de visita</label>
              <input className={styles.input} type="number" value={form.NumeroVisita ?? ""} onChange={(e) => handleChange("NumeroVisita", parseNumber(e.target.value))} />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Nro Adicional</label>
              <input className={styles.input} type="number" value={form.NroAdicional ?? ""} onChange={(e) => handleChange("NroAdicional", parseNumber(e.target.value))} />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Fecha Carga</label>
              <input className={styles.input} type="date" value={form.FechaCarga ?? ""} onChange={(e) => handleChange("FechaCarga", parseString(e.target.value))} />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Hora Carga</label>
              <input className={styles.input} type="time" value={form.HoraCarga ?? ""} onChange={(e) => handleChange("HoraCarga", parseString(e.target.value))} />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Operador Carga</label>
              <input className={styles.input} type="number" value={form.OperadorCarga ?? ""} onChange={(e) => handleChange("OperadorCarga", parseNumber(e.target.value))} />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Profesional Asiste</label>
              <input className={styles.input} type="number" value={form.ProfesionalAsiste ?? ""} onChange={(e) => handleChange("ProfesionalAsiste", parseNumber(e.target.value))} />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Tipo Indicacion</label>
              <input className={styles.input} type="number" value={form.TipoIndicacion ?? ""} onChange={(e) => handleChange("TipoIndicacion", parseNumber(e.target.value))} />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Código</label>
              <input className={styles.input} type="number" value={form.Codigo ?? ""} onChange={(e) => handleChange("Codigo", parseNumber(e.target.value))} />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Cantidad</label>
              <input className={styles.input} type="number" step="0.01" value={form.Cantidad ?? ""} onChange={(e) => handleChange("Cantidad", e.target.value === "" ? null : Number(e.target.value))} />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Tipo Unidad</label>
              <input className={styles.input} type="text" value={form.TipoUnidad ?? ""} onChange={(e) => handleChange("TipoUnidad", parseString(e.target.value))} />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Frecuencia</label>
              <input className={styles.input} type="text" value={form.Frecuencia ?? ""} onChange={(e) => handleChange("Frecuencia", parseString(e.target.value))} />
            </div>

            <div className={styles.field} style={{ gridColumn: "1 / -1" }}>
              <label className={styles.label}>Observaciones</label>
              <textarea className={styles.textarea} value={form.Observaciones ?? ""} onChange={(e) => handleChange("Observaciones", parseString(e.target.value))} />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Fecha Próximo</label>
              <input className={styles.input} type="date" value={form.FechaProximo ?? ""} onChange={(e) => handleChange("FechaProximo", parseString(e.target.value))} />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Hora Próximo</label>
              <input className={styles.input} type="time" value={form.HoraProximo ?? ""} onChange={(e) => handleChange("HoraProximo", parseString(e.target.value))} />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Fecha Cumplido</label>
              <input className={styles.input} type="date" value={form.FechaCumplido ?? ""} onChange={(e) => handleChange("FechaCumplido", parseString(e.target.value))} />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Hora Cumplido</label>
              <input className={styles.input} type="time" value={form.HoraCumplido ?? ""} onChange={(e) => handleChange("HoraCumplido", parseString(e.target.value))} />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Fecha Revisión</label>
              <input className={styles.input} type="date" value={form.FechaRevision ?? ""} onChange={(e) => handleChange("FechaRevision", parseString(e.target.value))} />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Hora Revisión</label>
              <input className={styles.input} type="time" value={form.HoraRevision ?? ""} onChange={(e) => handleChange("HoraRevision", parseString(e.target.value))} />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Fecha Expiración</label>
              <input className={styles.input} type="date" value={form.FechaExpiro ?? ""} onChange={(e) => handleChange("FechaExpiro", parseString(e.target.value))} />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Hora Expiración</label>
              <input className={styles.input} type="time" value={form.HoraExpiro ?? ""} onChange={(e) => handleChange("HoraExpiro", parseString(e.target.value))} />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Cantidad Indicada</label>
              <input className={styles.input} type="number" step="0.01" value={form.CantidadIndicada ?? ""} onChange={(e) => handleChange("CantidadIndicada", e.target.value === "" ? null : Number(e.target.value))} />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Orden</label>
              <input className={styles.input} type="number" value={form.Orden ?? ""} onChange={(e) => handleChange("Orden", parseNumber(e.target.value))} />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Estado</label>
              <select className={styles.select} value={form.Estado ?? ""} onChange={(e) => handleChange("Estado", parseString(e.target.value))}>
                <option value="">(sin estado)</option>
                <option value="A">Activo</option>
                <option value="C">Cumplido</option>
                <option value="P">Pendiente</option>
                <option value="S">Suspendido</option>
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Cant. por turno</label>
              <input className={styles.input} type="number" step="0.01" value={form.CantidadPorTurno ?? ""} onChange={(e) => handleChange("CantidadPorTurno", e.target.value === "" ? null : Number(e.target.value))} />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Cant. entregada</label>
              <input className={styles.input} type="number" step="0.01" value={form.CantidadEntregada ?? ""} onChange={(e) => handleChange("CantidadEntregada", e.target.value === "" ? null : Number(e.target.value))} />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Para fecha entrega</label>
              <input className={styles.input} type="date" value={form.ParaFechaEntrega ?? ""} onChange={(e) => handleChange("ParaFechaEntrega", parseString(e.target.value))} />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Forma adicional</label>
              <input className={styles.input} type="text" value={form.FormaAdicional ?? ""} onChange={(e) => handleChange("FormaAdicional", parseString(e.target.value))} />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Nro indicación anterior</label>
              <input className={styles.input} type="number" value={form.NroIndicacionAnterior ?? ""} onChange={(e) => handleChange("NroIndicacionAnterior", parseNumber(e.target.value))} />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Id Sector</label>
              <input className={styles.input} type="text" value={form.IdSector ?? ""} onChange={(e) => handleChange("IdSector", parseString(e.target.value))} />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Alias Medicamento</label>
              <input className={styles.input} type="text" value={form.AliasMedicamento ?? ""} onChange={(e) => handleChange("AliasMedicamento", parseString(e.target.value))} />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Excluido de entrega</label>
              <select className={styles.select} value={form.ExcluidoDeEntrega === null ? "" : form.ExcluidoDeEntrega ? "1" : "0"} onChange={(e) => handleChange("ExcluidoDeEntrega", e.target.value === "" ? null : e.target.value === "1") }>
                <option value="">No especificado</option>
                <option value="0">No</option>
                <option value="1">Sí</option>
              </select>
            </div>
          </div>

          <div className={styles.footer}>
            <button type="button" className={`${styles.btn} ${styles.btnCancel}`} onClick={onClose} disabled={saving}>Cancelar</button>
            <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={saving}>
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
