'use client';

import { useCallback, useState } from 'react';
import ModalAddPatient from '@/app/components/modals/ModalAddPatient';
import { patientService } from '@/app/services/patientService';
import type { PatientFormData } from '@/app/types/PatientFormInterface';

export interface PacienteCreadoMin {
	IDPaciente: number;
	ApellidoyNombre?: string;
	NumeroDocumento?: number | string | null;
	NumeroHC?: string | null;
	FechaNacimiento?: string | null;
	Cobertura?: string | null;
}

interface Props {
	className?: string;
	label?: string;
	/** Para mostrarse por encima del modal de asignar turno (z-index 1000). */
	stackOnTop?: boolean;
	onCreated?: (paciente: PacienteCreadoMin) => void;
}

export default function AgregarPacienteEnAgenda({
	className,
	label = '+ Agregar paciente',
	stackOnTop = false,
	onCreated,
}: Props) {
	const [open, setOpen] = useState(false);
	const [submitting, setSubmitting] = useState(false);

	const handleSubmit = useCallback(
		async (data: PatientFormData) => {
			setSubmitting(true);
			try {
				const file: File | null = (data as { _fotoFile?: File })._fotoFile || null;
				const created = await patientService.createPatient(data, file);
				setOpen(false);
				onCreated?.({
					IDPaciente: created.IDPaciente,
					ApellidoyNombre: created.ApellidoyNombre,
					NumeroDocumento: created.NumeroDocumento,
					NumeroHC: created.NumeroHC,
					FechaNacimiento: created.FechaNacimiento,
					Cobertura:
						(created as { Cobertura?: string }).Cobertura ??
						(created as { RazonSocial?: string }).RazonSocial,
				});
				return true;
			} catch (err) {
				console.error('Error al crear paciente desde agenda:', err);
				return false;
			} finally {
				setSubmitting(false);
			}
		},
		[onCreated],
	);

	return (
		<>
			<button type='button' className={className} onClick={() => setOpen(true)}>
				{label}
			</button>
			<ModalAddPatient
				isOpen={open}
				onClose={() => setOpen(false)}
				onSubmit={handleSubmit}
				isSubmitting={submitting}
				priority={stackOnTop ? 'high' : 'default'}
			/>
		</>
	);
}
