'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
	admissionApiErrorMessage,
	admissionSearchService,
	type AdmissionSearchRow,
} from '@/app/services/admissionSearchService';
import { groupRowsByPatient } from '@/app/utils/admissionSearchUtils';

interface Options {
	/** Solo busca cuando es true (wizard abierto y usuario con permiso). */
	enabled: boolean;
	idPaciente?: number | null;
	numeroDocumento?: number | string | null;
	pacienteNombre?: string | null;
}

function soloDigitos(v: unknown): string {
	return String(v ?? '').replace(/\D+/g, '');
}

/**
 * Historial (visitas) de un paciente a partir de los datos de un turno.
 * Busca por DNI y filtra por `IdPaciente` (o por documento exacto si no hay id),
 * porque el backend filtra el DNI con LIKE %…%.
 */
export function usePacienteHistorial({
	enabled,
	idPaciente,
	numeroDocumento,
	pacienteNombre,
}: Options) {
	const [visits, setVisits] = useState<AdmissionSearchRow[]>([]);
	const [patientRow, setPatientRow] = useState<AdmissionSearchRow | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [reloadTick, setReloadTick] = useState(0);

	const dni = soloDigitos(numeroDocumento);
	const idPac = Number(idPaciente) > 0 ? Number(idPaciente) : null;
	const puedeBuscar = Boolean(dni);

	useEffect(() => {
		if (!enabled) {
			setVisits([]);
			setPatientRow(null);
			setError('');
			setLoading(false);
			return;
		}
		if (!puedeBuscar) {
			setVisits([]);
			setPatientRow(null);
			setError('');
			setLoading(false);
			return;
		}
		let cancel = false;
		setLoading(true);
		setError('');
		admissionSearchService
			.buscar({ dni, page: 1, limit: 200 })
			.then((res) => {
				if (cancel) return;
				const rows = (res.data || []).filter((r) =>
					idPac != null
						? Number(r.IdPaciente) === idPac
						: soloDigitos(r.NumeroDocumento) === dni,
				);
				const grupo = groupRowsByPatient(rows)[0];
				setVisits(grupo?.visits ?? []);
				setPatientRow(grupo?.patient ?? null);
			})
			.catch((e: unknown) => {
				if (cancel) return;
				setVisits([]);
				setPatientRow(null);
				setError(admissionApiErrorMessage(e, 'No se pudo cargar el historial'));
			})
			.finally(() => {
				if (!cancel) setLoading(false);
			});
		return () => {
			cancel = true;
		};
	}, [enabled, puedeBuscar, dni, idPac, reloadTick]);

	/** Fila de paciente: la real si tiene visitas, o una mínima armada con los datos del turno. */
	const patient = useMemo<AdmissionSearchRow>(() => {
		if (patientRow) return patientRow;
		return {
			NumeroVisita: 0,
			IdPaciente: idPac ?? 0,
			ApellidoYNombre: String(pacienteNombre || '').trim() || 'Paciente',
			NumeroDocumento: dni,
			NumeroHC: '',
			FechaAdmision: '',
			HoraAdmision: '',
		};
	}, [patientRow, idPac, pacienteNombre, dni]);

	const reload = useCallback(() => setReloadTick((n) => n + 1), []);

	return {
		patient,
		visits,
		loading,
		error,
		count: visits.length,
		/** false si el turno no trae DNI: no hay forma de buscar. */
		puedeBuscar,
		reload,
	};
}
