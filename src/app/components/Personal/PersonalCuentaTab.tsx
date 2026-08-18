'use client';

import { useCallback, useEffect, useState } from 'react';
import Loader from '@/app/components/Loader/Loader';
import { personalService } from '@/app/services/personalService';
import { rolesService, type Rol } from '@/app/services/rolesService';
import type { PersonalCuentaEstado } from '@/app/types/personal';
import formStyles from './PersonalForm.module.css';
import styles from './PersonalActionModals.module.css';

type Props = {
	personalId: number;
	apellidoNombre?: string;
	matriculaProvincial?: number | string | null;
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

	const [roles, setRoles] = useState<Rol[]>([]);
	const [rolesAsignados, setRolesAsignados] = useState<number[]>([]);
	const [rolPrincipal, setRolPrincipal] = useState('');

	const cargar = useCallback(async () => {
		setLoading(true);
		setError('');
		try {
			const [data, cat, pack] = await Promise.all([
				personalService.getPersonalCuenta(personalId),
				rolesService.listar(),
				rolesService.getRolesDePersonal(personalId),
			]);
			setEstado(data);
			setNombreRed(data.tieneCuenta && data.cuenta ? data.cuenta.NombreRed || '' : '');
			setPassword('');
			setConfirmPassword('');
			setNewPassword('');
			setRoles(cat);
			const ids = (pack.roles || []).map((r) => r.IdRol);
			setRolesAsignados(ids);
			const principal =
				pack.principal?.IdRol ??
				pack.roles?.find((r) => r.EsPrincipal)?.IdRol ??
				ids[0] ??
				null;
			setRolPrincipal(principal != null ? String(principal) : '');
		} catch (e) {
			setError(extractError(e, 'Error al cargar acceso'));
		} finally {
			setLoading(false);
		}
	}, [personalId]);

	useEffect(() => {
		void cargar();
	}, [cargar]);

	const tieneCuenta = !!estado?.tieneCuenta;
	const codOperador = codOperadorDisplay(
		matriculaProvincial,
		personalId,
		estado?.cuenta?.CodOperador,
	);

	const toggleRol = (idRol: number) => {
		setRolesAsignados((prev) => {
			const has = prev.includes(idRol);
			const next = has ? prev.filter((x) => x !== idRol) : [...prev, idRol];
			setRolPrincipal((p) => {
				const cur = p === '' ? null : Number(p);
				if (has && cur === idRol) return next.length ? String(next[0]) : '';
				if (!has && (p === '' || cur == null)) return String(idRol);
				return p;
			});
			return next;
		});
	};

	const handleGuardar = async () => {
		setSaving(true);
		setError('');
		setSuccess('');
		try {
			if (!tieneCuenta) {
				if (!nombreRed.trim()) throw new Error('El usuario es obligatorio');
				if (password !== confirmPassword) throw new Error('Las contraseñas no coinciden');
				if (password.length < 4) throw new Error('La contraseña debe tener al menos 4 caracteres');
				const cuenta = await personalService.createPersonalCuenta(personalId, {
					nombreRed: nombreRed.trim(),
					password,
				});
				setEstado({ tieneCuenta: true, cuenta });
				setPassword('');
				setConfirmPassword('');
			} else {
				if (!nombreRed.trim()) throw new Error('El usuario es obligatorio');
				const cuenta = await personalService.updatePersonalCuenta(personalId, {
					nombreRed: nombreRed.trim(),
				});
				setEstado({ tieneCuenta: true, cuenta });
				if (newPassword) {
					if (newPassword.length < 4) throw new Error('La contraseña debe tener al menos 4 caracteres');
					await personalService.changePersonalCuentaPassword(personalId, newPassword);
					setNewPassword('');
				}
			}

			const principal = rolPrincipal === '' ? null : Number(rolPrincipal);
			await rolesService.asignarRolesAPersonal(personalId, rolesAsignados, principal);
			setSuccess('Acceso y roles guardados.');
			await onSaved?.();
		} catch (e) {
			setError(extractError(e, 'Error al guardar'));
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
	const primaryBtnClass = variant === 'form' ? formStyles.submitButton : styles.btnPrimary;
	const secondaryBtnClass = variant === 'form' ? formStyles.cancelButton : styles.btn;

	return (
		<div className={wrapClass}>
			{apellidoNombre && variant === 'modal' ? (
				<p className={styles.muted}>
					<strong>{apellidoNombre}</strong> — ID {personalId}
				</p>
			) : null}

			<div className={formStyles.usuarioHead}>
				<p className={formStyles.usuarioHint}>Usuario de login, contraseña y roles en un solo lugar.</p>
				{tieneCuenta ? (
					<span className={formStyles.statusBadgeActive}>Con cuenta</span>
				) : (
					<span className={formStyles.statusBadgeInactive}>Sin cuenta</span>
				)}
			</div>

			{error ? <div className={formStyles.alertError}>{error}</div> : null}
			{success ? <div className={formStyles.alertSuccess}>{success}</div> : null}

			<div className={formStyles.asignGrid}>
				<section className={formStyles.asignCol}>
					<h3 className={formStyles.subsectionTitle}>Login</h3>
					<div className={formStyles.usuarioGrid}>
						<div className={`${formStyles.field} ${formStyles.fieldHalf}`}>
							<label className={formStyles.label}>Usuario *</label>
							<input
								type="text"
								value={nombreRed}
								onChange={(e) => setNombreRed(e.target.value)}
								className={formStyles.input}
								autoComplete="off"
								disabled={saving}
							/>
						</div>
						<div className={`${formStyles.field} ${formStyles.fieldHalf}`}>
							<label className={formStyles.label}>Cód. operador</label>
							<input
								type="text"
								value={codOperador}
								readOnly
								disabled
								className={`${formStyles.input} ${formStyles.readOnly}`}
							/>
						</div>
						{!tieneCuenta ? (
							<>
								<div className={`${formStyles.field} ${formStyles.fieldHalf}`}>
									<label className={formStyles.label}>Contraseña *</label>
									<input
										type="password"
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										className={formStyles.input}
										autoComplete="new-password"
										disabled={saving}
									/>
								</div>
								<div className={`${formStyles.field} ${formStyles.fieldHalf}`}>
									<label className={formStyles.label}>Confirmar *</label>
									<input
										type="password"
										value={confirmPassword}
										onChange={(e) => setConfirmPassword(e.target.value)}
										className={formStyles.input}
										autoComplete="new-password"
										disabled={saving}
									/>
								</div>
							</>
						) : (
							<div className={`${formStyles.field} ${formStyles.fieldHalf}`}>
								<label className={formStyles.label}>Nueva contraseña</label>
								<input
									type="password"
									value={newPassword}
									onChange={(e) => setNewPassword(e.target.value)}
									className={formStyles.input}
									autoComplete="new-password"
									placeholder="Dejar vacío para no cambiar"
									disabled={saving}
								/>
							</div>
						)}
					</div>
				</section>

				<section className={formStyles.asignCol}>
					<h3 className={formStyles.subsectionTitle}>Roles</h3>
					<div className={styles.list}>
						{roles.map((r) => {
							const checked = rolesAsignados.includes(r.IdRol);
							return (
								<label key={r.IdRol} className={styles.checkRow}>
									<input
										type="checkbox"
										checked={checked}
										onChange={() => toggleRol(r.IdRol)}
										disabled={saving}
									/>
									<span>{r.Descripcion || r.Nombre}</span>
								</label>
							);
						})}
					</div>
					{rolesAsignados.length > 0 ? (
						<div className={formStyles.field} style={{ marginTop: 8 }}>
							<label className={formStyles.label}>Rol principal</label>
							<select
								className={formStyles.input}
								value={rolPrincipal}
								onChange={(e) => setRolPrincipal(e.target.value)}
								disabled={saving}
							>
								{roles
									.filter((r) => rolesAsignados.includes(r.IdRol))
									.map((r) => (
										<option key={r.IdRol} value={String(r.IdRol)}>
											{r.Descripcion || r.Nombre}
										</option>
									))}
							</select>
						</div>
					) : (
						<p className={styles.muted}>Marcá al menos un rol.</p>
					)}
				</section>
			</div>

			<div className={variant === 'form' ? formStyles.actions : styles.actions}>
				{variant === 'modal' && onClose ? (
					<button type="button" className={secondaryBtnClass} onClick={onClose} disabled={saving}>
						Cerrar
					</button>
				) : null}
				<button type="button" className={primaryBtnClass} onClick={() => void handleGuardar()} disabled={saving}>
					{saving ? 'Guardando…' : tieneCuenta ? 'Guardar acceso y roles' : 'Crear cuenta y roles'}
				</button>
			</div>
		</div>
	);
}
