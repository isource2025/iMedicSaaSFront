import { Suspense } from 'react';
import AlmacenClient from './AlmacenClient';

export default function AlmacenPage() {
	return (
		<Suspense fallback={<div style={{ padding: '2rem', color: '#64748b' }}>Cargando almacén...</div>}>
			<AlmacenClient />
		</Suspense>
	);
}
