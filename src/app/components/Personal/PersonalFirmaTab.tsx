'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import Loader from '@/app/components/Loader/Loader';
import PersonalFirmaPad, { type PersonalFirmaPadRef } from '@/app/components/Personal/PersonalFirmaPad';
import { personalService } from '@/app/services/personalService';
import formStyles from './PersonalForm.module.css';
import styles from './PersonalActionModals.module.css';

type Props = {
	personalId: number;
	active: boolean;
	variant?: 'form' | 'modal';
	hideActions?: boolean;
	onDirtyChange?: (dirty: boolean) => void;
	onSaved?: () => void | Promise<void>;
	onClose?: () => void;
};

export type PersonalFirmaTabHandle = {
	guardar: () => Promise<boolean>;
	isDirty: () => boolean;
};

const PersonalFirmaTab = forwardRef<PersonalFirmaTabHandle, Props>(function PersonalFirmaTab(
	{
		personalId,
		active,
		variant = 'form',
		hideActions = false,
		onDirtyChange,
		onSaved,
		onClose,
	},
	ref,
) {
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState('');
	const [dirty, setDirty] = useState(false);
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
		setDirty(false);
		onDirtyChange?.(false);
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
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [active, personalId]);

	const markDirty = () => {
		setDirty(true);
		onDirtyChange?.(true);
	};

	const guardar = async (): Promise<boolean> => {
		const file = await padRef.current?.toPngFile();
		if (!file) {
			setError('Dibuje una firma en el lienzo antes de guardar.');
			return false;
		}
		setSaving(true);
		setError('');
		try {
			await personalService.uploadPersonalFirma(personalId, file);
			const f = await personalService.getPersonalFirma(personalId);
			setFirma(f);
			setDirty(false);
			onDirtyChange?.(false);
			await onSaved?.();
			return true;
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : 'Error al guardar la firma');
			return false;
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
			setDirty(false);
			onDirtyChange?.(false);
			await onSaved?.();
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : 'Error al eliminar la firma');
		} finally {
			setSaving(false);
		}
	};

	useImperativeHandle(ref, () => ({
		guardar,
		isDirty: () => dirty,
	}));

	const primaryBtn = variant === 'form' ? formStyles.submitButton : styles.btnPrimary;
	const secondaryBtn = variant === 'form' ? formStyles.cancelButton : styles.btn;
	const dangerBtn = styles.btnDanger;
	const showActions = !hideActions;

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
					onStroke={markDirty}
				/>
			)}
			{(showActions || firma?.hasFirma) && (
				<div
					className={
						variant === 'form'
							? `${formStyles.actions} ${formStyles.cuentaActions}`
							: styles.actions
					}
				>
					{showActions && variant === 'modal' && onClose ? (
						<button type="button" className={secondaryBtn} onClick={onClose} disabled={saving}>
							Cerrar
						</button>
					) : null}
					{firma?.hasFirma ? (
						<button
							type="button"
							className={dangerBtn}
							onClick={() => void borrar()}
							disabled={saving || loading}
						>
							Eliminar firma
						</button>
					) : null}
					{showActions ? (
						<button
							type="button"
							className={primaryBtn}
							onClick={() => void guardar()}
							disabled={saving || loading}
						>
							{saving ? 'Guardando…' : 'Guardar firma'}
						</button>
					) : null}
				</div>
			)}
		</div>
	);
});

PersonalFirmaTab.displayName = 'PersonalFirmaTab';

export default PersonalFirmaTab;
