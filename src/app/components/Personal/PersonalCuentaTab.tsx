'use client';

import { useCallback, useEffect, useState } from 'react';
import Loader from '@/app/components/Loader/Loader';
import { personalService } from '@/app/services/personalService';
import type { PersonalCuentaEstado } from '@/app/types/personal';
import formStyles from './PersonalForm.module.css';
import styles from './PersonalActionModals.module.css';

type Props = {
	personalId: number;
	apellidoNombre?: string;
	/** Matrícula provincial: define el código operador (solo lectura). */
	matriculaProvincial?: number | string | null;
	/** En modal muestra botón cerrar; en formulario se integra en la solapa */
	variant?: 'form' | 'modal';
	onSaved?: () => void | Promise<void>;
	onClose?: () => void;
};

function extractError(err: unknown, fallback: string): string {
	if (err && typeof err === 'object' && 'response' in err) {
		const data = (err as { response?: { data?: { mensaje?: string } } }).response?.data;
		if (typeof data?.mensaje === 'string' && data.mensaje.trim()) return data.mensaje;
	}
	if (err instanceof Error && err.message) return err.message;
	return fallback;
}

function codOperadorDisplay(
	matriculaProvincial: number | string | null | undefined,
	personalId: number,
	cuentaCod?: string | null,
) {
	if (cuentaCod != null && String(cuentaCod).trim()) return String(cuentaCod).trim();
	if (matriculaProvincial != null && String(matriculaProvincial).trim()) {
		return String(matriculaProvincial).trim();
	}
	return String(personalId);
}

export default function PersonalCuentaTab({
	personalId,
	apellidoNombre,
	matriculaProvincial,
	variant = 'form',
	onSaved,
	onClose,
}: Props) {
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');
	const [estado, setEstado] = useState<PersonalCuentaEstado | null>(null);

	const [nombreRed, setNombreRed] = useState('');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [newPassword, setNewPassword] = useState('');
	const [confirmNewPassword, setConfirmNewPassword] = useState('');

	const cargar = useCallback(async () => {
		setLoading(true);
		setError('');
		try {
			const data = await personalService.getPersonalCuenta(personalId);
			setEstado(data);
			setNombreRed(data.tieneCuenta && data.cuenta ? data.cuenta.NombreRed || '' : '');
			setPassword('');
			setConfirmPassword('');
			setNewPassword('');
			setConfirmNewPassword('');
		} catch (e) {
			setError(extractError(e, 'Error al cargar la cuenta de acceso'));
		} finally {
			setLoading(false);
		}
	}, [personalId]);

	useEffect(() => {
		cargar();
	}, [cargar]);

	const tieneCuenta = !!estado?.tieneCuenta;
	const codOperador = codOperadorDisplay(
		matriculaProvincial,
		personalId,
		estado?.cuenta?.CodOperador,
	);

	const validarPasswordPar = (pwd: string, confirm: string): string | null => {
		if (pwd !== confirm) return 'Las contraseñas no coinciden';
		if (pwd.length < 4) return 'La contraseña debe tener al menos 4 caracteres';
		return null;
	};

	const handleCrearCuenta = async () => {
		const pwdErr = validarPasswordPar(password, confirmPassword);
		if (!nombreRed.trim()) {
			setError('El nombre de usuario (NombreRed) es obligatorio');
			return;
		}
		if (pwdErr) {
			setError(pwdErr);
			return;
		}
		setSaving(true);
		setError('');
		setSuccess('');
		try {
			const cuenta = await personalService.createPersonalCuenta(personalId, {
				nombreRed: nombreRed.trim(),
				password,
			});
			setEstado({ tieneCuenta: true, cuenta });
			setPassword('');
			setConfirmPassword('');
			setSuccess('Cuenta de acceso creada. El personal ya puede iniciar sesión.');
			await onSaved?.();
		} catch (e) {
			setError(extractError(e, 'Error al crear la cuenta'));
		} finally {
			setSaving(false);
		}
	};

	const handleGuardarCambios = async () => {
		if (!nombreRed.trim()) {
			setError('El nombre de usuario (NombreRed) es obligatorio');
			return;
		}

		const quiereCambiarPassword = !!(newPassword || confirmNewPassword);
		if (quiereCambiarPassword) {
			const pwdErr = validarPasswordPar(newPassword, confirmNewPassword);
			if (pwdErr) {
				setError(pwdErr);
				return;
			}
		}

		setSaving(true);
		setError('');
		setSuccess('');
		try {
			const cuenta = await personalService.updatePersonalCuenta(personalId, {
				nombreRed: nombreRed.trim(),
			});
			setEstado({ tieneCuenta: true, cuenta });

			if (quiereCambiarPassword) {
				await personalService.changePersonalCuentaPassword(personalId, newPassword);
				setNewPassword('');
				setConfirmNewPassword('');
			}

			setSuccess(
				quiereCambiarPassword
					? 'Datos de acceso y contraseña actualizados.'
					: 'Datos de acceso actualizados.',
			);
			await onSaved?.();
		} catch (e) {
			setError(extractError(e, 'Error al guardar los cambios'));
		} finally {
			setSaving(false);
		}
	};

	if (loading) {
		return (
			<div style={{ position: 'relative', minHeight: 160 }}>
				<Loader />
			</div>
		);
	}

	const wrapClass = variant === 'form' ? formStyles.usuarioSection : styles.row;
	const actionClass = variant === 'form' ? formStyles.actions : styles.actions;
	const primaryBtnClass = variant === 'form' ? formStyles.submitButton : styles.btnPrimary;
	const secondaryBtnClass = variant === 'form' ? formStyles.cancelButton : styles.btn;

	return (
		<div className={wrapClass}>
			{apellidoNombre && variant === 'modal' && (
				<p className={styles.muted}>
					<strong>{apellidoNombre}</strong> — ID {personalId}
				</p>
			)}

			<div className={formStyles.usuarioHead}>
				<p className={formStyles.usuarioHint}>
					Credencial de login del sistema vinculada al personal (ID {personalId}). El código
					operador se toma de la matrícula provincial y no se edita desde aquí.
				</p>
				{tieneCuenta ? (
					<span className={formStyles.statusBadgeActive}>Cuenta activa</span>
				) : (
					<span className={formStyles.statusBadgeInactive}>Sin cuenta de acceso</span>
				)}
			</div>

			{error && <div className={formStyles.alertError}>{error}</div>}
			{success && <div className={formStyles.alertSuccess}>{success}</div>}

			<div className={formStyles.usuarioGrid}>
				<div className={`${formStyles.field} ${formStyles.fieldHalf}`}>
					<label className={formStyles.label}>Usuario (NombreRed) *</label>
					<input
						type='text'
						value={nombreRed}
						onChange={(e) => setNombreRed(e.target.value)}
						className={formStyles.input}
						autoComplete='off'
						placeholder='Ej. jperez o DNI'
						disabled={saving}
					/>
				</div>
				<div className={`${formStyles.field} ${formStyles.fieldHalf}`}>
					<label className={formStyles.label}>Código operador</label>
					<input
						type='text'
						value={codOperador}
						readOnly
						disabled
						className={`${formStyles.input} ${formStyles.readOnly}`}
						tabIndex={-1}
					/>
					<span className={formStyles.fieldHint}>
						Definido por la matrícula provincial en Datos Profesionales.
					</span>
				</div>

				{!tieneCuenta && (
					<>
						<div className={`${formStyles.field} ${formStyles.fieldHalf}`}>
							<label className={formStyles.label}>Contraseña *</label>
							<input
								type='password'
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								className={formStyles.input}
								autoComplete='new-password'
								disabled={saving}
							/>
						</div>
						<div className={`${formStyles.field} ${formStyles.fieldHalf}`}>
							<label className={formStyles.label}>Confirmar contraseña *</label>
							<input
								type='password'
								value={confirmPassword}
								onChange={(e) => setConfirmPassword(e.target.value)}
								className={formStyles.input}
								autoComplete='new-password'
								disabled={saving}
							/>
						</div>
					</>
				)}
			</div>

			{tieneCuenta && estado?.cuenta?.sectores && estado.cuenta.sectores.length > 0 && (
				<div className={formStyles.readOnlyBlock}>
					<div className={styles.label}>Sectores de login</div>
					<div className={styles.list} style={{ maxHeight: 120 }}>
						{estado.cuenta.sectores.map((s) => (
							<div key={s.idSector} className={styles.listItem}>
								<span>{s.descripcionSector || s.idSector}</span>
							</div>
						))}
					</div>
					<p className={formStyles.usuarioHint}>
						Los sectores se gestionan desde el menú &quot;Sectores&quot; del personal.
					</p>
				</div>
			)}

			{tieneCuenta && (
				<div className={formStyles.subsection}>
					<p className={formStyles.subsectionTitle}>Cambiar contraseña</p>
					<div className={formStyles.usuarioGrid}>
						<div className={`${formStyles.field} ${formStyles.fieldHalf}`}>
							<label className={formStyles.label}>Nueva contraseña</label>
							<input
								type='password'
								value={newPassword}
								onChange={(e) => setNewPassword(e.target.value)}
								className={formStyles.input}
								autoComplete='new-password'
								disabled={saving}
							/>
						</div>
						<div className={`${formStyles.field} ${formStyles.fieldHalf}`}>
							<label className={formStyles.label}>Confirmar nueva contraseña</label>
							<input
								type='password'
								value={confirmNewPassword}
								onChange={(e) => setConfirmNewPassword(e.target.value)}
								className={formStyles.input}
								autoComplete='new-password'
								disabled={saving}
							/>
						</div>
					</div>
				</div>
			)}

			<div className={actionClass}>
				{variant === 'modal' && onClose && (
					<button type='button' className={secondaryBtnClass} onClick={onClose} disabled={saving}>
						Cerrar
					</button>
				)}
				{!tieneCuenta ? (
					<button
						type='button'
						className={primaryBtnClass}
						onClick={handleCrearCuenta}
						disabled={saving}
					>
						{saving ? 'Creando…' : 'Crear cuenta de acceso'}
					</button>
				) : (
					<button
						type='button'
						className={primaryBtnClass}
						onClick={handleGuardarCambios}
						disabled={saving}
					>
						{saving ? 'Guardando…' : 'Guardar cambios'}
					</button>
				)}
			</div>
		</div>
	);
}
