import type { Metadata } from 'next';
import TurneroLiveDisplay from '@/app/components/Turnero/TurneroLiveDisplay';

export const metadata: Metadata = {
	title: 'Turnero — iMedic',
	robots: 'noindex',
};

export default function DisplayPage({
	params,
	searchParams,
}: {
	params: { token: string };
	searchParams?: { kiosk?: string };
}) {
	const forceKiosk = searchParams?.kiosk === '1';
	return <TurneroLiveDisplay token={params.token} forceKiosk={forceKiosk} />;
}
