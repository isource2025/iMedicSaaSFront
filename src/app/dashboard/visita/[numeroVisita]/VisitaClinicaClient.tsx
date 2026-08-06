'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import BedDetailView from '@/app/components/beds/BedDetailView';
import Loader from '@/app/components/Loader/Loader';
import { BedDetailProvider } from '@/app/components/beds/contexts/BedDetailContext';
import type { Bed } from '@/app/types/beds';
import type { SidebarSection } from '@/app/components/beds/contexts/BedDetailContext';
import { apiFetch } from '@/app/utils/authFetch';
import { authService } from '@/app/services/authService';
import { normalizeBedFromApi } from '@/app/services/bedsService';

export default function VisitaClinicaClient() {
	const params = useParams();
	const router = useRouter();
	const raw = params?.numeroVisita;
	const numeroVisita = Array.isArray(raw) ? raw[0] : raw;
	const [bed, setBed] = useState<Bed | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!numeroVisita) return;
		const ctrl = new AbortController();
		(async () => {
			setLoading(true);
			setError(null);
			try {
				const res = await apiFetch(
					`/patients/visitas/${encodeURIComponent(String(numeroVisita))}/contexto-clinico`,
					{ signal: ctrl.signal, cache: 'no-store' },
				);
				if (!res.ok) {
					const body = await res.json().catch(() => ({}));
					throw new Error(body.mensaje || `Error ${res.status}`);
				}
				const json = await res.json();
				const mapped = normalizeBedFromApi(
					(json.data || json) as Record<string, unknown>,
				);
				const egresada = Boolean(
					(json.data as { egresada?: boolean })?.egresada ??
						(json as { egresada?: boolean }).egresada,
				);
				setBed({ ...mapped, egresada, numeroVisita: Number(numeroVisita) });
			} catch (e: unknown) {
				const err = e as { name?: string; message?: string };
				if (err?.name === 'AbortError') return;
				setError(err?.message ?? 'No se pudo abrir la visita');
				setBed(null);
			} finally {
				setLoading(false);
			}
		})();
		return () => ctrl.abort();
	}, [numeroVisita]);

	if (loading) {
		return (
			<div style={{ position: 'relative', minHeight: '300px' }}>
				<Loader />
			</div>
		);
	}

	if (error || !bed) {
		return (
			<div style={{ padding: 24 }}>
				<p style={{ color: '#b91c1c', marginBottom: 12 }}>{error || 'Visita no encontrada'}</p>
				<button type="button" onClick={() => router.back()}>
					Volver
				</button>
			</div>
		);
	}

	const rol = authService.getCurrentRol()?.nombre?.toUpperCase();
	const initialSection: SidebarSection =
		rol === 'CARGA_HC' ? 'adjuntos' : 'indicaciones';

	return (
		<>
			{bed.egresada ? (
				<div
					style={{
						background: '#fef3c7',
						borderBottom: '1px solid #f59e0b',
						color: '#92400e',
						padding: '0.65rem 1rem',
						fontSize: '0.9rem',
					}}
				>
					<strong>Visita egresada.</strong> Podés agregar registros clínicos. Solo el
					profesional que creó cada registro puede modificarlo o eliminarlo.
				</div>
			) : null}
			<BedDetailProvider
				initialSection={initialSection}
				initialDate={new Date()}
				initialBed={bed}
			>
				<BedDetailView bed={bed} />
			</BedDetailProvider>
		</>
	);
}
