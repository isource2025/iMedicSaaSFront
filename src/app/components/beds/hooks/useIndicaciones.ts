import { useState, useEffect } from 'react';
import { indicacionesService } from '../../../services/indicacionesService';
import { Indicacion } from '../../../types/indicaciones';
import { IndicacionRow } from '../indicaciones/IndicacionesTable';

export function useIndicaciones(numeroVisita: number | null | undefined) {
	const [indicaciones, setIndicaciones] = useState<IndicacionRow[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!numeroVisita) {
			setIndicaciones([]);
			return;
		}

		const fetchIndicaciones = async () => {
			setLoading(true);
			setError(null);
			try {
				const data = await indicacionesService.getIndicacionesByVisita(numeroVisita);
				const mappedData = data.map(mapIndicacionToRow);
				setIndicaciones(mappedData);
			} catch (err) {
				console.error('Error fetching indicaciones:', err);
				setError(err instanceof Error ? err.message : 'Error desconocido');
				setIndicaciones([]);
			} finally {
				setLoading(false);
			}
		};

		fetchIndicaciones();
	}, [numeroVisita]);

	return {
		indicaciones,
		loading,
		error,
		refetch: () => {
			if (numeroVisita) {
				const fetchIndicaciones = async () => {
					setLoading(true);
					setError(null);
					try {
						const data = await indicacionesService.getIndicacionesByVisita(
							numeroVisita,
						);
						const mappedData = data.map(mapIndicacionToRow);
						setIndicaciones(mappedData);
					} catch (err) {
						console.error('Error fetching indicaciones:', err);
						setError(err instanceof Error ? err.message : 'Error desconocido');
						setIndicaciones([]);
					} finally {
						setLoading(false);
					}
				};
				fetchIndicaciones();
			}
		},
	};
}

function mapIndicacionToRow(indicacion: Indicacion): IndicacionRow {
	return {
		id: `${indicacion.NumeroVisita}-${indicacion.NroIndicacion}`,
		cantidad: indicacion.Cantidad ?? undefined,
		descripcion: indicacion.AliasMedicamento || `Indicación ${indicacion.NroIndicacion}`,
		profesional:
			indicacion.OperadorApellido && indicacion.OperadorNombres
				? `${indicacion.OperadorNombres} ${indicacion.OperadorApellido}`
				: 'Profesional no especificado',
		frecuencia: indicacion.Frecuencia || '-',
		observaciones: indicacion.Observaciones || '',
		proximo: formatDateTime(indicacion.FechaProximo, indicacion.HoraProximo),
		anterior: formatDateTime(indicacion.FechaCumplido, indicacion.HoraCumplido),
		vigenteDesde: formatDateTime(indicacion.FechaCarga, indicacion.HoraCarga),
		nro: indicacion.NroIndicacion,
		idSector: indicacion.IdSector || '',
		medicamento: indicacion.AliasMedicamento || '-',
	};
}

function formatDateTime(fecha: string | null, hora: string | null): string {
	if (!fecha) return '-';
	const dateStr = fecha;
	const timeStr = hora ? ` ${hora}` : '';
	return `${dateStr}${timeStr}`;
}
