import { Suspense } from 'react';
import styles from './page.module.css';
import BedDetailClient from './BedDetailClient';

export default function BedDetailPage() {
  return (
    <main className={styles.container}>
      <Suspense fallback={<div className={styles.loadingState}>Cargando información de la cama...</div>}>
        <BedDetailClient />
      </Suspense>
    </main>
  );
}
