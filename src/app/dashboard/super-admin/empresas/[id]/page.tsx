'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import EmpresaWorkspace from '@/app/components/SuperAdmin/EmpresaWorkspace';
import Loader from '@/app/components/Loader/Loader';

export default function SuperAdminEmpresaPage() {
  const params = useParams();
  const id = String(params.id || '');
  return (
    <Suspense fallback={<Loader />}>
      <EmpresaWorkspace id={id} />
    </Suspense>
  );
}
