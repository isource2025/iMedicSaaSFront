'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { personalService } from '@/app/services/personalService';
import { rolesService, type Rol } from '@/app/services/rolesService';
import {
	permisosPersonalService,
	type PermisosDePersonal,
} from '@/app/services/permisosPersonalService';
import type { ModuloCatalogo } from '@/app/services/rolesService';
import type { PersonalCuentaEstado } from '@/app/types/personal';
import PersonalAccesoYRolesFields from './PersonalAccesoYRolesFields';
import PersonalPermisosMatriz from './PersonalPermisosMatriz';
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

function diffOverrides(base: string[], efectivos: Set<string>) {
	const b = new Set(base);
	return {
		grants: [...efectivos].filter((c) => !b.has(c)),
		denies: [...b].filter((c) => !efectivos.has(c)),
	};
}

function aplicarOverrides(base: string[], grants: string[], denies: string[]) {
	const s = new Set(base);
	for (const c of grants) s.add(c);
	for (const c of denies) s.delete(c);
	return s;
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

	const [catalogo, setCatalogo] = useState<ModuloCatalogo[]>([]);
	const [basePermisos, setBasePermisos] = useState<string[]>([]);
	const [marcados, setMarcados] = useState<Set<string>>(new Set());
	const [permisosActor, setPermisosActor] = useState<string[]>([]);
	const [permisosListos, setPermisosListos] = useState(false);
	const marcadosRef = useRef(marcados);
	const baseRef = useRef(basePermisos);
	marcadosRef.current = marcados;
	baseRef.current = basePermisos;

	const aplicarPackPermisos = (pack: PermisosDePersonal) => {
		setCatalogo(pack.catalogo || []);
		setBasePermisos(pack.base || []);
		setMarcados(new Set(pack.efectivos || []));
		setPermisosActor(pack.permisosActor || []);
		setPermisosListos(true);
	};

	const cargar = useCallback(async () => {
		setLoading(true);
		setError('');
		setPermisosListos(false);
		try {
			const [data, cat, packRoles, packPerm] = await Promise.all([
				personalService.getPersonalCuenta(personalId),
				rolesService.listar(),
				rolesService.getRolesDePersonal(personalId),
				permisosPersonalService.obtener(personalId).catch(() => null),
			]);
			setEstado(data);
			setNombreRed(data.tieneCuenta && data.cuenta ? data.cuenta.NombreRed || '' : '');
			setPassword('');
			setConfirmPassword('');
			setNewPassword('');
			setRoles((cat || []).filter((r) => r.Activo !== false));
			const ids = (packRoles.roles || []).map((r) => r.IdRol);
			setRolesAsignados(ids);
			const principal =
				packRoles.principal?.IdRol ??
				packRoles.roles?.find((r) => r.EsPrincipal)?.IdRol ??
				ids[0] ??
				null;
			setRolPrincipal(principal != null ? String(principal) : '');
			if (packPerm) aplicarPackPermisos(packPerm);
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

	const recalcularBasePorRoles = async (ids: number[], efectivosActuales: Set<string>, baseActual: string[]) => {
		if (!ids.length) {
			setBasePermisos([]);
			setMarcados(new Set());
			return;
		}
		try {
			const nuevaBase = await permisosPersonalService.previewBase(ids);
			const { grants, denies } = diffOverrides(baseActual, efectivosActuales);
			setBasePermisos(nuevaBase);
			setMarcados(aplicarOverrides(nuevaBase, grants, denies));
		} catch {
			/* si falla el preview, se mantiene lo visible */
		}
	};

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
			void recalcularBasePorRoles(next, marcadosRef.current, baseRef.current);
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

			if (permisosListos) {
				const guardado = await permisosPersonalService.guardar(
					personalId,
					Array.from(marcados),
				);
				setBasePermisos(guardado.base);
				setMarcados(new Set(guardado.efectivos));
			}

			setSuccess('Acceso, roles y permisos guardados.');
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

			{permisosListos && catalogo.length > 0 ? (
				<PersonalPermisosMatriz
					catalogo={catalogo}
					base={basePermisos}
					marcados={marcados}
					permisosActor={permisosActor}
					disabled={saving || loading}
					onChange={setMarcados}
				/>
			) : null}

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
						{saving ? 'Guardando…' : 'Guardar acceso, roles y permisos'}
					</button>
				</div>
			) : null}
		</div>
	);
});

PersonalCuentaTab.displayName = 'PersonalCuentaTab';

export default PersonalCuentaTab;
