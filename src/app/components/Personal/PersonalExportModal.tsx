'use client';

import { useEffect, useState } from 'react';
import Modal from '../UI/Modal';
import styles from './PersonalExportModal.module.css';

export type ExportFieldOption = { id: string; label: string };

type Props = {
	open: boolean;
	fields: ExportFieldOption[];
	loading?: boolean;
	onClose: () => void;
	onConfirm: (campos: string[]) => void | Promise<void>;
};

export default function PersonalExportModal({
	open,
	fields,
	loading = false,
	onClose,
	onConfirm,
}: Props) {
	const [selected, setSelected] = useState<Set<string>>(new Set());

	useEffect(() => {
		if (open) {
			setSelected(new Set(fields.map((f) => f.id)));
		}
	}, [open, fields]);

	const toggle = (id: string) => {
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const selectAll = () => setSelected(new Set(fields.map((f) => f.id)));
	const selectNone = () => setSelected(new Set());

	const handleConfirm = async () => {
		if (!selected.size || loading) return;
		await onConfirm(Array.from(selected));
	};

	return (
		<Modal isOpen={open} onClose={onClose} title='Exportar personal a Excel' size='medium'>
			<div className={styles.body}>
				<p className={styles.hint}>Elegí qué columnas incluir en el archivo.</p>
				<div className={styles.actions}>
					<button type='button' className={styles.linkBtn} onClick={selectAll}>
						Seleccionar todos
					</button>
					<button type='button' className={styles.linkBtn} onClick={selectNone}>
						Ninguno
					</button>
				</div>
				<ul className={styles.list}>
					{fields.map((f) => (
						<li key={f.id}>
							<label className={styles.item}>
								<input
									type='checkbox'
									checked={selected.has(f.id)}
									onChange={() => toggle(f.id)}
									disabled={loading}
								/>
								<span>{f.label}</span>
							</label>
						</li>
					))}
				</ul>
				<div className={styles.footer}>
					<button type='button' className={styles.cancelBtn} onClick={onClose} disabled={loading}>
						Cancelar
					</button>
					<button
						type='button'
						className={styles.confirmBtn}
						onClick={handleConfirm}
						disabled={loading || selected.size === 0}
					>
						{loading ? 'Exportando…' : 'Exportar'}
					</button>
				</div>
			</div>
		</Modal>
	);
}
