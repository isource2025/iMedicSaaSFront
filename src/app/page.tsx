import LoginForm from './components/Login/LoginForm';
import styles from './page.module.css';

export default function Home() {
  return (
    <main className={styles.loginPage}>
      <div className={styles.loginGrid}>
        <div className={styles.imageSection}>
          <div className={styles.healthImageContainer}>
            <div className={styles.overlay}></div>
          </div>
        </div>
        <div className={styles.formSection}>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
