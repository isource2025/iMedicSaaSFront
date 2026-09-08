'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import type { Rol } from '@/app/services/rolesService';
import { etiquetaRol } from '@/app/utils/permisos';
import formStyles from './PersonalForm.module.css';
import modalStyles from './PersonalActionModals.module.css';

export type AccesoYRolesErrors = {
	IdRol?: string;
	NombreRed?: string;
	Password?: string;
	ConfirmPassword?: string;
};

type Props = {
	mode: 'alta' | 'edicion';
	loading?: boolean;
	saving?: boolean;
	tieneCuenta?: boolean;
	crearUsuario?: boolean;
	onCrearUsuario?: (value: boolean) => void;
	nombreRed: string;
	onNombreRed: (value: string) => void;
	codOperador: string;
	password: string;
	onPassword: (value: string) => void;
	confirmPassword: string;
	onConfirmPassword: (value: string) => void;
	newPassword?: string;
	onNewPassword?: (value: string) => void;
	roles: Rol[];
	rolesAsignados: number[];
	onToggleRol: (idRol: number) => void;
	rolPrincipal: string;
	onRolPrincipal: (value: string) => void;
	errors?: AccesoYRolesErrors;
	alertError?: string;
	alertSuccess?: string;
};

function rolLabel(r: Rol): string {
	return (
		etiquetaRol({ nombre: r.Nombre, descripcion: r.Descripcion }) ||
		r.Descripcion ||
		r.Nombre
	);
}

export default function PersonalAccesoYRolesFields({
	mode,
	loading = false,
	saving = false,
	tieneCuenta = false,
	crearUsuario = false,
	onCrearUsuario,
	nombreRed,
	onNombreRed,
	codOperador,
	password,
	onPassword,
	confirmPassword,
	onConfirmPassword,
	newPassword = '',
	onNewPassword,
	roles,
	rolesAsignados,
	onToggleRol,
	rolPrincipal,
	onRolPrincipal,
	errors = {},
	alertError,
	alertSuccess,
}: Props) {
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirm, setShowConfirm] = useState(false);
	const [showNewPassword, setShowNewPassword] = useState(false);

	const busy = saving || loading;
	const loginEnabled = mode === 'edicion' || crearUsuario;
	const showCreatePasswords = mode === 'alta' || !tieneCuenta;
	const showNewPasswordField = mode === 'edicion' && tieneCuenta;

	return (
		<div className={formStyles.usuarioSection}>
			<div className={formStyles.usuarioHead}>
				<div className={formStyles.usuarioHeadText}>
					<p className={formStyles.usuarioHint}>
						{loading
							? 'Cargando acceso y roles…'
							: 'Usuario de login, contraseña y roles en un solo lugar.'}
					</p>
					{mode === 'alta' ? (
						<label className={formStyles.checkboxLabel}>
							<input
								type='checkbox'
								checked={!!crearUsuario}
								onChange={(e) => onCrearUsuario?.(e.target.checked)}
								disabled={busy}
							/>
							Crear usuario de acceso al sistema
						</label>
					) : null}
				</div>
				{mode === 'alta' ? (
					<span
						className={
							crearUsuario ? formStyles.statusBadgeActive : formStyles.statusBadgeInactive
						}
					>
						{crearUsuario ? 'Se creará cuenta' : 'Sin cuenta'}
					</span>
				) : tieneCuenta ? (
					<span className={formStyles.statusBadgeActive}>Con cuenta</span>
				) : (
					<span className={formStyles.statusBadgeInactive}>Sin cuenta</span>
				)}
			</div>

			{alertError ? <div className={formStyles.alertError}>{alertError}</div> : null}
			{alertSuccess ? <div className={formStyles.alertSuccess}>{alertSuccess}</div> : null}

			<div className={formStyles.asignGrid}>
				<section className={formStyles.asignCol}>
					<h3 className={formStyles.subsectionTitle}>Login</h3>
					{mode === 'alta' && !crearUsuario ? (
						<p className={formStyles.usuarioHint}>
							Opcional. Si lo activás, el personal podrá ingresar al sistema con usuario y
							contraseña.
						</p>
					) : null}
					<div className={formStyles.loginStack}>
						<div className={formStyles.field}>
							<label className={formStyles.label}>Usuario *</label>
							<input
								type='text'
								value={nombreRed}
								onChange={(e) => onNombreRed(e.target.value)}
								className={`${formStyles.input} ${errors.NombreRed ? formStyles.inputError : ''}`}
								autoComplete='off'
								disabled={busy || !loginEnabled}
								placeholder={mode === 'alta' ? 'Ej. DNI o usuario' : undefined}
							/>
							{errors.NombreRed ? (
								<span className={formStyles.error}>{errors.NombreRed}</span>
							) : null}
						</div>
						<div className={formStyles.field}>
							<label className={formStyles.label}>Cód. operador</label>
							<input
								type='text'
								value={codOperador}
								readOnly
								disabled
								className={`${formStyles.input} ${formStyles.readOnly}`}
							/>
						</div>
						{showCreatePasswords ? (
							<>
								<div className={formStyles.field}>
									<label className={formStyles.label}>Contraseña *</label>
									<div className={formStyles.passwordWrap}>
										<input
											type={showPassword ? 'text' : 'password'}
											value={password}
											onChange={(e) => onPassword(e.target.value)}
											className={`${formStyles.input} ${errors.Password ? formStyles.inputError : ''}`}
											autoComplete='new-password'
											disabled={busy || !loginEnabled}
										/>
										<button
											type='button'
											className={formStyles.passwordToggle}
											onClick={() => setShowPassword((v) => !v)}
											tabIndex={-1}
											aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
										>
											{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
										</button>
									</div>
									{errors.Password ? (
										<span className={formStyles.error}>{errors.Password}</span>
									) : null}
								</div>
								<div className={formStyles.field}>
									<label className={formStyles.label}>Confirmar *</label>
									<div className={formStyles.passwordWrap}>
										<input
											type={showConfirm ? 'text' : 'password'}
											value={confirmPassword}
											onChange={(e) => onConfirmPassword(e.target.value)}
											className={`${formStyles.input} ${
												errors.ConfirmPassword ? formStyles.inputError : ''
											}`}
											autoComplete='new-password'
											disabled={busy || !loginEnabled}
										/>
										<button
											type='button'
											className={formStyles.passwordToggle}
											onClick={() => setShowConfirm((v) => !v)}
											tabIndex={-1}
											aria-label={showConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'}
										>
											{showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
										</button>
									</div>
									{errors.ConfirmPassword ? (
										<span className={formStyles.error}>{errors.ConfirmPassword}</span>
									) : null}
								</div>
							</>
						) : null}
						{showNewPasswordField ? (
							<div className={formStyles.field}>
								<label className={formStyles.label}>Nueva contraseña</label>
								<div className={formStyles.passwordWrap}>
									<input
										type={showNewPassword ? 'text' : 'password'}
										value={newPassword}
										onChange={(e) => onNewPassword?.(e.target.value)}
										className={formStyles.input}
										autoComplete='new-password'
										placeholder='Dejar vacío para no cambiar'
										disabled={busy}
									/>
									<button
										type='button'
										className={formStyles.passwordToggle}
										onClick={() => setShowNewPassword((v) => !v)}
										tabIndex={-1}
										aria-label={
											showNewPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
										}
									>
										{showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
									</button>
								</div>
							</div>
						) : null}
					</div>
				</section>

				<section className={formStyles.asignCol}>
					<h3 className={formStyles.subsectionTitle}>Roles *</h3>
					<p className={formStyles.usuarioHint}>
						Obligatorio. Define los permisos del personal en el sistema.
					</p>
					<div className={modalStyles.list}>
						{roles.map((r) => {
							const checked = rolesAsignados.includes(r.IdRol);
							return (
								<label key={r.IdRol} className={modalStyles.checkRow}>
									<input
										type='checkbox'
										checked={checked}
										onChange={() => onToggleRol(r.IdRol)}
										disabled={busy}
									/>
									<span>{rolLabel(r)}</span>
								</label>
							);
						})}
					</div>
					{errors.IdRol ? <span className={formStyles.error}>{errors.IdRol}</span> : null}
					{roles.length === 0 && !loading ? (
						<p className={modalStyles.muted}>
							No hay roles disponibles. Verificá el catálogo de roles de la empresa.
						</p>
					) : null}
					{rolesAsignados.length > 0 ? (
						<div className={formStyles.field} style={{ marginTop: 8 }}>
							<label className={formStyles.label}>Rol principal</label>
							<select
								className={formStyles.input}
								value={rolPrincipal}
								onChange={(e) => onRolPrincipal(e.target.value)}
								disabled={busy}
							>
								{roles
									.filter((r) => rolesAsignados.includes(r.IdRol))
									.map((r) => (
										<option key={r.IdRol} value={String(r.IdRol)}>
											{rolLabel(r)}
										</option>
									))}
							</select>
						</div>
					) : (
						<p className={modalStyles.muted}>Marcá al menos un rol.</p>
					)}
				</section>
			</div>
		</div>
	);
}
