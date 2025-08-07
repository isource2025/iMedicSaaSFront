import styles from './Personal.module.css';

// Reutilizamos el componente SpinnerIcon que ya tenías
const SpinnerIcon = () => (
	<svg className={styles.spinnerIcon} viewBox='0 0 24 24' /* ...resto de tu SVG... */ />
);

interface Option {
	value: string;
	label: string;
}

interface LoadingSelectProps {
	label: string;
	name: string;
	value: string;
	onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
	isLoading: boolean;
	options: Option[];
}

export default function LoadingSelect({
	label,
	name,
	value,
	onChange,
	isLoading,
	options,
}: LoadingSelectProps) {
	return (
		<div className={styles.formGroup}>
			<label className={styles.label}>{label}</label>
			<div className={styles.selectWrapper}>
				<select
					name={name}
					value={value}
					onChange={onChange}
					className={styles.select}
					disabled={isLoading}
				>
					{isLoading ? (
						<option>Cargando...</option>
					) : (
						<>
							<option value=''>Seleccione...</option>
							{options.map((opt) => (
								<option key={opt.value} value={opt.value}>
									{opt.label}
								</option>
							))}
						</>
					)}
				</select>
				{isLoading && <SpinnerIcon />}
			</div>
		</div>
	);
}
