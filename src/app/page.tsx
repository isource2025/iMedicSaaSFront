import LoginForm from './components/Login/LoginForm';
import styles from './page.module.css';

export default function Home() {
  return (
    <main className={styles.loginPage}>
      <div className={styles.loginGrid}>
        <div className={styles.formSection}>
          <span className={styles.loginNote}>
            Software iMedic desarrollado por{' '}
            <a
              href="https://isource.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.brandLink}
            >
              iSource
            </a>
          </span>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
