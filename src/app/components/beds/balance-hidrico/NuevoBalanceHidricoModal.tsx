'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '@/app/contexts/AppContext';
import { actualizarBalance, crearBalance } from '../../../services/balanceHidricoService';
import type { BalanceHidrico, BalanceHidricoPayload } from '../../../types/balanceHidrico';
import {
	getSectorId,
	getSessionUser,
	getUserCodOperador,
	getHcIdProfesional,
} from '@/app/utils/sessionUser';
import styles from './NuevoBalanceHidricoModal.module.css';

const getLocalDate = (d: Date) =>
	`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const getLocalTime = (d: Date) =>
	`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

interface Props {
	defaultNumeroVisita: number | null;
	defaultFecha?: string | null;
	refetch?: () => Promise<void>;
	onClose: () => void;
	registroToEdit?: BalanceHidrico | null;
	bedSector?: string | null;
}

type NumKey =
	| 'Ing_Par_Ingreso'
	| 'Ing_Par_Paso'
	| 'Ing_Aent_Ingreso'
	| 'Ing_Aent_Paso'
	| 'Ing_Apar_Ingreso'
	| 'Ing_Apar_paso'
	| 'Ing_Tranf_Ingreso'
	| 'Ing_Tranf_paso'
	| 'Egr_Diuresis'
	| 'Egr_Catarsis'
	| 'Egr_SNG_Vomito'
	| 'Egr_Drenajes';

/** Vacío → 0 para que JSON no omita el campo y el UPDATE pueda limpiar. */
function n0(v: number | undefined | null): number {
	if (v == null || v === ('' as unknown)) return 0;
	const n = Number(v);
	return Number.isFinite(n) ? n : 0;
}

function emptyForm(numeroVisita: number, fecha: string, sector: string): BalanceHidricoPayload {
	return {
		NumeroVisita: numeroVisita,
		Fecha: fecha,
		Hora: getLocalTime(new Date()),
		Medicacion: '',
		Via: '',
		Ing_Par_Ingreso: undefined,
		Ing_Par_Paso: undefined,
		Ing_Aent_Alimento: '',
		Ing_Aent_Ingreso: undefined,
		Ing_Aent_Paso: undefined,
		Ing_Apar_Solucion: '',
		Ing_Apar_Ingreso: undefined,
		Ing_Apar_paso: undefined,
		Ing_Tranf_Ingreso: undefined,
		Ing_Tranf_paso: undefined,
		Egr_Diuresis: undefined,
		Egr_Catarsis: undefined,
		Egr_SNG_Vomito: undefined,
		Egr_Drenajes: undefined,
		Sector: sector,
	};
}

function fromRow(row: BalanceHidrico, sector: string): BalanceHidricoPayload {
	const nz = (v: number | null | undefined) =>
		v == null || Number(v) === 0 ? undefined : Number(v);
	return {
		NumeroVisita: row.NumeroVisita,
		Fecha: String(row.Fecha || '').slice(0, 10),
		Hora: String(row.Hora || '').slice(0, 5) || getLocalTime(new Date()),
		Medicacion: row.Medicacion || '',
		Via: row.Via || '',
		Ing_Par_Ingreso: nz(row.Ing_Par_Ingreso),
		Ing_Par_Paso: nz(row.Ing_Par_Paso),
		Ing_Aent_Alimento: row.Ing_Aent_Alimento || '',
		Ing_Aent_Ingreso: nz(row.Ing_Aent_Ingreso),
		Ing_Aent_Paso: nz(row.Ing_Aent_Paso),
		Ing_Apar_Solucion: row.Ing_Apar_Solucion || '',
		Ing_Apar_Ingreso: nz(row.Ing_Apar_Ingreso),
		Ing_Apar_paso: nz(row.Ing_Apar_paso),
		Ing_Tranf_Ingreso: nz(row.Ing_Tranf_Ingreso),
		Ing_Tranf_paso: nz(row.Ing_Tranf_paso),
		Egr_Diuresis: nz(row.Egr_Diuresis),
		Egr_Catarsis: nz(row.Egr_Catarsis),
		Egr_SNG_Vomito: nz(row.Egr_SNG_Vomito),
		Egr_Drenajes: nz(row.Egr_Drenajes),
		Sector: row.Sector || sector,
	};
}

function payloadParaApi(
	form: BalanceHidricoPayload,
	numeroVisita: number,
	sector: string,
): BalanceHidricoPayload {
	return {
		NumeroVisita: numeroVisita,
		Fecha: form.Fecha,
		Hora: form.Hora,
		Medicacion: (form.Medicacion || '').trim(),
		Via: (form.Via || '').trim().toUpperCase(),
		Ing_Par_Ingreso: n0(form.Ing_Par_Ingreso),
		Ing_Par_Paso: n0(form.Ing_Par_Paso),
		Ing_Aent_Alimento: (form.Ing_Aent_Alimento || '').trim(),
		Ing_Aent_Ingreso: n0(form.Ing_Aent_Ingreso),
		Ing_Aent_Paso: n0(form.Ing_Aent_Paso),
		Ing_Apar_Solucion: (form.Ing_Apar_Solucion || '').trim(),
		Ing_Apar_Ingreso: n0(form.Ing_Apar_Ingreso),
		Ing_Apar_paso: n0(form.Ing_Apar_paso),
		Ing_Tranf_Ingreso: n0(form.Ing_Tranf_Ingreso),
		Ing_Tranf_paso: n0(form.Ing_Tranf_paso),
		Egr_Diuresis: n0(form.Egr_Diuresis),
		Egr_Catarsis: n0(form.Egr_Catarsis),
		Egr_SNG_Vomito: n0(form.Egr_SNG_Vomito),
		Egr_Drenajes: n0(form.Egr_Drenajes),
		// Alta: sector de la cama. Edición: se conserva el sector con el que se registró.
		Sector: (form.Sector || sector || '').trim().toUpperCase().slice(0, 4),
	};
}

export default function NuevoBalanceHidricoModal({
	defaultNumeroVisita,
	defaultFecha,
	refetch,
	onClose,
	registroToEdit = null,
	bedSector = null,
}: Props) {
	const { usuario, sectorSeleccionado } = useAppContext();
	const usuarioActual = getSessionUser(usuario);
	const operadorId = getHcIdProfesional(usuarioActual) ?? getUserCodOperador(usuarioActual) ?? 0;
	// Sector: el de la cama del paciente (no se edita en el modal); fallback al de la sesión.
	const idSector = (bedSector || getSectorId(sectorSeleccionado) || '').toUpperCase().slice(0, 4);
	const isEdit = !!registroToEdit?.IdBalanceHidrico;

	const initial = useMemo(() => {
		if (registroToEdit) return fromRow(registroToEdit, idSector);
		return emptyForm(defaultNumeroVisita || 0, defaultFecha || getLocalDate(new Date()), idSector);
	}, [registroToEdit, defaultNumeroVisita, defaultFecha, idSector]);

	const [form, setForm] = useState<BalanceHidricoPayload>(initial);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		setForm(initial);
		setError(null);
	}, [initial]);

	const set = <K extends keyof BalanceHidricoPayload>(k: K, v: BalanceHidricoPayload[K]) =>
		setForm((p) => ({ ...p, [k]: v }));

	const setNum = (k: NumKey) => (e: React.ChangeEvent<HTMLInputElement>) => {
		const raw = e.target.value;
		if (raw === '') return set(k, undefined);
		const n = Number(raw);
		set(k, Number.isFinite(n) && n >= 0 ? n : undefined);
	};

	const copiarIngresoAPaso = (ing: NumKey, paso: NumKey) => set(paso, form[ing]);

	const totales = useMemo(() => {
		const ing =
			n0(form.Ing_Par_Paso) + n0(form.Ing_Aent_Paso) + n0(form.Ing_Apar_paso) + n0(form.Ing_Tranf_paso);
		const egr =
			n0(form.Egr_Diuresis) + n0(form.Egr_Catarsis) + n0(form.Egr_SNG_Vomito) + n0(form.Egr_Drenajes);
		return { ing, egr, bal: ing - egr };
	}, [form]);

	const tieneDatos = totales.ing > 0 || totales.egr > 0 ||
		n0(form.Ing_Par_Ingreso) + n0(form.Ing_Aent_Ingreso) + n0(form.Ing_Apar_Ingreso) + n0(form.Ing_Tranf_Ingreso) > 0 ||
		!!(form.Medicacion || form.Ing_Aent_Alimento || form.Ing_Apar_Solucion);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (saving) return;
		const visita = defaultNumeroVisita || form.NumeroVisita;
		if (!visita) return setError('Falta número de visita');
		if (!operadorId) return setError('Sesión sin operador — no se puede guardar');
		if (!form.Fecha || !form.Hora) return setError('Fecha y hora son obligatorias');
		if (!tieneDatos) return setError('Cargá al menos un ingreso o un egreso');

		setSaving(true);
		setError(null);
		try {
			const payload = payloadParaApi(form, visita, idSector);
			if (isEdit && registroToEdit) {
				await actualizarBalance(registroToEdit.IdBalanceHidrico, payload);
			} else {
				await crearBalance(payload);
			}
			await refetch?.();
			onClose();
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : 'Error al guardar');
		} finally {
			setSaving(false);
		}
	};

	// ---- render helpers (funciones, no componentes: evitan remount/pérdida de foco) ----
	const renderNum = (k: NumKey, label: string) => (
		<div className={styles.field}>
			<label className={styles.label} htmlFor={`bh-${k}`}>
				{label}
			</label>
			<div className={styles.mlWrap}>
				<input
					id={`bh-${k}`}
					className={`${styles.input} ${styles.inputNum}`}
					type="number"
					inputMode="decimal"
					min={0}
					step="any"
					placeholder="0"
					value={form[k] ?? ''}
					onChange={setNum(k)}
					onFocus={(e) => e.currentTarget.select()}
				/>
				<span className={styles.mlSuffix}>ml</span>
			</div>
		</div>
	);

	const renderPar = (ing: NumKey, paso: NumKey) => (
		<div className={styles.par}>
			{renderNum(ing, 'Ingreso')}
			<button
				type="button"
				className={styles.copyBtn}
				title="Copiar Ingreso → Paso"
				aria-label="Copiar ingreso a paso"
				onClick={() => copiarIngresoAPaso(ing, paso)}
				disabled={form[ing] == null}
			>
				→
			</button>
			{renderNum(paso, 'Paso')}
		</div>
	);

	return (
		<form id="nuevo-balance-hidrico-form" onSubmit={handleSubmit} className={styles.form} noValidate>
			{error && (
				<div className={styles.errorMsg} role="alert">
					{error}
				</div>
			)}

			{/* Cabecera del registro: Sector · Fecha · Hora */}
			<div className={styles.head}>
				<div className={styles.field}>
					<label className={styles.label} htmlFor="bh-fecha">
						Fecha
					</label>
					<input
						id="bh-fecha"
						className={styles.input}
						type="date"
						value={form.Fecha}
						onChange={(e) => set('Fecha', e.target.value)}
						required
					/>
				</div>
				<div className={styles.field}>
					<label className={styles.label} htmlFor="bh-hora">
						Hora
					</label>
					<div className={styles.horaRow}>
						<input
							id="bh-hora"
							className={styles.input}
							type="time"
							value={form.Hora}
							onChange={(e) => set('Hora', e.target.value)}
							required
						/>
						<button
							type="button"
							className={styles.ghostBtn}
							onClick={() => {
								const now = new Date();
								set('Hora', getLocalTime(now));
								if (!isEdit) set('Fecha', getLocalDate(now));
							}}
						>
							Ahora
						</button>
					</div>
				</div>
			</div>

			{/* INGRESOS */}
			<div className={styles.grupoTitulo}>
				<span className={`${styles.grupoDot} ${styles.dotIng}`} />
				Ingresos
			</div>
			<div className={styles.bloques}>
				<section className={`${styles.block} ${styles.blockIng}`}>
					<h4 className={styles.blockTitle}>Parenteral</h4>
					<div className={styles.rowTexto}>
						<div className={`${styles.field} ${styles.grow}`}>
							<label className={styles.label} htmlFor="bh-med">
								Medicación
							</label>
							<input
								id="bh-med"
								className={styles.input}
								value={form.Medicacion || ''}
								onChange={(e) => set('Medicacion', e.target.value)}
								placeholder="PHP, Sol. fisiológica, Dextrosa 5%…"
								maxLength={500}
								autoFocus
							/>
						</div>
						<div className={styles.field}>
							<label className={styles.label} htmlFor="bh-via">
								Vía
							</label>
							<input
								id="bh-via"
								className={`${styles.input} ${styles.inputVia}`}
								value={form.Via || ''}
								onChange={(e) => set('Via', e.target.value.toUpperCase())}
								placeholder="EV"
								maxLength={10}
								list="bh-vias"
							/>
							<datalist id="bh-vias">
								<option value="EV" />
								<option value="VO" />
								<option value="SNG" />
								<option value="SC" />
								<option value="IM" />
							</datalist>
						</div>
					</div>
					{renderPar('Ing_Par_Ingreso', 'Ing_Par_Paso')}
				</section>

				<section className={`${styles.block} ${styles.blockIng}`}>
					<h4 className={styles.blockTitle}>Alimentación enteral</h4>
					<div className={styles.field}>
						<label className={styles.label} htmlFor="bh-alim">
							Alimento
						</label>
						<input
							id="bh-alim"
							className={styles.input}
							value={form.Ing_Aent_Alimento || ''}
							onChange={(e) => set('Ing_Aent_Alimento', e.target.value)}
							maxLength={120}
							placeholder="Agua, Glucerna, Osmolite…"
						/>
					</div>
					{renderPar('Ing_Aent_Ingreso', 'Ing_Aent_Paso')}
				</section>

				<section className={`${styles.block} ${styles.blockIng}`}>
					<h4 className={styles.blockTitle}>Alimentación parenteral</h4>
					<div className={styles.field}>
						<label className={styles.label} htmlFor="bh-sol">
							Solución
						</label>
						<input
							id="bh-sol"
							className={styles.input}
							value={form.Ing_Apar_Solucion || ''}
							onChange={(e) => set('Ing_Apar_Solucion', e.target.value)}
							maxLength={120}
							placeholder="NPT, Lípidos, Aminoácidos…"
						/>
					</div>
					{renderPar('Ing_Apar_Ingreso', 'Ing_Apar_paso')}
				</section>

				<section className={`${styles.block} ${styles.blockIng}`}>
					<h4 className={styles.blockTitle}>Transfusión</h4>
					<p className={styles.blockHint}>Glóbulos rojos, plasma, plaquetas.</p>
					{renderPar('Ing_Tranf_Ingreso', 'Ing_Tranf_paso')}
				</section>
			</div>

			{/* EGRESOS */}
			<div className={styles.grupoTitulo}>
				<span className={`${styles.grupoDot} ${styles.dotEgr}`} />
				Egresos
			</div>
			<section className={`${styles.block} ${styles.blockEgr}`}>
				<div className={styles.grid4}>
					{renderNum('Egr_Diuresis', 'Diuresis')}
					{renderNum('Egr_Catarsis', 'Catarsis')}
					{renderNum('Egr_SNG_Vomito', 'SNG / Vómito')}
					{renderNum('Egr_Drenajes', 'Drenajes')}
				</div>
			</section>

			{/* Totales en vivo */}
			<div className={styles.totales}>
				<div className={styles.totalItem}>
					<span>Ingresos</span>
					<strong>{totales.ing} ml</strong>
					<small>suma de “Paso”</small>
				</div>
				<div className={styles.totalItem}>
					<span>Egresos</span>
					<strong>{totales.egr} ml</strong>
					<small>diuresis + catarsis + SNG + drenajes</small>
				</div>
				<div
					className={`${styles.totalItem} ${styles.totalBal} ${
						totales.bal < 0 ? styles.neg : totales.bal > 0 ? styles.pos : ''
					}`}
				>
					<span>Balance</span>
					<strong>
						{totales.bal > 0 ? '+' : ''}
						{totales.bal} ml
					</strong>
					<small>{saving ? 'Guardando…' : isEdit ? 'Editando registro' : 'Nuevo registro'}</small>
				</div>
			</div>
		</form>
	);
}
