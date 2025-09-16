'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import BedDetailView from '@/src/app/components/beds/BedDetailView';
import BedDetailSkeleton from '@/src/app/components/beds/BedDetailSkeleton';
import type { Bed } from '@/src/app/types/beds';

type Props = { id: string };

function getBaseUrl() {
	return (process.env.NEXT_PUBLIC_API_URL ?? window.location.origin).replace(/\/$/, '');
}
function getTokenFromLocalStorage(): string | undefined {
	try {
		const raw = localStorage.getItem('auth_token') ?? localStorage.getItem('token');
		if (!raw) return;
		try {
			const parsed = JSON.parse(raw);
			if (typeof parsed === 'string') return parsed;
			if (parsed?.token) return parsed.token;
		} catch {
			return raw;
		}
	} catch {}
}

export default function ClientBedView({ id }: Props) {
	const router = useRouter();
	const bedId = useMemo(() => id?.split('-')?.[1] ?? id, [id]);
	const url = useMemo(
		() => (bedId ? `${getBaseUrl()}/beds/${encodeURIComponent(bedId)}` : null),
		[bedId],
	);

	const [bed, setBed] = useState<Bed | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!url) return;
		const ctrl = new AbortController();

		(async () => {
			setLoading(true);
			setError(null);
			try {
				const token = getTokenFromLocalStorage();
				const res = await fetch(url, {
					signal: ctrl.signal,
					headers: {
						accept: 'application/json',
						...(token ? { Authorization: `Bearer ${token}` } : {}),
					},
					cache: 'no-store',
				});

				if (res.status === 404) {
					// ⬇️ redirige a la misma ruta con ?nf=1 para disparar notFound() en el server
					router.replace(`/dashboard/beds/${id}?nf=1`);
					return;
				}
				if (!res.ok) {
					const body = await res.text().catch(() => '');
					const err = new Error(
						`GET ${url} → ${res.status} ${res.statusText}\n${body}`,
					);
					// podrías manejar 401 → login aquí si quieres
					throw err;
				}

				const data = (await res.json()) as Bed;
				setBed(data);
			} catch (e: any) {
				if (e?.name === 'AbortError') return;
				setError(e?.message ?? 'Error cargando cama.');
				setBed(null);
			} finally {
				setLoading(false);
			}
		})();

		return () => ctrl.abort();
	}, [url, id, router]);

	if (loading) return <BedDetailSkeleton />;
	if (error) {
		// Si prefieres también mandar errores desconocidos al notFound, descomenta:
		// router.replace(`/dashboard/beds/${id}?nf=1`);
		return (
			<div style={{ padding: 16, color: '#b45309' }}>
				<b>Error:</b> {error}
			</div>
		);
	}
	if (!bed) return <BedDetailSkeleton />;

	return <BedDetailView bed={bed} />;
}
