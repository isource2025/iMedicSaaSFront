import { BedsList } from "../../components/beds/BedsList";
import styles from "./page.module.css";

export default function BedsPage() {
  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Gestión de Camas</h1>
      <BedsList />
    </main>
  );
}
