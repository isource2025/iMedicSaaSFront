import { Suspense } from 'react';
import styles from './page.module.css';
import BedDetailClient from './BedDetailClient';

import Loader from '@/app/components/Loader/Loader';

export default function BedDetailPage() {
  return (
    <main className={styles.container}>
      <Suspense fallback={<div style={{ position: 'relative', minHeight: '300px' }}><Loader /></div>}>
        <BedDetailClient />
      </Suspense>
    </main>
  );
}
