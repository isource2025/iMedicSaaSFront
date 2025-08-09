import { useState, useEffect } from 'react';
import { Trabajo } from '@/src/app/types/PatientInterface';
import styles from './LaboralModal.module.css';

interface Option {
	value: string;
	label: string;
}

interface ModalTrabajoProps {
	isOpen: boolean;
	onClose: () => void;
	onSave: (trabajo: Trabajo) => void;
	initialData: Partial<Trabajo> | null;
	ocupacionOptions: Option[];
	situacionOptions: Option[];
	estudiosOptions: Option[];
}

const newTrabajo = (): Trabajo => ({
	id: Date.now(),
	Ocupacion: '',
	DocumentoEmpresa: '',
	RazonSocial: '',
	DomicilioEmpresa: '',
	TelefonoEmpresa: '',
	CuitEmpresa: '',
	SituacionLaboral: '',
	NivelEstudios: '',
});

export default function ModalTrabajo({
	isOpen,
	onClose,
	onSave,
	initialData,
	ocupacionOptions,
	situacionOptions,
	estudiosOptions,
}: ModalTrabajoProps) {
	const [trabajo, setTrabajo] = useState<Trabajo>(newTrabajo());
	const [errors, setErrors] = useState<Record<string, string>>({});

	// mostrar el campo "Otro" DEBAJO del select
	const [showOtroOcupacion, setShowOtroOcupacion] = useState(false);
	const [ocupacionLibre, setOcupacionLibre] = useState('');

	useEffect(() => {
		if (!isOpen) return;
		if (initialData) {
			setTrabajo({ ...newTrabajo(), ...initialData, id: initialData.id! } as Trabajo);

			// si la ocupación guardada no pertenece al catálogo, mostramos el campo "Otro"
			const inCatalog = initialData.Ocupacion
				? ocupacionOptions.some((o) => o.value === initialData.Ocupacion)
				: false;
			setShowOtroOcupacion(!inCatalog && !!initialData.Ocupacion);
			setOcupacionLibre(!inCatalog ? initialData.Ocupacion || '' : '');
		} else {
			setTrabajo(newTrabajo());
			setShowOtroOcupacion(false);
			setOcupacionLibre('');
		}
		setErrors({});
	}, [isOpen, initialData, ocupacionOptions]);

	if (!isOpen) return null;

	const setField = (name: keyof Trabajo, value: string) => {
		setTrabajo((prev) => ({ ...prev, [name]: value }));
		if (errors[name])
			setErrors((prev) => {
				const n = { ...prev };
				delete n[name as string];
				return n;
			});
	};

	const validate = (): boolean => {
		const e: Record<string, string> = {};
		const ocupacionOk = (showOtroOcupacion ? ocupacionLibre : trabajo.Ocupacion)?.trim();

		if (!ocupacionOk) e.Ocupacion = 'Ocupación es obligatoria';
		if (!trabajo.DocumentoEmpresa?.trim()) e.DocumentoEmpresa = 'Documento es obligatorio';
		if (!trabajo.RazonSocial?.trim()) e.RazonSocial = 'Razón social es obligatoria';
		if (!trabajo.CuitEmpresa?.trim()) e.CuitEmpresa = 'CUIT es obligatorio';

		setErrors(e);
		return Object.keys(e).length === 0;
	};

	const handleSave = () => {
		if (!validate()) return;
		const payload: Trabajo = {
			...trabajo,
			Ocupacion: showOtroOcupacion ? ocupacionLibre.trim() : trabajo.Ocupacion?.trim(),
		};
		onSave(payload);
		onClose();
	};

	return (
		<div className={styles.modalOverlay} onClick={onClose}>
			<div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
				<h3>{initialData ? 'Editar Empleo' : 'Agregar Empleo'}</h3>

				<div className={styles.formGrid}>
					{/* Ocupación (select + "Otro" abajo) */}
					<div
						className={`${styles.formGroup} ${
							errors.Ocupacion ? styles.hasError : ''
						}`}
					>
						<label>Ocupación</label>

						<div className={styles.selectWrapper}>
							<select
								className={styles.select}
								name='Ocupacion'
								value={trabajo.Ocupacion || ''}
								onChange={(e) => setField('Ocupacion', e.target.value)}
							>
								<option value=''>Seleccione...</option>
								{ocupacionOptions.map((opt) => (
									<option key={opt.value} value={opt.value}>
										{opt.label}
									</option>
								))}
							</select>
						</div>

						<button
							type='button'
							className={styles.linkBtn}
							onClick={() => setShowOtroOcupacion((v) => !v)}
						>
							{showOtroOcupacion ? 'Ocultar “Otro”' : 'Otro'}
						</button>

						{showOtroOcupacion && (
							<div className={styles.auxField}>
								<input
									className={styles.input}
									type='text'
									placeholder='Escribe la ocupación'
									value={ocupacionLibre}
									onChange={(e) => setOcupacionLibre(e.target.value)}
								/>
							</div>
						)}
						{errors.Ocupacion && (
							<span className={styles.error}>{errors.Ocupacion}</span>
						)}
					</div>

					<div
						className={`${styles.formGroup} ${
							errors.DocumentoEmpresa ? styles.hasError : ''
						}`}
					>
						<label>Documento empresa</label>
						<input
							className={styles.input}
							type='text'
							name='DocumentoEmpresa'
							value={trabajo.DocumentoEmpresa || ''}
							onChange={(e) => setField('DocumentoEmpresa', e.target.value)}
							placeholder='e.g. 20111222'
						/>
						{errors.DocumentoEmpresa && (
							<span className={styles.error}>{errors.DocumentoEmpresa}</span>
						)}
					</div>

					<div
						className={`${styles.formGroup} ${
							errors.RazonSocial ? styles.hasError : ''
						}`}
					>
						<label>Razón social</label>
						<input
							className={styles.input}
							type='text'
							name='RazonSocial'
							value={trabajo.RazonSocial || ''}
							onChange={(e) => setField('RazonSocial', e.target.value)}
						/>
						{errors.RazonSocial && (
							<span className={styles.error}>{errors.RazonSocial}</span>
						)}
					</div>

					<div
						className={`${styles.formGroup} ${
							errors.CuitEmpresa ? styles.hasError : ''
						}`}
					>
						<label>CUIT empresa</label>
						<input
							className={styles.input}
							type='text'
							name='CuitEmpresa'
							value={trabajo.CuitEmpresa || ''}
							onChange={(e) => setField('CuitEmpresa', e.target.value)}
							placeholder='XX-XXXXXXXX-X'
						/>
						{errors.CuitEmpresa && (
							<span className={styles.error}>{errors.CuitEmpresa}</span>
						)}
					</div>

					<div className={styles.formGroup}>
						<label>Domicilio empresa</label>
						<input
							className={styles.input}
							type='text'
							name='DomicilioEmpresa'
							value={trabajo.DomicilioEmpresa || ''}
							onChange={(e) => setField('DomicilioEmpresa', e.target.value)}
						/>
					</div>

					<div className={styles.formGroup}>
						<label>Teléfono empresa</label>
						<input
							className={styles.input}
							type='text'
							name='TelefonoEmpresa'
							value={trabajo.TelefonoEmpresa || ''}
							onChange={(e) => setField('TelefonoEmpresa', e.target.value)}
						/>
					</div>

					<div className={styles.formGroup}>
						<label>Situación laboral</label>
						<div className={styles.selectWrapper}>
							<select
								className={styles.select}
								name='SituacionLaboral'
								value={trabajo.SituacionLaboral || ''}
								onChange={(e) => setField('SituacionLaboral', e.target.value)}
							>
								<option value=''>Seleccione...</option>
								{situacionOptions.map((opt) => (
									<option key={opt.value} value={opt.value}>
										{opt.label}
									</option>
								))}
							</select>
						</div>
					</div>

					<div className={styles.formGroup}>
						<label>Nivel de estudios</label>
						<div className={styles.selectWrapper}>
							<select
								className={styles.select}
								name='NivelEstudios'
								value={trabajo.NivelEstudios || ''}
								onChange={(e) => setField('NivelEstudios', e.target.value)}
							>
								<option value=''>Seleccione...</option>
								{estudiosOptions.map((opt) => (
									<option key={opt.value} value={opt.value}>
										{opt.label}
									</option>
								))}
							</select>
						</div>
					</div>
				</div>

				<div className={styles.buttonContainer}>
					<button type='button' onClick={onClose} className={styles.cancelButton}>
						Cancelar
					</button>
					<button type='button' onClick={handleSave} className={styles.saveButton}>
						Guardar
					</button>
				</div>
			</div>
		</div>
	);
}
