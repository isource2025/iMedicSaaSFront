"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAppContext } from "@/app/contexts/AppContext";
import { crearControl, type CrearControlData } from "../../../services/controlesFrecuentesService";
import { formatIMC } from "@/app/utils/antropometria";
import { getSectorId, getSessionUser, getUserCodOperador, getHcIdProfesional } from "@/app/utils/sessionUser";
import styles from "../evolucion/NuevaEvolucionEnfermeriaModal.module.css";

const getLocalDate = (d: Date) =>
	`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const getLocalTime = (d: Date) =>
	`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

interface Props {
	defaultNumeroVisita: number | null;
	refetch?: () => Promise<void>;
	onClose: () => void;
}

export default function NuevoControlModal({ defaultNumeroVisita, refetch, onClose }: Props) {
	const { usuario, sectorSeleccionado } = useAppContext();
	const usuarioActual = getSessionUser(usuario);
	const operadorId = getHcIdProfesional(usuarioActual) ?? getUserCodOperador(usuarioActual) ?? 0;
	const idSector = getSectorId(sectorSeleccionado);

	const initial = useMemo<CrearControlData>(() => ({
		numeroVisita: defaultNumeroVisita || 0,
		fechaControl: getLocalDate(new Date()),
		horaControl: getLocalTime(new Date()),
		operadorCarga: operadorId,
		idSector,
	}), [defaultNumeroVisita, operadorId, idSector]);

	const [form, setForm] = useState<CrearControlData>(initial);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => { setForm(initial); }, [initial]);

	const set = <K extends keyof CrearControlData>(k: K, v: CrearControlData[K]) =>
		setForm((p) => ({ ...p, [k]: v }));

	const setNum = (k: keyof CrearControlData) => (e: React.ChangeEvent<HTMLInputElement>) =>
		set(k, e.target.value === "" ? undefined : Number(e.target.value) as any);

	const imcPreview = formatIMC(form.peso, form.talla);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSaving(true);
		setError(null);
		try {
			await crearControl({ ...form, numeroVisita: defaultNumeroVisita || 0 });
			await refetch?.();
			onClose();
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : "Error al guardar el control");
		} finally {
			setSaving(false);
		}
	};

	return (
		<form id="nuevo-control-form" onSubmit={handleSubmit} className={styles.form}>
			{error && <div className={styles.errorMsg}>{error}</div>}

			<div className={styles.row}>
				<div className={styles.field}>
					<label className={styles.label}>Fecha</label>
					<input className={styles.input} type="date" value={form.fechaControl}
						onChange={e => set("fechaControl", e.target.value)} required />
				</div>
				<div className={styles.field}>
					<label className={styles.label}>Hora</label>
					<input className={styles.input} type="time" value={form.horaControl}
						onChange={e => set("horaControl", e.target.value)} required />
				</div>
			</div>

			<div className={styles.row}>
				<div className={styles.field}>
					<label className={styles.label}>Pulso <span className={styles.unit}>(lat/min)</span></label>
					<input className={styles.input} type="number" min={0} max={300}
						value={form.pulso ?? ""} onChange={setNum("pulso")} placeholder="—" />
				</div>
				<div className={styles.field}>
					<label className={styles.label}>TA Máx <span className={styles.unit}>(mmHg)</span></label>
					<input className={styles.input} type="number" min={0} max={400}
						value={form.presionMax ?? ""} onChange={setNum("presionMax")} placeholder="—" />
				</div>
				<div className={styles.field}>
					<label className={styles.label}>TA Mín <span className={styles.unit}>(mmHg)</span></label>
					<input className={styles.input} type="number" min={0} max={400}
						value={form.presionMin ?? ""} onChange={setNum("presionMin")} placeholder="—" />
				</div>
			</div>

			<div className={styles.row}>
				<div className={styles.field}>
					<label className={styles.label}>Temp. Axilar <span className={styles.unit}>(°C)</span></label>
					<input className={styles.input} type="number" step="0.1" min={30} max={45}
						value={form.temperaturaAxilar ?? ""} onChange={setNum("temperaturaAxilar")} placeholder="—" />
				</div>
				<div className={styles.field}>
					<label className={styles.label}>Saturación <span className={styles.unit}>(%)</span></label>
					<input className={styles.input} type="number" min={0} max={100}
						value={form.saturacion ?? ""} onChange={setNum("saturacion")} placeholder="—" />
				</div>
				<div className={styles.field}>
					<label className={styles.label}>Frec. Respiratoria <span className={styles.unit}>(rpm)</span></label>
					<input className={styles.input} type="number" min={0} max={100}
						value={form.frecuenciaRespiratoria ?? ""} onChange={setNum("frecuenciaRespiratoria")} placeholder="—" />
				</div>
			</div>

			<div className={styles.row}>
				<div className={styles.field}>
					<label className={styles.label}>Glucemia <span className={styles.unit}>(mg/dL)</span></label>
					<input className={styles.input} type="number" min={0}
						value={form.glucemia ?? ""} onChange={setNum("glucemia")} placeholder="—" />
				</div>
				<div className={styles.field}>
					<label className={styles.label}>Peso <span className={styles.unit}>(kg)</span></label>
					<input className={styles.input} type="number" step="0.1" min={0}
						value={form.peso ?? ""} onChange={setNum("peso")} placeholder="—" />
				</div>
				<div className={styles.field}>
					<label className={styles.label}>Talla <span className={styles.unit}>(cm)</span></label>
					<input className={styles.input} type="number" min={0}
						value={form.talla ?? ""} onChange={setNum("talla")} placeholder="—" />
				</div>
				<div className={styles.field}>
					<label className={styles.label}>IMC <span className={styles.unit}>(kg/m²)</span></label>
					<input className={styles.input} type="text" value={imcPreview} readOnly tabIndex={-1} placeholder="—" />
				</div>
			</div>

			<div className={styles.field}>
				<label className={styles.label}>Observaciones</label>
				<textarea className={styles.textarea} rows={3}
					value={form.observaciones ?? ""} onChange={e => set("observaciones", e.target.value)}
					placeholder="Observaciones adicionales..." />
			</div>

			<div className={styles.footer}>
				<button type="button" className={styles.btnSecondary} onClick={onClose} disabled={saving}>
					Cancelar
				</button>
				<button type="submit" className={styles.btnPrimary} disabled={saving}>
					{saving ? "Guardando…" : "Guardar control"}
				</button>
			</div>
		</form>
	);
}
