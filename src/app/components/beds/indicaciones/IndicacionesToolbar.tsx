'use client';
import styles from './IndicacionesToolbar.module.css';

type Props = {
	total: number;
	onVisualizar?: () => void;
	onAplicar?: () => void;
	onDejarSinEfecto?: () => void;
	onImprimir?: () => void;
	onRecetario?: () => void;
	disabled?: boolean;
};
export default function IndicacionesToolbar({
	total,
	onVisualizar,
	onAplicar,
	onDejarSinEfecto,
	onImprimir,
	onRecetario,
	disabled,
}: Props) {
	return (
		<div className={styles.bar}>
			<div className={styles.left}>
				<button onClick={onVisualizar} disabled={disabled}>
					👁️ Visualizar
				</button>
				<button onClick={onAplicar} disabled={disabled}>
					✅ Aplicar
				</button>
				<button onClick={onDejarSinEfecto} disabled={disabled}>
					✖ Dejar sin efecto
				</button>
			</div>
			<div className={styles.right}>
				<button onClick={onImprimir} disabled={disabled}>
					🖨️ Imprimir
				</button>
				<button onClick={onRecetario} disabled={disabled}>
					📄 Recetario
				</button>
				<span className={styles.total}>
					Total Indicaciones: <b>{total}</b>
				</span>
			</div>
		</div>
	);
}
