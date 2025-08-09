import { useState, useRef, useEffect } from 'react';
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

	const selectedOption = options.find((opt) => opt.value === value);

	const filteredOptions = options.filter((opt) =>
		opt.label.toLowerCase().includes(searchTerm.toLowerCase()),
	);

	const handleSelect = (option: Option) => {
		onChange(option.value);
		setIsOpen(false);
		setSearchTerm(''); // limpiar búsqueda al seleccionar
	};

	// Cerrar cuando haga click afuera
	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
				setIsOpen(false);
				setSearchTerm('');
			}
		}
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	// Capturar lo que escribe el usuario mientras el menú está abierto
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
				{/* Botón que abre/cierra el menú */}
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

				{/* Lista de opciones */}
				{isOpen && !isLoading && (
					<ul className={styles.dropdown}>
						{filteredOptions.length > 0 ? (
							filteredOptions.map((opt) => (
								<li
									key={opt.value}
									onClick={() => handleSelect(opt)}
									className={styles.dropdownItem}
								>
									{opt.label}
								</li>
							))
						) : (
							<li className={styles.dropdownItemDisabled}>No hay resultados</li>
						)}
					</ul>
				)}
			</div>
		</div>
	);
}
