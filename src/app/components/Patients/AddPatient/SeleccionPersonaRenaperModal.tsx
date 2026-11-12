import { createPortal } from 'react-dom';
import type { Persona } from '../typesForRenaper';
import styles from './SeleccionCobertura.module.css';

interface Props {
	documento: string;
	personas: Persona[];
	onSeleccionar: (persona: Persona) => void;
	onCancelar: () => void;
}

function fechaAr(iso?: string | null) {
	const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
	return m ? `${m[3]}/${m[2]}/${m[1]}` : String(iso || '');
}

function sexoTexto(p: Persona) {
	const s = String(p.sexo || '').toUpperCase();
	if (s === 'F') return 'Femenino';
	if (s === 'M') return 'Masculino';
	return s || 'Sexo no informado';
}

function esFallecido(p: Persona) {
	const aviso = String(p.mensaf || '').toUpperCase();
	return aviso.includes('FALLECID') && !aviso.includes('SIN AVISO');
}

/** RENAPER devuelve una persona por sexo: un mismo DNI puede corresponder a dos personas. */
export default function SeleccionPersonaRenaperModal({
	documento,
	personas,
	onSeleccionar,
	onCancelar,
}: Props) {
	if (personas.length < 2 || typeof document === 'undefined') return null;

	return createPortal(
		<div className={styles.overlay} role='dialog' aria-modal='true'>
			<div className={styles.dialog}>
				<h3 className={styles.titulo}>Seleccione la persona</h3>
				<p className={styles.texto}>
					El DNI {documento} corresponde a {personas.length} personas en RENAPER. Elija la
					correcta para cargar sus datos.
				</p>
				<ul className={styles.lista}>
					{personas.map((p) => (
						<li key={`${p.sexo}-${p.apellido}-${p.nombres}`}>
							<button
								type='button'
								className={styles.opcion}
								onClick={() => onSeleccionar(p)}
							>
								<span className={styles.nombre}>
									{[p.apellido, p.nombres].filter(Boolean).join(', ')}
								</span>
								<span className={styles.meta}>
									{sexoTexto(p)}
									{p.fechaNacimiento ? ` · Nac. ${fechaAr(p.fechaNacimiento)}` : ''}
									{esFallecido(p) ? ' · FALLECIDO' : ''}
								</span>
							</button>
						</li>
					))}
				</ul>
				<div className={styles.acciones}>
					<button type='button' className={styles.cancelar} onClick={onCancelar}>
						No cargar datos de RENAPER
					</button>
				</div>
			</div>
		</div>,
		document.body,
	);
}
