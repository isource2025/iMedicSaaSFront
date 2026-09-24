'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '@/app/contexts/AppContext';
import {
	actualizarBalance,
	crearBalance,
} from '../../../services/balanceHidricoService';
import type { BalanceHidrico, BalanceHidricoPayload } from '../../../types/balanceHidrico';
import { getSectorId, getSessionUser, getUserCodOperador, getHcIdProfesional } from '@/app/utils/sessionUser';
import styles from '../evolucion/NuevaEvolucionEnfermeriaModal.module.css';
import localStyles from './NuevoBalanceHidricoModal.module.css';

const getLocalDate = (d: Date) =>
	`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const getLocalTime = (d: Date) =>
	`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

type TipoRegistro = 'registro' | 'parcial' | 'total';

interface Props {
	defaultNumeroVisita: number | null;
	defaultFecha?: string | null;
	refetch?: () => Promise<void>;
	onClose: () => void;
	registroToEdit?: BalanceHidrico | null;
	bedSector?: string | null;
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
	return {
		NumeroVisita: row.NumeroVisita,
		Fecha: String(row.Fecha || '').slice(0, 10),
		Hora: String(row.Hora || '').slice(0, 5) || getLocalTime(new Date()),
		Medicacion: row.Medicacion || '',
		Via: row.Via || '',
		Ing_Par_Ingreso: row.Ing_Par_Ingreso || undefined,
		Ing_Par_Paso: row.Ing_Par_Paso || undefined,
		Ing_Aent_Alimento: row.Ing_Aent_Alimento || '',
		Ing_Aent_Ingreso: row.Ing_Aent_Ingreso || undefined,
		Ing_Aent_Paso: row.Ing_Aent_Paso || undefined,
		Ing_Apar_Solucion: row.Ing_Apar_Solucion || '',
		Ing_Apar_Ingreso: row.Ing_Apar_Ingreso || undefined,
		Ing_Apar_paso: row.Ing_Apar_paso || undefined,
		Ing_Tranf_Ingreso: row.Ing_Tranf_Ingreso || undefined,
		Ing_Tranf_paso: row.Ing_Tranf_paso || undefined,
		Egr_Diuresis: row.Egr_Diuresis || undefined,
		Egr_Catarsis: row.Egr_Catarsis || undefined,
		Egr_SNG_Vomito: row.Egr_SNG_Vomito || undefined,
		Egr_Drenajes: row.Egr_Drenajes || undefined,
		Sector: row.Sector || sector,
	};
}

function detectTipo(med?: string | null): TipoRegistro {
	const m = String(med || '').toUpperCase();
	if (m.includes('TOTAL')) return 'total';
	if (m.includes('PARCIAL') || m.startsWith('BALANCE')) return 'parcial';
	return 'registro';
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
	const idSector = (getSectorId(sectorSeleccionado) || bedSector || '').slice(0, 4);
	const isEdit = !!registroToEdit?.IdBalanceHidrico;

	const initial = useMemo(() => {
		if (registroToEdit) return fromRow(registroToEdit, idSector);
		return emptyForm(
			defaultNumeroVisita || 0,
			defaultFecha || getLocalDate(new Date()),
			idSector,
		);
	}, [registroToEdit, defaultNumeroVisita, defaultFecha, idSector]);

	const [form, setForm] = useState<BalanceHidricoPayload>(initial);
	const [tipo, setTipo] = useState<TipoRegistro>(detectTipo(registroToEdit?.Medicacion));
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		setForm(initial);
		setTipo(detectTipo(registroToEdit?.Medicacion));
	}, [initial, registroToEdit]);

	const set = <K extends keyof BalanceHidricoPayload>(k: K, v: BalanceHidricoPayload[K]) =>
		setForm((p) => ({ ...p, [k]: v }));

	const setNum = (k: keyof BalanceHidricoPayload) => (e: React.ChangeEvent<HTMLInputElement>) =>
		set(k, e.target.value === '' ? undefined : (Number(e.target.value) as any));

	const previewTotales = useMemo(() => {
		const ing =
			Number(form.Ing_Par_Paso || 0) +
			Number(form.Ing_Aent_Paso || 0) +
			Number(form.Ing_Apar_paso || 0) +
			Number(form.Ing_Tranf_paso || 0);
		const egr =
			Number(form.Egr_Diuresis || 0) +
			Number(form.Egr_Catarsis || 0) +
			Number(form.Egr_SNG_Vomito || 0) +
			Number(form.Egr_Drenajes || 0);
		return { ing, egr, bal: ing - egr };
	}, [form]);

	const applyTipo = (t: TipoRegistro) => {
		setTipo(t);
		if (t === 'parcial') set('Medicacion', 'BALANCE PARCIAL');
		else if (t === 'total') set('Medicacion', 'BALANCE TOTAL');
		else if (/^balance/i.test(String(form.Medicacion || ''))) set('Medicacion', '');
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!defaultNumeroVisita && !form.NumeroVisita) {
			setError('Falta número de visita');
			return;
		}
		if (!operadorId) {
			setError('Sesión sin operador — no se puede guardar');
			return;
		}
		setSaving(true);
		setError(null);
		try {
			const payload: BalanceHidricoPayload = {
				...form,
				NumeroVisita: defaultNumeroVisita || form.NumeroVisita,
				Sector: (form.Sector || idSector || '').slice(0, 4),
			};
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

	return (
		<form id="nuevo-balance-hidrico-form" onSubmit={handleSubmit} className={styles.form}>
			{error && <div className={localStyles.errorMsg}>{error}</div>}

			<div className={localStyles.tipoRow}>
				{(
					[
						['registro', 'Registro'],
						['parcial', 'Balance parcial'],
						['total', 'Balance total'],
					] as const
				).map(([key, label]) => (
					<button
						key={key}
						type="button"
						className={`${localStyles.tipoBtn} ${tipo === key ? localStyles.tipoBtnActive : ''}`}
						onClick={() => applyTipo(key)}
					>
						{label}
					</button>
				))}
			</div>

			<div className={styles.formGrid}>
				<div className={styles.formGroup}>
					<label className={styles.label}>Fecha</label>
					<input
						className={styles.input}
						type="date"
						value={form.Fecha}
						onChange={(e) => set('Fecha', e.target.value)}
						required
					/>
				</div>
				<div className={styles.formGroup}>
					<label className={styles.label}>Hora</label>
					<input
						className={styles.input}
						type="time"
						value={form.Hora}
						onChange={(e) => set('Hora', e.target.value)}
						required
					/>
				</div>
				<div className={styles.formGroup}>
					<label className={styles.label}>
						{tipo === 'registro' ? 'Medicación / descripción' : 'Etiqueta'}
					</label>
					<input
						className={styles.input}
						value={form.Medicacion || ''}
						onChange={(e) => set('Medicacion', e.target.value)}
						placeholder={tipo === 'registro' ? 'Ej: PHP, DICLOFENAC…' : ''}
						maxLength={500}
					/>
				</div>
				<div className={styles.formGroup}>
					<label className={styles.label}>Vía</label>
					<input
						className={styles.input}
						value={form.Via || ''}
						onChange={(e) => set('Via', e.target.value)}
						placeholder="EV, VO…"
						maxLength={10}
					/>
				</div>
			</div>

			<section className={localStyles.block}>
				<h4 className={localStyles.blockTitle}>Ingresos — Parenteral (ml)</h4>
				<div className={styles.formGrid}>
					<div className={styles.formGroup}>
						<label className={styles.label}>Ingreso</label>
						<input className={styles.input} type="number" min={0} step={1} value={form.Ing_Par_Ingreso ?? ''} onChange={setNum('Ing_Par_Ingreso')} />
					</div>
					<div className={styles.formGroup}>
						<label className={styles.label}>Paso</label>
						<input className={styles.input} type="number" min={0} step={1} value={form.Ing_Par_Paso ?? ''} onChange={setNum('Ing_Par_Paso')} />
					</div>
				</div>
			</section>

			<section className={localStyles.block}>
				<h4 className={localStyles.blockTitle}>Ingresos — Enteral / oral (ml)</h4>
				<div className={styles.formGrid}>
					<div className={styles.formGroupFull}>
						<label className={styles.label}>Alimento / solución</label>
						<input className={styles.input} value={form.Ing_Aent_Alimento || ''} onChange={(e) => set('Ing_Aent_Alimento', e.target.value)} maxLength={120} placeholder="Glucerna, Osmolite, merienda…" />
					</div>
					<div className={styles.formGroup}>
						<label className={styles.label}>Ingreso</label>
						<input className={styles.input} type="number" min={0} step={1} value={form.Ing_Aent_Ingreso ?? ''} onChange={setNum('Ing_Aent_Ingreso')} />
					</div>
					<div className={styles.formGroup}>
						<label className={styles.label}>Paso</label>
						<input className={styles.input} type="number" min={0} step={1} value={form.Ing_Aent_Paso ?? ''} onChange={setNum('Ing_Aent_Paso')} />
					</div>
				</div>
			</section>

			<section className={localStyles.block}>
				<h4 className={localStyles.blockTitle}>Ingresos — Otras soluciones / transfusión (ml)</h4>
				<div className={styles.formGrid}>
					<div className={styles.formGroupFull}>
						<label className={styles.label}>Solución</label>
						<input className={styles.input} value={form.Ing_Apar_Solucion || ''} onChange={(e) => set('Ing_Apar_Solucion', e.target.value)} maxLength={120} />
					</div>
					<div className={styles.formGroup}>
						<label className={styles.label}>Apar. ingreso</label>
						<input className={styles.input} type="number" min={0} step={1} value={form.Ing_Apar_Ingreso ?? ''} onChange={setNum('Ing_Apar_Ingreso')} />
					</div>
					<div className={styles.formGroup}>
						<label className={styles.label}>Apar. paso</label>
						<input className={styles.input} type="number" min={0} step={1} value={form.Ing_Apar_paso ?? ''} onChange={setNum('Ing_Apar_paso')} />
					</div>
					<div className={styles.formGroup}>
						<label className={styles.label}>Transf. ingreso</label>
						<input className={styles.input} type="number" min={0} step={1} value={form.Ing_Tranf_Ingreso ?? ''} onChange={setNum('Ing_Tranf_Ingreso')} />
					</div>
					<div className={styles.formGroup}>
						<label className={styles.label}>Transf. paso</label>
						<input className={styles.input} type="number" min={0} step={1} value={form.Ing_Tranf_paso ?? ''} onChange={setNum('Ing_Tranf_paso')} />
					</div>
				</div>
			</section>

			<section className={localStyles.block}>
				<h4 className={localStyles.blockTitle}>Egresos (ml)</h4>
				<div className={styles.formGrid}>
					<div className={styles.formGroup}>
						<label className={styles.label}>Diuresis</label>
						<input className={styles.input} type="number" min={0} step={1} value={form.Egr_Diuresis ?? ''} onChange={setNum('Egr_Diuresis')} />
					</div>
					<div className={styles.formGroup}>
						<label className={styles.label}>Catarsis</label>
						<input className={styles.input} type="number" min={0} step={1} value={form.Egr_Catarsis ?? ''} onChange={setNum('Egr_Catarsis')} />
					</div>
					<div className={styles.formGroup}>
						<label className={styles.label}>SNG / vómito</label>
						<input className={styles.input} type="number" min={0} step={1} value={form.Egr_SNG_Vomito ?? ''} onChange={setNum('Egr_SNG_Vomito')} />
					</div>
					<div className={styles.formGroup}>
						<label className={styles.label}>Drenajes</label>
						<input className={styles.input} type="number" min={0} step={1} value={form.Egr_Drenajes ?? ''} onChange={setNum('Egr_Drenajes')} />
					</div>
				</div>
			</section>

			<div className={localStyles.totalesPreview}>
				<span>Ingresos (paso): <strong>{previewTotales.ing} ml</strong></span>
				<span>Egresos: <strong>{previewTotales.egr} ml</strong></span>
				<span className={previewTotales.bal < 0 ? localStyles.neg : localStyles.pos}>
					Balance: <strong>{previewTotales.bal} ml</strong>
				</span>
			</div>

			{saving && <p className={localStyles.savingHint}>Guardando…</p>}
		</form>
	);
}
