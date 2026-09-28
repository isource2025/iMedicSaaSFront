import { createPortal } from 'react-dom';
import type { AfiliadoMatch } from '../../../services/coberturaService';
import styles from './SeleccionCobertura.module.css';

interface Props {
	matches: AfiliadoMatch[];
	onSeleccionar: (match: AfiliadoMatch) => void;
	onCancelar: () => void;
}

export default function SeleccionCoberturaModal({ matches, onSeleccionar, onCancelar }: Props) {
	if (!matches.length || typeof document === 'undefined') return null;

	return createPortal(
		<div className={styles.overlay} role='dialog' aria-modal='true'>
			<div className={styles.dialog}>
				<h3 className={styles.titulo}>Seleccione la obra social</h3>
				<p className={styles.texto}>
					El paciente figura activo en más de una obra social. Elija con cuál se carga.
				</p>
				<ul className={styles.lista}>
					{matches.map((m) => (
						<li key={String(m.valor)}>
							<button
								type='button'
								className={styles.opcion}
								onClick={() => onSeleccionar(m)}
							>
								<span className={styles.nombre}>{m.razonSocial}</span>
								<span className={styles.meta}>
									Afiliado {m.nAfiliado || '—'} · Activo
								</span>
							</button>
						</li>
					))}
				</ul>
				<div className={styles.acciones}>
					<button type='button' className={styles.cancelar} onClick={onCancelar}>
						No cargar obra social
					</button>
				</div>
			</div>
		</div>,
		document.body,
	);
}
