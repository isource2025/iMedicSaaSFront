'use client';

import { useEffect, useRef, useState } from 'react';
import Loader from '@/app/components/Loader/Loader';
import PersonalFirmaPad, { type PersonalFirmaPadRef } from '@/app/components/Personal/PersonalFirmaPad';
import { personalService } from '@/app/services/personalService';
import formStyles from './PersonalForm.module.css';
import styles from './PersonalActionModals.module.css';

type Props = {
	personalId: number;
	active: boolean;
	variant?: 'form' | 'modal';
	onSaved?: () => void | Promise<void>;
	onClose?: () => void;
};

export default function PersonalFirmaTab({
	personalId,
	active,
	variant = 'form',
	onSaved,
	onClose,
}: Props) {
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState('');
	const [firma, setFirma] = useState<{
		hasFirma: boolean;
		mime?: string;
		dataUrl?: string;
	} | null>(null);
	const padRef = useRef<PersonalFirmaPadRef>(null);

	useEffect(() => {
		if (!active || !personalId) return;
		let cancelled = false;
		setLoading(true);
		setError('');
		void personalService
			.getPersonalFirma(personalId)
			.then((f) => {
				if (!cancelled) setFirma(f);
			})
			.catch((e: unknown) => {
				if (cancelled) return;
				const msg = e instanceof Error ? e.message : 'Error al cargar la firma';
				setError(msg);
				setFirma({ hasFirma: false });
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [active, personalId]);

	const guardar = async () => {
		const file = await padRef.current?.toPngFile();
		if (!file) {
			setError('Dibuje una firma en el lienzo antes de guardar.');
			return;
		}
		setSaving(true);
		setError('');
		try {
			await personalService.uploadPersonalFirma(personalId, file);
			const f = await personalService.getPersonalFirma(personalId);
			setFirma(f);
			await onSaved?.();
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : 'Error al guardar la firma');
		} finally {
			setSaving(false);
		}
	};

	const borrar = async () => {
		if (!firma?.hasFirma) return;
		if (!confirm('¿Eliminar la firma guardada?')) return;
		setSaving(true);
		setError('');
		try {
			await personalService.deletePersonalFirma(personalId);
			setFirma({ hasFirma: false });
			padRef.current?.clearPad();
			await onSaved?.();
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : 'Error al eliminar la firma');
		} finally {
			setSaving(false);
		}
	};

	const primaryBtn = variant === 'form' ? formStyles.submitButton : styles.btnPrimary;
	const secondaryBtn = variant === 'form' ? formStyles.cancelButton : styles.btn;
	const dangerBtn = styles.btnDanger;

	return (
		<div className={variant === 'form' ? formStyles.usuarioSection : styles.row}>
			{variant === 'form' ? <h3 className={formStyles.subsectionTitle}>Firma digital</h3> : null}
			<p className={styles.muted}>
				{firma?.hasFirma
					? 'Hay una firma guardada. Puede retocarla en el lienzo o reemplazarla al guardar.'
					: 'Dibuje la firma en el lienzo. Se usa en los PDF clínicos de este profesional.'}
			</p>
			{error ? <p className={formStyles.error}>{error}</p> : null}
			{loading ? (
				<div style={{ position: 'relative', minHeight: 200 }}>
					<Loader />
				</div>
			) : (
				<PersonalFirmaPad
					ref={padRef}
					active={active && !loading}
					initialDataUrl={firma?.hasFirma && firma.dataUrl ? firma.dataUrl : null}
				/>
			)}
			<div
				className={
					variant === 'form'
						? `${formStyles.actions} ${formStyles.cuentaActions}`
						: styles.actions
				}
			>
				{variant === 'modal' && onClose ? (
					<button type="button" className={secondaryBtn} onClick={onClose} disabled={saving}>
						Cerrar
					</button>
				) : null}
				{firma?.hasFirma ? (
					<button type="button" className={dangerBtn} onClick={() => void borrar()} disabled={saving || loading}>
						Eliminar firma
					</button>
				) : null}
				<button
					type="button"
					className={primaryBtn}
					onClick={() => void guardar()}
					disabled={saving || loading}
				>
					{saving ? 'Guardando…' : 'Guardar firma'}
				</button>
			</div>
		</div>
	);
}
