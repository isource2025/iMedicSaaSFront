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

export default function PersonalCuentaTab({
	personalId,
	apellidoNombre,
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
	const [codOperador, setCodOperador] = useState('');
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
			if (data.tieneCuenta && data.cuenta) {
				setNombreRed(data.cuenta.NombreRed || '');
				setCodOperador(data.cuenta.CodOperador || '');
			} else {
				setNombreRed('');
				setCodOperador('');
			}
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
				codOperador: codOperador.trim() || undefined,
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

	const handleActualizarCuenta = async () => {
		if (!nombreRed.trim()) {
			setError('El nombre de usuario (NombreRed) es obligatorio');
			return;
		}
		setSaving(true);
		setError('');
		setSuccess('');
		try {
			const cuenta = await personalService.updatePersonalCuenta(personalId, {
				nombreRed: nombreRed.trim(),
				codOperador: codOperador.trim() || undefined,
			});
			setEstado({ tieneCuenta: true, cuenta });
			setSuccess('Datos de acceso actualizados.');
			await onSaved?.();
		} catch (e) {
			setError(extractError(e, 'Error al actualizar la cuenta'));
		} finally {
			setSaving(false);
		}
	};

	const handleCambiarPassword = async () => {
		const pwdErr = validarPasswordPar(newPassword, confirmNewPassword);
		if (pwdErr) {
			setError(pwdErr);
			return;
		}
		setSaving(true);
		setError('');
		setSuccess('');
		try {
			await personalService.changePersonalCuentaPassword(personalId, newPassword);
			setNewPassword('');
			setConfirmNewPassword('');
			setSuccess('Contraseña actualizada correctamente.');
			await onSaved?.();
		} catch (e) {
			setError(extractError(e, 'Error al cambiar la contraseña'));
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

	return (
		<div className={wrapClass}>
			{apellidoNombre && variant === 'modal' && (
				<p className={styles.muted}>
					<strong>{apellidoNombre}</strong> — ID {personalId}
				</p>
			)}

			<div className={formStyles.usuarioHead}>
				<p className={formStyles.usuarioHint}>
					La cuenta de acceso se guarda en <code>imPassword</code> con el mismo ID del personal (
					<strong>ValorPersonal = {personalId}</strong>). Es la misma credencial que usa el login del
					sistema.
				</p>
				{tieneCuenta ? (
					<span
						style={{
							display: 'inline-block',
							padding: '0.2rem 0.6rem',
							borderRadius: 999,
							background: '#dcfce7',
							color: '#166534',
							fontSize: '0.78rem',
							fontWeight: 600,
						}}
					>
						Cuenta activa
					</span>
				) : (
					<span
						style={{
							display: 'inline-block',
							padding: '0.2rem 0.6rem',
							borderRadius: 999,
							background: '#fef3c7',
							color: '#92400e',
							fontSize: '0.78rem',
							fontWeight: 600,
						}}
					>
						Sin cuenta de acceso
					</span>
				)}
			</div>

			{error && (
				<div
					style={{
						padding: '0.5rem 0.75rem',
						marginBottom: '0.75rem',
						borderRadius: 8,
						background: '#fef2f2',
						color: '#b91c1c',
						fontSize: '0.85rem',
					}}
				>
					{error}
				</div>
			)}
			{success && (
				<div
					style={{
						padding: '0.5rem 0.75rem',
						marginBottom: '0.75rem',
						borderRadius: 8,
						background: '#f0fdf4',
						color: '#166534',
						fontSize: '0.85rem',
					}}
				>
					{success}
				</div>
			)}

			{!tieneCuenta ? (
				<div className={formStyles.usuarioGrid}>
					<div className={`${formStyles.field} ${formStyles.fieldHalf}`}>
						<label className={formStyles.label}>Usuario (NombreRed) *</label>
						<input
							type='text'
							value={nombreRed}
							onChange={(e) => setNombreRed(e.target.value)}
							className={formStyles.input}
							autoComplete='off'
							placeholder='Ej. jperez'
							disabled={saving}
						/>
					</div>
					<div className={`${formStyles.field} ${formStyles.fieldHalf}`}>
						<label className={formStyles.label}>Código operador</label>
						<input
							type='text'
							value={codOperador}
							onChange={(e) => setCodOperador(e.target.value)}
							className={formStyles.input}
							autoComplete='off'
							disabled={saving}
						/>
					</div>
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
				</div>
			) : (
				<>
					<div className={formStyles.usuarioGrid}>
						<div className={`${formStyles.field} ${formStyles.fieldHalf}`}>
							<label className={formStyles.label}>Usuario (NombreRed) *</label>
							<input
								type='text'
								value={nombreRed}
								onChange={(e) => setNombreRed(e.target.value)}
								className={formStyles.input}
								autoComplete='off'
								disabled={saving}
							/>
						</div>
						<div className={`${formStyles.field} ${formStyles.fieldHalf}`}>
							<label className={formStyles.label}>Código operador</label>
							<input
								type='text'
								value={codOperador}
								onChange={(e) => setCodOperador(e.target.value)}
								className={formStyles.input}
								autoComplete='off'
								disabled={saving}
							/>
						</div>
					</div>

					{estado?.cuenta?.sectores && estado.cuenta.sectores.length > 0 && (
						<div style={{ marginTop: '0.75rem' }}>
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

					<div
						style={{
							marginTop: '1rem',
							paddingTop: '1rem',
							borderTop: '1px solid #dbeafe',
						}}
					>
						<p className={formStyles.checkboxLabel} style={{ marginBottom: '0.5rem' }}>
							Cambiar contraseña
						</p>
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
				</>
			)}

			<div className={variant === 'modal' ? styles.actions : formStyles.actions}>
				{variant === 'modal' && onClose && (
					<button type='button' className={styles.btn} onClick={onClose} disabled={saving}>
						Cerrar
					</button>
				)}
				{!tieneCuenta ? (
					<button
						type='button'
						className={variant === 'modal' ? styles.btnPrimary : formStyles.submitButton}
						onClick={handleCrearCuenta}
						disabled={saving}
					>
						{saving ? 'Creando…' : 'Crear cuenta de acceso'}
					</button>
				) : (
					<>
						<button
							type='button'
							className={variant === 'modal' ? styles.btnPrimary : formStyles.submitButton}
							onClick={handleActualizarCuenta}
							disabled={saving}
						>
							{saving ? 'Guardando…' : 'Guardar datos de acceso'}
						</button>
						{(newPassword || confirmNewPassword) && (
							<button
								type='button'
								className={variant === 'modal' ? styles.btn : formStyles.cancelButton}
								onClick={handleCambiarPassword}
								disabled={saving}
								style={variant === 'form' ? { marginLeft: '0.5rem' } : undefined}
							>
								{saving ? 'Guardando…' : 'Actualizar contraseña'}
							</button>
						)}
					</>
				)}
			</div>
		</div>
	);
}
