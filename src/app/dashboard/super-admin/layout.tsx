'use client';

import SuperAdminGuard from '@/app/components/SuperAdmin/SuperAdminGuard';

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return <SuperAdminGuard>{children}</SuperAdminGuard>;
}
