'use client';

import { ReactNode, createContext, useCallback, useContext, useState } from 'react';
import { FiDownload } from 'react-icons/fi';
import { useBedDetail } from '../contexts/BedDetailContext';
import { useSeccionesCama } from '../sidebar/useSeccionesCama';
import BedSheet from './BedSheet';
import styles from './SectionPicker.module.css';

const SectionPickerContext = createContext<(() => void) | null>(null);

/** Devuelve la función que abre el selector de secciones, o null fuera del detalle de cama. */
export function useAbrirSectionPicker() {
	return useContext(SectionPickerContext);
}

type ProviderProps = {
	onExportDetalle?: () => void;
	children: ReactNode;
};

export function SectionPickerProvider({ onExportDetalle, children }: ProviderProps) {
	const [abierto, setAbierto] = useState(false);
	const abrir = useCallback(() => setAbierto(true), []);
	const cerrar = useCallback(() => setAbierto(false), []);

	return (
		<SectionPickerContext.Provider value={abrir}>
			{children}
			{abierto ? <SectionPickerSheet onClose={cerrar} onExportDetalle={onExportDetalle} /> : null}
		</SectionPickerContext.Provider>
	);
}

function SectionPickerSheet({
	onClose,
	onExportDetalle,
}: {
	onClose: () => void;
	onExportDetalle?: () => void;
}) {
	const { activeSection, navigateToSection, adjuntosTotalCount } = useBedDetail();
	const { grupos } = useSeccionesCama();

	return (
		<BedSheet title='Ir a sección' onClose={onClose} wide>
			<div className={styles.root}>
				{grupos.map((g) => (
					<section key={g.id} className={styles.grupo}>
						<h3 className={styles.grupoTitulo}>{g.label}</h3>
						<div className={styles.grid}>
							{g.items.map((it) => {
								const activo = activeSection === it.id;
								return (
									<button
										key={it.id}
										type='button'
										className={`${styles.item} ${activo ? styles.itemActivo : ''}`}
										aria-current={activo ? 'page' : undefined}
										onClick={() => {
											navigateToSection(it.id);
											onClose();
										}}
									>
										<span className={styles.itemLabel}>{it.label}</span>
										{it.id === 'adjuntos' && adjuntosTotalCount > 0 ? (
											<span className={styles.badge}>{adjuntosTotalCount}</span>
										) : null}
									</button>
								);
							})}
						</div>
					</section>
				))}
				{onExportDetalle ? (
					<button
						type='button'
						className={styles.export}
						onClick={() => {
							onClose();
							onExportDetalle();
						}}
					>
						<FiDownload aria-hidden />
						Exportar detalle
					</button>
				) : null}
			</div>
		</BedSheet>
	);
}
