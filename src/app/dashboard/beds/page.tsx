import { Suspense } from "react";
import BedsList from "@/app/components/beds/BedsList";
import Loader from "@/app/components/Loader/Loader";
import styles from "./page.module.css";

export default function BedsPage() {
  return (
    <main className={styles.container}>
      <Suspense fallback={<div style={{ position: 'relative', minHeight: '300px' }}><Loader /></div>}>
        <BedsList />
      </Suspense>
    </main>
  );
}
