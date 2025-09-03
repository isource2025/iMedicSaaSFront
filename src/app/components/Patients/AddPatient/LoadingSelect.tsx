import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from './Personal.module.css';

interface Option {
	value: string;
	label: string;
}
interface CustomSelectProps {
	label: string;
	name: string;
	value: string;
	onChange: (value: string) => void;
	isLoading: boolean;
	options: Option[];
}

type Placement = 'top' | 'bottom';

export default function CustomSelect({
	label,
	name,
	value,
	onChange,
	isLoading,
	options,
}: CustomSelectProps) {
	const [mounted, setMounted] = useState(false); // evita SSR issues
	const [isOpen, setIsOpen] = useState(false);
	const [searchTerm, setSearchTerm] = useState('');
	const [placement, setPlacement] = useState<Placement>('bottom');
	const [coords, setCoords] = useState({ left: 0, top: 0, width: 0 });
	const [portalEl, setPortalEl] = useState<HTMLElement | null>(null);

	const wrapperRef = useRef<HTMLDivElement>(null);
	const triggerRef = useRef<HTMLDivElement>(null);
	const dropdownRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		setMounted(true);
	}, []);

	const selected = options.find((o) => o.value === value);
	const filtered = options.filter((o) =>
		o.label.toLowerCase().includes(searchTerm.toLowerCase()),
	);

	const close = () => {
		setIsOpen(false);
		setSearchTerm('');
	};

	const handleSelect = (opt: Option) => {
		onChange(opt.value);
		close();
	};

	// Cálculo de posición (y decidir arriba/abajo)
	const updatePosition = () => {
		const el = triggerRef.current;
		if (!el) return;
		const r = el.getBoundingClientRect();
		const vh = window.innerHeight;
		const spaceBelow = vh - r.bottom;
		const spaceAbove = r.top;
		const estimated = 280; // px aprox. (search + lista)

		const openDown =
			spaceBelow >= Math.min(estimated, vh * 0.4) || spaceBelow >= spaceAbove;

		setPlacement(openDown ? 'bottom' : 'top');
		setCoords({
			left: Math.round(r.left),
			top: Math.round(openDown ? r.bottom + 4 : r.top - 4),
			width: Math.round(r.width),
		});
	};

	useLayoutEffect(() => {
		if (isOpen) updatePosition();
	}, [isOpen]);

	useEffect(() => {
		if (!isOpen) return;
		const onResize = () => updatePosition();
		const onScroll = () => updatePosition();
		window.addEventListener('resize', onResize);
		window.addEventListener('scroll', onScroll, true);
		return () => {
			window.removeEventListener('resize', onResize);
			window.removeEventListener('scroll', onScroll, true);
		};
	}, [isOpen]);

	// Cerrar al hacer click afuera (incluye el portal)
	useEffect(() => {
		if (!isOpen) return;
		const handleClick = (e: MouseEvent) => {
			const t = e.target as Node;
			if (!wrapperRef.current?.contains(t) && !dropdownRef.current?.contains(t)) {
				close();
			}
		};
		document.addEventListener('mousedown', handleClick);
		return () => document.removeEventListener('mousedown', handleClick);
	}, [isOpen]);
	useEffect(() => {
		if (!wrapperRef.current) return;
		// intenta el contenedor del modal
		const modalRoot = wrapperRef.current.closest<HTMLElement>(
			'[data-modal-root], [role="dialog"], .modal, .Modal, .MuiModal-root',
		);
		setPortalEl(modalRoot ?? document.body);
	}, []);

	const selectClasses = [
		styles.select,
		isLoading ? styles.selectDisabled : '',
		isLoading ? styles.selectLoading : '',
	]
		.filter(Boolean)
		.join(' ');

	return (
		<div className={styles.formGroup} ref={wrapperRef}>
			<label className={styles.label} htmlFor={name}>
				{label}
			</label>

			<div className={styles.selectWrapper}>
				<div
					id={name}
					ref={triggerRef}
					className={selectClasses}
					onClick={() => !isLoading && setIsOpen((v) => !v)}
					role='button'
					aria-haspopup='listbox'
					aria-expanded={isOpen}
					aria-disabled={isLoading}
				>
					{isLoading ? 'Cargando...' : selected ? selected.label : 'Seleccione...'}
					{isLoading && <div className={styles.spinnerIcon} aria-hidden='true' />}
				</div>
			</div>

			{/* Dropdown en portal — solo en cliente */}
			{mounted &&
				isOpen &&
				!isLoading &&
				portalEl &&
				createPortal(
					<div
						ref={dropdownRef}
						className={`${styles.dropdownPortal} ${
							placement === 'top' ? styles.dropTop : styles.dropBottom
						}`}
						style={{ left: coords.left, top: coords.top, width: coords.width }}
						role='listbox'
						aria-labelledby={name}
						// EVITA que el click cierre el modal por bubbling/capture
						onMouseDownCapture={(e) => e.stopPropagation()}
						onMouseDown={(e) => e.stopPropagation()}
						onClick={(e) => e.stopPropagation()}
					>
						<div className={styles.searchBar}>
							<input
								className={styles.searchInput}
								type='text'
								placeholder='Buscar…'
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								autoFocus
								aria-label='Buscar opción'
								onMouseDown={(e) => e.stopPropagation()} // prevenir blur/cierre
							/>
						</div>

						<ul className={styles.optionList}>
							{filtered.length ? (
								filtered.map((opt) => (
									<li
										key={opt.value}
										className={`${styles.dropdownItem} ${
											opt.value === value ? styles.active : ''
										}`}
										role='option'
										aria-selected={opt.value === value}
										onMouseDown={(e) => e.stopPropagation()} // importante si el modal escucha mousedown
										onClick={() => {
											onChange(opt.value);
											setIsOpen(false);
											setSearchTerm('');
										}}
									>
										{opt.label}
									</li>
								))
							) : (
								<li className={styles.dropdownItemDisabled}>
									No hay resultados
								</li>
							)}
						</ul>
					</div>,
					portalEl,
				)}
		</div>
	);
}
