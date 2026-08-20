import LoginForm from './components/Login/LoginForm';
import styles from './page.module.css';
import LoginCarousel from './components/Carousel/LoginCarousel';

export default function Home() {
  return (
    <main className={styles.loginPage}>
      <div className={styles.loginGrid}>
        <div className={styles.imageSection}>
          <LoginCarousel />
        </div>
        <div className={styles.formSection}>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
