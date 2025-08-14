import { useState, useRef, useEffect } from 'react';
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

export default function CustomSelect({
	label,
	name,
	value,
	onChange,
	isLoading,
	options,
}: CustomSelectProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [searchTerm, setSearchTerm] = useState('');
	const wrapperRef = useRef<HTMLDivElement>(null);
	const portalListRef = useRef<HTMLUListElement>(null);
	const [dropdownRect, setDropdownRect] = useState<{
		width: number;
		top: number;
		left: number;
		openUp?: boolean;
	} | null>(null);

	const selectedOption = options.find((opt) => opt.value === value);

	const filteredOptions = options.filter((opt) =>
		opt.label.toLowerCase().includes(searchTerm.toLowerCase()),
	);

	const handleSelect = (option: Option) => {
		onChange(option.value);
		setIsOpen(false);
		setSearchTerm('');
	};

	// Resolve portal root inside modal to avoid closing it
	const resolvePortalRoot = () => {
		if (!wrapperRef.current) return document.body;
		const modalAncestor =
			wrapperRef.current.closest('[data-modal-root]') ||
			wrapperRef.current.closest('[role="dialog"]');
		return (modalAncestor as HTMLElement) || document.body;
	};

	// Outside click
	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			const target = event.target as Node;
			if (
				wrapperRef.current &&
				!wrapperRef.current.contains(target) &&
				!(portalListRef.current && portalListRef.current.contains(target))
			) {
				setIsOpen(false);
				setSearchTerm('');
			}
		}
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	// Positioning
	useEffect(() => {
		if (!isOpen) return;
		const calc = () => {
			if (!wrapperRef.current) return;
			const rect = wrapperRef.current.getBoundingClientRect();
			const viewportHeight = window.innerHeight;
			const espacioAbajo = viewportHeight - rect.bottom;
			const espacioArriba = rect.top;
			const openUp = espacioAbajo < 160 && espacioArriba > espacioAbajo;
			setDropdownRect({
				width: rect.width,
				left: rect.left,
				top: openUp ? rect.top - 6 : rect.bottom + 6,
				openUp,
			});
		};
		calc();
		window.addEventListener('resize', calc);
		window.addEventListener('scroll', calc, true);
		return () => {
			window.removeEventListener('resize', calc);
			window.removeEventListener('scroll', calc, true);
		};
	}, [isOpen]);

	// Keyboard incremental search
	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if (isOpen && !isLoading) {
				if (e.key.length === 1) {
					setSearchTerm((prev) => prev + e.key);
				} else if (e.key === 'Backspace') {
					setSearchTerm((prev) => prev.slice(0, -1));
				}
			}
		}
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [isOpen, isLoading]);

	return (
		<div className={styles.formGroup} ref={wrapperRef}>
			<label className={styles.label}>{label}</label>
			<div
				className={
					styles.selectWrapper + (isLoading ? ` ${styles.selectDisabled}` : '')
				}
			>
				<div
					className={`${styles.select} ${isLoading ? styles.selectDisabled : ''}`}
					onClick={() => !isLoading && setIsOpen((prev) => !prev)}
				>
					{isLoading
						? 'Cargando...'
						: selectedOption
						? selectedOption.label
						: 'Seleccione...'}
				</div>

				{isOpen &&
					!isLoading &&
					dropdownRect &&
					createPortal(
						<ul
							ref={portalListRef}
							className={
								styles.dropdownPortal +
								(dropdownRect.openUp ? ' ' + styles.openUp : '')
							}
							style={{
								width: dropdownRect.width,
								left: dropdownRect.left,
								top: dropdownRect.top,
								position: 'fixed',
							}}
							onMouseDown={(e) => {
								// prevent bubbling closing modal
								e.stopPropagation();
							}}
						>
							{filteredOptions.length > 0 ? (
								filteredOptions.map((opt) => (
									<li
										key={opt.value}
										onClick={(e) => {
											e.stopPropagation();
											handleSelect(opt);
										}}
										className={styles.dropdownItem}
									>
										{opt.label}
									</li>
								))
							) : (
								<li className={styles.dropdownItemDisabled}>
									No hay resultados
								</li>
							)}
						</ul>,
						resolvePortalRoot(),
					)}
			</div>
		</div>
	);
}
