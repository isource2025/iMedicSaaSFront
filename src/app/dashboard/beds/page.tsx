import { Suspense } from "react";
import BedsList from "@/app/components/beds/BedsList";
import styles from "./page.module.css";

export default function BedsPage() {
  return (
    <main className={styles.container}>
      <Suspense fallback={<div className={styles.loadingState}>Cargando listado de camas...</div>}>
        <BedsList />
      </Suspense>
    </main>
  );
}
