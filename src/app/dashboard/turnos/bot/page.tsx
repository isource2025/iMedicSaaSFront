'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Redirección legacy → configuración unificada (tab bot). */
export default function BotConfigRedirectPage() {
	const router = useRouter();
	useEffect(() => {
		router.replace('/dashboard/turnos/configuracion?tab=bot');
	}, [router]);
	return null;
}
