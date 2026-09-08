'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';
import { personalService } from '@/app/services/personalService';
import { rolesService, type Rol } from '@/app/services/rolesService';
import type { PersonalCuentaEstado } from '@/app/types/personal';
import PersonalAccesoYRolesFields from './PersonalAccesoYRolesFields';
import formStyles from './PersonalForm.module.css';
import styles from './PersonalActionModals.module.css';

type Props = {
	personalId: number;
	apellidoNombre?: string;
	matriculaProvincial?: number | string | null;
	variant?: 'form' | 'modal';
	hideActions?: boolean;
	onSaved?: () => void | Promise<void>;
	onClose?: () => void;
	onBusyChange?: (busy: boolean) => void;
};

export type PersonalCuentaTabHandle = {
	guardar: () => Promise<boolean>;
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

const PersonalCuentaTab = forwardRef<PersonalCuentaTabHandle, Props>(function PersonalCuentaTab(
	{
		personalId,
		apellidoNombre,
		matriculaProvincial,
		variant = 'form',
		hideActions = false,
		onSaved,
		onClose,
		onBusyChange,
	},
	ref,
) {
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
			setRoles((cat || []).filter((r) => r.Activo !== false));
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

	useEffect(() => {
		onBusyChange?.(saving);
	}, [saving, onBusyChange]);

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

	const handleGuardar = async (): Promise<boolean> => {
		setSaving(true);
		setError('');
		setSuccess('');
		try {
			if (rolesAsignados.length === 0) {
				throw new Error('Marcá al menos un rol');
			}
			if (!tieneCuenta) {
				const intentoLogin = !!(nombreRed.trim() || password || confirmPassword);
				if (intentoLogin) {
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
				}
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
			return true;
		} catch (e) {
			setError(extractError(e, 'Error al guardar'));
			return false;
		} finally {
			setSaving(false);
		}
	};

	useImperativeHandle(ref, () => ({
		guardar: handleGuardar,
	}));

	const primaryBtnClass = variant === 'form' ? formStyles.submitButton : styles.btnPrimary;
	const secondaryBtnClass = variant === 'form' ? formStyles.cancelButton : styles.btn;
	const showActions = !hideActions;

	return (
		<div className={variant === 'modal' ? styles.row : undefined}>
			{apellidoNombre && variant === 'modal' ? (
				<p className={styles.muted}>
					<strong>{apellidoNombre}</strong> — ID {personalId}
				</p>
			) : null}

			<PersonalAccesoYRolesFields
				mode='edicion'
				loading={loading}
				saving={saving}
				tieneCuenta={tieneCuenta}
				nombreRed={nombreRed}
				onNombreRed={setNombreRed}
				codOperador={codOperador}
				password={password}
				onPassword={setPassword}
				confirmPassword={confirmPassword}
				onConfirmPassword={setConfirmPassword}
				newPassword={newPassword}
				onNewPassword={setNewPassword}
				roles={roles}
				rolesAsignados={rolesAsignados}
				onToggleRol={toggleRol}
				rolPrincipal={rolPrincipal}
				onRolPrincipal={setRolPrincipal}
				alertError={error}
				alertSuccess={success}
			/>

			{showActions ? (
				<div
					className={
						variant === 'form' ? `${formStyles.actions} ${formStyles.cuentaActions}` : styles.actions
					}
				>
					{variant === 'modal' && onClose ? (
						<button type='button' className={secondaryBtnClass} onClick={onClose} disabled={saving}>
							Cerrar
						</button>
					) : null}
					<button
						type='button'
						className={primaryBtnClass}
						onClick={() => void handleGuardar()}
						disabled={saving}
					>
						{saving ? 'Guardando…' : 'Guardar acceso y roles'}
					</button>
				</div>
			) : null}
		</div>
	);
});

PersonalCuentaTab.displayName = 'PersonalCuentaTab';

export default PersonalCuentaTab;
