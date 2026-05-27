'use client';

import { Suspense } from 'react';
import SuperAdminPage from '@/app/components/SuperAdmin/SuperAdminPage';
import Loader from '@/app/components/Loader/Loader';

export default function SuperAdminRoute() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: '2rem' }}>
          <Loader />
        </div>
      }
    >
      <SuperAdminPage />
    </Suspense>
  );
}
