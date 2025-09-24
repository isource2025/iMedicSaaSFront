// components/sections/IndicacionesSection.tsx
'use client';

import { useMemo, useState } from 'react';
import { useBedSectionFetch } from '../contexts/useBedSectionQuery';
import IndicacionesTable, { IndicacionRow } from './IndicacionesTable';
import { useBedDetail } from '../contexts/BedDetailContext';

type IndicacionDTO = {
	id: string;
	cantidad?: number | string;
	descripcion?: string;
	profesional?: string;
	frecuencia?: string;
	observaciones?: string;
	proximo?: string; // ISO string o texto
	anterior?: string; // ISO string o texto
	vigenteDesde?: string; // ISO string o texto
	nro?: number | string;
	idSector?: string;
	medicamento?: string;
};

export default function IndicacionesSection({
	bedId,
	patientId,
	numeroVisita,
}: {
	bedId?: string | number;
	patientId?: string | number;
	numeroVisita: number | null;
}) {
	const { activeSection, selectedDate } = useBedDetail();

	// Construimos el endpoint solo si hay numeroVisita
	const indicacionesPath = useMemo(
		() => (numeroVisita ? `/indicaciones/${numeroVisita}/byDate` : undefined),
		[numeroVisita],
	);

	// Llama al hook (ya escucha activeSection y selectedDate del contexto)
	const { data, isLoading, error, refetch, url } = useBedSectionFetch<IndicacionDTO[]>({
		bedId,
		patientId,
		// Muy importante: solo habilitar si tenemos el path listo
		enabled: !!indicacionesPath && activeSection === 'indicaciones',
		endpointOverride: indicacionesPath ? { indicaciones: indicacionesPath } : undefined,
		// Si tu backend necesita headers/credenciales:
		// fetchInit: { credentials: 'include' },
		cacheTimeMs: 15000,
	});

	// Mapea a las filas esperadas por la tabla
	const rows: IndicacionRow[] = useMemo(() => {
		const list = Array.isArray(data) ? data : [];
		return list.map((x) => ({
			id: x.id,
			cantidad: x.cantidad,
			descripcion: x.descripcion,
			profesional: x.profesional,
			frecuencia: x.frecuencia,
			observaciones: x.observaciones,
			proximo: x.proximo ? formatMaybeDate(x.proximo) : undefined,
			anterior: x.anterior ? formatMaybeDate(x.anterior) : undefined,
			vigenteDesde: x.vigenteDesde ? formatMaybeDate(x.vigenteDesde) : undefined,
			nro: x.nro,
			idSector: x.idSector,
			medicamento: x.medicamento,
		}));
	}, [data]);

	const [selectedId, setSelectedId] = useState<string | null>(null);

	if (activeSection !== 'indicaciones') {
		return null;
	}

	if (isLoading) return <div>Cargando indicaciones…</div>;
	if (error) return <div>Error cargando indicaciones: {error.message}</div>;

	return (
		<div>
			<div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
				<strong>Indicaciones</strong>
				<small style={{ opacity: 0.6 }}>
					{selectedDate ? selectedDate.toLocaleDateString() : '—'}
				</small>
				<button onClick={refetch} style={{ marginLeft: 'auto' }}>
					Refrescar
				</button>
			</div>

			<IndicacionesTable
				rows={rows}
				selectedId={selectedId}
				onSelectRow={(id) => setSelectedId(id)}
			/>

			<div style={{ marginTop: 8, fontSize: 12, opacity: 0.6 }}>
				<span>Fuente: {url}</span>
			</div>
		</div>
	);
}

// Helpers locales
function formatMaybeDate(s: string) {
	// Si viene ISO -> formatear; si no, mostrar tal cual
	const d = new Date(s);
	return isNaN(d.getTime()) ? s : d.toLocaleString();
}
