'use client';

import { useEffect, useState } from 'react';
import Modal from '@/app/components/UI/Modal';
import type { TurneroPantallaResumen } from '@/app/types/turnero';
import styles from './NuevaPantallaModal.module.css';

export interface NuevaPantallaPayload {
	nombre: string;
	copiarDesdeIdPantalla?: number;
}

interface Props {
	open: boolean;
	pantallas: TurneroPantallaResumen[];
	pantallaActualId?: number | null;
	saving?: boolean;
	onClose: () => void;
	onConfirm: (payload: NuevaPantallaPayload) => void | Promise<void>;
}

export default function NuevaPantallaModal({
	open,
	pantallas,
	pantallaActualId,
	saving = false,
	onClose,
	onConfirm,
}: Props) {
	const [nombre, setNombre] = useState('');
	const [modo, setModo] = useState<'blanco' | 'copiar'>('blanco');
	const [origenId, setOrigenId] = useState<number | ''>('');

	const origenes = pantallas.filter((p) => p.activa);

	useEffect(() => {
		if (!open) return;
		const activas = pantallas.filter((p) => p.activa);
		setNombre('');
		setModo(activas.length > 0 ? 'copiar' : 'blanco');
		const defaultOrigen =
			pantallaActualId && activas.some((p) => p.idPantalla === pantallaActualId)
				? pantallaActualId
				: activas[0]?.idPantalla ?? '';
		setOrigenId(defaultOrigen);
	}, [open, pantallaActualId, pantallas]);

	const origenSel = origenes.find((p) => p.idPantalla === origenId);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const nombreTrim = nombre.trim();
		if (!nombreTrim) return;
		void onConfirm({
			nombre: nombreTrim,
			copiarDesdeIdPantalla:
				modo === 'copiar' && typeof origenId === 'number' ? origenId : undefined,
		});
	};

	return (
		<Modal isOpen={open} onClose={onClose} title="Nueva pantalla del turnero" size="small">
			<form className={styles.form} onSubmit={handleSubmit}>
				<div className={styles.field}>
					<label htmlFor="np-nombre">Nombre de la pantalla</label>
					<input
						id="np-nombre"
						type="text"
						maxLength={100}
						placeholder="Ej. Sector Pediatría, Guardia, Planta baja"
						value={nombre}
						onChange={(e) => setNombre(e.target.value)}
						autoFocus
						disabled={saving}
					/>
				</div>

				<fieldset className={styles.fieldset} disabled={saving}>
					<legend className={styles.legend}>Formato inicial</legend>

					<label className={styles.radioRow}>
						<input
							type="radio"
							name="np-modo"
							checked={modo === 'blanco'}
							onChange={() => setModo('blanco')}
						/>
						<span>
							<strong>Pantalla en blanco</strong>
							<small>Plantilla y colores por defecto</small>
						</span>
					</label>

					{origenes.length > 0 && (
						<label className={styles.radioRow}>
							<input
								type="radio"
								name="np-modo"
								checked={modo === 'copiar'}
								onChange={() => setModo('copiar')}
							/>
							<span>
								<strong>Copiar formato de otra pantalla</strong>
								<small>Colores, plantilla, audio, video y opciones de visualización</small>
							</span>
						</label>
					)}
				</fieldset>

				{modo === 'copiar' && origenes.length > 0 && (
					<div className={styles.field}>
						<label htmlFor="np-origen">Copiar desde</label>
						<select
							id="np-origen"
							value={origenId}
							onChange={(e) =>
								setOrigenId(e.target.value ? Number(e.target.value) : '')
							}
							disabled={saving}
						>
							{origenes.map((p) => (
								<option key={p.idPantalla} value={p.idPantalla}>
									{p.nombre} ({p.sectoresResumen})
								</option>
							))}
						</select>
						{origenSel && (
							<p className={styles.hint}>
								Se copiarán colores, plantilla, sonido, video y visualización. Los
								filtros de sector quedan vacíos para que los configures en esta pantalla.
							</p>
						)}
					</div>
				)}

				<div className={styles.actions}>
					<button type="button" className={styles.btnSecondary} onClick={onClose} disabled={saving}>
						Cancelar
					</button>
					<button
						type="submit"
						className={styles.btnPrimary}
						disabled={saving || !nombre.trim()}
					>
						{saving ? 'Creando…' : 'Crear pantalla'}
					</button>
				</div>
			</form>
		</Modal>
	);
}
