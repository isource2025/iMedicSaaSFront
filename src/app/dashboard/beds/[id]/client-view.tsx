'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import BedDetailView from '../../../components/beds/BedDetailView';
import Loader from '../../../components/Loader/Loader';
import { BedDetailProvider } from '../../../components/beds/contexts/BedDetailContext';
import type { Bed } from '../../../types/beds';
import type { SidebarSection } from '../../../components/beds/contexts/BedDetailContext';
import { apiFetch } from '@/app/utils/authFetch';
import { authService } from '@/app/services/authService';
import { normalizeBedFromApi } from '@/app/services/bedsService';
import {
	getBedSnapshot,
	mergeBedSnapshots,
	setBedSnapshot,
} from '@/app/utils/bedSnapshotCache';

type Props = { id: string };

export default function ClientBedView({ id }: Props) {
	const router = useRouter();
	const path = useMemo(
		() => (id ? `/beds/${encodeURIComponent(id)}` : null),
		[id],
	);

	const seed = useMemo(() => (id ? getBedSnapshot(id) : null), [id]);
	const [bed, setBed] = useState<Bed | null>(seed);
	const [loading, setLoading] = useState(!seed);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!path) return;
		const ctrl = new AbortController();
		const hasSeed = Boolean(getBedSnapshot(id));

		(async () => {
			if (!hasSeed) {
				setLoading(true);
			}
			setError(null);
			try {
				const res = await apiFetch(path, {
					signal: ctrl.signal,
					headers: { accept: 'application/json' },
					cache: 'no-store',
				});

				if (res.status === 404) {
					if (hasSeed) {
						setLoading(false);
						return;
					}
					router.replace(`/dashboard/beds/${id}?nf=1`);
					return;
				}
				if (!res.ok) {
					const body = await res.text().catch(() => '');
					throw new Error(`GET ${path} → ${res.status} ${res.statusText}\n${body}`);
				}

				const json = await res.json();
				const fresh = normalizeBedFromApi(
					(json.data || json) as Record<string, unknown>,
				);
				const cached = getBedSnapshot(id);
				const merged = mergeBedSnapshots(cached, fresh);
				setBedSnapshot(merged);
				setBed(merged);
			} catch (e: unknown) {
				const err = e as { name?: string; message?: string };
				if (err?.name === 'AbortError') return;
				if (!hasSeed) {
					setError(err?.message ?? 'Error cargando cama.');
					setBed(null);
				}
			} finally {
				setLoading(false);
			}
		})();

		return () => ctrl.abort();
	}, [path, id, router]);

	if (loading && !bed) {
		return (
			<div style={{ position: 'relative', minHeight: '300px' }}>
				<Loader />
			</div>
		);
	}
	if (error && !bed) {
		return (
			<div style={{ padding: 16, color: '#b45309' }}>
				<b>Error:</b> {error}
			</div>
		);
	}
	if (!bed) {
		return (
			<div style={{ position: 'relative', minHeight: '300px' }}>
				<Loader />
			</div>
		);
	}

	const rol = authService.getCurrentRol()?.nombre?.toUpperCase();
	const initialSection: SidebarSection =
		rol === 'CARGA_HC' ? 'adjuntos' : 'indicaciones';

	return (
		<BedDetailProvider
			initialSection={initialSection}
			initialDate={new Date()}
			initialBed={bed}
		>
			<BedDetailView bed={bed} />
		</BedDetailProvider>
	);
}
