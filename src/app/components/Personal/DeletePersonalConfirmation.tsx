'use client';

import { Personal } from '../../types/personal';
import styles from './DeletePersonalConfirmation.module.css';

interface Props {
	personal: Personal;
	isDeleting: boolean;
	onConfirm: () => void;
	onCancel: () => void;
}

export default function DeletePersonalConfirmation({
	personal,
	isDeleting,
	onConfirm,
	onCancel,
}: Props) {
	return (
		<div className={styles.container}>
			<div className={styles.iconContainer}>
				<div className={styles.iconWarning}>⚠️</div>
			</div>

			<h3 className={styles.title}>Confirmar eliminación</h3>

			<p className={styles.message}>
				¿Está seguro de que desea eliminar al personal{' '}
				<strong>{personal.ApellidoNombre}</strong> (ID: {personal.Valor})?
			</p>

			<p className={styles.warning}>Esta acción no se puede deshacer.</p>

			<div className={styles.actions}>
				<button
					type='button'
					className={styles.cancelButton}
					onClick={onCancel}
					disabled={isDeleting}
				>
					Cancelar
				</button>
				<button
					type='button'
					className={styles.deleteButton}
					onClick={onConfirm}
					disabled={isDeleting}
				>
					{isDeleting ? 'Eliminando...' : 'Eliminar'}
				</button>
			</div>
		</div>
	);
}
