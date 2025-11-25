import React from 'react';
import styles from './RendicionFilters.module.css';
import { SearchInput } from '../beds/SearchInput';

export interface RendicionFiltersProps {
	searchTerm: string;
	setSearchTerm: (term: string) => void;
	estadoFilter: string;
	setEstadoFilter: (estado: string) => void;
	periodoFilter: { month: number; year: number } | null;
	setPeriodoFilter: (periodo: { month: number; year: number } | null) => void;
	loading?: boolean;
	error?: string | null;
}

export const RendicionFilters: React.FC<RendicionFiltersProps> = ({
	searchTerm,
	setSearchTerm,
	estadoFilter,
	setEstadoFilter,
	periodoFilter,
	setPeriodoFilter,
	loading = false,
	error = null,
}) => {
	// Generar opciones de años (últimos 5 años + año actual + próximo año)
	const currentYear = new Date().getFullYear();
	const years = Array.from({ length: 7 }, (_, i) => currentYear - 5 + i);

	// Meses
	const months = [
		{ value: 1, label: 'Enero' },
		{ value: 2, label: 'Febrero' },
		{ value: 3, label: 'Marzo' },
		{ value: 4, label: 'Abril' },
		{ value: 5, label: 'Mayo' },
		{ value: 6, label: 'Junio' },
		{ value: 7, label: 'Julio' },
		{ value: 8, label: 'Agosto' },
		{ value: 9, label: 'Septiembre' },
		{ value: 10, label: 'Octubre' },
		{ value: 11, label: 'Noviembre' },
		{ value: 12, label: 'Diciembre' },
	];

	const handleMonthChange = (month: string) => {
		if (month === '') {
			setPeriodoFilter(null);
		} else if (periodoFilter) {
			setPeriodoFilter({ ...periodoFilter, month: parseInt(month) });
		} else {
			setPeriodoFilter({ month: parseInt(month), year: currentYear });
		}
	};

	const handleYearChange = (year: string) => {
		if (year === '') {
			setPeriodoFilter(null);
		} else if (periodoFilter) {
			setPeriodoFilter({ ...periodoFilter, year: parseInt(year) });
		} else {
			const currentMonth = new Date().getMonth() + 1;
			setPeriodoFilter({ month: currentMonth, year: parseInt(year) });
		}
	};

	const handleClearPeriodo = () => {
		setPeriodoFilter(null);
	};

	return (
		<div className={styles.filterModule}>
			<div className={styles.filtersContainer}>
				<div className={styles.filterGroup}>
					<label className={styles.filterLabel}>Estado</label>
					<select
						className={styles.filterSelect}
						value={estadoFilter}
						onChange={(e) => setEstadoFilter(e.target.value)}
					>
						<option value='all'>Todos los estados</option>
						<option value='abierta'>Abierta</option>
						<option value='cerrada'>Cerrada</option>
					</select>
				</div>

				<div className={styles.filterGroup}>
					<label className={styles.filterLabel}>Mes</label>
					<select
						className={styles.filterSelect}
						value={periodoFilter?.month || ''}
						onChange={(e) => handleMonthChange(e.target.value)}
					>
						<option value=''>Todos los meses</option>
						{months.map((month) => (
							<option key={month.value} value={month.value}>
								{month.label}
							</option>
						))}
					</select>
				</div>

				<div className={styles.filterGroup}>
					<label className={styles.filterLabel}>Año</label>
					<select
						className={styles.filterSelect}
						value={periodoFilter?.year || ''}
						onChange={(e) => handleYearChange(e.target.value)}
					>
						<option value=''>Todos los años</option>
						{years.map((year) => (
							<option key={year} value={year}>
								{year}
							</option>
						))}
					</select>
				</div>

				{periodoFilter && (
					<div className={styles.filterGroup}>
						<label className={styles.filterLabel}>&nbsp;</label>
						<button className={styles.clearButton} onClick={handleClearPeriodo}>
							Limpiar período
						</button>
					</div>
				)}
			</div>

			<div className={styles.searchWrapper}>
				<SearchInput
					searchTerm={searchTerm}
					setSearchTerm={setSearchTerm}
					placeholder='Buscar por cliente, convenio o ID...'
					loading={loading}
					error={error}
					isSearching={!!searchTerm}
					tooltipContent={
						<>
							<p>Buscar rendiciones por:</p>
							<ul className={styles.tooltipList}>
								<li>Razón social del cliente</li>
								<li>Descripción del convenio</li>
								<li>ID de rendición</li>
								<li>Número de convenio</li>
							</ul>
							<p style={{ fontSize: '0.8rem', fontStyle: 'italic', marginTop: '0.5rem' }}>
								Mínimo 3 caracteres
							</p>
						</>
					}
				/>
			</div>
		</div>
	);
};

export default RendicionFilters;
