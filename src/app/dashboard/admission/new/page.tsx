import { Suspense } from 'react';
import NuevaAdmisionClient from './NuevaAdmisionClient';

export default function NuevaAdmisionPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: '2rem', color: '#64748b' }}>Cargando nueva admisión…</div>
      }
    >
      <NuevaAdmisionClient />
    </Suspense>
  );
}
