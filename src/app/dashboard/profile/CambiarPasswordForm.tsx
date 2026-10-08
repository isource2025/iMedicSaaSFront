'use client';

import { useState, type FormEvent } from 'react';
import { KeyRound } from 'lucide-react';
import PasswordInput from '@/app/components/SuperAdmin/ui/PasswordInput';
import { miPerfilService } from '@/app/services/miPerfilService';
import styles from './profile.module.css';

const MIN_LARGO = 4;

function mensajeDeApi(e: unknown): string {
	if (typeof e === 'object' && e !== null && 'response' in e) {
		const m = (e as { response?: { data?: { mensaje?: unknown } } }).response?.data?.mensaje;
		if (typeof m === 'string' && m.trim()) return m.trim();
	}
	return 'No se pudo cambiar la contraseña';
}

export default function CambiarPasswordForm() {
	const [actual, setActual] = useState('');
	const [nueva, setNueva] = useState('');
	const [confirmacion, setConfirmacion] = useState('');
	const [guardando, setGuardando] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [ok, setOk] = useState(false);

	const validar = (): string | null => {
		if (!actual) return 'Ingresá tu contraseña actual';
		if (nueva.trim().length < MIN_LARGO) {
			return `La contraseña nueva debe tener al menos ${MIN_LARGO} caracteres`;
		}
		if (nueva !== confirmacion) return 'La confirmación no coincide con la contraseña nueva';
		if (nueva.trim().toUpperCase() === actual.trim().toUpperCase()) {
			return 'La contraseña nueva tiene que ser distinta de la actual';
		}
		return null;
	};

	const submit = async (ev: FormEvent) => {
		ev.preventDefault();
		setOk(false);
		const invalido = validar();
		if (invalido) {
			setError(invalido);
			return;
		}
		setGuardando(true);
		setError(null);
		try {
			await miPerfilService.cambiarPassword(actual, nueva.trim());
			setActual('');
			setNueva('');
			setConfirmacion('');
			setOk(true);
		} catch (e: unknown) {
			setError(mensajeDeApi(e));
		} finally {
			setGuardando(false);
		}
	};

	return (
		<form className={`${styles.detailGroup} ${styles.passwordCard}`} onSubmit={submit} noValidate>
			<div className={styles.detailGroupHead}>
				<h3>
					<KeyRound size={16} aria-hidden /> Cambiar contraseña
				</h3>
				<p>Para confirmar que sos vos, ingresá primero tu contraseña actual.</p>
			</div>

			<label className={styles.passwordField}>
				<span>Contraseña actual</span>
				<PasswordInput
					value={actual}
					onChange={(e) => setActual(e.target.value)}
					autoComplete="current-password"
					disabled={guardando}
				/>
			</label>
			<label className={styles.passwordField}>
				<span>Contraseña nueva</span>
				<PasswordInput
					value={nueva}
					onChange={(e) => setNueva(e.target.value)}
					autoComplete="new-password"
					disabled={guardando}
				/>
				<small>Mínimo {MIN_LARGO} caracteres.</small>
			</label>
			<label className={styles.passwordField}>
				<span>Repetir contraseña nueva</span>
				<PasswordInput
					value={confirmacion}
					onChange={(e) => setConfirmacion(e.target.value)}
					autoComplete="new-password"
					disabled={guardando}
				/>
			</label>

			{error && <p className={styles.err}>{error}</p>}
			{ok && (
				<p className={styles.passwordOk} role="status">
					Listo, tu contraseña se actualizó. Usala la próxima vez que inicies sesión.
				</p>
			)}

			<div className={styles.passwordActions}>
				<button type="submit" className={styles.btnApply} disabled={guardando}>
					{guardando ? 'Guardando…' : 'Cambiar contraseña'}
				</button>
			</div>
		</form>
	);
}
